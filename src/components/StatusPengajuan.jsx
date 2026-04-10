import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  Clock, CheckCircle2, FileText, Inbox, AlertCircle, X, Eye, Edit3,
  Package, Tag, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  Calendar, Calculator, FileSpreadsheet, FileDown
} from "lucide-react";

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function StatusPengajuan({ daftarPengajuan, onSuccess }) {
  const disetujui = daftarPengajuan.filter((p) => p.status_terakhir === "Disetujui");
  const menungguBusDev = daftarPengajuan.filter((p) => p.status_terakhir === "Menunggu Review BusDev");
  const revisiSales = daftarPengajuan.filter((p) => p.status_terakhir === "Revisi Sales");
  const ditolak = daftarPengajuan.filter((p) => p.status_terakhir === "Ditolak");

  // State Modal
  const [modalEdit, setModalEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);

  // State Fitur: Search, Filter, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [sortBy, setSortBy] = useState("terbaru");
  const [currentPage, setCurrentPage] = useState(1);
  
  const rowsPerPage = 10;

  const uniqueStatuses = ["Semua", ...Array.from(new Set(daftarPengajuan.map(item => item.status_terakhir)))];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterKategori, sortBy]);

  const hitungEstimasiBiaya = (omset, jenis_promosi) => {
    if (!omset || !jenis_promosi) return 0;
    const match = jenis_promosi.match(/(\d+)%/);
    const persentase = match ? parseInt(match[1]) : 0;
    return (Number(omset) * persentase) / 100;
  };

  // Fungsi: Gabungkan Detail dengan Catatan Revisi
  const bukaDetail = async (item) => {
    let catatanRevisi = null;
    if (item.status_terakhir === "Revisi Sales") {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("log_riwayat_approval")
          .select("catatan_reviewer")
          .eq("id_pengajuan", item.id_pengajuan)
          .eq("tindakan", "Revisi")
          .order("waktu_tindakan", { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          catatanRevisi = data[0].catatan_reviewer;
        }
      } catch (err) {
        console.error("Gagal mengambil log revisi:", err);
      } finally {
        setIsLoading(false);
      }
    }

    setDetailModalItem({
      ...item,
      estimasi_biaya: hitungEstimasiBiaya(item.omset_perbulan, item.jenis_promosi),
      catatan_revisi: catatanRevisi
    });
  };

  // Proses Data
  let processedData = [...daftarPengajuan];
  if (searchQuery) {
    processedData = processedData.filter(item => 
      item.master_customer?.nama_customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jenis_promosi?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  if (filterStatus !== "Semua") processedData = processedData.filter(item => item.status_terakhir === filterStatus);

  processedData.sort((a, b) => {
    if (sortBy === "terbaru") return new Date(b.tanggal_pengajuan) - new Date(a.tanggal_pengajuan);
    if (sortBy === "terlama") return new Date(a.tanggal_pengajuan) - new Date(b.tanggal_pengajuan);
    if (sortBy === "omset_tertinggi") return b.omset_perbulan - a.omset_perbulan;
    if (sortBy === "omset_terendah") return a.omset_perbulan - b.omset_perbulan;
    if (sortBy === "nama_az") return (a.master_customer?.nama_customer || "").localeCompare(b.master_customer?.nama_customer || "");
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("trx_pengajuan_promosi")
        .update({
          omset_perbulan: parseFloat(modalEdit.omset_perbulan),
          kuantitas_produk: parseInt(modalEdit.kuantitas_produk),
          jenis_promosi: modalEdit.jenis_promosi,
          durasi_mulai: modalEdit.durasi_mulai,
          durasi_selesai: modalEdit.durasi_selesai,
          keterangan_sales: modalEdit.keterangan_sales,
          status_terakhir: "Menunggu Review BusDev",
        })
        .eq("id_pengajuan", modalEdit.id_pengajuan);

      if (updateError) throw updateError;

      await supabase.from("log_riwayat_approval").insert([{
        id_pengajuan: modalEdit.id_pengajuan,
        id_reviewer: modalEdit.id_sales,
        tindakan: "Submit",
        catatan_reviewer: "Telah diperbaiki oleh Sales berdasarkan catatan revisi BusDev.",
      }]);

      toast.success("Pengajuan berhasil diperbaiki dan dikirim ulang!");
      setModalEdit(null);
      if (onSuccess) onSuccess(); 
    } catch (error) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(processedData.map((item, index) => ({
      No: index + 1,
      Customer: item.master_customer?.nama_customer,
      Promosi: item.jenis_promosi,
      Omset: `Rp ${Number(item.omset_perbulan).toLocaleString('id-ID')}`,
      Status: item.status_terakhir,
      Tanggal: new Date(item.tanggal_pengajuan).toLocaleDateString("id-ID")
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Status Pengajuan");
    XLSX.writeFile(workbook, "Status_Pengajuan_Promosi.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Laporan Status Pengajuan Promosi", 14, 15);
    const tableRows = processedData.map((item, index) => [
      index + 1,
      item.master_customer?.nama_customer,
      item.jenis_promosi,
      `Rp ${Number(item.omset_perbulan).toLocaleString('id-ID')}`,
      item.status_terakhir
    ]);
    doc.autoTable({ head: [["No", "Customer", "Promosi", "Omset Target", "Status"]], body: tableRows, startY: 20 });
    doc.save("Status_Pengajuan_Promosi.pdf");
  };

  const renderStatusBadge = (status) => {
    const badges = {
      "Disetujui": "bg-green-50 text-green-700 border-green-200",
      "Menunggu Review BusDev": "bg-orange-50 text-orange-700 border-orange-200",
      "Revisi Sales": "bg-red-50 text-red-700 border-red-200",
      "Ditolak": "bg-slate-100 text-slate-600 border-slate-300 opacity-90"
    };
    const icons = {
      "Disetujui": <CheckCircle2 size={14} />,
      "Menunggu Review BusDev": <Clock size={14} />,
      "Revisi Sales": <AlertCircle size={14} />,
      "Ditolak": <X size={14} />
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${badges[status] || 'bg-slate-100 text-slate-600'}`}>
        {icons[status]} {status === "Menunggu Review BusDev" ? "Review" : status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Menunggu Review", count: menungguBusDev.length, color: "orange", icon: <Clock size={20}/> },
          { label: "Telah Disetujui", count: disetujui.length, color: "green", icon: <CheckCircle2 size={20}/> },
          { label: "Perlu Direvisi", count: revisiSales.length, color: "red", icon: <AlertCircle size={20}/> },
          { label: "Ditolak", count: ditolak.length, color: "slate", icon: <X size={20}/> }
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
              <h4 className="text-3xl font-bold text-slate-800">{card.count}</h4>
            </div>
            <div className={`w-10 h-10 rounded-md bg-${card.color}-50 flex items-center justify-center text-${card.color}-600`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        
        {/* Header & Export */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-900" />
            <h3 className="text-xl font-bold text-slate-800">Daftar Pengajuan Promosi</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={exportToExcel} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button onClick={exportToPDF} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              <FileDown size={16} /> PDF
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col lg:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <input type="text" placeholder="Cari customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-900"/>
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="lg:w-40 bg-white border border-slate-300 rounded-md py-2 px-3 text-sm">
            {uniqueStatuses.map(s => <option key={s} value={s}>{s === 'Semua' ? 'Semua Status' : s}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="lg:w-44 bg-white border border-slate-300 rounded-md py-2 px-3 text-sm">
            <option value="terbaru">Terbaru</option>
            <option value="omset_tertinggi">Omset Tertinggi</option>
            <option value="nama_az">Nama A-Z</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Kategori & Promosi</th>
                <th className="py-3 px-4">Omset</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? currentRows.map((item, idx) => (
                <tr key={item.id_pengajuan} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${item.status_terakhir === "Ditolak" ? "bg-slate-50/50" : ""}`}>
                  <td className="py-3 px-4 text-slate-500">{indexOfFirstRow + idx + 1}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{item.master_customer?.nama_customer}</td>
                  <td className="py-3 px-4">
                    <span className="block text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border mb-1 w-fit">{item.kategori_program || "Reguler"}</span>
                    <p className="text-xs text-slate-500">{item.jenis_promosi}</p>
                  </td>
                  <td className="py-3 px-4 font-medium">Rp {Number(item.omset_perbulan).toLocaleString("id-ID")}</td>
                  <td className="py-3 px-4">{renderStatusBadge(item.status_terakhir)}</td>
                  
                  {/* AKSI HANYA ICON */}
                  <td className="py-3 px-4 flex justify-center gap-2">
                    <button 
                      onClick={() => bukaDetail(item)} 
                      className="p-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded transition-colors" 
                      title="Lihat Detail"
                    >
                      <Eye size={16} />
                    </button>
                    {item.status_terakhir === "Revisi Sales" && (
                      <button 
                        onClick={() => setModalEdit(item)} 
                        className="p-1.5 bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 rounded transition-colors" 
                        title="Edit / Perbaiki"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-10 text-slate-400"><Inbox size={32} className="mx-auto mb-2 opacity-20"/> Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {processedData.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span>Menampilkan {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, processedData.length)} dari {processedData.length} data</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border rounded disabled:opacity-30"><ChevronLeft size={18}/></button>
              <span className="font-medium text-slate-700">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border rounded disabled:opacity-30"><ChevronRight size={18}/></button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: DETAIL PENGAJUAN (Menampilkan SEMUA DATA) */}
      {/* ========================================================= */}
      {detailModalItem && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setDetailModalItem(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            <h4 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-200">
              Detail Pengajuan Promosi
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Kolom 1 (Data Umum & Waktu) */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Customer</p>
                  <p className="text-sm font-bold text-slate-800">{detailModalItem.master_customer?.nama_customer}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Produk Target</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Package size={14} className="text-slate-400" />
                    {detailModalItem.master_produk?.nama_produk}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tanggal Diajukan</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Calendar size={14} className="text-slate-400" />
                    {new Date(detailModalItem.tanggal_pengajuan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Durasi Program</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Clock size={14} className="text-slate-400" />
                    {new Date(detailModalItem.durasi_mulai).toLocaleDateString("id-ID")} - {new Date(detailModalItem.durasi_selesai).toLocaleDateString("id-ID")}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status Saat Ini</p>
                  {renderStatusBadge(detailModalItem.status_terakhir)}
                </div>
              </div>

              {/* Kolom 2 (Data Promosi & Finansial) */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Program & Benefit</p>
                  <div className="flex items-start gap-2 flex-col">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                      {detailModalItem.kategori_program || "Reguler"}
                    </span>
                    <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                      <Tag size={14} className="text-slate-400" /> 
                      {detailModalItem.jenis_promosi}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Target Omset & Kuantitas</p>
                  <p className="text-sm font-bold text-slate-800">
                    Rp {Number(detailModalItem.omset_perbulan).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {detailModalItem.kuantitas_produk} Item / Pcs
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calculator size={14} /> Estimasi Biaya Promosi
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    Rp {detailModalItem.estimasi_biaya.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Catatan Sales (Full Width) */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Keterangan / Catatan Sales</p>
                <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 text-sm text-slate-700 leading-relaxed">
                  <FileText size={16} className="inline-block mr-1.5 text-slate-400 -mt-0.5" />
                  {detailModalItem.keterangan_sales || <span className="italic text-slate-400">Tidak ada catatan tambahan.</span>}
                </div>
              </div>

              {/* Catatan Revisi BusDev (Jika Ada) */}
              {detailModalItem.catatan_revisi && (
                <div className="md:col-span-2 p-4 rounded-md bg-red-50 border border-red-200">
                  <p className="text-xs font-bold text-red-700 uppercase flex items-center gap-1.5 mb-2">
                    <AlertCircle size={16}/> Catatan Revisi BusDev
                  </p>
                  <p className="text-sm text-red-900 italic leading-relaxed">"{detailModalItem.catatan_revisi}"</p>
                </div>
              )}

              {/* Attachment Preview (Dokumen Lampiran) */}
              {detailModalItem.file_bukti_pendukung && (
                <div className="md:col-span-2 mt-2 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Dokumen Lampiran</p>
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    {detailModalItem.file_bukti_pendukung.match(/\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i) ? (
                      <div className="relative group shrink-0">
                        <img 
                          src={detailModalItem.file_bukti_pendukung} 
                          alt="Lampiran" 
                          className="h-24 w-32 object-cover rounded border border-slate-300 shadow-sm"
                        />
                        <a 
                          href={detailModalItem.file_bukti_pendukung} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium rounded transition-opacity backdrop-blur-sm"
                        >
                          Buka Penuh
                        </a>
                      </div>
                    ) : (
                      <div className="h-24 w-32 shrink-0 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-400 shadow-sm">
                        <FileText size={36} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">File Pendukung Promosi</p>
                      <p className="text-xs text-slate-500 mt-1 mb-3">Dokumen bukti yang dilampirkan untuk pengajuan ini.</p>
                      <a 
                        href={detailModalItem.file_bukti_pendukung} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-300 py-1.5 px-4 rounded-md text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-colors"
                      >
                        <Eye size={14}/> Buka Dokumen Utuh
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200 bg-white">
              <button 
                onClick={() => setDetailModalItem(null)} 
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
              {detailModalItem.status_terakhir === "Revisi Sales" && (
                <button 
                  onClick={() => { setModalEdit(detailModalItem); setDetailModalItem(null); }} 
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  <Edit3 size={16} /> Perbaiki Form
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT PENGAJUAN (Jika Direvisi)                   */}
      {/* ========================================================= */}
      {modalEdit && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <h4 className="text-xl font-bold mb-4">Perbaiki Pengajuan</h4>
            <p className="text-sm text-slate-500 mb-6">Silakan perbaiki data di bawah ini sesuai arahan catatan revisi dari BusDev.</p>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Usulan Promosi Baru</label>
                <input 
                  type="text" 
                  value={modalEdit.jenis_promosi} 
                  onChange={e => setModalEdit({...modalEdit, jenis_promosi: e.target.value})} 
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Target Omset Baru</label>
                  <input 
                    type="number" 
                    value={modalEdit.omset_perbulan} 
                    onChange={e => setModalEdit({...modalEdit, omset_perbulan: e.target.value})} 
                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" 
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Kuantitas Baru (Qty)</label>
                  <input 
                    type="number" 
                    value={modalEdit.kuantitas_produk} 
                    onChange={e => setModalEdit({...modalEdit, kuantitas_produk: e.target.value})} 
                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Durasi Mulai Baru</label>
                  <input 
                    type="date" 
                    value={modalEdit.durasi_mulai} 
                    onChange={e => setModalEdit({...modalEdit, durasi_mulai: e.target.value})} 
                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" 
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Durasi Selesai Baru</label>
                  <input 
                    type="date" 
                    value={modalEdit.durasi_selesai} 
                    onChange={e => setModalEdit({...modalEdit, durasi_selesai: e.target.value})} 
                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" 
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Keterangan Perbaikan</label>
                <textarea 
                  value={modalEdit.keterangan_sales} 
                  onChange={e => setModalEdit({...modalEdit, keterangan_sales: e.target.value})} 
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none" 
                  rows="3" 
                  placeholder="Jelaskan perbaikan yang Anda lakukan..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button type="button" onClick={() => setModalEdit(null)} className="px-4 py-2 border rounded-md text-sm font-medium">Batal</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-900 text-white rounded-md text-sm font-medium">{isLoading ? "Memproses..." : "Kirim Revisi"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
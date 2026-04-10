import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  BarChart2, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  Inbox, FileSpreadsheet, Calendar
} from 'lucide-react';

import * as XLSX from 'xlsx';

export default function Reporting() {
  const [laporanData, setLaporanData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // State Fitur: Search, Filter, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [startDate, setStartDate] = useState(""); // Filter Tanggal Awal
  const [endDate, setEndDate] = useState("");     // Filter Tanggal Akhir
  const [sortBy, setSortBy] = useState("terbaru");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchLaporan = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('trx_pengajuan_promosi')
        .select(`
          *,
          master_users:id_sales (nama_lengkap),
          master_customer (nama_customer),
          master_produk (nama_produk)
        `)
        .order('tanggal_pengajuan', { ascending: false });

      if (error) throw error;
      setLaporanData(data || []);
    } catch (error) {
      toast.error('Gagal mengambil data laporan.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporan();
  }, []);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterKategori, startDate, endDate, sortBy]);

  const uniqueStatuses = ["Semua", ...Array.from(new Set(laporanData.map(item => item.status_terakhir)))];
  const uniqueCategories = ["Semua", ...Array.from(new Set(laporanData.map(item => item.kategori_program || 'Reguler')))];

  const hitungEstimasiBiaya = (omset, jenis_promosi) => {
    if (!omset || !jenis_promosi) return 0;
    const match = jenis_promosi.match(/(\d+)%/);
    const persentase = match ? parseInt(match[1]) : 0;
    return (Number(omset) * persentase) / 100;
  };

  // --- LOGIKA PENGOLAHAN DATA ---
  let processedData = [...laporanData];

  // Filter Search
  if (searchQuery) {
    processedData = processedData.filter(item => 
      item.master_customer?.nama_customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.master_users?.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jenis_promosi?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Filter Kategori & Status
  if (filterStatus !== "Semua") processedData = processedData.filter(item => item.status_terakhir === filterStatus);
  if (filterKategori !== "Semua") processedData = processedData.filter(item => (item.kategori_program || 'Reguler') === filterKategori);

  // Filter Rentang Waktu (Tanggal)
  if (startDate) {
    processedData = processedData.filter(item => item.tanggal_pengajuan >= startDate);
  }
  if (endDate) {
    processedData = processedData.filter(item => item.tanggal_pengajuan <= endDate);
  }

  // Sort Data
  processedData.sort((a, b) => {
    if (sortBy === "terbaru") return new Date(b.tanggal_pengajuan) - new Date(a.tanggal_pengajuan);
    if (sortBy === "terlama") return new Date(a.tanggal_pengajuan) - new Date(b.tanggal_pengajuan);
    if (sortBy === "omset_tertinggi") return b.omset_perbulan - a.omset_perbulan;
    if (sortBy === "omset_terendah") return a.omset_perbulan - b.omset_perbulan;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  // --- FUNGSI EXPORT EXCEL ---
  const exportToExcel = () => {
    if (processedData.length === 0) {
      toast.error('Tidak ada data untuk diekspor pada rentang waktu ini.');
      return;
    }

    const worksheetData = processedData.map((item, index) => ({
      No: index + 1,
      Tanggal: new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID'),
      Sales: item.master_users?.nama_lengkap,
      Customer: item.master_customer?.nama_customer,
      Produk: item.master_produk?.nama_produk,
      Kategori: item.kategori_program || 'Reguler',
      Promosi: item.jenis_promosi,
      Omset: item.omset_perbulan,
      Estimasi_Biaya: hitungEstimasiBiaya(item.omset_perbulan, item.jenis_promosi),
      Status: item.status_terakhir
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    
    // Penamaan file dinamis jika ada filter tanggal
    let fileName = "Laporan_Semua_Promosi.xlsx";
    if (startDate && endDate) fileName = `Laporan_Promosi_${startDate}_sampai_${endDate}.xlsx`;
    else if (startDate) fileName = `Laporan_Promosi_dari_${startDate}.xlsx`;
    else if (endDate) fileName = `Laporan_Promosi_sampai_${endDate}.xlsx`;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Promosi");
    XLSX.writeFile(workbook, fileName);
    toast.success('Laporan berhasil diunduh!');
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    const badges = {
      "Disetujui": "bg-green-50 text-green-700 border-green-200",
      "Menunggu Review BusDev": "bg-orange-50 text-orange-700 border-orange-200",
      "Revisi Sales": "bg-red-50 text-red-700 border-red-200",
      "Ditolak": "bg-slate-100 text-slate-700 border-slate-300"
    };
    return (
      <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold border ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {status === "Menunggu Review BusDev" ? "Review" : status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
      
      {/* Header & Export Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={24} className="text-blue-900" />
            <h2 className="text-xl font-bold text-slate-800">Laporan Pengajuan</h2>
          </div>
          <p className="text-sm text-slate-500">Rekapitulasi seluruh data pengajuan promosi dari semua tim Sales.</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={exportToExcel} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            <FileSpreadsheet size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Kontrol Filter, Search, Sort */}
      <div className="flex flex-col xl:flex-row gap-3 border-y border-slate-100 py-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Cari customer, sales, atau promosi..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-900 outline-none transition-all" 
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Filter Tanggal */}
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-2 focus-within:ring-2 focus-within:ring-blue-900 focus-within:border-transparent transition-all">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              title="Dari Tanggal"
              className="py-2 text-sm text-slate-600 outline-none cursor-pointer bg-transparent"
            />
            <span className="text-slate-300">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              title="Sampai Tanggal"
              className="py-2 text-sm text-slate-600 outline-none cursor-pointer bg-transparent"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="relative w-full sm:w-32">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none appearance-none cursor-pointer">
              {uniqueStatuses.map(s => <option key={s} value={s}>{s === 'Semua' ? 'Semua Status' : s}</option>)}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>

          <div className="relative w-full sm:w-36">
            <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none appearance-none cursor-pointer">
              {uniqueCategories.map(c => <option key={c} value={c}>{c === 'Semua' ? 'Semua Kategori' : c}</option>)}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>

          <div className="relative w-full sm:w-36">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none appearance-none cursor-pointer">
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="omset_tertinggi">Omset Tertinggi</option>
              <option value="omset_terendah">Omset Terendah</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>
      </div>

      {/* Tabel Data Rekap */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
              <th className="py-3 px-4">Tgl & Sales</th>
              <th className="py-3 px-4">Customer & Kategori</th>
              <th className="py-3 px-4">Promosi & Produk</th>
              <th className="py-3 px-4">Target & Biaya</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
               <tr><td colSpan="5" className="text-center py-10 text-slate-500">Memuat data laporan...</td></tr>
            ) : currentRows.length > 0 ? (
              currentRows.map((item) => (
              <tr key={item.id_pengajuan} className="border-b border-slate-100 hover:bg-slate-50 transition-colors align-top">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-800 text-xs">
                    {new Date(item.tanggal_pengajuan).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{item.master_users?.nama_lengkap}</div>
                </td>
                <td className="py-3 px-4">
                  <p className="font-medium text-slate-800">{item.master_customer?.nama_customer}</p>
                  <span className="inline-block px-1.5 py-0.5 mt-1 rounded bg-slate-100 text-slate-600 text-[10px] border border-slate-200 font-medium">
                    {item.kategori_program || 'Reguler'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <p className="font-medium text-slate-800">{item.jenis_promosi}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]" title={item.master_produk?.nama_produk}>
                    {item.master_produk?.nama_produk}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <p className="font-semibold text-slate-800 text-xs">Rp {Number(item.omset_perbulan).toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-blue-700 font-bold mt-1 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                    Est: Rp {hitungEstimasiBiaya(item.omset_perbulan, item.jenis_promosi).toLocaleString('id-ID')}
                  </p>
                </td>
                <td className="py-3 px-4 text-center">
                  {renderStatusBadge(item.status_terakhir)}
                </td>
              </tr>
            ))) : (
              <tr>
                <td colSpan="5" className="text-center py-12">
                  <div className="flex flex-col items-center text-slate-400">
                    <Inbox size={40} className="mb-2 opacity-30" />
                    <p className="text-sm font-medium">Tidak ada data laporan ditemukan.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {processedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
          <span>Menampilkan <span className="font-bold text-slate-700">{indexOfFirstRow + 1}</span> - <span className="font-bold text-slate-700">{Math.min(indexOfLastRow, processedData.length)}</span> dari <span className="font-bold text-slate-700">{processedData.length}</span> pengajuan</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={18}/>
            </button>
            <span className="font-medium text-slate-700 px-2">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-slate-50 transition-colors">
              <ChevronRight size={18}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
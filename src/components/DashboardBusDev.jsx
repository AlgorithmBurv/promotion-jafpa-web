import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  X, CheckCircle, AlertCircle, Search, Inbox, Calculator, 
  Eye, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  Calendar, Package, Tag, Clock, CheckSquare
} from 'lucide-react';

export default function DashboardBusDev({ currentUser, daftarPengajuan, onSuccess }) {
  const menungguReview = daftarPengajuan.filter(p => p.status_terakhir === 'Menunggu Review BusDev');
  
  const [actionModal, setActionModal] = useState({ isOpen: false, type: '', id_pengajuan: null, catatan: '' });
  const [detailModalItem, setDetailModalItem] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State untuk Bulk Action
  const [selectedItems, setSelectedItems] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [sortBy, setSortBy] = useState('terbaru');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const uniqueCategories = ['Semua', ...Array.from(new Set(menungguReview.map(item => item.kategori_program || 'Reguler')))];

  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems([]); // Reset selection kalau halaman ganti filter
  }, [searchQuery, filterKategori, sortBy]);

  let processedData = [...menungguReview];
  if (searchQuery) {
    processedData = processedData.filter(item => 
      item.master_customer?.nama_customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.jenis_promosi?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  if (filterKategori !== 'Semua') {
    processedData = processedData.filter(item => (item.kategori_program || 'Reguler') === filterKategori);
  }

  processedData.sort((a, b) => {
    if (sortBy === 'terbaru') return new Date(b.tanggal_pengajuan) - new Date(a.tanggal_pengajuan);
    if (sortBy === 'omset_tertinggi') return b.omset_perbulan - a.omset_perbulan;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const hitungEstimasiBiaya = (omset, jenis_promosi) => {
    if (!omset || !jenis_promosi) return 0;
    const match = jenis_promosi.match(/(\d+)%/);
    const persentase = match ? parseInt(match[1]) : 0;
    return (Number(omset) * persentase) / 100;
  };

  // --- LOGIKA BULK ACTION (Checkbox) ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(currentRows.map(item => item.id_pengajuan));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleBulkApprove = async () => {
    if (!window.confirm(`Setujui ${selectedItems.length} pengajuan sekaligus?`)) return;
    setIsProcessing(true);
    try {
      // Update status batch
      const { error: updateError } = await supabase
        .from('trx_pengajuan_promosi')
        .update({ status_terakhir: 'Disetujui' })
        .in('id_pengajuan', selectedItems);
      if (updateError) throw updateError;

      // Insert log batch
      const logData = selectedItems.map(id => ({
        id_pengajuan: id,
        id_reviewer: currentUser.id_user,
        tindakan: 'Setuju',
        catatan_reviewer: 'Disetujui massal oleh BusDev'
      }));
      const { error: logError } = await supabase.from('log_riwayat_approval').insert(logData);
      if (logError) throw logError;

      toast.success(`${selectedItems.length} pengajuan berhasil disetujui!`);
      setSelectedItems([]);
      onSuccess();
    } catch (error) {
      toast.error(`Gagal menyetujui massal: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Standard Action handler (untuk satu baris)
  const openActionModal = (id_pengajuan, type) => setActionModal({ isOpen: true, type, id_pengajuan, catatan: '' });
  
  const submitAction = async () => {
    setIsProcessing(true);
    const { id_pengajuan, type, catatan } = actionModal;
    
    if ((type === 'Revisi Sales' || type === 'Ditolak') && !catatan.trim()) {
      toast.error(`Catatan ${type === 'Ditolak' ? 'penolakan' : 'revisi'} wajib diisi!`);
      setIsProcessing(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.from('trx_pengajuan_promosi').update({ status_terakhir: type }).eq('id_pengajuan', id_pengajuan);
      if (updateError) throw updateError;

      let tindakanLog = 'Revisi';
      if (type === 'Disetujui') tindakanLog = 'Setuju';
      if (type === 'Ditolak') tindakanLog = 'Tolak';

      const { error: logError } = await supabase.from('log_riwayat_approval').insert([{
        id_pengajuan, 
        id_reviewer: currentUser.id_user, 
        tindakan: tindakanLog,
        catatan_reviewer: type === 'Disetujui' ? 'Disetujui oleh BusDev' : catatan
      }]);
      if (logError) throw logError;

      toast.success(`Pengajuan berhasil diproses (${type})!`);
      setActionModal({ isOpen: false, type: '', id_pengajuan: null, catatan: '' });
      setDetailModalItem(null); 
      onSuccess(); 
    } catch (error) {
      toast.error(`Gagal memproses: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
      
      {/* Header & Bulk Action Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Daftar Review Promosi</h3>
          <p className="text-sm text-slate-500 mt-1">Review dan tindak lanjuti pengajuan promosi dari tim Sales.</p>
        </div>
        
        {/* Tombol Aksi Massal muncul jika ada yang di-checklist */}
        <div className="flex items-center gap-2 h-10">
          {selectedItems.length > 0 && (
            <button 
              onClick={handleBulkApprove} 
              disabled={isProcessing}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-md transition-all animate-in fade-in slide-in-from-top-2"
            >
              <CheckSquare size={16} /> Setujui Terpilih ({selectedItems.length})
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 border-y border-slate-100 py-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
          <input type="text" placeholder="Cari customer atau promosi..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-900 outline-none" />
        </div>
        <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="w-full md:w-48 bg-white border rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-900 outline-none cursor-pointer appearance-none">
          {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === 'Semua' ? 'Semua Kategori' : cat}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
              <th className="py-3 px-4 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={currentRows.length > 0 && selectedItems.length === currentRows.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="py-3 px-2">Customer & Promosi</th>
              <th className="py-3 px-4">Omset & Qty </th>
              <th className="py-3 px-4 text-blue-900"><div className="flex items-center gap-1"><Calculator size={14}/> Est. Biaya</div></th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? currentRows.map((item) => {
              const biaya = hitungEstimasiBiaya(item.omset_perbulan, item.jenis_promosi);
              const isChecked = selectedItems.includes(item.id_pengajuan);
              
              return (
              <tr key={item.id_pengajuan} className={`border-b border-slate-100 transition-colors ${isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                <td className="py-3 px-4 text-center">
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => handleSelectItem(item.id_pengajuan)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="py-3 px-2">
                  <p className="font-semibold text-slate-800">{item.master_customer?.nama_customer}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.jenis_promosi}</p>
                </td>
                <td className="py-3 px-4 text-slate-700">
                  <p className="font-medium">Rp {Number(item.omset_perbulan).toLocaleString('id-ID')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Qty: {item.kuantitas_produk} Item</p>
                </td>
                <td className="py-3 px-4 font-bold text-blue-900">
                  Rp {biaya.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-4 flex items-center justify-center gap-2">
                  <button onClick={() => setDetailModalItem({ ...item, estimasi_biaya: biaya })} className="p-1.5 border rounded hover:bg-slate-50" title="Detail"><Eye size={16}/></button>
                  <button onClick={() => openActionModal(item.id_pengajuan, 'Disetujui')} className="p-1.5 border border-green-600 text-green-700 hover:bg-green-50 rounded" title="Setuju"><CheckCircle size={16}/></button>
                  <button onClick={() => openActionModal(item.id_pengajuan, 'Revisi Sales')} className="p-1.5 border border-yellow-500 text-yellow-700 hover:bg-yellow-50 rounded" title="Revisi"><AlertCircle size={16}/></button>
                  <button onClick={() => openActionModal(item.id_pengajuan, 'Ditolak')} className="p-1.5 border border-red-600 text-red-700 hover:bg-red-50 rounded" title="Tolak"><X size={16}/></button>
                </td>
              </tr>
            )}) : (
              <tr><td colSpan="5" className="text-center py-10 text-slate-400"><Inbox size={32} className="mx-auto mb-2 opacity-20" />Tidak ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {processedData.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t text-sm">
          <span className="text-slate-500">
            Menampilkan <span className="font-semibold text-slate-700">{indexOfFirstRow + 1}</span> - <span className="font-semibold text-slate-700">{Math.min(indexOfLastRow, processedData.length)}</span> dari <span className="font-semibold text-slate-700">{processedData.length}</span> data
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border rounded-md disabled:opacity-50 transition-colors"><ChevronLeft size={18} /></button>
            <span className="font-medium text-slate-700">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border rounded-md disabled:opacity-50 transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {detailModalItem && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setDetailModalItem(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h4 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b">Detail Pengajuan</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Customer</p><p className="text-sm font-bold text-slate-800">{detailModalItem.master_customer?.nama_customer}</p></div>
                <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Diajukan</p><div className="flex items-center gap-1.5 text-sm text-slate-700"><Calendar size={14} className="text-slate-400" />{new Date(detailModalItem.tanggal_pengajuan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
                <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Durasi Program</p><div className="flex items-center gap-1.5 text-sm text-slate-700"><Clock size={14} className="text-slate-400" />{new Date(detailModalItem.durasi_mulai).toLocaleDateString('id-ID')} - {new Date(detailModalItem.durasi_selesai).toLocaleDateString('id-ID')}</div></div>
                <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Produk</p><div className="flex items-center gap-1.5 text-sm text-slate-700"><Package size={14} className="text-slate-400" />{detailModalItem.master_produk?.nama_produk}</div></div>
              </div>
              <div className="space-y-4">
                <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Program & Benefit</p><div className="flex items-start gap-2 flex-col"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">{detailModalItem.kategori_program || 'Reguler'}</span><p className="text-sm font-medium flex items-center gap-1.5"><Tag size={14} className="text-slate-400" /> {detailModalItem.jenis_promosi}</p></div></div>
                <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Target</p><p className="text-sm font-bold">Rp {Number(detailModalItem.omset_perbulan).toLocaleString('id-ID')}</p><p className="text-xs text-slate-500">{detailModalItem.kuantitas_produk} Item</p></div>
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100"><p className="text-xs font-bold text-blue-800 uppercase flex items-center gap-1.5 mb-1"><Calculator size={14} /> Est. Biaya</p><p className="text-lg font-bold text-blue-900">Rp {detailModalItem.estimasi_biaya.toLocaleString('id-ID')}</p></div>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Catatan Sales</p>
                <div className="bg-slate-50 p-3.5 rounded-md border text-sm text-slate-700 leading-relaxed"><FileText size={16} className="inline-block mr-1.5 text-slate-400 -mt-0.5" />{detailModalItem.keterangan_sales || <span className="italic text-slate-400">Tidak ada catatan.</span>}</div>
              </div>

              {detailModalItem.file_bukti_pendukung && (
                <div className="md:col-span-2 mt-2 pt-4 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Dokumen Lampiran</p>
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-slate-50 rounded-lg border">
                    {detailModalItem.file_bukti_pendukung.match(/\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i) ? (
                      <div className="relative group shrink-0">
                        <img src={detailModalItem.file_bukti_pendukung} alt="Lampiran" className="h-24 w-32 object-cover rounded border shadow-sm" />
                        <a href={detailModalItem.file_bukti_pendukung} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded text-white text-xs font-medium">Buka</a>
                      </div>
                    ) : (
                      <div className="h-24 w-32 shrink-0 flex items-center justify-center bg-white rounded border text-slate-400"><FileText size={36} /></div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">File Pendukung</p>
                      <p className="text-xs text-slate-500 mt-1 mb-3">Lampiran bukti pendukung pengajuan.</p>
                      <a href={detailModalItem.file_bukti_pendukung} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-white border py-1.5 px-4 rounded-md text-xs font-bold transition-all shadow-sm hover:bg-slate-100"><Eye size={14} /> Lihat File</a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 mt-8 pt-5 border-t">
              <button onClick={() => setDetailModalItem(null)} className="bg-white border text-slate-700 py-2 px-4 rounded-md text-sm transition-colors hover:bg-slate-50">Tutup</button>
              <button onClick={() => openActionModal(detailModalItem.id_pengajuan, 'Ditolak')} className="bg-red-600 text-white py-2 px-4 rounded-md text-sm transition-colors hover:bg-red-700">Tolak</button>
              <button onClick={() => openActionModal(detailModalItem.id_pengajuan, 'Revisi Sales')} className="bg-yellow-500 text-slate-900 py-2 px-4 rounded-md text-sm transition-colors hover:bg-yellow-600">Revisi</button>
              <button onClick={() => openActionModal(detailModalItem.id_pengajuan, 'Disetujui')} className="bg-green-600 text-white py-2 px-4 rounded-md text-sm transition-colors hover:bg-green-700">Setujui</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Action */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setActionModal({isOpen: false, type: '', id_pengajuan: null, catatan: ''})} className="absolute top-4 right-4 text-slate-400"><X size={20} /></button>
            <h4 className="text-lg font-bold text-slate-800 mb-2">{actionModal.type === 'Disetujui' ? 'Konfirmasi Persetujuan' : actionModal.type === 'Ditolak' ? 'Tolak Pengajuan' : 'Catatan Revisi'}</h4>
            {(actionModal.type === 'Revisi Sales' || actionModal.type === 'Ditolak') ? (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Alasan <span className="text-red-500">*</span></label>
                <textarea rows="3" value={actionModal.catatan} onChange={(e) => setActionModal({...actionModal, catatan: e.target.value})} className="w-full border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" placeholder="Ketik alasan..." />
              </div>
            ) : <p className="text-slate-600 text-sm mt-2">Setujui pengajuan promosi ini?</p>}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setActionModal({isOpen: false, type: '', id_pengajuan: null, catatan: ''})} className="border py-2 px-4 rounded-md text-sm hover:bg-slate-50">Batal</button>
              <button onClick={submitAction} disabled={isProcessing} className={`py-2 px-4 rounded-md text-sm text-white disabled:opacity-70 min-w-[100px] ${actionModal.type === 'Disetujui' ? 'bg-blue-900' : actionModal.type === 'Ditolak' ? 'bg-red-600' : 'bg-yellow-500 !text-slate-900'}`}>{isProcessing ? 'Proses...' : 'Konfirmasi'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
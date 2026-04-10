import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  Tags, PlusCircle, Save, FileX, CheckCircle, XCircle, 
  Edit, Trash2, X, Search, Filter, ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function ManajemenPromosi({ currentUser }) {
  const [promosiList, setPromosiList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // State Fitur Baru: Search, Filter Status, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [formData, setFormData] = useState({
    nama_promosi: '',
    syarat_ketentuan: '',
    is_active: true
  });

  const isAdmin = currentUser?.role === 'Admin';

  const fetchPromosi = async () => {
    try {
      let query = supabase.from('master_promosi').select('*').order('created_at', { ascending: false });
      
      if (!isAdmin) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPromosiList(data || []);
    } catch (error) {
      console.error('Error fetching promosi:', error.message);
    }
  };

  useEffect(() => {
    fetchPromosi();
  }, [isAdmin]);

  // Reset pagination jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterActive]);

  // --- LOGIKA PENGOLAHAN DATA ---
  let processedData = [...promosiList];

  if (searchQuery) {
    processedData = processedData.filter(item => 
      item.nama_promosi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.syarat_ketentuan.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (isAdmin && filterActive !== "Semua") {
    const targetStatus = filterActive === "Aktif";
    processedData = processedData.filter(item => item.is_active === targetStatus);
  }

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ nama_promosi: '', syarat_ketentuan: '', is_active: true });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('master_promosi').update({
          nama_promosi: formData.nama_promosi,
          syarat_ketentuan: formData.syarat_ketentuan
        }).eq('id_promosi', editingId);
        
        if (error) throw error;
        toast.success('Data promosi berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('master_promosi').insert([formData]);
        if (error) throw error;
        toast.success('Promosi baru berhasil ditambahkan.');
      }
      
      resetForm();
      fetchPromosi();
    } catch (error) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id_promosi);
    setFormData({
      nama_promosi: item.nama_promosi,
      syarat_ketentuan: item.syarat_ketentuan,
      is_active: item.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus promosi ini secara permanen?')) return;
    try {
      const { error } = await supabase.from('master_promosi').delete().eq('id_promosi', id);
      if (error) throw error;
      toast.success('Promosi dihapus!');
      fetchPromosi();
    } catch (error) {
      toast.error(`Gagal menghapus: ${error.message}`);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('master_promosi').update({ is_active: !currentStatus }).eq('id_promosi', id);
      if (error) throw error;
      toast.success('Status diperbarui!');
      fetchPromosi();
    } catch (error) {
      toast.error(`Gagal: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* FORM SECTION (ADMIN ONLY) */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="mb-6 border-b border-slate-200 pb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-blue-900" />
            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Promosi' : 'Tambah Promosi'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Promosi</label>
              <input type="text" name="nama_promosi" value={formData.nama_promosi} onChange={handleChange} required className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-900 outline-none transition-all" placeholder="Contoh: Diskon 5%" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Syarat & Ketentuan</label>
              <textarea name="syarat_ketentuan" value={formData.syarat_ketentuan} onChange={handleChange} required rows="3" className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-900 outline-none transition-all resize-none" placeholder="Detail syarat..."></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              {editingId && <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-md text-sm hover:bg-slate-50 transition-colors">Batal</button>}
              <button type="submit" disabled={isLoading} className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">{isLoading ? 'Proses...' : 'Simpan Promosi'}</button>
            </div>
          </form>
        </div>
      )}

      {/* LIST SECTION */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Tags size={20} className="text-blue-900" />
          <h2 className="text-xl font-bold text-slate-800">Daftar Promosi</h2>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <input type="text" placeholder="Cari nama atau syarat..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-900 outline-none transition-all" />
          </div>
          {isAdmin && (
            <div className="relative md:w-44">
              <Filter className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
              <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-900 outline-none appearance-none cursor-pointer transition-all">
                <option value="Semua">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4 w-1/4">Nama Promosi</th>
                <th className="py-3 px-4 w-1/2">Syarat & Ketentuan</th>
                {isAdmin && <th className="py-3 px-4">Status</th>}
                {isAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? currentRows.map((item) => (
                <tr key={item.id_promosi} className="border-b border-slate-100 hover:bg-slate-50 transition-colors align-top">
                  <td className="py-3 px-4 font-medium text-slate-800">{item.nama_promosi}</td>
                  <td className="py-3 px-4 text-slate-600 leading-relaxed">{item.syarat_ketentuan}</td>
                  {isAdmin && (
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${item.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {item.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                  )}
                  {isAdmin && (
                    <td className="py-3 px-4 flex items-center justify-center gap-2 flex-wrap">
                      <button onClick={() => toggleStatus(item.id_promosi, item.is_active)} className="p-1.5 border rounded hover:bg-slate-50 transition-colors" title={item.is_active ? "Nonaktifkan" : "Aktifkan"}>
                        {item.is_active ? <XCircle size={16} className="text-red-600"/> : <CheckCircle size={16} className="text-green-600"/>}
                      </button>
                      <button onClick={() => handleEdit(item)} className="p-1.5 border rounded hover:bg-slate-50 transition-colors text-blue-700" title="Edit"><Edit size={16}/></button>
                      <button onClick={() => handleDelete(item.id_promosi)} className="p-1.5 border rounded hover:bg-red-50 hover:text-red-700 transition-colors" title="Hapus"><Trash2 size={16}/></button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={isAdmin ? 4 : 2} className="text-center py-12"><FileX size={40} className="mx-auto mb-2 opacity-20" /><p className="text-sm opacity-50">Belum ada data promosi.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {processedData.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span>Menampilkan {currentPage} - {totalPages} dari {processedData.length} data</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border rounded disabled:opacity-30"><ChevronLeft size={18}/></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border rounded disabled:opacity-30"><ChevronRight size={18}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
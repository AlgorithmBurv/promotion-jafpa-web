import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Package, Save, Edit, Trash2, X, Search, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export default function ManajemenProduk() {
  const [produk, setProduk] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // State Fitur Baru: Search, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("terbaru");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [formData, setFormData] = useState({
    nama_produk: ''
  });

  const fetchProduk = async () => {
    try {
      const { data, error } = await supabase
        .from('master_produk')
        .select('*')
        .order('id_produk', { ascending: false });
      if (error) throw error;
      setProduk(data || []);
    } catch (error) {
      toast.error('Gagal mengambil data produk.');
    }
  };

  useEffect(() => {
    fetchProduk();
  }, []);

  // Reset pagination ke halaman 1 saat pencarian atau pengurutan berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  // --- LOGIKA PROSES DATA (Search & Sort) ---
  let processedData = [...produk];

  if (searchQuery) {
    processedData = processedData.filter(item => 
      item.nama_produk.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id_produk.toString().includes(searchQuery)
    );
  }

  processedData.sort((a, b) => {
    if (sortBy === "terbaru") return b.id_produk - a.id_produk;
    if (sortBy === "terlama") return a.id_produk - b.id_produk;
    if (sortBy === "nama_az") return a.nama_produk.localeCompare(b.nama_produk);
    if (sortBy === "nama_za") return b.nama_produk.localeCompare(a.nama_produk);
    return 0;
  });

  // --- LOGIKA PAGINATION ---
  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ nama_produk: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('master_produk').update(formData).eq('id_produk', editingId);
        if (error) throw error;
        toast.success('Data produk berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('master_produk').insert([formData]);
        if (error) throw error;
        toast.success('Produk baru berhasil ditambahkan.');
      }
      resetForm();
      fetchProduk();
    } catch (error) {
      toast.error(`Gagal menyimpan produk: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id_produk);
    setFormData({ nama_produk: item.nama_produk });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    
    try {
      const { error } = await supabase.from('master_produk').delete().eq('id_produk', id);
      if (error) throw error;
      toast.success('Produk berhasil dihapus!');
      fetchProduk();
    } catch (error) {
      toast.error(`Gagal menghapus produk (Mungkin sedang digunakan di tabel pengajuan).`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-blue-900" />
            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Produk' : 'Tambah Produk'}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Produk</label>
            <input 
              type="text" 
              name="nama_produk" 
              value={formData.nama_produk} 
              onChange={handleChange} 
              required 
              placeholder="Contoh: Sosis Kanzler Original 500g" 
              className="w-full bg-white border border-slate-300 rounded-md py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all" 
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {editingId && (
              <button type="button" onClick={resetForm} className="flex-1 md:flex-none inline-flex items-center justify-center bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-2.5 px-4 rounded-md text-sm transition-colors">
                <X size={16} className="mr-1" /> Batal
              </button>
            )}
            <button type="submit" disabled={isLoading} className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-medium py-2.5 px-6 rounded-md text-sm transition-colors disabled:opacity-50">
              <Save size={16} /> {editingId ? 'Update Produk' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Daftar Produk</h2>
          <p className="text-sm text-slate-500 mt-1">Kelola master data produk Japfa Food.</p>
        </div>

        {/* ----- Fitur Kontrol: Search & Sort ----- */}
        <div className="flex flex-col md:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Cari nama atau ID produk..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all" 
            />
          </div>

          <div className="relative w-full md:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <ArrowUpDown size={16} />
            </div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 appearance-none cursor-pointer transition-all"
            >
              <option value="terbaru">Input Terbaru</option>
              <option value="terlama">Input Terlama</option>
              <option value="nama_az">Nama A - Z</option>
              <option value="nama_za">Nama Z - A</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4 w-20">ID</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4 text-center w-40">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map(p => (
                  <tr key={p.id_produk} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono">#{p.id_produk}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{p.nama_produk}</td>
                    <td className="py-3 px-4 flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(p)} 
                        className="inline-flex items-center gap-1 bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded text-xs font-medium transition-colors"
                        title="Edit Produk"
                      >
                        <Edit size={14}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id_produk)} 
                        className="inline-flex items-center gap-1 bg-white border border-red-600 text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded text-xs font-medium transition-colors"
                        title="Hapus Produk"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-12">
                    <div className="flex flex-col items-center text-slate-400">
                      <Inbox size={40} className="mb-2 opacity-20" />
                      <p className="text-sm">Tidak ada produk yang ditemukan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ----- Pagination Controls ----- */}
        {processedData.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Menampilkan <span className="font-semibold text-slate-700">{indexOfFirstRow + 1}</span> - <span className="font-semibold text-slate-700">{Math.min(indexOfLastRow, processedData.length)}</span> dari <span className="font-semibold text-slate-700">{processedData.length}</span> produk
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1 px-2">
                <span className="font-medium text-slate-700">{currentPage}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-500">{totalPages}</span>
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
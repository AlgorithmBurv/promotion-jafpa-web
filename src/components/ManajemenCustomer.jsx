import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  Users, UserPlus, Save, Edit, Trash2, X, AlertCircle, 
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Inbox 
} from 'lucide-react';

export default function ManajemenCustomer() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // State Fitur: Search, Filter, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKestabilan, setFilterKestabilan] = useState("Semua");
  const [filterPembayaran, setFilterPembayaran] = useState("Semua");
  const [sortBy, setSortBy] = useState("terbaru");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [formData, setFormData] = useState({
    nama_customer: '',
    kestabilan: 'Sedang',
    status_pembayaran: 'Lancar',
    lama_bekerjasama_tahun: 0
  });

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('master_customer')
        .select('*')
        .order('id_customer', { ascending: false });
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      toast.error('Gagal mengambil data customer.');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Reset ke halaman 1 jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterKestabilan, filterPembayaran, sortBy]);

  // --- LOGIKA PENGOLAHAN DATA ---
  let processedData = [...customers];

  if (searchQuery) {
    processedData = processedData.filter(c => 
      c.nama_customer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (filterKestabilan !== "Semua") {
    processedData = processedData.filter(c => c.kestabilan === filterKestabilan);
  }

  if (filterPembayaran !== "Semua") {
    processedData = processedData.filter(c => c.status_pembayaran === filterPembayaran);
  }

  processedData.sort((a, b) => {
    if (sortBy === "terbaru") return b.id_customer - a.id_customer;
    if (sortBy === "nama_az") return a.nama_customer.localeCompare(b.nama_customer);
    if (sortBy === "kerjasama_lama") return b.lama_bekerjasama_tahun - a.lama_bekerjasama_tahun;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  // --- HANDLERS ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ nama_customer: '', kestabilan: 'Sedang', status_pembayaran: 'Lancar', lama_bekerjasama_tahun: 0 });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('master_customer').update(formData).eq('id_customer', editingId);
        if (error) throw error;
        toast.success('Data customer berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('master_customer').insert([formData]);
        if (error) throw error;
        toast.success('Customer baru berhasil ditambahkan.');
      }
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(`Gagal menyimpan customer: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id_customer);
    setFormData({
      nama_customer: customer.nama_customer,
      kestabilan: customer.kestabilan || 'Sedang',
      status_pembayaran: customer.status_pembayaran || 'Lancar',
      lama_bekerjasama_tahun: customer.lama_bekerjasama_tahun || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus customer ini? (Pastikan tidak ada data pengajuan yang terikat)')) return;
    try {
      const { error } = await supabase.from('master_customer').delete().eq('id_customer', id);
      if (error) throw error;
      toast.success('Customer berhasil dihapus!');
      fetchCustomers();
    } catch (error) {
      toast.error(`Gagal menghapus data.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* FORM SECTION */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-blue-900" />
            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Customer' : 'Tambah Customer'}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Customer</label>
            <input type="text" name="nama_customer" value={formData.nama_customer} onChange={handleChange} required placeholder="Contoh: PT ABC Makmur" className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lama Bekerjasama (Tahun)</label>
            <input type="number" name="lama_bekerjasama_tahun" value={formData.lama_bekerjasama_tahun} onChange={handleChange} min="0" required className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kestabilan Usaha</label>
            <select name="kestabilan" value={formData.kestabilan} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all">
              <option value="Sangat Baik">Sangat Baik</option>
              <option value="Baik">Baik</option>
              <option value="Sedang">Sedang</option>
              <option value="Kurang">Kurang</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status Pembayaran</label>
            <select name="status_pembayaran" value={formData.status_pembayaran} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all">
              <option value="Lancar">Lancar</option>
              <option value="Tersendat">Tersendat</option>
              <option value="Macet">Macet</option>
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-5 mt-2 border-t border-slate-200">
            {editingId && (
              <button type="button" onClick={resetForm} className="inline-flex items-center justify-center bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 px-4 rounded-md text-sm transition-colors">Batal</button>
            )}
            <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-medium py-2 px-6 rounded-md text-sm transition-colors disabled:opacity-50">
              <Save size={16} /> {editingId ? 'Update Customer' : 'Simpan Customer'}
            </button>
          </div>
        </form>
      </div>

      {/* LIST SECTION */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Users size={20} className="text-blue-900" />
          <h2 className="text-xl font-bold text-slate-800">Daftar Customer</h2>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col lg:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <input type="text" placeholder="Cari nama customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-900"/>
          </div>
          <select value={filterPembayaran} onChange={(e) => setFilterPembayaran(e.target.value)} className="lg:w-40 bg-white border border-slate-300 rounded-md py-2 px-3 text-sm">
            <option value="Semua">Pembayaran</option>
            <option value="Lancar">Lancar</option>
            <option value="Tersendat">Tersendat</option>
            <option value="Macet">Macet</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="lg:w-44 bg-white border border-slate-300 rounded-md py-2 px-3 text-sm">
            <option value="terbaru">Terbaru</option>
            <option value="nama_az">Nama A-Z</option>
            <option value="kerjasama_lama">Kerjasama Terlama</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4">Nama Customer</th>
                <th className="py-3 px-4">Lama Kerja Sama</th>
                <th className="py-3 px-4">Kestabilan</th>
                <th className="py-3 px-4">Pembayaran</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? currentRows.map(c => (
                <tr key={c.id_customer} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">{c.nama_customer}</td>
                  <td className="py-3 px-4 text-slate-600">{c.lama_bekerjasama_tahun} Tahun</td>
                  <td className="py-3 px-4 text-slate-600">{c.kestabilan}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${c.status_pembayaran === 'Macet' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                      {c.status_pembayaran}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex items-center justify-center gap-2">
                    <button onClick={() => handleEdit(c)} className="bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors"><Edit size={14}/></button>
                    <button onClick={() => handleDelete(c.id_customer)} className="bg-white border border-red-600 text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={14}/></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="text-center py-10 text-slate-400"><Inbox size={32} className="mx-auto mb-2 opacity-20"/> Tidak ada data ditemukan.</td></tr>
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
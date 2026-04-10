import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  Users, UserPlus, Save, Mail, Lock, User, Shield, CheckCircle, XCircle, 
  ChevronDown, Eye, EyeOff, Edit, Trash2, X, Search, ArrowUpDown, 
  ChevronLeft, ChevronRight, Inbox, Filter 
} from 'lucide-react';

export default function ManajemenUser() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null); // State untuk mendeteksi mode Edit

  // State Fitur Baru: Search, Filter, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("Semua");
  const [sortBy, setSortBy] = useState("terbaru");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
    password: '',
    role: 'Sales',
    is_active: true
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('master_users')
        .select('*')
        .order('id_user', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error('Gagal mengambil data user.');
      console.error('Error fetching users:', error.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset pagination ke halaman 1 jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, sortBy]);

  // --- LOGIKA PENGOLAHAN DATA ---
  let processedData = [...users];

  // 1. Search
  if (searchQuery) {
    processedData = processedData.filter(user => 
      user.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // 2. Filter Role
  if (filterRole !== "Semua") {
    processedData = processedData.filter(user => user.role === filterRole);
  }

  // 3. Sort
  processedData.sort((a, b) => {
    if (sortBy === "terbaru") return b.id_user - a.id_user;
    if (sortBy === "nama_az") return a.nama_lengkap.localeCompare(b.nama_lengkap);
    if (sortBy === "nama_za") return b.nama_lengkap.localeCompare(a.nama_lengkap);
    return 0;
  });

  // 4. Pagination
  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ nama_lengkap: '', email: '', password: '', role: 'Sales', is_active: true });
    setEditingId(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingId) {
        // Mode Edit (Update)
        const { error } = await supabase.from('master_users').update(formData).eq('id_user', editingId);
        if (error) throw error;
        toast.success('Data user berhasil diperbarui!');
      } else {
        // Mode Tambah (Insert)
        const { error } = await supabase.from('master_users').insert([formData]);
        if (error) throw error;
        toast.success('User baru berhasil ditambahkan.');
      }
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(`Gagal menyimpan user: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id_user);
    setFormData({
      nama_lengkap: user.nama_lengkap,
      email: user.email,
      password: user.password,
      role: user.role,
      is_active: user.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll ke atas agar form terlihat
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus user ini secara permanen?')) return;
    
    try {
      const { error } = await supabase.from('master_users').delete().eq('id_user', id);
      if (error) throw error;
      toast.success('User berhasil dihapus!');
      fetchUsers();
    } catch (error) {
      toast.error(`Gagal menghapus user: ${error.message}`);
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('master_users')
        .update({ is_active: !currentStatus })
        .eq('id_user', id);
      if (error) throw error;
      
      toast.success('Status user berhasil diperbarui!');
      fetchUsers();
    } catch (error) {
      toast.error(`Gagal mengubah status: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Form Tambah/Edit User */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-blue-900" />
            <h2 className="text-xl font-bold text-slate-800">
              {editingId ? 'Edit Data User' : 'Tambah User'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {editingId ? 'Perbarui informasi akun untuk user terpilih.' : 'Daftarkan akun baru untuk tim Sales, Admin, atau BusDev.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          
          {/* Input Nama Lengkap */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input 
                type="text" 
                name="nama_lengkap" 
                value={formData.nama_lengkap} 
                onChange={handleChange} 
                required 
                placeholder="Misal: Budi Santoso"
                className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all" 
              />
            </div>
          </div>

          {/* Input Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                placeholder="nama@company.com"
                className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all" 
              />
            </div>
          </div>

          {/* Input Password dengan Tombol Show */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {editingId ? 'Ubah Password' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
                placeholder="••••••••"
                className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-900 transition-colors"
                title={showPassword ? "Sembunyikan Sandi" : "Lihat Sandi"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Input Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <select 
                name="role" 
                value={formData.role} 
                onChange={handleChange} 
                className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all appearance-none"
              >
                <option value="Sales">Sales</option>
                <option value="Admin">Admin</option>
                <option value="BusDev">Business Development</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Submit & Cancel Button */}
          <div className="md:col-span-2 flex justify-end gap-3 pt-5 mt-2 border-t border-slate-200">
            {editingId && (
              <button 
                type="button" 
                onClick={resetForm}
                className="inline-flex items-center justify-center bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-2 px-4 rounded-md text-sm transition-colors"
              >
                <X size={16} className="mr-1" /> Batal Edit
              </button>
            )}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-medium py-2 px-6 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
            >
              {isLoading ? 'Memproses...' : <><Save size={16} /> {editingId ? 'Update User' : 'Simpan User'}</>}
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Daftar User */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-blue-900" />
            <h2 className="text-xl font-bold text-slate-800">Daftar User</h2>
          </div>
        </div>

        {/* ----- Fitur Kontrol Baru: Search, Filter, Sort ----- */}
        <div className="flex flex-col lg:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari nama atau email..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-blue-900 outline-none"
            />
          </div>

          {/* Filter Role */}
          <div className="relative w-full lg:w-48">
            <Filter className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <select 
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm outline-none appearance-none cursor-pointer"
            >
              <option value="Semua">Semua Role</option>
              <option value="Sales">Sales</option>
              <option value="Admin">Admin</option>
              <option value="BusDev">Business Development</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>

          {/* Sort By */}
          <div className="relative w-full lg:w-48">
            <ArrowUpDown className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm outline-none appearance-none cursor-pointer"
            >
              <option value="terbaru">Terbaru</option>
              <option value="nama_az">Nama A-Z</option>
              <option value="nama_za">Nama Z-A</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? currentRows.map(user => (
                <tr key={user.id_user} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">{user.nama_lengkap}</td>
                  <td className="py-3 px-4 text-slate-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-widest border border-slate-200">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${user.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {user.is_active ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex items-center justify-center gap-2">
                    <button 
                      onClick={() => toggleUserStatus(user.id_user, user.is_active)}
                      className="p-1.5 border rounded hover:bg-slate-50 transition-colors" 
                      title={user.is_active ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {user.is_active ? <XCircle size={16} className="text-red-600"/> : <CheckCircle size={16} className="text-green-600"/>}
                    </button>
                    <button 
                      onClick={() => handleEdit(user)}
                      className="p-1.5 border rounded hover:bg-slate-50 transition-colors text-blue-700" 
                      title="Edit"
                    >
                      <Edit size={16}/>
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id_user)}
                      className="p-1.5 border rounded hover:bg-red-50 hover:text-red-700 hover:border-red-600 transition-colors text-slate-700" 
                      title="Hapus"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center text-slate-400">
                      <Inbox size={40} className="mb-2 opacity-20" />
                      <p className="text-sm">Tidak ada data user ditemukan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ----- Pagination Controls ----- */}
        {processedData.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span>Menampilkan {currentPage} - {totalPages} dari {processedData.length} data</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-slate-50"
              >
                <ChevronLeft size={18}/>
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-slate-50"
              >
                <ChevronRight size={18}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
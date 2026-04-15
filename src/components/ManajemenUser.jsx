import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  Users,
  UserPlus,
  Save,
  Mail,
  Lock,
  User,
  Shield,
  CheckCircle,
  XCircle,
  ChevronDown,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  X,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Filter,
  Plus,
} from "lucide-react";

export default function ManajemenUser() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [formData, setFormData] = useState({
    nama_lengkap: "",
    email: "",
    password: "",
    role: "Sales",
    is_active: true,
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("master_users")
        .select("*")
        .order("id_user", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error("Failed to fetch users.");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, sortBy]);

  let processedData = [...users];

  if (searchQuery) {
    processedData = processedData.filter(
      (user) =>
        user.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (filterRole !== "All") {
    processedData = processedData.filter((user) => user.role === filterRole);
  }

  processedData.sort((a, b) => {
    if (sortBy === "newest") return b.id_user - a.id_user;
    if (sortBy === "name_az") return a.nama_lengkap.localeCompare(b.nama_lengkap);
    if (sortBy === "name_za") return b.nama_lengkap.localeCompare(a.nama_lengkap);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      nama_lengkap: "",
      email: "",
      password: "",
      role: "Sales",
      is_active: true,
    });
    setEditingId(null);
    setShowPassword(false);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("master_users")
          .update(formData)
          .eq("id_user", editingId);
        if (error) throw error;
        toast.success("User updated!");
      } else {
        const { error } = await supabase
          .from("master_users")
          .insert([formData]);
        if (error) throw error;
        toast.success("User added!");
      }
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(`Save failed: ${error.message}`);
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
      is_active: user.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      const { error } = await supabase
        .from("master_users")
        .delete()
        .eq("id_user", id);
      if (error) throw error;
      toast.success("User deleted!");
      fetchUsers();
    } catch (error) {
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from("master_users")
        .update({ is_active: !currentStatus })
        .eq("id_user", id);
      if (error) throw error;
      toast.success("Status updated!");
      fetchUsers();
    } catch (error) {
      toast.error(`Status update failed: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-orange-600" />
            <h2 className="text-xl font-bold text-slate-800">Users</h2>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add User
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
            />
          </div>
          <div className="relative w-full lg:w-48">
            <Filter className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm outline-none appearance-none cursor-pointer"
            >
              <option value="All">All Roles</option>
              <option value="Sales">Sales</option>
              <option value="Admin">Admin</option>
              <option value="BusDev">Business Development</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <div className="relative w-full lg:w-48">
            <ArrowUpDown className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm outline-none appearance-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="name_az">Name A-Z</option>
              <option value="name_za">Name Z-A</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((user) => (
                  <tr key={user.id_user} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">{user.nama_lengkap}</td>
                    <td className="py-3 px-4 text-slate-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-widest border border-slate-200">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${user.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleUserStatus(user.id_user, user.is_active)}
                        className="p-1.5 border rounded hover:bg-slate-50 transition-colors"
                        title={user.is_active ? "Deactivate" : "Activate"}
                      >
                        {user.is_active ? <XCircle size={16} className="text-red-600" /> : <CheckCircle size={16} className="text-green-600" />}
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 border rounded hover:bg-slate-50 transition-colors text-orange-600"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id_user)}
                        className="p-1.5 border rounded hover:bg-red-50 hover:text-red-700 transition-colors text-slate-700"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <Inbox size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-slate-400">No users found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {processedData.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span>Showing {currentPage} - {totalPages} of {processedData.length} entries</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded-md disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded-md disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={resetForm} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <div className="p-6 md:p-8">
              <div className="mb-6 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <UserPlus size={20} className="text-orange-600" />
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingId ? "Edit User" : "Add User"}
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <input
                      type="text"
                      name="nama_lengkap"
                      value={formData.nama_lengkap}
                      onChange={handleChange}
                      required
                      placeholder="E.g., John Doe"
                      className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="name@company.com"
                      className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {editingId ? "Change Password" : "Password"}
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
                      className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 appearance-none"
                    >
                      <option value="Sales">Sales</option>
                      <option value="Admin">Admin</option>
                      <option value="BusDev">Business Development</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 pt-5 mt-2 border-t border-slate-200">
                  <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-md text-sm hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md text-sm disabled:opacity-50">
                    <Save size={16} /> {editingId ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
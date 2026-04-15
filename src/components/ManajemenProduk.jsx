import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  Package,
  Save,
  Edit,
  Trash2,
  X,
  Plus,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

export default function ManajemenProduk() {
  const [produk, setProduk] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [formData, setFormData] = useState({ nama_produk: "" });

  const fetchProduk = async () => {
    try {
      const { data, error } = await supabase
        .from("master_produk")
        .select("*")
        .order("id_produk", { ascending: false });
      if (error) throw error;
      setProduk(data || []);
    } catch (error) {
      toast.error("Failed to fetch products.");
    }
  };

  useEffect(() => {
    fetchProduk();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  let processedData = [...produk];
  if (searchQuery) {
    processedData = processedData.filter((item) =>
      item.nama_produk.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  processedData.sort((a, b) => {
    if (sortBy === "newest") return b.id_produk - a.id_produk;
    if (sortBy === "oldest") return a.id_produk - b.id_produk;
    if (sortBy === "nama_az") return a.nama_produk.localeCompare(b.nama_produk);
    if (sortBy === "nama_za") return b.nama_produk.localeCompare(a.nama_produk);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => {
    setFormData({ nama_produk: "" });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("master_produk")
          .update(formData)
          .eq("id_produk", editingId);
        if (error) throw error;
        toast.success("Product updated!");
      } else {
        const { error } = await supabase
          .from("master_produk")
          .insert([formData]);
        if (error) throw error;
        toast.success("Product added.");
      }
      resetForm();
      fetchProduk();
    } catch (error) {
      toast.error(`Save failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id_produk);
    setFormData({ nama_produk: item.nama_produk });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      const { error } = await supabase
        .from("master_produk")
        .delete()
        .eq("id_produk", id);
      if (error) throw error;
      toast.success("Product deleted!");
      fetchProduk();
    } catch (error) {
      toast.error(`Delete failed.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-orange-600" />
            <h2 className="text-xl font-bold text-slate-800">Products</h2>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>
          <div className="relative w-full md:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <ArrowUpDown size={16} />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 appearance-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="nama_az">Name A - Z</option>
              <option value="nama_za">Name Z - A</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4 w-20">ID</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center w-40">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((p) => (
                  <tr
                    key={p.id_produk}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      #{p.id_produk}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {p.nama_produk}
                    </td>
                    <td className="py-3 px-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(p)}
                        className="inline-flex items-center gap-1 bg-white border border-orange-600 text-orange-700 hover:bg-orange-50 px-2.5 py-1.5 rounded text-xs font-medium"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id_produk)}
                        className="inline-flex items-center gap-1 bg-white border border-red-600 text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded text-xs font-medium"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-12">
                    <Inbox size={40} className="mb-2 opacity-20" />
                    <p className="text-sm">No products found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {processedData.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Showing {currentPage} - {totalPages} of {processedData.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={resetForm}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <div className="p-6 md:p-8">
              <div className="mb-6 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-orange-600" />
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingId ? "Edit Product" : "Add Product"}
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    name="nama_produk"
                    value={formData.nama_produk}
                    onChange={handleChange}
                    required
                    placeholder="E.g., Chicken Sausage 500g"
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border rounded-md text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-md text-sm disabled:opacity-50"
                  >
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
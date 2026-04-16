import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  Tags,
  Plus,
  Save,
  FileX,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
} from "lucide-react";

export default function ManajemenPromosi({ currentUser }) {
  const [promoList, setPromoList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTermsModal, setViewTermsModal] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // 1. Penyesuaian nama key di formData
  const [formData, setFormData] = useState({
    name: "",
    terms_conditions: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  const isAdmin = currentUser?.role === "Admin";

  const fetchPromos = async () => {
    try {
      // 2. Ubah nama tabel ke 'promotions'
      let query = supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!isAdmin) query = query.eq("is_active", true);

      const { data, error } = await query;
      if (error) throw error;
      setPromoList(data || []);
    } catch (error) {
      console.error("Fetch error:", error.message);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, [isAdmin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterActive, sortBy]);

  let processedData = [...promoList];

  if (searchQuery) {
    processedData = processedData.filter(
      (item) =>
        // 3. Sesuaikan dengan kolom name & terms_conditions
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.terms_conditions.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  if (isAdmin && filterActive !== "All") {
    processedData = processedData.filter(
      (item) => item.is_active === (filterActive === "Active"),
    );
  }

  processedData.sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === "oldest")
      return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === "name_az") return a.name.localeCompare(b.name);
    if (sortBy === "name_za") return b.name.localeCompare(a.name);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => {
    setFormData({
      name: "",
      terms_conditions: "",
      start_date: "",
      end_date: "",
      is_active: true,
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        terms_conditions: formData.terms_conditions,
        start_date: formData.start_date,
        end_date: formData.end_date,
      };

      if (editingId) {
        // 4. Update tabel 'promotions' dan eq 'id'
        const { error } = await supabase
          .from("promotions")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Promo updated!");
      } else {
        const { error } = await supabase
          .from("promotions")
          .insert([{ ...payload, is_active: true }]);
        if (error) throw error;
        toast.success("Promo added!");
      }
      resetForm();
      fetchPromos();
    } catch (error) {
      toast.error(`Save failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      terms_conditions: item.terms_conditions,
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      is_active: item.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this promo permanently?")) return;
    try {
      // 5. Hapus dari tabel 'promotions'
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Promo deleted!");
      fetchPromos();
    } catch (error) {
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from("promotions")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      toast.success("Status updated!");
      fetchPromos();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Tags size={20} className="text-orange-600" />
            <h2 className="text-xl font-bold text-slate-800">Promo List</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Add Promo
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          <div className="relative flex-1">
            <Search
              className="absolute inset-y-0 left-3 my-auto text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search name or terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
            />
          </div>

          <div className="relative w-full md:w-48">
            <ArrowUpDown
              className="absolute inset-y-0 left-3 my-auto text-slate-400"
              size={16}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none appearance-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name_az">Name A-Z</option>
              <option value="name_za">Name Z-A</option>
            </select>
          </div>

          {isAdmin && (
            <div className="relative w-full md:w-44">
              <Filter
                className="absolute inset-y-0 left-3 my-auto text-slate-400"
                size={16}
              />
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none appearance-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4 w-1/5">Promo Name</th>
                <th className="py-3 px-4 w-1/5">Period</th>
                <th className="py-3 px-4 w-2/5">Terms & Conditions</th>
                <th className="py-3 px-4">Status</th>
                {isAdmin && <th className="py-3 px-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((item) => (
                  <tr
                    key={item.id} // 6. Penyesuaian ke item.id
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors align-top"
                  >
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {item.name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs whitespace-nowrap">
                        <Calendar
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                        <span>
                          {formatDate(item.start_date)} <br /> -{" "}
                          {formatDate(item.end_date)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-600 leading-relaxed line-clamp-2">
                        {item.terms_conditions}
                      </div>
                      <button
                        onClick={() => setViewTermsModal(item)}
                        className="text-orange-600 text-xs font-bold hover:underline mt-1 focus:outline-none"
                      >
                        Read More
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wide ${item.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 flex items-center justify-center gap-2 flex-wrap mt-1">
                        <button
                          onClick={() => toggleStatus(item.id, item.is_active)}
                          className="p-1.5 border rounded hover:bg-slate-50 text-slate-700"
                          title={item.is_active ? "Deactivate" : "Activate"}
                        >
                          {item.is_active ? (
                            <XCircle size={16} className="text-red-600" />
                          ) : (
                            <CheckCircle size={16} className="text-green-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 border rounded hover:bg-slate-50 text-orange-600"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 border rounded hover:bg-red-50 hover:text-red-700 text-slate-700"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="text-center py-12">
                    <FileX size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm opacity-50">No promos found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {processedData.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Showing {currentPage} - {totalPages} of {processedData.length}{" "}
              entries
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Read More Modal */}
      {viewTermsModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
            <button
              onClick={() => setViewTermsModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Tags size={20} className="text-orange-600" />
                <h3 className="text-lg font-bold text-slate-800">
                  {/* 7. Penyesuaian nama kolom pada modal read more */}
                  {viewTermsModal.name}
                </h3>
              </div>
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {viewTermsModal.terms_conditions}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewTermsModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={resetForm}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <div className="p-6 md:p-8">
              <div className="mb-6 border-b border-slate-200 pb-4 flex items-center gap-2">
                <Tags size={20} className="text-orange-600" />
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? "Edit Promo" : "Add Promo"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Promo Name
                  </label>
                  {/* 8. Penyesuaian attribute "name" pada input */}
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
                    placeholder="E.g., 5% Discount"
                  />
                </div>

                {/* Tambahan Start Date & End Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      required
                      className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      min={formData.start_date}
                      value={formData.end_date}
                      onChange={handleChange}
                      required
                      className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    name="terms_conditions"
                    value={formData.terms_conditions}
                    onChange={handleChange}
                    required
                    rows="3"
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none resize-none"
                    placeholder="T&C details..."
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
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
                    className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    <Save size={16} />{" "}
                    {isLoading ? "Processing..." : "Save Promo"}
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
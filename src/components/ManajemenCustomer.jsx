import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  Users,
  UserPlus,
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
  CalendarDays
} from "lucide-react";

export default function ManajemenCustomer() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStability, setFilterStability] = useState("All");
  const [filterPayment, setFilterPayment] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Ubah years_active menjadi join_date
  const [formData, setFormData] = useState({
    name: "",
    stability: "Medium",
    payment_status: "Good",
    join_date: new Date().toISOString().split("T")[0],
  });

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("id", { ascending: false });
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      toast.error("Failed to fetch customers.");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStability, filterPayment, sortBy]);

  // Fungsi Kalkulator Otomatis Tahun Kerjasama
  const calculateYearsActive = (dateString) => {
    if (!dateString) return 0;
    const joinDate = new Date(dateString);
    const today = new Date();
    let years = today.getFullYear() - joinDate.getFullYear();
    const m = today.getMonth() - joinDate.getMonth();
    // Kurangi 1 tahun jika bulan/tanggal hari ini belum melewati tanggal join di tahun ini
    if (m < 0 || (m === 0 && today.getDate() < joinDate.getDate())) {
      years--;
    }
    return Math.max(0, years);
  };

  let processedData = [...customers];
  if (searchQuery)
    processedData = processedData.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  if (filterStability !== "All")
    processedData = processedData.filter(
      (c) => c.stability === filterStability,
    );
  if (filterPayment !== "All")
    processedData = processedData.filter(
      (c) => c.payment_status === filterPayment,
    );

  processedData.sort((a, b) => {
    if (sortBy === "newest") return b.id - a.id;
    if (sortBy === "nama_az") return a.name.localeCompare(b.name);
    if (sortBy === "kerjasama_lama") {
      // Yang paling lama gabung adalah yang tanggalnya paling tua (kecil)
      return new Date(a.join_date) - new Date(b.join_date);
    }
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
      stability: "Medium",
      payment_status: "Good",
      join_date: new Date().toISOString().split("T")[0],
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("customers")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Customer updated!");
      } else {
        const { error } = await supabase
          .from("customers")
          .insert([formData]);
        if (error) throw error;
        toast.success("Customer added.");
      }
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(`Save failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      stability: customer.stability || "Medium",
      payment_status: customer.payment_status || "Good",
      join_date: customer.join_date || new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Customer deleted!");
      fetchCustomers();
    } catch (error) {
      toast.error(`Delete failed.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-orange-600" />
            <h2 className="text-xl font-bold text-slate-800">
              Customer List
            </h2>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add Customer
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          <div className="relative flex-1">
            <Search
              className="absolute inset-y-0 left-3 my-auto text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
            />
          </div>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="lg:w-40 bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none cursor-pointer"
          >
            <option value="All">All Payments</option>
            <option value="Good">Good</option>
            <option value="Delayed">Delayed</option>
            <option value="Bad Debt">Bad Debt</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="lg:w-44 bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="nama_az">Name A-Z</option>
            <option value="kerjasama_lama">Longest Coop</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Coop Duration</th>
                <th className="py-3 px-4">Stability</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {/* Menampilkan hasil kalkulasi otomatis */}
                      <span className="font-semibold text-slate-800">{calculateYearsActive(c.join_date)} Years</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <CalendarDays size={10} /> Since {new Date(c.join_date).getFullYear()}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.stability}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${c.payment_status === "Bad Debt" ? "bg-red-50 text-red-700 border-red-200" : c.payment_status === "Delayed" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-green-50 text-green-700 border-green-200"}`}
                      >
                        {c.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="bg-white border border-orange-600 text-orange-700 hover:bg-orange-50 p-1.5 rounded transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="bg-white border border-red-600 text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    <Inbox size={32} className="mx-auto mb-2 opacity-20" />{" "}
                    No data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {processedData.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Showing {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, processedData.length)} of {processedData.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-medium text-slate-700">{currentPage} / {totalPages}</span>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={resetForm}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <div className="p-6 md:p-8">
              <div className="mb-6 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <UserPlus size={20} className="text-orange-600" />
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingId ? "Edit Customer" : "Add Customer"}
                  </h2>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. PT ABC"
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
                <div>
                  {/* Diubah dari input angka menjadi Date Picker */}
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Join Date
                  </label>
                  <input
                    type="date"
                    name="join_date"
                    value={formData.join_date}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Business Stability
                  </label>
                  <select
                    name="stability"
                    value={formData.stability}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 outline-none cursor-pointer"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    name="payment_status"
                    value={formData.payment_status}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 outline-none cursor-pointer"
                  >
                    <option value="Good">Good</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Bad Debt">Bad Debt</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 pt-5 mt-2 border-t border-slate-200">
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
                    <Save size={16} />{" "}
                    {editingId ? "Update" : "Save"}
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
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import {
  X,
  CheckCircle,
  AlertCircle,
  Search,
  Inbox,
  Eye,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
  Tag,
  Clock,
  CheckSquare,
  FileText,
} from "lucide-react";

export default function DashboardBusDev({
  currentUser,
  daftarPengajuan,
  onSuccess,
}) {
  const pendingReview = daftarPengajuan.filter(
    (p) => p.status === "Pending BusDev",
  );

  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: "",
    id: null,
    notes: "",
  });
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKategori, setFilterKategori] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const uniqueCategories = [
    "All",
    ...Array.from(
      new Set(pendingReview.map((item) => item.program_category || "Regular")),
    ),
  ];

  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems([]);
  }, [searchQuery, filterKategori, sortBy]);

  let processedData = [...pendingReview];
  if (searchQuery) {
    processedData = processedData.filter(
      (item) =>
        item.customers?.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.promotion_type?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }
  if (filterKategori !== "All") {
    processedData = processedData.filter(
      (item) => (item.program_category || "Regular") === filterKategori,
    );
  }

  processedData.sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.request_date) - new Date(a.request_date);
    if (sortBy === "oldest")
      return new Date(a.request_date) - new Date(b.request_date);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(currentRows.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((item) => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleBulkApprove = async () => {
    if (!window.confirm(`Approve ${selectedItems.length} requests?`)) return;
    setIsProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from("promotion_requests")
        .update({ status: "Approved" })
        .in("id", selectedItems);
      if (updateError) throw updateError;

      const logData = selectedItems.map((id) => ({
        request_id: id,
        reviewer_id: currentUser.id,
        action: "Approve",
        reviewer_notes: "Bulk approved by BusDev",
      }));
      const { error: logError } = await supabase
        .from("approval_logs")
        .insert(logData);
      if (logError) throw logError;

      toast.success(`${selectedItems.length} requests approved!`);
      setSelectedItems([]);
      onSuccess();
    } catch (error) {
      toast.error(`Bulk approve failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionModal = (id, type) =>
    setActionModal({ isOpen: true, type, id, notes: "" });

  const submitAction = async () => {
    setIsProcessing(true);
    const { id, type, notes } = actionModal;

    if ((type === "Sales Revision" || type === "Rejected") && !notes.trim()) {
      toast.error(`Reason required!`);
      setIsProcessing(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("promotion_requests")
        .update({ status: type })
        .eq("id", id);
      if (updateError) throw updateError;

      let tindakanLog = "Revise";
      if (type === "Approved") tindakanLog = "Approve";
      if (type === "Rejected") tindakanLog = "Reject";

      const { error: logError } = await supabase.from("approval_logs").insert([
        {
          request_id: id,
          reviewer_id: currentUser.id,
          action: tindakanLog,
          reviewer_notes: type === "Approved" ? "Approved by BusDev" : notes,
        },
      ]);
      if (logError) throw logError;

      toast.success(`Request processed!`);
      setActionModal({ isOpen: false, type: "", id: null, notes: "" });
      setDetailModalItem(null);
      onSuccess();
    } catch (error) {
      toast.error(`Action failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Promo Reviews</h3>
          <p className="text-sm text-slate-500 mt-1">
            Review and manage sales promo requests.
          </p>
        </div>

        <div className="flex items-center gap-2 h-10">
          {selectedItems.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-md transition-all animate-in fade-in slide-in-from-top-2"
            >
              <CheckSquare size={16} /> Approve ({selectedItems.length})
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 border-y border-slate-100 py-4 bg-orange-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
        <div className="relative flex-1">
          <Search
            className="absolute inset-y-0 left-3 my-auto text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
          />
        </div>
        <div className="relative w-full md:w-48">
          <Filter
            className="absolute inset-y-0 left-3 my-auto text-slate-400"
            size={16}
          />
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none cursor-pointer appearance-none"
          >
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "All Categories" : cat}
              </option>
            ))}
          </select>
        </div>
        <div className="relative w-full md:w-48">
          <ArrowUpDown
            className="absolute inset-y-0 left-3 my-auto text-slate-400"
            size={16}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none cursor-pointer appearance-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
              <th className="py-3 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    currentRows.length > 0 &&
                    selectedItems.length === currentRows.length
                  }
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-600 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4">Date & Period</th>
              <th className="py-3 px-2">Customer & Promo</th>
              <th className="py-3 px-4">Quantity</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length > 0 ? (
              currentRows.map((item) => {
                const isChecked = selectedItems.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 transition-colors ${isChecked ? "bg-orange-50/50" : "hover:bg-slate-50"}`}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSelectItem(item.id)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-600 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {new Date(item.request_date).toLocaleDateString(
                          "en-US",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Calendar size={12} className="shrink-0" />
                        {new Date(item.start_date).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        -{" "}
                        {new Date(item.end_date).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <p className="font-semibold text-slate-800">
                        {item.customers?.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.promotion_type}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {item.quantity} Kg
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
                        {item.program_category || "Regular"}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setDetailModalItem(item)}
                        className="p-1.5 border rounded hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openActionModal(item.id, "Approved")}
                        className="p-1.5 border border-green-600 text-green-700 hover:bg-green-50 rounded"
                        title="Approve"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() =>
                          openActionModal(item.id, "Sales Revision")
                        }
                        className="p-1.5 border border-yellow-500 text-yellow-700 hover:bg-yellow-50 rounded"
                        title="Revise"
                      >
                        <AlertCircle size={16} />
                      </button>
                      <button
                        onClick={() => openActionModal(item.id, "Rejected")}
                        className="p-1.5 border border-red-600 text-red-700 hover:bg-red-50 rounded"
                        title="Reject"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-10 text-slate-400">
                  <Inbox size={32} className="mx-auto mb-2 opacity-20" />
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {processedData.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t text-sm">
          <span className="text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {indexOfFirstRow + 1}
            </span>{" "}
            -{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(indexOfLastRow, processedData.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">
              {processedData.length}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border rounded-md disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border rounded-md disabled:opacity-50 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {detailModalItem && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDetailModalItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <h4 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b">
              Promo Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Customer
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {detailModalItem.customers?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Date Submitted
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Calendar size={14} className="text-slate-400" />
                    {new Date(detailModalItem.request_date).toLocaleDateString(
                      "en-US",
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Promo Duration
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Clock size={14} className="text-slate-400" />
                    {new Date(detailModalItem.start_date).toLocaleDateString(
                      "en-US",
                    )}{" "}
                    -{" "}
                    {new Date(detailModalItem.end_date).toLocaleDateString(
                      "en-US",
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Product
                  </p>
                  <div className="flex items-start gap-1.5 text-sm text-slate-700">
                    <Package size={14} className="text-slate-400 mt-0.5" />
                    <span>{detailModalItem.target_products}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Promo & Benefit
                  </p>
                  <div className="flex items-start gap-2 flex-col">
                    <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
                      {detailModalItem.program_category || "Regular"}
                    </span>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Tag size={14} className="text-slate-400" />{" "}
                      {detailModalItem.promotion_type}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                    Quantity
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {detailModalItem.quantity} Kg
                  </p>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Notes
                </p>
                <div className="bg-slate-50 p-3.5 rounded-md border text-sm text-slate-700 leading-relaxed">
                  <FileText
                    size={16}
                    className="inline-block mr-1.5 text-slate-400 -mt-0.5"
                  />
                  {detailModalItem.sales_notes || (
                    <span className="italic text-slate-400">No notes.</span>
                  )}
                </div>
              </div>

              {detailModalItem.attachment && (
                <div className="md:col-span-2 mt-2 pt-4 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                    Attachments
                  </p>
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-slate-50 rounded-lg border">
                    {detailModalItem.attachment.match(
                      /\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i,
                    ) ? (
                      <div className="relative group shrink-0">
                        <img
                          src={detailModalItem.attachment}
                          alt="Attachment"
                          className="h-24 w-32 object-cover rounded border shadow-sm"
                        />
                        <a
                          href={detailModalItem.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded text-white text-xs font-medium"
                        >
                          Open
                        </a>
                      </div>
                    ) : (
                      <div className="h-24 w-32 shrink-0 flex items-center justify-center bg-white rounded border text-slate-400">
                        <FileText size={36} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        Supporting Doc
                      </p>
                      <p className="text-xs text-slate-500 mt-1 mb-3">
                        Uploaded proof.
                      </p>
                      <a
                        href={detailModalItem.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-white border py-1.5 px-4 rounded-md text-xs font-bold transition-all shadow-sm hover:bg-slate-100"
                      >
                        <Eye size={14} /> View File
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 mt-8 pt-5 border-t">
              <button
                onClick={() => setDetailModalItem(null)}
                className="bg-white border text-slate-700 py-2 px-4 rounded-md text-sm transition-colors hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => openActionModal(detailModalItem.id, "Rejected")}
                className="bg-red-600 text-white py-2 px-4 rounded-md text-sm transition-colors hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() =>
                  openActionModal(detailModalItem.id, "Sales Revision")
                }
                className="bg-yellow-500 text-slate-900 py-2 px-4 rounded-md text-sm transition-colors hover:bg-yellow-600"
              >
                Revise
              </button>
              <button
                onClick={() => openActionModal(detailModalItem.id, "Approved")}
                className="bg-orange-600 text-white py-2 px-4 rounded-md text-sm transition-colors hover:bg-orange-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() =>
                setActionModal({ isOpen: false, type: "", id: null, notes: "" })
              }
              className="absolute top-4 right-4 text-slate-400"
            >
              <X size={20} />
            </button>
            <h4 className="text-lg font-bold text-slate-800 mb-2">
              {actionModal.type === "Approved"
                ? "Confirm Approval"
                : actionModal.type === "Rejected"
                  ? "Reject Request"
                  : "Revision Notes"}
            </h4>
            {actionModal.type === "Sales Revision" ||
            actionModal.type === "Rejected" ? (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={actionModal.notes}
                  onChange={(e) =>
                    setActionModal({ ...actionModal, notes: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="Enter reason..."
                />
              </div>
            ) : (
              <p className="text-slate-600 text-sm mt-2">
                Approve this request?
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() =>
                  setActionModal({
                    isOpen: false,
                    type: "",
                    id: null,
                    notes: "",
                  })
                }
                className="border py-2 px-4 rounded-md text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={isProcessing}
                className={`py-2 px-4 rounded-md text-sm text-white disabled:opacity-70 min-w-[100px] ${actionModal.type === "Approved" ? "bg-orange-600" : actionModal.type === "Rejected" ? "bg-red-600" : "bg-yellow-500 !text-slate-900"}`}
              >
                {isProcessing ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
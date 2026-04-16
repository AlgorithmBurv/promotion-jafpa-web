import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  Clock,
  CheckCircle2,
  FileText,
  Inbox,
  AlertCircle,
  X,
  Eye,
  Edit3,
  Package,
  Tag,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

export default function StatusPengajuan({ daftarPengajuan, onSuccess }) {
  // 1. Penyesuaian pengecekan value status
  const disetujui = daftarPengajuan.filter(
    (p) => p.status === "Approved",
  );
  const menungguBusDev = daftarPengajuan.filter(
    (p) => p.status === "Pending BusDev",
  );
  const revisiSales = daftarPengajuan.filter(
    (p) => p.status === "Sales Revision",
  );
  const ditolak = daftarPengajuan.filter(
    (p) => p.status === "Rejected",
  );

  const [modalEdit, setModalEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  const uniqueStatuses = [
    "All",
    ...Array.from(new Set(daftarPengajuan.map((item) => item.status))),
  ];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortBy]);

  const bukaDetail = async (item) => {
    let catatanRevisi = null;
    if (item.status === "Sales Revision") {
      setIsLoading(true);
      try {
        // 2. Penyesuaian query tabel log, kolom, dan filter tindakan
        const { data } = await supabase
          .from("approval_logs")
          .select("reviewer_notes")
          .eq("request_id", item.id)
          .eq("action", "Revise")
          .order("created_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          catatanRevisi = data[0].reviewer_notes;
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      } finally {
        setIsLoading(false);
      }
    }

    setDetailModalItem({
      ...item,
      revision_notes: catatanRevisi,
    });
  };

  let processedData = [...daftarPengajuan];
  if (searchQuery) {
    // 3. Penyesuaian mapping ke relasi customers.name dan promotion_type
    processedData = processedData.filter(
      (item) =>
        item.customers?.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.promotion_type?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }
  if (filterStatus !== "All") {
    processedData = processedData.filter(
      (item) => item.status === filterStatus,
    );
  }

  processedData.sort((a, b) => {
    // 4. Penyesuaian ke kolom request_date
    if (sortBy === "newest")
      return new Date(b.request_date) - new Date(a.request_date);
    if (sortBy === "oldest")
      return new Date(a.request_date) - new Date(b.request_date);
    if (sortBy === "name_az")
      return (a.customers?.name || "").localeCompare(
        b.customers?.name || "",
      );
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 5. Penyesuaian payload update ke tabel promotion_requests
      const { error: updateError } = await supabase
        .from("promotion_requests")
        .update({
          promotion_type: modalEdit.promotion_type,
          quantity: parseInt(modalEdit.quantity),
          start_date: modalEdit.start_date,
          end_date: modalEdit.end_date,
          sales_notes: modalEdit.sales_notes,
          status: "Pending BusDev",
        })
        .eq("id", modalEdit.id);

      if (updateError) throw updateError;

      // 6. Penyesuaian payload log riwayat
      await supabase.from("approval_logs").insert([
        {
          request_id: modalEdit.id,
          reviewer_id: modalEdit.sales_id,
          action: "Submit",
          reviewer_notes: "Revised by Sales based on BusDev notes.",
        },
      ]);

      toast.success("Request revised and resubmitted!");
      setModalEdit(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    // 7. Penyesuaian key badge dan label ke value bahasa Inggris
    const badges = {
      "Approved": "bg-green-50 text-green-700 border-green-200",
      "Pending BusDev": "bg-orange-50 text-orange-700 border-orange-200",
      "Sales Revision": "bg-red-50 text-red-700 border-red-200",
      "Rejected": "bg-slate-100 text-slate-600 border-slate-300 opacity-90",
    };
    const labels = {
      "Approved": "Approved",
      "Pending BusDev": "Pending",
      "Sales Revision": "Revise",
      "Rejected": "Rejected",
    };
    const icons = {
      "Approved": <CheckCircle2 size={14} />,
      "Pending BusDev": <Clock size={14} />,
      "Sales Revision": <AlertCircle size={14} />,
      "Rejected": <X size={14} />,
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${badges[status] || "bg-slate-100 text-slate-600"}`}
      >
        {icons[status]} {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Pending",
            count: menungguBusDev.length,
            color: "orange",
            icon: <Clock size={20} />,
          },
          {
            label: "Approved",
            count: disetujui.length,
            color: "green",
            icon: <CheckCircle2 size={20} />,
          },
          {
            label: "Revise",
            count: revisiSales.length,
            color: "red",
            icon: <AlertCircle size={20} />,
          },
          {
            label: "Rejected",
            count: ditolak.length,
            color: "slate",
            icon: <X size={20} />,
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 flex items-start justify-between"
          >
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">
                {card.label}
              </p>
              <h4 className="text-3xl font-bold text-slate-800">
                {card.count}
              </h4>
            </div>
            <div
              className={`w-10 h-10 rounded-md bg-${card.color}-50 flex items-center justify-center text-${card.color}-600`}
            >
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-orange-600" />
            <h3 className="text-xl font-bold text-slate-800">Promo Requests</h3>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
          <div className="relative flex-1">
            <Search
              className="absolute inset-y-0 left-3 my-auto text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="lg:w-40 bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none"
          >
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {s === "All" || s === "Semua"
                  ? "All Status"
                  : renderStatusBadge(s).props.children[2]}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="lg:w-44 bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name_az">Name A-Z</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Category & Promo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${item.status === "Rejected" ? "bg-slate-50/50" : ""}`}
                  >
                    <td className="py-3 px-4 text-slate-500">
                      {indexOfFirstRow + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {item.customers?.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="block text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border mb-1 w-fit">
                        {item.program_category || "Regular"}
                      </span>
                      <p className="text-xs text-slate-500">
                        {item.promotion_type}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 flex justify-center gap-2">
                      <button
                        onClick={() => bukaDetail(item)}
                        className="p-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {item.status === "Sales Revision" && (
                        <button
                          onClick={() => setModalEdit(item)}
                          className="p-1.5 bg-white border border-orange-600 text-orange-700 hover:bg-orange-50 rounded transition-colors"
                          title="Revise Form"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    <Inbox size={32} className="mx-auto mb-2 opacity-20" /> No
                    data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {processedData.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Showing {indexOfFirstRow + 1} -{" "}
              {Math.min(indexOfLastRow, processedData.length)} of{" "}
              {processedData.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-medium text-slate-700">
                {currentPage} / {totalPages}
              </span>
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

      {detailModalItem && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDetailModalItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <h4 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-200">
              Promo Request Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Customer
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {detailModalItem.customers?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Target Product
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Package size={14} className="text-slate-400" />
                    {detailModalItem.products?.name}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Date Submitted
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Calendar size={14} className="text-slate-400" />
                    {new Date(
                      detailModalItem.request_date,
                    ).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Duration
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Clock size={14} className="text-slate-400" />
                    {new Date(detailModalItem.start_date).toLocaleDateString(
                      "en-US",
                    )}{" "}
                    -{" "}
                    {new Date(
                      detailModalItem.end_date,
                    ).toLocaleDateString("en-US")}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Current Status
                  </p>
                  {renderStatusBadge(detailModalItem.status)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Program & Benefit
                  </p>
                  <div className="flex items-start gap-2 flex-col">
                    <span className="inline-block px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
                      {detailModalItem.program_category || "Regular"}
                    </span>
                    <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                      <Tag size={14} className="text-slate-400" />
                      {detailModalItem.promotion_type}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Quantity (Qty)
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {detailModalItem.quantity} Pcs
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Sales Notes
                </p>
                <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 text-sm text-slate-700 leading-relaxed">
                  <FileText
                    size={16}
                    className="inline-block mr-1.5 text-slate-400 -mt-0.5"
                  />
                  {detailModalItem.sales_notes || (
                    <span className="italic text-slate-400">
                      No additional notes.
                    </span>
                  )}
                </div>
              </div>

              {detailModalItem.revision_notes && (
                <div className="md:col-span-2 p-4 rounded-md bg-red-50 border border-red-200">
                  <p className="text-xs font-bold text-red-700 uppercase flex items-center gap-1.5 mb-2">
                    <AlertCircle size={16} /> Revision Notes
                  </p>
                  <p className="text-sm text-red-900 italic leading-relaxed">
                    "{detailModalItem.revision_notes}"
                  </p>
                </div>
              )}

              {detailModalItem.attachment && (
                <div className="md:col-span-2 mt-2 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Attachments
                  </p>
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    {detailModalItem.attachment.match(
                      /\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i,
                    ) ? (
                      <div className="relative group shrink-0">
                        <img
                          src={detailModalItem.attachment}
                          alt="Attachment"
                          className="h-24 w-32 object-cover rounded border border-slate-300 shadow-sm"
                        />
                        <a
                          href={detailModalItem.attachment}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium rounded transition-opacity backdrop-blur-sm"
                        >
                          Open
                        </a>
                      </div>
                    ) : (
                      <div className="h-24 w-32 shrink-0 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-400 shadow-sm">
                        <FileText size={36} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        Support File
                      </p>
                      <p className="text-xs text-slate-500 mt-1 mb-3">
                        Document attached to this request.
                      </p>
                      <a
                        href={detailModalItem.attachment}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-300 py-1.5 px-4 rounded-md text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-colors"
                      >
                        <Eye size={14} /> Open Document
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200 bg-white">
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              {detailModalItem.status === "Sales Revision" && (
                <button
                  onClick={() => {
                    setModalEdit(detailModalItem);
                    setDetailModalItem(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  <Edit3 size={16} /> Revise Form
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {modalEdit && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <h4 className="text-xl font-bold mb-4">Revise Request</h4>
            <p className="text-sm text-slate-500 mb-6">
              Update the data below based on the revision notes.
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  New Promo Proposal
                </label>
                <input
                  type="text"
                  value={modalEdit.promotion_type}
                  onChange={(e) =>
                    setModalEdit({
                      ...modalEdit,
                      promotion_type: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  New Quantity (Qty)
                </label>
                <input
                  type="number"
                  value={modalEdit.quantity}
                  onChange={(e) =>
                    setModalEdit({
                      ...modalEdit,
                      quantity: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    New Start Date
                  </label>
                  <input
                    type="date"
                    value={modalEdit.start_date}
                    onChange={(e) =>
                      setModalEdit({
                        ...modalEdit,
                        start_date: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    New End Date
                  </label>
                  <input
                    type="date"
                    value={modalEdit.end_date}
                    onChange={(e) =>
                      setModalEdit({
                        ...modalEdit,
                        end_date: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Revision Notes
                </label>
                <textarea
                  value={modalEdit.sales_notes}
                  onChange={(e) =>
                    setModalEdit({
                      ...modalEdit,
                      sales_notes: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 resize-none"
                  rows="3"
                  placeholder="Explain the updates made..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setModalEdit(null)}
                  className="px-4 py-2 border rounded-md text-sm font-medium outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium outline-none"
                >
                  {isLoading ? "Processing..." : "Submit Revision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
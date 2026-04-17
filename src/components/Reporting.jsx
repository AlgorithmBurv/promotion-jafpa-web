import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  BarChart2, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  Inbox, FileSpreadsheet, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Reporting() {
  const [reportsData, setReportsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [startDate, setStartDate] = useState(""); 
  const [endDate, setEndDate] = useState("");     
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("promotion_requests")
        .select(
          `
          *,
          users:sales_id (full_name),
          customers (name)
        `,
        )
        .order("request_date", { ascending: false });

      if (error) throw error;
      setReportsData(data || []);
    } catch (error) {
      toast.error("Failed to fetch reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterCategory, startDate, endDate, sortBy]);

  const uniqueStatuses = [
    "All",
    ...Array.from(new Set(reportsData.map((item) => item.status))),
  ];
  const uniqueCategories = [
    "All",
    ...Array.from(
      new Set(reportsData.map((item) => item.program_category || "Regular")),
    ),
  ];

  let processedData = [...reportsData];

  if (searchQuery) {
    processedData = processedData.filter(
      (item) =>
        item.customers?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.users?.full_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.promotion_type?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  if (filterStatus !== "All")
    processedData = processedData.filter(
      (item) => item.status === filterStatus,
    );
  if (filterCategory !== "All")
    processedData = processedData.filter(
      (item) => (item.program_category || "Regular") === filterCategory,
    );

  if (startDate)
    processedData = processedData.filter(
      (item) => item.request_date >= startDate,
    );
  if (endDate)
    processedData = processedData.filter(
      (item) => item.request_date <= endDate,
    );

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

  const exportToExcel = () => {
    if (processedData.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const worksheetData = processedData.map((item, index) => ({
      No: index + 1,
      Date: new Date(item.request_date).toLocaleDateString("en-US"),
      Sales: item.users?.full_name,
      Customer: item.customers?.name,
      Product: item.target_products,
      Category: item.program_category || "Regular",
      Promo: item.promotion_type,
      Status: item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();

    let fileName = "Promo_Reports.xlsx";
    if (startDate && endDate)
      fileName = `Reports_${startDate}_to_${endDate}.xlsx`;
    else if (startDate) fileName = `Reports_from_${startDate}.xlsx`;
    else if (endDate) fileName = `Reports_until_${endDate}.xlsx`;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
    XLSX.writeFile(workbook, fileName);
    toast.success("Export successful!");
  };

  const renderStatusBadge = (status) => {
    const badges = {
      Approved: "bg-green-50 text-green-700 border-green-200",
      "Pending BusDev": "bg-orange-50 text-orange-700 border-orange-200",
      "Sales Revision": "bg-red-50 text-red-700 border-red-200",
      Rejected: "bg-slate-100 text-slate-700 border-slate-300",
    };
    const labels = {
      Approved: "Approved",
      "Pending BusDev": "Pending",
      "Sales Revision": "Revise",
      Rejected: "Rejected",
    };
    return (
      <span
        className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold border ${badges[status] || "bg-gray-100 text-gray-700"}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={24} className="text-orange-600" />
            <h2 className="text-xl font-bold text-slate-800">Reports</h2>
          </div>
          <p className="text-sm text-slate-500">
            All sales promo request records.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <FileSpreadsheet size={16} /> Export
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 border-y border-slate-100 py-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute inset-y-0 left-3 my-auto text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search customer, sales, or promo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-2 focus-within:ring-2 focus-within:ring-orange-600 focus-within:border-transparent transition-all">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-2 text-sm text-slate-600 outline-none cursor-pointer bg-transparent"
            />
            <span className="text-slate-300">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-2 text-sm text-slate-600 outline-none cursor-pointer bg-transparent"
            />
          </div>

          <div className="relative w-full sm:w-32">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none appearance-none cursor-pointer"
            >
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Status" : s}
                </option>
              ))}
            </select>
            <Filter
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={14}
            />
          </div>

          <div className="relative w-full sm:w-36">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none appearance-none cursor-pointer"
            >
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>
            <Filter
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={14}
            />
          </div>

          <div className="relative w-full sm:w-36">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm outline-none appearance-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
            <ArrowUpDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={14}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-xs uppercase">
              <th className="py-3 px-4">Date & Sales</th>
              <th className="py-3 px-4">Customer & Category</th>
              <th className="py-3 px-4">Promo & Product</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-slate-500">
                  Loading data...
                </td>
              </tr>
            ) : currentRows.length > 0 ? (
              currentRows.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors align-top"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 text-xs">
                      {new Date(item.request_date).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {item.users?.full_name}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-800">
                      {item.customers?.name}
                    </p>
                    <span className="inline-block px-1.5 py-0.5 mt-1 rounded bg-slate-100 text-slate-600 text-[10px] border border-slate-200 font-medium">
                      {item.program_category || "Regular"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-800">
                      {item.promotion_type}
                    </p>
                    <p
                      className="text-xs text-slate-500 mt-1 truncate max-w-[200px]"
                      title={item.target_products}
                    >
                      {item.target_products}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {renderStatusBadge(item.status)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-12">
                  <div className="flex flex-col items-center text-slate-400">
                    <Inbox size={40} className="mb-2 opacity-30" />
                    <p className="text-sm font-medium">No records found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {processedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
          <span>
            Showing{" "}
            <span className="font-bold text-slate-700">
              {indexOfFirstRow + 1}
            </span>{" "}
            -{" "}
            <span className="font-bold text-slate-700">
              {Math.min(indexOfLastRow, processedData.length)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-700">
              {processedData.length}
            </span>{" "}
            entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium text-slate-700 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { 
  History, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Inbox, FileText 
} from 'lucide-react';

export default function ManajemenLog() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTindakan, setFilterTindakan] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('log_riwayat_approval')
        .select(`
          *,
          master_users:id_reviewer (nama_lengkap, role),
          trx_pengajuan_promosi:id_pengajuan (
             jenis_promosi,
             master_customer (nama_customer)
          )
        `)
        .order('waktu_tindakan', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      toast.error('Failed to fetch activity logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTindakan, sortBy]);

  let processedData = [...logs];

  if (searchQuery) {
    processedData = processedData.filter(log => {
      const namaUser = log.master_users?.nama_lengkap?.toLowerCase() || '';
      const namaCustomer = log.trx_pengajuan_promosi?.master_customer?.nama_customer?.toLowerCase() || '';
      const catatan = log.catatan_reviewer?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();
      return namaUser.includes(q) || namaCustomer.includes(q) || catatan.includes(q);
    });
  }

  if (filterTindakan !== "All") {
    processedData = processedData.filter(log => log.tindakan === filterTindakan);
  }

  processedData.sort((a, b) => {
    const dateA = new Date(a.waktu_tindakan);
    const dateB = new Date(b.waktu_tindakan);
    if (sortBy === "newest") return dateB - dateA;
    if (sortBy === "oldest") return dateA - dateB;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedData.slice(indexOfFirstRow, indexOfLastRow);

  const renderBadgeTindakan = (tindakan) => {
    const badges = {
      "Submit": "bg-blue-50 text-blue-700 border-blue-200",
      "Setuju": "bg-green-50 text-green-700 border-green-200",
      "Tolak": "bg-slate-100 text-slate-700 border-slate-300",
      "Revisi": "bg-yellow-50 text-yellow-700 border-yellow-200"
    };
    const labels = {
      "Submit": "Submit",
      "Setuju": "Approve",
      "Tolak": "Reject",
      "Revisi": "Revise"
    };
    return (
      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${badges[tindakan] || 'bg-gray-100 text-gray-700'}`}>
        {labels[tindakan] || tindakan}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History size={20} className="text-orange-600" />
            <h2 className="text-xl font-bold text-slate-800">
              Activity Logs
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Monitor all request, revision, and approval history.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 px-3 py-1.5 rounded-md shadow-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 border-y border-slate-100 py-4 bg-slate-50/50 -mx-6 px-6 md:-mx-8 md:px-8">
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search user, customer, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none transition-all"
          />
        </div>

        <div className="relative w-full md:w-48">
          <Filter className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
          <select
            value={filterTindakan}
            onChange={(e) => setFilterTindakan(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm outline-none appearance-none cursor-pointer"
          >
            <option value="All">All Actions</option>
            <option value="Submit">Submit</option>
            <option value="Setuju">Approve</option>
            <option value="Revisi">Revise</option>
            <option value="Tolak">Reject</option>
          </select>
        </div>

        <div className="relative w-full md:w-48">
          <ArrowUpDown className="absolute inset-y-0 left-3 my-auto text-slate-400" size={16} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md py-2 pl-10 pr-3 text-sm outline-none appearance-none cursor-pointer"
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
              <th className="py-3 px-4 w-40">Time</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Customer & Request</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4 min-w-[250px]">Notes / Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-slate-500">
                  Loading data...
                </td>
              </tr>
            ) : currentRows.length > 0 ? (
              currentRows.map((log) => (
                <tr key={log.id_log} className="border-b border-slate-100 hover:bg-slate-50 transition-colors align-top">
                  <td className="py-3 px-4 text-slate-500">
                    <div className="text-xs font-medium text-slate-800">
                      {new Date(log.waktu_tindakan).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      {new Date(log.waktu_tindakan).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">
                      {log.master_users?.nama_lengkap || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {log.master_users?.role || "-"}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-800">
                      {log.trx_pengajuan_promosi?.master_customer?.nama_customer || "Deleted Data"}
                    </p>
                    <p className="text-xs text-slate-500 max-w-[200px] truncate" title={log.trx_pengajuan_promosi?.jenis_promosi}>
                      {log.trx_pengajuan_promosi?.jenis_promosi || "-"}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    {renderBadgeTindakan(log.tindakan)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-start gap-2 bg-white border border-slate-200 p-2 rounded-md shadow-sm whitespace-normal text-xs text-slate-600">
                      <FileText size={14} className="shrink-0 text-slate-400 mt-0.5" />
                      <span className="leading-relaxed">
                        {log.catatan_reviewer || "-"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-12">
                  <div className="flex flex-col items-center text-slate-400">
                    <Inbox size={40} className="mb-2 opacity-30" />
                    <p className="text-sm font-medium">
                      No activity records found.
                    </p>
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
            Showing <span className="font-bold text-slate-700">{indexOfFirstRow + 1}</span> - <span className="font-bold text-slate-700">{Math.min(indexOfLastRow, processedData.length)}</span> of <span className="font-bold text-slate-700">{processedData.length}</span> logs
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium text-slate-700 px-2">
              {currentPage} / {totalPages}
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border rounded-md disabled:opacity-30 hover:bg-slate-50 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
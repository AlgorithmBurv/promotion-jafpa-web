import React from 'react';
import { Menu, Bell } from 'lucide-react';

export default function Header({ activeMenu, currentUser, toggleSidebar }) {
  // Mapping ID menu ke judul bahasa Inggris yang sesuai
  const menuTitles = {
    promosi: currentUser.role === "Admin" ? "Manage Promos" : "Promo Info",
    form_pengajuan: "Submit Promo",
    status_pengajuan: "Promo Status",
    manajemen_user: "Manage Users",
    manajemen_customer: "Manage Customers",
    manajemen_produk: "Manage Products",
    log_aktivitas: "Activity Logs",
    reporting: "Reports",
    review_pengajuan: "Review Promos",
  };

  const displayTitle = menuTitles[activeMenu] || activeMenu.replace("_", " ");

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm p-4 md:px-8 md:py-5 flex justify-between items-center sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 text-slate-600 bg-white rounded-md shadow-sm border border-slate-200 hover:text-orange-600 hover:border-orange-300 transition-all"
        >
          <Menu size={20} />
        </button>
        {/* Hapus class 'capitalize' karena teks sudah berformat rapi dari mapping di atas */}
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          {displayTitle}
        </h2>
      </div>

      <div className="flex items-center gap-4 md:gap-5">
        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
        <div className="flex items-center gap-3 bg-orange-50 py-1.5 px-2 rounded-full border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-default">
          <div className="hidden md:flex flex-col items-end pr-2 pl-3">
            <span className="text-sm font-bold text-slate-800 leading-tight">
              {/* Penyesuaian ke full_name */}
              {currentUser.full_name}
            </span>
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
              {currentUser.role}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold shadow-md">
            {/* Penyesuaian ke full_name */}
            {currentUser.full_name.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
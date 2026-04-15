import React, { useState } from "react";
import {
  X,
  LogOut,
  FileText,
  CheckSquare,
  AlertCircle,
  Users,
  Tags,
  Package,
  UserPlus,
  History,
  BarChart2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function Sidebar({
  activeMenu,
  setActiveMenu,
  onLogout,
  currentUser,
  isOpen,
  setIsOpen,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const salesMenus = [
    { id: "promosi", label: "Promo Info", icon: <Tags size={20} /> },
    { id: "form_pengajuan", label: "Submit Promo", icon: <FileText size={20} /> },
    { id: "status_pengajuan", label: "Promo Status", icon: <CheckSquare size={20} /> },
  ];

  const adminMenus = [
    { id: "promosi", label: "Manage Promos", icon: <Tags size={20} /> },
    { id: "manajemen_user", label: "Manage Users", icon: <Users size={20} /> },
    { id: "manajemen_customer", label: "Manage Customers", icon: <UserPlus size={20} /> },
    { id: "manajemen_produk", label: "Manage Products", icon: <Package size={20} /> },
    { id: "log_aktivitas", label: "Activity Logs", icon: <History size={20} /> },
    { id: "reporting", label: "Reports", icon: <BarChart2 size={20} /> },
  ];

  const busDevMenus = [
    { id: "review_pengajuan", label: "Review Promos", icon: <CheckSquare size={20} /> },
    { id: "promosi", label: "Promo Info", icon: <Tags size={20} /> },
    { id: "reporting", label: "Reports", icon: <BarChart2 size={20} /> },
  ];

  let menuItems = [];
  if (currentUser?.role === "Admin") menuItems = adminMenus;
  else if (currentUser?.role === "BusDev") menuItems = busDevMenus;
  else menuItems = salesMenus;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} ${isCollapsed ? "md:w-20" : "md:w-72"} w-72 shrink-0`}
      >
        <div
          className={`p-6 flex items-center border-b border-slate-100 ${isCollapsed ? "justify-center px-0" : "justify-between"}`}
        >
          <div
            className={`transition-all duration-300 ${isCollapsed ? "scale-0 w-0 hidden" : "scale-100 w-auto block"}`}
          >
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight whitespace-nowrap">
              JAPFA <span className="text-orange-600">Food</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
              {currentUser?.role} PANEL
            </p>
          </div>

          {isCollapsed && (
            <div className="w-10 h-10 bg-orange-600 text-white font-extrabold text-xl rounded-lg flex items-center justify-center animate-in zoom-in">
              JF
            </div>
          )}

          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-700"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((menu) => (
            <button
              key={menu.id}
              title={isCollapsed ? menu.label : ""}
              onClick={() => {
                setActiveMenu(menu.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center py-3 px-3 rounded-md transition-colors text-sm font-medium ${isCollapsed ? "justify-center" : "gap-3"} ${activeMenu === menu.id ? "bg-orange-50 text-orange-600 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <span
                className={`shrink-0 transition-colors ${activeMenu === menu.id ? "text-orange-600" : "text-slate-400"}`}
              >
                {menu.icon}
              </span>
              <span
                className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"}`}
              >
                {menu.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 flex flex-col gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center py-2 px-3 rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors w-full border border-transparent hover:border-slate-200"
            title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          <button
            onClick={onLogout}
            title={isCollapsed ? "Logout" : ""}
            className={`w-full flex items-center py-2.5 px-3 rounded-md text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors ${isCollapsed ? "justify-center" : "justify-center gap-2"}`}
          >
            <LogOut size={20} className="shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"}`}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
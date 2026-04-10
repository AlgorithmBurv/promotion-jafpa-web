import React, { useState } from 'react';
import { 
  X, LogOut, LayoutDashboard, FileText, CheckSquare, AlertCircle, 
  Users, Tags, Package, UserPlus, History, BarChart2, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function Sidebar({ activeMenu, setActiveMenu, onLogout, currentUser, isOpen, setIsOpen }) {
  // State untuk melipat Sidebar di mode Desktop
  const [isCollapsed, setIsCollapsed] = useState(false);

  const salesMenus = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'promosi', label: 'Info Promosi', icon: <Tags size={20} /> },
    { id: 'form_pengajuan', label: 'Pengajuan Promosi', icon: <FileText size={20} /> },
    { id: 'status_pengajuan', label: 'Status Pengajuan', icon: <CheckSquare size={20} /> },
  ];

  const adminMenus = [
    { id: 'promosi', label: 'Manajemen Promosi', icon: <Tags size={20} /> },
    { id: 'manajemen_user', label: 'Manajemen User', icon: <Users size={20} /> },
    { id: 'manajemen_customer', label: 'Manajemen Customer', icon: <UserPlus size={20} /> },
    { id: 'manajemen_produk', label: 'Manajemen Produk', icon: <Package size={20} /> },
    { id: 'log_aktivitas', label: 'Log Aktivitas', icon: <History size={20} /> },
    { id: 'reporting', label: 'Laporan', icon: <BarChart2 size={20} /> },
  ];

  const busDevMenus = [
    { id: 'review_pengajuan', label: 'Review Pengajuan', icon: <CheckSquare size={20} /> },
    { id: 'promosi', label: 'Info Promosi', icon: <Tags size={20} /> },
  ];

  let menuItems = [];
  if (currentUser?.role === 'Admin') menuItems = adminMenus;
  else if (currentUser?.role === 'BusDev') menuItems = busDevMenus;
  else menuItems = salesMenus;

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden transition-opacity" 
          onClick={() => setIsOpen(false)} 
        />
      )}
      
      {/* Container Sidebar Dinamis */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 bg-white border-r border-slate-200 
        flex flex-col transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-72'} 
        w-72 shrink-0
      `}>
        
        {/* Header Logo */}
        <div className={`p-6 flex items-center border-b border-slate-100 ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
          <div className={`transition-all duration-300 ${isCollapsed ? 'scale-0 w-0 hidden' : 'scale-100 w-auto block'}`}>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight whitespace-nowrap">
              JAPFA <span className="text-blue-900">Food</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
              {currentUser?.role} PANEL
            </p>
          </div>
          
          {/* Logo Singkat untuk Mode Collapsed */}
          {isCollapsed && (
            <div className="w-10 h-10 bg-blue-900 text-white font-extrabold text-xl rounded-lg flex items-center justify-center animate-in zoom-in">
              JF
            </div>
          )}

          <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-slate-700">
            <X size={24} />
          </button>
        </div>

        {/* List Menu */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((menu) => (
            <button 
              key={menu.id}
              title={isCollapsed ? menu.label : ""}
              onClick={() => {
                setActiveMenu(menu.id);
                setIsOpen(false); 
              }}
              className={`w-full flex items-center py-3 px-3 rounded-md transition-colors text-sm font-medium
                ${isCollapsed ? 'justify-center' : 'gap-3'}
                ${activeMenu === menu.id 
                  ? 'bg-blue-50 text-blue-900 font-bold' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`shrink-0 transition-colors ${activeMenu === menu.id ? 'text-blue-900' : 'text-slate-400'}`}>
                {menu.icon}
              </span>
              <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
                {menu.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Footer Sidebar (Toggle Collapse & Logout) */}
        <div className="p-4 border-t border-slate-200 flex flex-col gap-2">
          {/* Tombol Collapse Khusus Desktop */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center py-2 px-3 rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors w-full border border-transparent hover:border-slate-200"
            title={isCollapsed ? "Perlebar Menu" : "Perkecil Menu"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          <button 
            onClick={onLogout} 
            title={isCollapsed ? "Logout" : ""}
            className={`w-full flex items-center py-2.5 px-3 rounded-md text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors
              ${isCollapsed ? 'justify-center' : 'justify-center gap-2'}
            `}
          >
            <LogOut size={20} className="shrink-0" /> 
            <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
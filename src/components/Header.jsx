import React from 'react';
import { Menu, Bell } from 'lucide-react';

export default function Header({ activeMenu, currentUser, toggleSidebar }) {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm p-4 md:px-8 md:py-5 flex justify-between items-center sticky top-0 z-20">
      
      {/* Bagian Kiri: Tombol Hamburger & Judul Halaman */}
      <div className="flex items-center gap-4">
        {/* Tombol menu untuk Mobile disesuaikan ke rounded-md seperti form */}
        <button 
          onClick={toggleSidebar} 
          className="md:hidden p-2 text-slate-600 bg-white rounded-md shadow-sm border border-slate-200 hover:text-blue-900 hover:border-blue-300 transition-all"
        >
          <Menu size={20} />
        </button>
        
        <h2 className="text-xl font-bold text-slate-800 capitalize tracking-tight">
          {activeMenu.replace('_', ' ')}
        </h2>
      </div>
      
      {/* Bagian Kanan: Notifikasi & Profil Pengguna */}
      <div className="flex items-center gap-4 md:gap-5">
        
   
        
        {/* Garis Pembatas (Hanya tampil di Desktop) */}
        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

        {/* Kotak Profil disesuaikan menggunakan border-slate dan tanpa transparansi */}
        <div className="flex items-center gap-3 bg-slate-50 py-1.5 px-2 rounded-full border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-default">
          
          {/* Info Nama & Role */}
          <div className="hidden md:flex flex-col items-end pr-2 pl-3">
            <span className="text-sm font-bold text-slate-800 leading-tight">
              {currentUser.nama_lengkap}
            </span>
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
              {currentUser.role}
            </span>
          </div>
          
          {/* Avatar Inisial Nama (Menjadi biru gelap) */}
          <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold shadow-md">
            {currentUser.nama_lengkap.charAt(0)}
          </div>
          
        </div>
      </div>
      
    </header>
  );
}
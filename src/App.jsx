import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Toaster } from "react-hot-toast";

// Import Komponen
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import FormPengajuan from "./components/FormPengajuan";
import StatusPengajuan from "./components/StatusPengajuan";
import ManajemenUser from "./components/ManajemenUser";
import ManajemenPromosi from "./components/ManajemenPromosi";
import DashboardBusDev from "./components/DashboardBusDev";
import ManajemenCustomer from "./components/ManajemenCustomer";
import ManajemenProduk from "./components/ManajemenProduk";
import ManajemenLog from "./components/ManajemenLog";
import Reporting from "./components/Reporting";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [masterProduk, setMasterProduk] = useState([]);
  const [masterCustomer, setMasterCustomer] = useState([]);
  const [masterPromosi, setMasterPromosi] = useState([]);
  const [daftarPengajuan, setDaftarPengajuan] = useState([]);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === "Admin") {
      setActiveMenu("manajemen_user");
    } else if (user.role === "BusDev") {
      setActiveMenu("review_pengajuan");
    } else {
      // Default menu untuk Sales diubah menjadi form pengajuan karena dashboard dihapus
      setActiveMenu("form_pengajuan");
    }
  };

  const fetchData = async () => {
    if (!currentUser) return;

    try {
      const { data: promosi } = await supabase
        .from("master_promosi")
        .select("*")
        .eq("is_active", true);
      setMasterPromosi(promosi || []);

      if (currentUser.role === "Sales") {
        const { data: produk } = await supabase
          .from("master_produk")
          .select("*");
        const { data: customer } = await supabase
          .from("master_customer")
          .select("*");

        const { data: pengajuan } = await supabase
          .from("trx_pengajuan_promosi")
          .select(
            `*, master_customer ( nama_customer ), master_produk ( nama_produk )`,
          )
          .eq("id_sales", currentUser.id_user)
          .order("created_at", { ascending: false });

        setMasterProduk(produk || []);
        setMasterCustomer(customer || []);
        setDaftarPengajuan(pengajuan || []);
      } else if (currentUser.role === "BusDev") {
        const { data: pengajuanBusdev } = await supabase
          .from("trx_pengajuan_promosi")
          .select(
            `*, master_customer ( nama_customer ), master_produk ( nama_produk )`,
          )
          .order("created_at", { ascending: false });

        setDaftarPengajuan(pengajuanBusdev || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, activeMenu]);

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="bg-[#f8fafc] text-slate-800 font-sans flex h-screen overflow-hidden relative">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-orange-100/50 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-50/60 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="flex w-full h-full relative z-10">
        <Sidebar
          activeMenu={activeMenu}
          setActiveMenu={(menu) => {
            setActiveMenu(menu);
            setIsSidebarOpen(false);
          }}
          onLogout={handleLogout}
          currentUser={currentUser}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />

        <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full">
          <Header
            activeMenu={activeMenu}
            currentUser={currentUser}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            {/* KOMPONEN INI BISA DIAKSES SEMUA ROLE: Admin (Kelola) & Sales/BusDev (Lihat) */}
            {activeMenu === "promosi" && (
              <ManajemenPromosi currentUser={currentUser} />
            )}

            {/* Menu Khusus Sales */}
            {activeMenu === "form_pengajuan" &&
              currentUser.role === "Sales" && (
                <FormPengajuan
                  currentUser={currentUser}
                  masterProduk={masterProduk}
                  masterCustomer={masterCustomer}
                  masterPromosi={masterPromosi}
                  onSuccess={() => {
                    fetchData();
                    setActiveMenu("status_pengajuan");
                  }}
                />
              )}

            {activeMenu === "status_pengajuan" &&
              currentUser.role === "Sales" && (
                <StatusPengajuan
                  daftarPengajuan={daftarPengajuan}
                  onSuccess={fetchData}
                />
              )}

            {/* Menu Khusus BusDev */}
            {activeMenu === "review_pengajuan" &&
              currentUser.role === "BusDev" && (
                <DashboardBusDev
                  currentUser={currentUser}
                  daftarPengajuan={daftarPengajuan}
                  onSuccess={fetchData}
                />
              )}

            {/* Menu Khusus Admin */}
            {activeMenu === "manajemen_user" &&
              currentUser.role === "Admin" && <ManajemenUser />}

            {activeMenu === "manajemen_customer" &&
              currentUser.role === "Admin" && <ManajemenCustomer />}

            {activeMenu === "manajemen_produk" &&
              currentUser.role === "Admin" && <ManajemenProduk />}

            {activeMenu === "log_aktivitas" && currentUser.role === "Admin" && (
              <ManajemenLog />
            )}

            {/* Izinkan Admin ATAU BusDev untuk melihat Reporting */}
            {activeMenu === "reporting" &&
              (currentUser.role === "Admin" ||
                currentUser.role === "BusDev") && <Reporting />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
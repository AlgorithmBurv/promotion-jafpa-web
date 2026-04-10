import React, { useMemo } from "react";
import {
  CheckCircle2,
  FileText,
  AlertCircle,
  TrendingUp,
  PieChart as PieIcon,
  X // <--- TAMBAHKAN X DI SINI
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function Dashboard({ currentUser, daftarPengajuan }) {
  // Hitung jumlah berdasarkan status
  const disetujui = daftarPengajuan.filter(
    (p) => p.status_terakhir === "Disetujui",
  );
  const revisiSales = daftarPengajuan.filter(
    (p) => p.status_terakhir === "Revisi Sales",
  );
  const menungguReview = daftarPengajuan.filter(
    (p) => p.status_terakhir === "Menunggu Review BusDev",
  );
  const ditolak = daftarPengajuan.filter(
    (p) => p.status_terakhir === "Ditolak",
  );

  // Siapkan Data untuk Bar Chart (Total Omset berdasarkan Jenis Promosi)
  const barChartData = useMemo(() => {
    const dataMap = daftarPengajuan.reduce((acc, curr) => {
      const jenis = curr.jenis_promosi || "Lainnya";
      if (!acc[jenis]) acc[jenis] = { nama: jenis, totalOmset: 0 };
      acc[jenis].totalOmset += Number(curr.omset_perbulan) || 0;
      return acc;
    }, {});

    return Object.values(dataMap);
  }, [daftarPengajuan]);

  // Siapkan Data untuk Pie/Donut Chart (Persentase Status)
  const pieChartData = [
    { name: "Disetujui", value: disetujui.length, color: "#10b981" }, // Hijau (Sukses)
    { name: "Menunggu Review", value: menungguReview.length, color: "#eab308" }, // Kuning Aksen (Proses)
    { name: "Perlu Revisi", value: revisiSales.length, color: "#ef4444" }, // Merah (Peringatan)
  ];

  // Kustomisasi Tooltip Bar Chart untuk format Rupiah
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-md shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-semibold mb-1">{label}</p>
          <p className="text-slate-800 font-bold text-sm">
            Rp {payload[0].value.toLocaleString("id-ID")}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ----- Header Section ----- */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Ringkasan Promosi</h2>
        <p className="text-slate-500 mt-1 text-sm">
          Performa dan status pengajuan promosi bulan ini.
        </p>
      </div>

      {/* ----- Metric Cards ----- */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              Total Pengajuan
            </p>
            <h4 className="text-3xl font-bold text-slate-800">
              {daftarPengajuan.length}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-blue-900">
            <FileText size={20} />
          </div>
        </div>

        {/* Card 2: Disetujui */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              Telah Disetujui
            </p>
            <h4 className="text-3xl font-bold text-slate-800">
              {disetujui.length}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-md bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 3: Revisi */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              Perlu Revisi
            </p>
            <h4 className="text-3xl font-bold text-slate-800">
              {revisiSales.length}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-md bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle size={20} />
          </div>
        </div>
        {/* Card 4: Menunggu Review */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Ditolak</p>
          <h4 className="text-3xl font-bold text-slate-800">
            {ditolak.length}
          </h4>
        </div>
        <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
          <X size={20} />
        </div>
      </div>
      </div>


      {/* ----- Charts Section ----- */}
      {daftarPengajuan.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart: Target Omset */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-blue-900" />
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Proyeksi Omset
                </h3>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="nama"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(value) => `Rp${value / 1000000}M`}
                  />
                  <RechartsTooltip
                    content={<CustomBarTooltip />}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar
                    dataKey="totalOmset"
                    fill="#1e3a8a" // Biru Tua (Warna Utama Profesional)
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart: Status Distribusi */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon size={18} className="text-blue-900" />
              <h3 className="text-base font-bold text-slate-800">
                Distribusi Status
              </h3>
            </div>

            <div className="h-[280px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#1e293b",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-slate-600 font-medium ml-1 text-sm">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Teks di tengah Donut Chart */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-6">
                <span className="text-2xl font-bold text-slate-800">
                  {daftarPengajuan.length}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  Total
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  Package,
  User,
  Tag,
  FileText,
  Send,
  ChevronDown,
  AlertOctagon,
  Search,
  UploadCloud,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";

export default function FormPengajuan({
  currentUser,
  masterProduk,
  masterCustomer,
  masterPromosi,
  onSuccess,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);

  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchProduk, setSearchProduk] = useState("");
  const [fileLampiran, setFileLampiran] = useState(null);

  const [formData, setFormData] = useState({
    id_produk: "",
    id_customer: "",
    tanggal_pengajuan: new Date().toISOString().split("T")[0],
    kategori_program: "",
    kuantitas_produk: "",
    jenis_promosi: "",
    durasi_mulai: "",
    durasi_selesai: "",
    keterangan_sales: "",
  });

  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (
      masterPromosi &&
      masterPromosi.length > 0 &&
      !formData.kategori_program
    ) {
      setFormData((prev) => ({
        ...prev,
        kategori_program: masterPromosi[0].nama_promosi,
      }));
    }
  }, [masterPromosi]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (errors[name]) setErrors({ ...errors, [name]: null });

    if (name === "id_customer") {
      const detail = masterCustomer.find(
        (c) => c.id_customer.toString() === value,
      );
      setSelectedCustomerDetail(detail || null);
    }
  };

  const filteredCustomers = masterCustomer.filter((c) =>
    c.nama_customer.toLowerCase().includes(searchCustomer.toLowerCase()),
  );
  const filteredProduk = masterProduk.filter((p) =>
    p.nama_produk.toLowerCase().includes(searchProduk.toLowerCase()),
  );

  const isPembayaranMacet =
    selectedCustomerDetail?.status_pembayaran?.toLowerCase() === "macet" ||
    selectedCustomerDetail?.status_pembayaran?.toLowerCase() === "tersendat";

  const validateStep = (currentStep) => {
    let newErrors = {};
    if (currentStep === 1) {
      if (!formData.kategori_program)
        newErrors.kategori_program = "Select promo program";
      if (!formData.id_customer) newErrors.id_customer = "Select customer";
      if (!formData.id_produk) newErrors.id_produk = "Select product";
    }
    if (currentStep === 2) {
      if (!formData.jenis_promosi)
        newErrors.jenis_promosi = "Promo proposal required";
      if (!formData.kuantitas_produk)
        newErrors.kuantitas_produk = "Quantity required";
      if (!formData.durasi_mulai)
        newErrors.durasi_mulai = "Start date required";
      if (!formData.durasi_selesai)
        newErrors.durasi_selesai = "End date required";
      if (formData.durasi_selesai < formData.durasi_mulai)
        newErrors.durasi_selesai = "Invalid end date";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFileLampiran(e.dataTransfer.files[0]);
    }
  };

  const handleFinalSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      toast.error("Please complete previous steps!");
      return;
    }

    const isConfirmed = window.confirm("Submit this request?");
    if (!isConfirmed) return;

    setIsLoading(true);

    try {
      const finalCustomerId = parseInt(formData.id_customer);
      const { data: existingPromos, error: checkError } = await supabase
        .from("trx_pengajuan_promosi")
        .select("durasi_mulai, durasi_selesai")
        .eq("id_customer", finalCustomerId)
        .in("status_terakhir", ["Menunggu Review BusDev", "Disetujui"]);

      if (checkError) throw checkError;
      const isOverlapping = existingPromos.some(
        (p) =>
          formData.durasi_mulai <= p.durasi_selesai &&
          formData.durasi_selesai >= p.durasi_mulai,
      );
      if (isOverlapping)
        throw new Error("Active promo exists for these dates!");

      let fileUrl = null;
      if (fileLampiran) {
        const fileExt = fileLampiran.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `pengajuan/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("lampiran_bucket")
          .upload(filePath, fileLampiran);
        if (uploadError)
          throw new Error(`Upload failed: ${uploadError.message}`);
        const { data: publicUrlData } = supabase.storage
          .from("lampiran_bucket")
          .getPublicUrl(filePath);
        fileUrl = publicUrlData.publicUrl;
      }

      const { data: trxData, error: trxError } = await supabase
        .from("trx_pengajuan_promosi")
        .insert([
          {
            id_sales: currentUser.id_user,
            id_produk: parseInt(formData.id_produk),
            id_customer: finalCustomerId,
            tanggal_pengajuan: formData.tanggal_pengajuan,
            kategori_program: formData.kategori_program,
            kuantitas_produk: parseInt(formData.kuantitas_produk),
            jenis_promosi: formData.jenis_promosi,
            durasi_mulai: formData.durasi_mulai,
            durasi_selesai: formData.durasi_selesai,
            keterangan_sales: formData.keterangan_sales,
            file_bukti_pendukung: fileUrl,
            status_terakhir: "Menunggu Review BusDev",
          },
        ])
        .select();

      if (trxError) throw trxError;

      await supabase.from("log_riwayat_approval").insert([
        {
          id_pengajuan: trxData[0].id_pengajuan,
          id_reviewer: currentUser.id_user,
          tindakan: "Submit",
          catatan_reviewer: `Submitted ${formData.kategori_program} program.`,
        },
      ]);

      toast.success("Promo request submitted!");
      onSuccess();
    } catch (error) {
      toast.error(error.message, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      if (step < 3) nextStep();
      else handleFinalSubmit();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h2 className="text-xl font-bold text-slate-800">Promo Request Form</h2>
        <div className="flex items-center mt-6">
          {[1, 2, 3].map((num) => (
            <React.Fragment key={num}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors ${step >= num ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-400"}`}
              >
                {step > num ? <CheckCircle2 size={16} /> : num}
              </div>
              {num < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded-full transition-colors ${step > num ? "bg-orange-600" : "bg-slate-100"}`}
                ></div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs font-semibold text-slate-500 uppercase">
          <span className={step >= 1 ? "text-orange-600" : ""}>
            Select Data
          </span>
          <span className={step >= 2 ? "text-orange-600" : ""}>Details</span>
          <span className={step === 3 ? "text-orange-600" : ""}>
            Attachment
          </span>
        </div>
      </div>

      <form onKeyDown={handleKeyDown}>
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-slate-50 rounded-md p-4 border border-slate-200">
              <label className="font-semibold text-slate-800 text-sm mb-3 block">
                Promo Program
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {masterPromosi.map((prog) => (
                  <label
                    key={prog.id_promosi}
                    className={`cursor-pointer border rounded-md p-3 text-center transition-all ${formData.kategori_program === prog.nama_promosi ? "border-orange-600 bg-orange-50 text-orange-600 ring-1 ring-orange-600" : "border-slate-300 bg-white hover:bg-slate-50 text-slate-600"}`}
                  >
                    <input
                      type="radio"
                      name="kategori_program"
                      value={prog.nama_promosi}
                      checked={formData.kategori_program === prog.nama_promosi}
                      onChange={handleFormChange}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold">
                      {prog.nama_promosi}
                    </span>
                  </label>
                ))}
              </div>
              {errors.kategori_program && (
                <p className="text-red-500 text-xs mt-2">
                  {errors.kategori_program}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Customer
                </label>
                <div className="relative mb-2">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-8 pr-3 text-xs focus:ring-1 focus:ring-orange-600 outline-none"
                  />
                </div>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <select
                    name="id_customer"
                    value={formData.id_customer}
                    onChange={handleFormChange}
                    className={`w-full bg-white border rounded-md py-2 pl-9 pr-8 text-sm focus:ring-2 focus:ring-orange-600 appearance-none outline-none ${errors.id_customer ? "border-red-500" : "border-slate-300"}`}
                  >
                    <option value="" disabled>
                      -- Select Customer --
                    </option>
                    {filteredCustomers.map((c) => (
                      <option key={c.id_customer} value={c.id_customer}>
                        {c.nama_customer}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                </div>
                {errors.id_customer && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.id_customer}
                  </p>
                )}

                {selectedCustomerDetail && (
                  <div
                    className={`mt-3 p-3 rounded-md border grid grid-cols-2 gap-3 ${isPembayaranMacet ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}
                  >
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">
                        Stability
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {selectedCustomerDetail.kestabilan}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">
                        Payment
                      </p>
                      <p
                        className={`text-sm font-medium ${isPembayaranMacet ? "text-red-600" : "text-slate-800"}`}
                      >
                        {selectedCustomerDetail.status_pembayaran}
                      </p>
                    </div>
                  </div>
                )}
                {isPembayaranMacet && (
                  <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertOctagon size={18} className="shrink-0 mt-0.5" />
                    <p>Blocked! Customer has bad payment history.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Product
                </label>
                <div className="relative mb-2">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={searchProduk}
                    onChange={(e) => setSearchProduk(e.target.value)}
                    disabled={isPembayaranMacet}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-8 pr-3 text-xs disabled:opacity-50 outline-none"
                  />
                </div>
                <div className="relative">
                  <Package
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <select
                    name="id_produk"
                    value={formData.id_produk}
                    onChange={handleFormChange}
                    disabled={isPembayaranMacet}
                    className={`w-full bg-white border rounded-md py-2 pl-9 pr-8 text-sm focus:ring-2 focus:ring-orange-600 appearance-none disabled:bg-slate-100 outline-none ${errors.id_produk ? "border-red-500" : "border-slate-300"}`}
                  >
                    <option value="" disabled>
                      -- Select Product --
                    </option>
                    {filteredProduk.map((p) => (
                      <option key={p.id_produk} value={p.id_produk}>
                        {p.nama_produk}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                </div>
                {errors.id_produk && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.id_produk}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Promo Proposal
              </label>
              <div className="relative">
                <Tag
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  name="jenis_promosi"
                  value={formData.jenis_promosi}
                  onChange={handleFormChange}
                  placeholder="E.g., 10% Discount + Sample"
                  className={`w-full bg-white border rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none ${errors.jenis_promosi ? "border-red-500" : "border-slate-300"}`}
                />
              </div>
              {errors.jenis_promosi && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.jenis_promosi}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantity (Qty)
              </label>
              <div className="relative">
                <Package
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="number"
                  name="kuantitas_produk"
                  min="0"
                  value={formData.kuantitas_produk}
                  onChange={handleFormChange}
                  placeholder="1500"
                  className={`w-full bg-white border rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none ${errors.kuantitas_produk ? "border-red-500" : "border-slate-300"}`}
                />
              </div>
              {errors.kuantitas_produk && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.kuantitas_produk}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="durasi_mulai"
                  min={todayDate}
                  value={formData.durasi_mulai}
                  onChange={handleFormChange}
                  className={`w-full bg-white border rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none ${errors.durasi_mulai ? "border-red-500" : "border-slate-300"}`}
                />
                {errors.durasi_mulai && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.durasi_mulai}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="durasi_selesai"
                  min={formData.durasi_mulai || todayDate}
                  value={formData.durasi_selesai}
                  onChange={handleFormChange}
                  className={`w-full bg-white border rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none ${errors.durasi_selesai ? "border-red-500" : "border-slate-300"}`}
                />
                {errors.durasi_selesai && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.durasi_selesai}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Additional Notes
              </label>
              <textarea
                name="keterangan_sales"
                value={formData.keterangan_sales}
                onChange={handleFormChange}
                rows="3"
                placeholder="Write notes or analysis..."
                className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-orange-600 resize-none outline-none"
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Attachment (Optional)
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${isDragging ? "border-orange-500 bg-orange-100 scale-[1.02]" : "border-slate-300 hover:bg-slate-50"} ${fileLampiran ? "border-green-500 bg-green-50" : ""}`}
              >
                <input
                  type="file"
                  onChange={(e) => setFileLampiran(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <div className="flex flex-col items-center pointer-events-none">
                  <UploadCloud
                    className={`${fileLampiran ? "text-green-600" : isDragging ? "text-orange-600" : "text-slate-400"} mb-3`}
                    size={32}
                  />
                  <p
                    className={`text-sm font-bold ${fileLampiran ? "text-green-800" : isDragging ? "text-orange-800" : "text-slate-600"}`}
                  >
                    {fileLampiran
                      ? fileLampiran.name
                      : isDragging
                        ? "Drop file here..."
                        : "Click or drag file here"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Max 5MB (PDF, JPG, PNG)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="inline-flex items-center gap-1 text-slate-600 font-medium py-2 px-4 rounded-md text-sm hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={isPembayaranMacet && step === 1}
              className="inline-flex items-center gap-1 bg-orange-600 text-white font-medium py-2 px-6 rounded-md text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md text-sm transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                "Processing..."
              ) : (
                <>
                  <Send size={16} /> Submit Now
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

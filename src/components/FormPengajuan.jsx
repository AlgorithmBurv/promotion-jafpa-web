import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";
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

  // State untuk modal konfirmasi submit
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const [formData, setFormData] = useState({
    product_ids: [],
    customer_id: "",
    request_date: new Date().toISOString().split("T")[0],
    program_category: "",
    quantity: "",
    promotion_type: "",
    start_date: "",
    end_date: "",
    sales_notes: "",
  });

  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (
      masterPromosi &&
      masterPromosi.length > 0 &&
      !formData.program_category
    ) {
      setFormData((prev) => ({
        ...prev,
        program_category: masterPromosi[0].name,
      }));
    }
  }, [masterPromosi]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (errors[name]) setErrors({ ...errors, [name]: null });

    if (name === "customer_id") {
      const detail = masterCustomer.find((c) => c.id.toString() === value);
      setSelectedCustomerDetail(detail || null);
    }
  };

  const filteredCustomers = masterCustomer.filter((c) =>
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()),
  );
  const filteredProduk = masterProduk.filter((p) =>
    p.name.toLowerCase().includes(searchProduk.toLowerCase()),
  );

  const isPembayaranMacet =
    selectedCustomerDetail?.payment_status === "Bad Debt" ||
    selectedCustomerDetail?.payment_status === "Delayed";

  const validateStep = (currentStep) => {
    let newErrors = {};
    if (currentStep === 1) {
      if (!formData.program_category)
        newErrors.program_category = "Select promo program";
      if (!formData.customer_id) newErrors.customer_id = "Select customer";
      if (!formData.product_ids || formData.product_ids.length === 0)
        newErrors.product_ids = "Select at least one product";
    }
    if (currentStep === 2) {
      if (!formData.promotion_type)
        newErrors.promotion_type = "Promo proposal required";
      if (!formData.quantity) newErrors.quantity = "Quantity required";
      if (!formData.start_date) newErrors.start_date = "Start date required";
      if (!formData.end_date) newErrors.end_date = "End date required";
      if (formData.end_date < formData.start_date)
        newErrors.end_date = "Invalid end date";
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

  const handleFinalSubmit = () => {
    if (!validateStep(1) || !validateStep(2)) {
      toast.error("Please complete previous steps!");
      return;
    }
    // Buka konfirmasi modal
    setConfirmSubmit(true);
  };

  const executeSubmit = async () => {
    setIsLoading(true);

    try {
      const finalCustomerId = parseInt(formData.customer_id);

      const { data: existingPromos, error: checkError } = await supabase
        .from("promotion_requests")
        .select("start_date, end_date")
        .eq("customer_id", finalCustomerId)
        .in("status", ["Pending BusDev", "Approved"]);

      if (checkError) throw checkError;
      const isOverlapping = existingPromos.some(
        (p) =>
          formData.start_date <= p.end_date &&
          formData.end_date >= p.start_date,
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

      const selectedProductsName = masterProduk
        .filter((p) => formData.product_ids.includes(p.id))
        .map((p) => p.name)
        .join(", ");

      const payload = {
        sales_id: currentUser.id,
        target_products: selectedProductsName,
        customer_id: finalCustomerId,
        request_date: formData.request_date,
        program_category: formData.program_category,
        quantity: parseInt(formData.quantity),
        promotion_type: formData.promotion_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        sales_notes: formData.sales_notes,
        attachment: fileUrl,
        status: "Pending BusDev",
      };

      const { data: trxData, error: trxError } = await supabase
        .from("promotion_requests")
        .insert([payload])
        .select();

      if (trxError) throw trxError;

      const { error: logError } = await supabase.from("approval_logs").insert([
        {
          request_id: trxData[0].id,
          reviewer_id: currentUser.id,
          action: "Submit",
          reviewer_notes: `Submitted ${formData.program_category} program.`,
        },
      ]);

      if (logError) throw logError;

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
                    key={prog.id}
                    className={`cursor-pointer border rounded-md p-3 text-center transition-all ${formData.program_category === prog.name ? "border-orange-600 bg-orange-50 text-orange-600 ring-1 ring-orange-600" : "border-slate-300 bg-white hover:bg-slate-50 text-slate-600"}`}
                  >
                    <input
                      type="radio"
                      name="program_category"
                      value={prog.name}
                      checked={formData.program_category === prog.name}
                      onChange={handleFormChange}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold">
                      {prog.name}
                    </span>
                  </label>
                ))}
              </div>
              {errors.program_category && (
                <p className="text-red-500 text-xs mt-2">
                  {errors.program_category}
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
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleFormChange}
                    className={`w-full bg-white border rounded-md py-2 pl-9 pr-8 text-sm focus:ring-2 focus:ring-orange-600 appearance-none outline-none ${errors.customer_id ? "border-red-500" : "border-slate-300"}`}
                  >
                    <option value="" disabled>
                      -- Select Customer --
                    </option>
                    {filteredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                </div>
                {errors.customer_id && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.customer_id}
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
                        {selectedCustomerDetail.stability}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">
                        Payment
                      </p>
                      <p
                        className={`text-sm font-medium ${isPembayaranMacet ? "text-red-600" : "text-slate-800"}`}
                      >
                        {selectedCustomerDetail.payment_status}
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
                  Target Product(s)
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

                <div
                  className={`max-h-48 overflow-y-auto border rounded-md bg-white ${errors.product_ids ? "border-red-500" : "border-slate-300"} ${isPembayaranMacet ? "opacity-50 pointer-events-none bg-slate-50" : ""}`}
                >
                  {filteredProduk.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.product_ids.includes(p.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          let newIds = [...formData.product_ids];

                          if (isChecked) {
                            newIds.push(p.id);
                          } else {
                            newIds = newIds.filter((id) => id !== p.id);
                          }

                          setFormData({ ...formData, product_ids: newIds });
                          if (errors.product_ids)
                            setErrors({ ...errors, product_ids: null });
                        }}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-600 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700">{p.name}</span>
                    </label>
                  ))}
                  {filteredProduk.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-3">
                      No products found.
                    </p>
                  )}
                </div>

                <div className="mt-1 flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    {formData.product_ids.length} Selected
                  </span>
                  {errors.product_ids && (
                    <p className="text-red-500 text-xs">{errors.product_ids}</p>
                  )}
                </div>
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
                  name="promotion_type"
                  value={formData.promotion_type}
                  onChange={handleFormChange}
                  placeholder="E.g., 10% Discount + Sample"
                  className={`w-full bg-white border rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none ${errors.promotion_type ? "border-red-500" : "border-slate-300"}`}
                />
              </div>
              {errors.promotion_type && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.promotion_type}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantity (Kg)
              </label>
              <div className="relative">
                <Package
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="number"
                  name="quantity"
                  min="0"
                  value={formData.quantity}
                  onChange={handleFormChange}
                  placeholder="1500"
                  className={`w-full bg-white border rounded-md py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none ${errors.quantity ? "border-red-500" : "border-slate-300"}`}
                />
              </div>
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  min={todayDate}
                  value={formData.start_date}
                  onChange={handleFormChange}
                  className={`w-full bg-white border rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none ${errors.start_date ? "border-red-500" : "border-slate-300"}`}
                />
                {errors.start_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.start_date}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  min={formData.start_date || todayDate}
                  value={formData.end_date}
                  onChange={handleFormChange}
                  className={`w-full bg-white border rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-orange-600 outline-none ${errors.end_date ? "border-red-500" : "border-slate-300"}`}
                />
                {errors.end_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
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
                name="sales_notes"
                value={formData.sales_notes}
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

      <ConfirmModal
        isOpen={confirmSubmit}
        title="Submit Request"
        message={`Are you sure you want to submit request for ${formData.product_ids.length} product(s)?`}
        confirmText="Yes, Submit"
        onConfirm={executeSubmit}
        onCancel={() => setConfirmSubmit(false)}
      />
    </div>
  );
}
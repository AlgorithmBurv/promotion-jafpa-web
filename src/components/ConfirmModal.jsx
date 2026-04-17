import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message,
  confirmText = "Yes",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDanger = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[100] transition-opacity">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>
        <div className="p-6">
          <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-xl font-bold text-center text-slate-800 mb-2">
            {title}
          </h3>
          <p className="text-sm text-center text-slate-500 mb-8 leading-relaxed">
            {message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-bold transition-colors outline-none"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`flex-1 px-4 py-2.5 text-white rounded-md text-sm font-bold transition-colors shadow-sm outline-none ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
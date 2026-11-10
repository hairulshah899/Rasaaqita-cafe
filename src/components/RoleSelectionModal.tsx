import React, { useState } from 'react';
import { UserProfile, Outlet, UserRole } from '../types';
import { Store, UserCheck, Shield, CheckCircle2, ChevronRight } from 'lucide-react';

interface RoleSelectionModalProps {
  isOpen: boolean;
  user: {
    uid: string;
    name: string;
    email: string;
  } | null;
  outlets: Outlet[];
  onConfirm: (role: UserRole, outletId: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  user,
  outlets,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [selectedOutlet, setSelectedOutlet] = useState<string>(outlets[0]?.id || 'outlet-1');

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(selectedRole, selectedRole === 'admin' ? 'all' : selectedOutlet);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#5e2713] to-[#3d180b] p-6 text-white text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-white p-1 shadow-md mb-2 items-center justify-center">
            <img
              src="https://arleta.site/interactivelink/2841/Logo-Rasaaqita.jpeg"
              alt="Rasaaqita Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.innerHTML = `<span class="text-[#5e2713] font-bold text-xl tracking-tighter">RQ</span>`;
                }
              }}
            />
          </div>
          <h3 className="font-bold text-lg tracking-tight">Pilih Peranan & Cawangan</h3>
          <p className="text-xs text-amber-200/90 mt-1">
            Selamat datang, <span className="font-semibold text-white">{user.name}</span>!
          </p>
          <p className="text-[11px] text-stone-300 mt-0.5">
            Sila tentukan peranan operasi dan cawangan yang ditugaskan kepada akaun anda.
          </p>
        </div>

        {/* Selection Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-800" />
              <span>Jawatan / Peranan Akaun</span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedRole('staff')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedRole === 'staff'
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-stone-900">Staf Operasi</span>
                  {selectedRole === 'staff' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                  )}
                </div>
                <p className="text-[11px] text-stone-500">
                  Mengisi semakan 12 titik kritikal sesi BOS, MOS & EOS.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('supervisor')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedRole === 'supervisor'
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-stone-900">Penyelia (Supervisor)</span>
                  {selectedRole === 'supervisor' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                  )}
                </div>
                <p className="text-[11px] text-stone-500">
                  Menyemak, mengesahkan laporan & memulangkan pembetulan.
                </p>
              </button>
            </div>
          </div>

          {/* Outlet Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-800" />
              <span>Nama Cawangan (Outlet)</span>
            </label>

            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              disabled={selectedRole === 'admin'}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-800"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code}) — {o.location}
                </option>
              ))}
              {selectedRole === 'supervisor' && (
                <option value="all">Semua Cawangan Seliaan (Global)</option>
              )}
            </select>
            <p className="text-[11px] text-stone-400 mt-1 pl-1">
              {selectedRole === 'staff'
                ? 'Laporan pemeriksaan yang anda hantar akan dikhususkan bagi cawangan ini.'
                : 'Penyelia boleh memantau cawangan yang dipilih atau semua cawangan seliaan.'}
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-[#2da44e] hover:bg-[#2c974b] text-white transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <span>Sahkan & Masuk Sistem</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-xs font-semibold text-stone-500 hover:text-stone-700 transition"
            >
              Batal / Log Keluar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

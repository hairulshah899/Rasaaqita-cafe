import React from 'react';
import { UserProfile, Outlet, SessionType, ReportRecord } from '../types';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ClipboardList,
  Store,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface StaffDashboardProps {
  currentUser: UserProfile;
  currentOutlet: Outlet;
  outlets: Outlet[];
  onSelectOutlet: (outletId: string) => void;
  reports: ReportRecord[];
  onOpenChecklist: (sessionType: SessionType) => void;
  onRefresh: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  currentUser,
  currentOutlet,
  outlets,
  onSelectOutlet,
  reports,
  onOpenChecklist,
  onRefresh,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const sessions: { type: SessionType; label: string; desc: string; timeHint: string }[] = [
    {
      type: 'BOS',
      label: 'BOS (Sebelum Operasi)',
      desc: 'Pemeriksaan rapi bukaan awal harian, suhu chiller/freezer, sanitasi dapur & penyediaan.',
      timeHint: '07:00 - 08:30 Pagi',
    },
    {
      type: 'MOS',
      label: 'MOS (Semasa Operasi)',
      desc: 'Pemantauan berterusan waktu puncak makan tengah hari, suhu pemanas makanan & kebersihan meja.',
      timeHint: '12:00 - 14:00 Petang',
    },
    {
      type: 'EOS',
      label: 'EOS (Penutupan Operasi)',
      desc: 'Sanitasi menyeluruh akhir hari, pembuangan sisa sisa dapur, fly trap & keselamatan peralatan.',
      timeHint: '21:00 - 22:30 Malam',
    },
  ];

  // Reports for this outlet
  const outletReports = reports.filter((r) => r.outletId === currentOutlet.id);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Disahkan':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Disahkan',
        };
      case 'Dihantar':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
          label: 'Menunggu Semakan',
        };
      case 'Perlu Pembetulan':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Perlu Pembetulan',
        };
      case 'Draf':
        return {
          bg: 'bg-stone-200 text-stone-700 border-stone-300',
          icon: <ClipboardList className="w-3.5 h-3.5 text-stone-600" />,
          label: 'Draf Disimpan',
        };
      default:
        return {
          bg: 'bg-stone-100 text-stone-600 border-stone-200',
          icon: <Clock className="w-3.5 h-3.5 text-stone-400" />,
          label: 'Belum Mula',
        };
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#923b1b] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
              Mod Staf Operasi
            </span>
            <span className="text-xs text-stone-400">·</span>
            <span className="text-xs text-stone-500 font-mono">
              Tarikh: {new Date().toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            Selamat Bertugas, {currentUser.name}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-stone-600">
            <Store className="w-4 h-4 text-amber-700" />
            <span>Outlet Ditugaskan: </span>
            <span className="font-semibold text-stone-900">{currentOutlet.name}</span>
            <span className="text-stone-400">({currentOutlet.code})</span>
          </div>
        </div>

        {/* Outlet indicator or selector for multi-branch staff */}
        <div className="flex items-center gap-3">
          {currentUser.outletId === 'all' && (
            <div className="flex flex-col text-right">
              <label className="text-[11px] text-stone-500 font-medium">Tukar Cawangan Semasa:</label>
              <select
                value={currentOutlet.id}
                onChange={(e) => onSelectOutlet(e.target.value)}
                className="mt-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold bg-stone-50 text-stone-800"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={onRefresh}
            title="Segar semula status"
            className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Operational Sessions for Today */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-800" />
            <span>Pemeriksaan 3 Sesi Operasi Hari Ini ({todayStr})</span>
          </h3>
          <span className="text-xs text-stone-500">12 Titik Kritikal Setiap Sesi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sessions.map((sess) => {
            const existing = outletReports.find(
              (r) => r.session === sess.type && r.date === todayStr
            );
            const badge = getStatusBadge(existing?.status);

            return (
              <div
                key={sess.type}
                className="bg-white rounded-2xl shadow-xs border border-stone-200 p-5 flex flex-col justify-between hover:border-amber-300/80 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-lg text-stone-900 tracking-tight">
                      {sess.type}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 ${badge.bg}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-amber-900 mb-1">{sess.label}</p>
                  <p className="text-xs text-stone-500 leading-relaxed mb-4">{sess.desc}</p>

                  {/* Score & Warning box if returned */}
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">Skor Pematuhan:</span>
                      <span className="font-bold text-sm text-stone-900 font-mono">
                        {existing ? `${existing.score}%` : 'Belum dinilai'}
                      </span>
                    </div>

                    {existing?.status === 'Perlu Pembetulan' && existing.supervisorNotes && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[11px] uppercase tracking-wide">
                            Arahan Pembetulan Penyelia:
                          </strong>
                          <span>{existing.supervisorNotes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3">
                  <button
                    type="button"
                    onClick={() => onOpenChecklist(sess.type)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs ${
                      existing?.status === 'Perlu Pembetulan'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : existing?.status === 'Disahkan'
                        ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200'
                        : existing?.status === 'Dihantar'
                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200'
                        : 'bg-[#773117] hover:bg-[#5e2713] text-amber-100'
                    }`}
                  >
                    <span>
                      {existing?.status === 'Perlu Pembetulan'
                        ? 'Betulkan Laporan Segera'
                        : existing?.status === 'Disahkan'
                        ? 'Lihat Laporan Disahkan'
                        : existing?.status === 'Dihantar'
                        ? 'Kemaskini Laporan'
                        : 'Mula Pemeriksaan Sesi'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Submissions Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-800" />
            <h3 className="font-bold text-sm text-stone-900">
              Rekod Pemeriksaan {currentOutlet.name}
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            Jumlah rekod: <strong className="text-stone-800">{outletReports.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100/70 text-stone-600 uppercase text-[11px] font-semibold border-b border-stone-200">
                <th className="py-3 px-6">Sesi</th>
                <th className="py-3 px-4">Tarikh & Waktu</th>
                <th className="py-3 px-4">Staf Pelapor</th>
                <th className="py-3 px-4 text-center">Skor Pematuhan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Catatan Penyelia</th>
                <th className="py-3 px-6 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {outletReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    Tiada rekod pemeriksaan untuk outlet ini lagi. Sila klik &apos;Mula Pemeriksaan&apos; di atas.
                  </td>
                </tr>
              ) : (
                outletReports.map((r) => {
                  const badge = getStatusBadge(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3 px-6 font-bold text-stone-900 font-mono">
                        {r.session}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        <span>{r.date}</span>
                        {r.time && <span className="text-stone-400 ml-1">· {r.time}</span>}
                      </td>
                      <td className="py-3 px-4 text-stone-800 font-medium">
                        {r.staffName}
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-stone-900">
                        {r.score}%
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}
                        >
                          {badge.icon}
                          <span>{r.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-600 italic max-w-xs truncate">
                        {r.supervisorNotes || '-'}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenChecklist(r.session)}
                          className="px-3 py-1 rounded-md text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition"
                        >
                          Buka
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

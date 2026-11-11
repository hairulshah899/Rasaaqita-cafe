import React, { useState } from 'react';
import { UserProfile, Outlet, SessionType, ReportRecord, ReportStatus } from '../types';
import {
  ClipboardCheck,
  Filter,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Eye,
  Store,
} from 'lucide-react';

interface SupervisorDashboardProps {
  currentUser: UserProfile;
  outlets: Outlet[];
  reports: ReportRecord[];
  onOpenReview: (report: ReportRecord) => void;
  onRefresh: () => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  currentUser,
  outlets,
  reports,
  onOpenReview,
  onRefresh,
}) => {
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Dihantar');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick counts
  const pendingCount = reports.filter((r) => r.status === 'Dihantar').length;
  const approvedCount = reports.filter((r) => r.status === 'Disahkan').length;
  const correctionCount = reports.filter((r) => r.status === 'Perlu Pembetulan').length;

  // Filter logic
  const filteredReports = reports.filter((r) => {
    if (selectedOutlet && r.outletId !== selectedOutlet) return false;
    if (selectedSession && r.session !== selectedSession) return false;
    if (selectedStatus !== 'Semua' && r.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const staffMatch = r.staffName.toLowerCase().includes(q);
      const notesMatch = (r.supervisorNotes || '').toLowerCase().includes(q);
      const dateMatch = r.date.includes(q);
      if (!staffMatch && !notesMatch && !dateMatch) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
              Mod Penyelia Operasi
            </span>
            <span className="text-xs text-stone-400 dark:text-stone-600">·</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">Pusat Kawalan & Pengesahan Kualiti</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Semakan & Pengesahan Laporan Cawangan
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Pantau dan sahkan audit 12 titik kritikal sesi BOS, MOS, dan EOS bagi semua cawangan di bawah seliaan anda.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Segar Semula</span>
        </button>
      </div>

      {/* Pending Alert Banner if reports waiting */}
      {pendingCount > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 dark:border-amber-700/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                Terdapat {pendingCount} Laporan Baharu Menunggu Tindakan Semakan Anda!
              </h4>
              <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                Staf telah menghantar pemeriksaan 12 titik berserta bukti bergambar untuk semakan dan kelulusan rasmi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedOutlet('');
              setSelectedSession('');
              setSelectedStatus('Dihantar');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#b04922] hover:bg-[#8d3716] text-white transition shadow-sm whitespace-nowrap self-stretch sm:self-auto text-center cursor-pointer"
          >
            Papar Laporan Menunggu ({pendingCount})
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setSelectedStatus('Dihantar')}
          className={`p-5 rounded-2xl border text-left transition cursor-pointer ${
            selectedStatus === 'Dihantar'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-blue-200 dark:hover:border-blue-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Menunggu Tindakan</span>
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-200 font-mono">{pendingCount}</div>
          <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1">Laporan baru dihantar staf untuk semakan</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('Perlu Pembetulan')}
          className={`p-5 rounded-2xl border text-left transition cursor-pointer ${
            selectedStatus === 'Perlu Pembetulan'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-rose-200 dark:hover:border-rose-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Perlu Pembetulan</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-900 dark:text-rose-200 font-mono">{correctionCount}</div>
          <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">Dipulangkan kepada staf untuk pembaikan</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('Disahkan')}
          className={`p-5 rounded-2xl border text-left transition cursor-pointer ${
            selectedStatus === 'Disahkan'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-200 dark:hover:border-emerald-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Telah Disahkan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 font-mono">{approvedCount}</div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">Laporan melepasi piawaian & kelulusan</p>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
            <span>Penapis Laporan</span>
          </div>

          {(selectedOutlet || selectedSession || selectedStatus !== 'Semua' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedOutlet('');
                setSelectedSession('');
                setSelectedStatus('Semua');
                setSearchQuery('');
              }}
              className="text-xs text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 font-semibold"
            >
              Set Semula Semua Penapis
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">Tapis Outlet</label>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 font-medium"
            >
              <option value="">Semua Cawangan ({outlets.length})</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">Tapis Sesi</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 font-medium"
            >
              <option value="">Semua Sesi Operasi</option>
              <option value="BOS">BOS (Sebelum Operasi)</option>
              <option value="MOS">MOS (Semasa Operasi)</option>
              <option value="EOS">EOS (Penutupan Operasi)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">Tapis Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 font-medium"
            >
              <option value="Dihantar">Menunggu Semakan (Dihantar)</option>
              <option value="Disahkan">Disahkan</option>
              <option value="Perlu Pembetulan">Perlu Pembetulan</option>
              <option value="Semua">Semua Status</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">Cari Laporan</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama staf / tarikh..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xs border border-stone-200 dark:border-stone-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-800 dark:text-amber-400" />
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">Senarai Laporan Masuk</h3>
          </div>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Ditemui: <strong className="text-stone-800 dark:text-stone-200">{filteredReports.length}</strong> laporan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100/70 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 uppercase text-[11px] font-semibold border-b border-stone-200 dark:border-stone-800">
                <th className="py-3 px-6">Outlet</th>
                <th className="py-3 px-4">Sesi & Tarikh</th>
                <th className="py-3 px-4">Staf Pelapor</th>
                <th className="py-3 px-4">Bukti Bergambar (1:1)</th>
                <th className="py-3 px-4 text-center">Skor Pematuhan</th>
                <th className="py-3 px-4">Status Semakan</th>
                <th className="py-3 px-6 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500 dark:text-stone-400 space-y-3">
                    <p className="font-medium">
                      Tiada laporan yang sepadan dengan tapisan semasa.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOutlet('');
                        setSelectedSession('');
                        setSelectedStatus('Semua');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#773117] text-white hover:bg-[#5e2713] transition shadow-2xs inline-flex items-center gap-1.5"
                    >
                      <span>Papar Semua Laporan Cawangan</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => {
                  const outletObj = outlets.find((o) => o.id === r.outletId);
                  const photos = Object.values(r.answers || {})
                    .filter((a) => Boolean(a?.image && a.image.length > 0))
                    .map((a) => a.image!);

                  return (
                    <tr key={r.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition">
                      <td className="py-3.5 px-6 font-bold text-stone-900 dark:text-stone-100">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                          <span>{outletObj ? outletObj.name : r.outletId}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 dark:text-stone-300">
                        <span className="font-bold text-stone-900 dark:text-stone-100 font-mono">{r.session}</span>
                        <div className="text-[11px] text-stone-400 dark:text-stone-500">
                          {r.date} {r.time ? `· ${r.time}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-800 dark:text-stone-200 font-medium">{r.staffName}</td>

                      {/* Photo Thumbnails Column */}
                      <td className="py-3.5 px-4">
                        {photos.length > 0 ? (
                          <div
                            onClick={() => onOpenReview(r)}
                            className="flex items-center gap-1.5 cursor-pointer group"
                            title="Klik untuk membuka laporan dan melihat semua gambar"
                          >
                            <div className="flex -space-x-2 overflow-hidden py-0.5">
                              {photos.slice(0, 3).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt="Bukti 1:1"
                                  className="w-8 h-8 rounded-lg object-cover border-2 border-white dark:border-stone-800 shadow-2xs group-hover:scale-105 transition shrink-0"
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 shrink-0">
                              {photos.length} Gambar
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 dark:text-stone-500 text-[11px] italic">Tiada gambar</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold font-mono text-stone-900 dark:text-stone-100">
                        <span
                          className={
                            r.score >= 90
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : r.score >= 75
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }
                        >
                          {r.score}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            r.status === 'Disahkan'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : r.status === 'Dihantar'
                              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 animate-pulse'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenReview(r)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ml-auto shadow-2xs ${
                            r.status === 'Dihantar'
                              ? 'bg-[#b04922] hover:bg-[#8d3716] text-white'
                              : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/80'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{r.status === 'Dihantar' ? 'Semak & Sahkan' : 'Lihat Semakan'}</span>
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

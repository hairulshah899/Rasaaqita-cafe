import React, { useState } from 'react';
import { ReportRecord, Outlet } from '../types';
import { CHECKLIST_ITEMS } from '../data/initialData';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  MessageSquare,
  Camera,
  CameraOff,
  ZoomIn,
  Eye,
} from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportRecord | null;
  outlet: Outlet | undefined;
  onApprove: (reportId: string, notes: string) => void;
  onReject: (reportId: string, notes: string) => void;
  onViewPhoto: (imageUrl: string, title: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  report,
  outlet,
  onApprove,
  onReject,
  onViewPhoto,
}) => {
  const [supervisorNotes, setSupervisorNotes] = useState(
    report?.supervisorNotes || ''
  );
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !report) return null;

  // Extract all images uploaded by staff in this report
  const uploadedPhotos = Object.entries(report.answers || {})
    .filter(([_, ans]) => Boolean(ans?.image && ans.image.trim().length > 0))
    .map(([idStr, ans]) => {
      const id = Number(idStr);
      const itemInfo = CHECKLIST_ITEMS.find((i) => i.id === id);
      return {
        id,
        name: itemInfo ? itemInfo.name : `Titik #${id}`,
        image: ans.image as string,
        status: ans.status,
      };
    });

  const handleDecision = (decision: 'approve' | 'reject') => {
    setErrorMessage('');
    if (decision === 'reject' && !supervisorNotes.trim()) {
      setErrorMessage(
        'Catatan pembetulan/arahan penyelia wajib diisi sekiranya laporan dipulangkan.'
      );
      return;
    }

    if (decision === 'approve') {
      onApprove(
        report.id,
        supervisorNotes.trim() || 'Laporan disahkan mematuhi piawaian operasi.'
      );
    } else {
      onReject(report.id, supervisorNotes.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-[#b04922] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg">
                Semakan Laporan Operasi: {report.session}
              </span>
              <span className="text-xs bg-amber-950/40 text-amber-100 px-2.5 py-0.5 rounded-full font-medium">
                {outlet?.name || report.outletId}
              </span>
            </div>
            <p className="text-xs text-amber-100/90 mt-0.5">
              Dihantar oleh {report.staffName} · {report.date} pada {report.time || 'Waktu Operasi'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-amber-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview banner */}
        <div className="bg-stone-50 dark:bg-stone-800/80 px-6 py-3 border-b border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-stone-500 dark:text-stone-400">Skor Pematuhan: </span>
              <span
                className={`font-bold text-sm ${
                  report.score >= 90
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : report.score >= 75
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {report.score}%
              </span>
            </div>
            <span className="text-stone-300 dark:text-stone-600">·</span>
            <div>
              <span className="text-stone-500 dark:text-stone-400">Status Semasa: </span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{report.status}</span>
            </div>
            <span className="text-stone-300 dark:text-stone-600">·</span>
            <div className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-300">
              <Camera className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Gambar Bukti: <strong>{uploadedPhotos.length}</strong> dimuat naik</span>
            </div>
          </div>

          <div className="text-xs text-stone-500 dark:text-stone-400">
            Outlet Code: <span className="font-mono text-stone-700 dark:text-stone-300 font-semibold">{outlet?.code || 'RQ'}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* 12 Checklist Answers list with prominent photo views */}
          <div>
            <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2.5">
              Perincian 12 Titik Kritikal Operasi & Bukti Gambar
            </h4>

            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => {
                const ans = report.answers[item.id] || {
                  status: 'Tidak Berkenaan',
                  notes: '',
                  temp: '',
                  image: '',
                };

                const isCompliant = ans.status === 'Patuh';
                const isNonCompliant = ans.status === 'Tidak Patuh';
                const hasImage = Boolean(ans.image && ans.image.trim().length > 0);

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition ${
                      isNonCompliant
                        ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40'
                    }`}
                  >
                    {/* Item Text Details */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center justify-center shrink-0">
                          {item.id}
                        </span>
                        <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {item.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCompliant
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : isNonCompliant
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {ans.status}
                        </span>
                      </div>

                      <p className="text-stone-600 dark:text-stone-300 pl-7">
                        <span className="font-medium text-stone-500 dark:text-stone-400">Catatan Staf: </span>
                        {ans.notes ? (
                          <span className="text-stone-800 dark:text-stone-200 font-medium">{ans.notes}</span>
                        ) : (
                          <span className="text-stone-400 dark:text-stone-500 italic">Tiada catatan</span>
                        )}
                      </p>

                      {item.type === 'temp' && (
                        <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-medium pl-7">
                          <Thermometer className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          <span>
                            Bacaan Suhu:{' '}
                            <strong className="font-mono text-stone-900 dark:text-stone-100">
                              {ans.temp || '-'}°C
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Prominent Evidence Image Display */}
                    <div className="shrink-0 pl-7 sm:pl-0">
                      {hasImage ? (
                        <div className="flex items-center gap-3 bg-white dark:bg-stone-800 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              onViewPhoto(
                                ans.image!,
                                `${outlet?.name} - Sesi ${report.session} #${item.id} (${item.name})`
                              )
                            }
                            className="group relative block w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-amber-300 dark:border-amber-700 shadow-2xs shrink-0 cursor-pointer"
                            title="Klik untuk membesarkan gambar bukti 1:1"
                          >
                            <img
                              src={ans.image}
                              alt={`Bukti ${item.name}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <ZoomIn className="w-6 h-6 drop-shadow-md" />
                            </div>
                          </button>

                          <div className="flex flex-col gap-1 pr-1">
                            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1 w-fit">
                              <Camera className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                              <span>Bukti Gambar 1:1</span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onViewPhoto(
                                  ans.image!,
                                  `${outlet?.name} - Sesi ${report.session} #${item.id} (${item.name})`
                                )
                              }
                              className="text-[11px] text-[#773117] dark:text-amber-400 hover:underline font-semibold flex items-center gap-1 mt-1 text-left"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Buka Zum Penuh</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-stone-400 dark:text-stone-500 text-[11px] bg-white/60 dark:bg-stone-800/60 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700">
                          <CameraOff className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600" />
                          <span>Tiada gambar bukti</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Supervisor review form */}
        <div className="bg-stone-100 dark:bg-stone-800/90 px-6 py-4 border-t border-stone-200 dark:border-stone-700 flex flex-col gap-3 shrink-0">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
              <span>Ulasan / Arahan Tindakan Penyelia (Supervisor Notes):</span>
            </label>
            <input
              type="text"
              value={supervisorNotes}
              onChange={(e) => setSupervisorNotes(e.target.value)}
              placeholder="cth: Lulus dengan cemerlang / Sila pastikan tumpahan di meja 4 dibersihkan segera..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden focus:ring-1 focus:ring-amber-800"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {report.reviewedAt
                ? `Disemak sebelum ini pada: ${report.reviewedAt}`
                : 'Belum disahkan oleh penyelia.'}
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handleDecision('reject')}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-2xs flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pulangkan (Perlu Pembetulan)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDecision('approve')}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{report.status === 'Disahkan' ? 'Kemaskini Pengesahan' : 'Sahkan Laporan (Lulus)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

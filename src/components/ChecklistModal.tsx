import React, { useState, useEffect } from 'react';
import {
  Outlet,
  SessionType,
  ReportRecord,
  ChecklistAnswer,
  ChecklistItemStatus,
} from '../types';
import { CHECKLIST_ITEMS } from '../data/initialData';
import { uploadEvidencePhoto } from '../firebase';
import {
  X,
  Camera,
  Trash2,
  AlertTriangle,
  Check,
  Percent,
  Thermometer,
  FileCheck,
  Save,
} from 'lucide-react';

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionType: SessionType;
  outlet: Outlet;
  existingReport?: ReportRecord;
  onSaveReport: (report: Partial<ReportRecord>, isDraft: boolean) => void;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({
  isOpen,
  onClose,
  sessionType,
  outlet,
  existingReport,
  onSaveReport,
}) => {
  const [answers, setAnswers] = useState<Record<number, ChecklistAnswer>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize answers from existing report or defaults
  useEffect(() => {
    if (!isOpen) return;

    if (existingReport && existingReport.answers) {
      setAnswers(JSON.parse(JSON.stringify(existingReport.answers)));
    } else {
      const initial: Record<number, ChecklistAnswer> = {};
      CHECKLIST_ITEMS.forEach((item) => {
        initial[item.id] = {
          status: 'Patuh',
          notes: '',
          temp: '',
          image: '',
        };
      });
      setAnswers(initial);
    }
    setValidationError(null);
  }, [isOpen, existingReport]);

  if (!isOpen) return null;

  const handleStatusChange = (itemId: number, newStatus: ChecklistItemStatus) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { notes: '', temp: '', image: '' }),
        status: newStatus,
      },
    }));
  };

  const handleFieldChange = (
    itemId: number,
    field: 'temp' | 'notes',
    value: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { status: 'Patuh', image: '' }),
        [field]: value,
      },
    }));
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    itemId: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setValidationError('Saiz fail melebihi had 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Crop squarely 1:1 on canvas with optimal compression for Firestore document storage
        const canvas = document.createElement('canvas');
        const minDim = Math.min(img.width, img.height);
        const targetSize = Math.min(minDim, 600);
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const offsetX = (img.width - minDim) / 2;
          const offsetY = (img.height - minDim) / 2;
          ctx.drawImage(
            img,
            offsetX,
            offsetY,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.72);

          setAnswers((prev) => ({
            ...prev,
            [itemId]: {
              ...(prev[itemId] || { status: 'Patuh', notes: '', temp: '' }),
              image: croppedDataUrl,
            },
          }));
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (itemId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        image: '',
      },
    }));
  };

  // Calculate live compliance score
  let compliantCount = 0;
  let nonCompliantCount = 0;
  CHECKLIST_ITEMS.forEach((item) => {
    const ans = answers[item.id];
    if (!ans) return;
    if (ans.status === 'Patuh') compliantCount++;
    if (ans.status === 'Tidak Patuh') nonCompliantCount++;
  });
  const applicableTotal = compliantCount + nonCompliantCount;
  const currentScore =
    applicableTotal > 0
      ? Number(((compliantCount / applicableTotal) * 100).toFixed(1))
      : 100;

  const handleSave = async (isDraft: boolean) => {
    setValidationError(null);

    if (!isDraft) {
      // Validate mandatory fields: if "Tidak Patuh", notes required
      for (const item of CHECKLIST_ITEMS) {
        const ans = answers[item.id];
        if (ans && ans.status === 'Tidak Patuh' && !ans.notes.trim()) {
          setValidationError(
            `Catatan/tindakan pembetulan wajib diisi untuk item #${item.id} (${item.name}) kerana ditandakan Tidak Patuh.`
          );
          return;
        }
      }
    }

    setIsUploading(true);
    let finalAnswers = { ...answers };
    try {
      // Upload any local base64 images to Firebase Storage in parallel
      const uploadEntries = Object.entries(finalAnswers).filter(
        ([_, ans]) => Boolean(ans?.image && ans.image.startsWith('data:image/'))
      );

      if (uploadEntries.length > 0) {
        const uploadResults = await Promise.all(
          uploadEntries.map(async ([idStr, ans]) => {
            const downloadUrl = await uploadEvidencePhoto(
              ans.image!,
              outlet.id,
              sessionType,
              Number(idStr)
            );
            return { id: Number(idStr), downloadUrl };
          })
        );

        uploadResults.forEach(({ id, downloadUrl }) => {
          if (finalAnswers[id]) {
            finalAnswers[id] = {
              ...finalAnswers[id],
              image: downloadUrl,
            };
          }
        });
      }
    } catch (err) {
      console.warn('Storage upload notice:', err);
    } finally {
      setIsUploading(false);
    }

    onSaveReport(
      {
        session: sessionType,
        outletId: outlet.id,
        score: currentScore,
        answers: finalAnswers,
        status: isDraft ? 'Draf' : 'Dihantar',
      },
      isDraft
    );
  };

  const getSessionFullName = (s: SessionType) => {
    switch (s) {
      case 'BOS':
        return 'BOS (Sebelum Operasi / Bukaan Awal)';
      case 'MOS':
        return 'MOS (Semasa Operasi / Tengah Hari)';
      case 'EOS':
        return 'EOS (Penutupan Operasi & Sanitasi)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-[#5e2713] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg">
                Pemeriksaan Operasi: {sessionType}
              </span>
              <span className="text-xs bg-amber-900/60 text-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                {outlet.name}
              </span>
            </div>
            <p className="text-xs text-amber-100/80 mt-0.5">
              {getSessionFullName(sessionType)} · 12 Titik Kritikal SOP
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

        {/* Live Score Strip */}
        <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="font-semibold text-stone-800">Status Semasa:</span>
            <span>{compliantCount} Patuh</span>
            <span className="text-stone-300">·</span>
            <span className="text-rose-600 font-semibold">{nonCompliantCount} Tidak Patuh</span>
            <span className="text-stone-300">·</span>
            <span>{12 - applicableTotal} T/B</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-600">Skor Pematuhan:</span>
            <div
              className={`flex items-center gap-1 font-bold text-sm px-2.5 py-1 rounded-lg ${
                currentScore >= 90
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentScore >= 75
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>{currentScore}%</span>
            </div>
          </div>
        </div>

        {/* Validation Warning Alert */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 12 Checklist Items */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {CHECKLIST_ITEMS.map((item) => {
            const ans = answers[item.id] || {
              status: 'Patuh',
              notes: '',
              temp: '',
              image: '',
            };

            // Temperature threshold checking
            let tempGuideline = '';
            let tempWarning = '';
            if (item.type === 'temp') {
              if (item.tempKey === 'chiller') {
                const rng = outlet.tempRange.chiller;
                tempGuideline = `Piawaian ${outlet.name}: ${rng.min}°C hingga ${rng.max}°C`;
                if (ans.temp) {
                  const val = parseFloat(ans.temp);
                  if (val < rng.min || val > rng.max) {
                    tempWarning = `Perhatian: ${val}°C berada di luar julat selamat (${rng.min}°C - ${rng.max}°C)`;
                  }
                }
              } else if (item.tempKey === 'freezer') {
                const rng = outlet.tempRange.freezer;
                tempGuideline = `Piawaian ${outlet.name}: ${rng.min}°C hingga ${rng.max}°C`;
                if (ans.temp) {
                  const val = parseFloat(ans.temp);
                  if (val < rng.min || val > rng.max) {
                    tempWarning = `Perhatian: ${val}°C berada di luar julat beku (${rng.min}°C - ${rng.max}°C)`;
                  }
                }
              } else if (item.tempKey === 'bainMarie') {
                const rng = outlet.tempRange.bainMarie || { min: 60, max: 85 };
                tempGuideline = `Piawaian Pemanas: ${rng.min}°C hingga ${rng.max}°C`;
                if (ans.temp) {
                  const val = parseFloat(ans.temp);
                  if (val < rng.min) {
                    tempWarning = `Amaran: Suhu pemanas ${val}°C terlalu rendah (min ${rng.min}°C)!`;
                  }
                }
              }
            }

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  ans.status === 'Tidak Patuh'
                    ? 'border-rose-200 bg-rose-50/40'
                    : 'border-stone-200 bg-stone-50/70 hover:bg-stone-50'
                }`}
              >
                {/* Header row: Item name and 3-way toggle */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {item.id}
                      </span>
                      <h4 className="font-bold text-sm text-stone-900">{item.name}</h4>
                    </div>
                    <p className="text-xs text-stone-500 mt-1 pl-7">{item.desc}</p>
                  </div>

                  {/* 3-Way Segmented Control */}
                  <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'Patuh')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                        ans.status === 'Patuh'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>Patuh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'Tidak Patuh')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                        ans.status === 'Tidak Patuh'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                    >
                      <X className="w-3 h-3" />
                      <span>Tidak Patuh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'Tidak Berkenaan')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                        ans.status === 'Tidak Berkenaan'
                          ? 'bg-stone-600 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>T/B</span>
                    </button>
                  </div>
                </div>

                {/* Temperature input for temp items */}
                {item.type === 'temp' && (
                  <div className="mt-3 pt-3 border-t border-stone-200/80 flex flex-wrap items-center gap-3 pl-7">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-amber-700" />
                      <label className="text-xs font-semibold text-stone-700">
                        Bacaan Suhu ({item.unit}):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={ans.temp || ''}
                        onChange={(e) =>
                          handleFieldChange(item.id, 'temp', e.target.value)
                        }
                        placeholder="cth: 3.5"
                        className="w-24 px-2.5 py-1.5 text-xs rounded-md border border-stone-300 bg-white font-mono"
                      />
                    </div>
                    {tempGuideline && (
                      <span className="text-[11px] text-stone-500 font-medium">
                        {tempGuideline}
                      </span>
                    )}
                    {tempWarning && (
                      <span className="text-[11px] text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {tempWarning}
                      </span>
                    )}
                  </div>
                )}

                {/* Notes and Image Capture */}
                <div className="mt-3 pt-3 border-t border-stone-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 pl-7">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={ans.notes || ''}
                      onChange={(e) =>
                        handleFieldChange(item.id, 'notes', e.target.value)
                      }
                      placeholder={
                        ans.status === 'Tidak Patuh'
                          ? 'Wajib: Nyatakan isu & tindakan pembetulan segera...'
                          : 'Catatan tambahan / ulasan kebersihan...'
                      }
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border bg-white focus:outline-hidden ${
                        ans.status === 'Tidak Patuh' && !ans.notes.trim()
                          ? 'border-rose-400 focus:ring-1 focus:ring-rose-500'
                          : 'border-stone-300 focus:ring-1 focus:ring-amber-800'
                      }`}
                    />
                  </div>

                  <div>
                    {ans.image ? (
                      <div className="flex items-center gap-2.5 bg-white p-1.5 rounded-xl border border-stone-200 shadow-2xs">
                        <img
                          src={ans.image}
                          alt="Bukti 1:1"
                          className="w-12 h-12 rounded-lg object-cover border border-amber-300 shadow-2xs shrink-0"
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded w-fit">
                            Bukti 1:1 Siap
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <label className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold cursor-pointer">
                              <span>Tukar</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, item.id)}
                                className="hidden"
                              />
                            </label>
                            <span className="text-stone-300">·</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(item.id)}
                              className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Padam</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-300 hover:border-amber-300 rounded-lg text-xs font-semibold cursor-pointer transition">
                        <Camera className="w-3.5 h-3.5 text-amber-700" />
                        <span>Kamera / Muat Naik Gambar (1:1)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, item.id)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="bg-stone-100 px-6 py-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-stone-500 text-center sm:text-left">
            Pastikan semua catatan diisi tepat sebelum penghantaran pengesahan.
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => handleSave(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-stone-200 hover:bg-stone-300 text-stone-700 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Draf</span>
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => handleSave(false)}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#2da44e] hover:bg-[#2c974b] text-white transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memuat Naik ke Storage...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Hantar Rasmi kepada Penyelia</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

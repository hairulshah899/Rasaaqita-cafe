import React from 'react';
import { X, ZoomIn } from 'lucide-react';

interface PhotoZoomModalProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const PhotoZoomModal: React.FC<PhotoZoomModalProps> = ({
  imageUrl,
  title,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl p-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-stone-200">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold">{title || 'Bukti Pemeriksaan Kamera (1:1)'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 flex items-center justify-center bg-stone-950 rounded-xl mt-3 overflow-hidden">
          <img
            src={imageUrl}
            alt="Bukti Pemeriksaan Penuh"
            referrerPolicy="no-referrer"
            className="max-h-[70vh] max-w-full aspect-square object-contain rounded-lg"
          />
        </div>

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
          >
            Tutup Paparan
          </button>
        </div>
      </div>
    </div>
  );
};

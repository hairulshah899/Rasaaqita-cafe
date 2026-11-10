import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface NotificationState {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface NotificationModalProps {
  notification: NotificationState | null;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  notification,
  onClose,
}) => {
  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />;
      case 'error':
        return <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-2" />;
      case 'info':
      default:
        return <Info className="w-10 h-10 text-amber-700 mx-auto mb-2" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-stone-200">
        {getIcon()}
        <h4 className="font-bold text-base text-stone-900 mb-1">{notification.title}</h4>
        <p className="text-xs text-stone-600 leading-relaxed mb-6">{notification.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#773117] hover:bg-[#5e2713] text-white transition shadow-xs"
        >
          Faham & Tutup
        </button>
      </div>
    </div>
  );
};

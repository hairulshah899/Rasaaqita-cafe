import React from 'react';
import { UserProfile, Outlet } from '../types';
import { LogOut, User, Store, ShieldCheck, CheckCircle2, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentUser: UserProfile | null;
  currentOutlet: Outlet | undefined;
  onLogout: () => void;
  onSwitchUserClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentOutlet,
  onLogout,
  onSwitchUserClick,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Pengurus Eksekutif';
      case 'supervisor':
        return 'Penyelia Operasi';
      case 'staff':
      default:
        return 'Staf Operasi';
    }
  };

  return (
    <header className="bg-stone-900 text-stone-100 border-b border-stone-800 shadow-sm shrink-0 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-[#5e2713] border border-amber-900/40 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
            <img
              src="https://arleta.site/interactivelink/2841/Logo-Rasaaqita.jpeg"
              alt="Rasaaqita Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.innerHTML = `<span class="text-amber-200 font-bold text-sm tracking-wider">RQ</span>`;
                }
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                Rasaaqita
              </span>
              <span className="text-xs text-amber-300/80 font-medium hidden sm:inline whitespace-nowrap">
                Cafe Operations
              </span>
            </div>
            <p className="text-[11px] text-stone-400 truncate max-w-[200px] sm:max-w-xs">
              {currentUser
                ? `${currentUser.name} · ${getRoleLabel(currentUser.role)}`
                : 'Sistem Pemantauan Berbilang Outlet'}
            </p>
          </div>
        </div>

        {/* Zone 2: System Status & Outlet Indicator */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          {currentUser && currentOutlet && currentUser.role === 'staff' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-stone-800 border border-stone-700 text-stone-300">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium text-white">{currentOutlet.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Sistem Diselaraskan</span>
          </div>
        </div>

        {/* Zone 3: Actions, Theme Toggle & Logout */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle Button (Mod Gelap / Malam untuk staf cawangan) */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Tukar ke Mod Siang (Cerah)' : 'Tukar ke Mod Malam (Gelap)'}
            aria-label={isDark ? 'Tukar ke Mod Siang' : 'Tukar ke Mod Malam'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition cursor-pointer shadow-2xs"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-amber-200">Mod Siang</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden sm:inline text-stone-300">Mod Malam</span>
              </>
            )}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSwitchUserClick}
                title="Tukar Pengguna / Peranan"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>Tukar Akaun</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#773117] hover:bg-[#5e2713] text-amber-100 transition shadow-sm border border-amber-900/50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Keluar</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSwitchUserClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#c55a30] hover:bg-[#b04922] text-white transition shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Log Masuk</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

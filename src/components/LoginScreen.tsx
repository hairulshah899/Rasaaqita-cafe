import React, { useState } from 'react';
import { UserProfile, Outlet } from '../types';
import {
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  User,
  Sparkles,
  HelpCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  appleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  db,
  doc,
  getDoc,
  setDoc,
} from '../firebase';
import { INITIAL_USERS } from '../data/initialData';
import cafeBackground from '../assets/images/cafe_background_1793715984823.jpg';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  outlets: Outlet[];
  onNewUserNeedsRole: (user: { uid: string; name: string; email: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  outlets: _outlets,
  onNewUserNeedsRole,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [showDemoOptions, setShowDemoOptions] = useState(false);

  const isOwnerAdminEmail = (e?: string | null) =>
    Boolean(e && e.trim().toLowerCase() === 'hairulshah899@gmail.com');

  // Fast One-Click Demo Logins for instant role testing
  const handleQuickLogin = (role: 'staff' | 'supervisor' | 'admin') => {
    let targetUser: UserProfile;

    if (role === 'admin') {
      targetUser = {
        uid: 'admin-owner-hairul',
        name: 'Hairul Shah (Owner)',
        email: 'hairulshah899@gmail.com',
        role: 'admin',
        outletId: 'all',
      };
    } else if (role === 'supervisor') {
      const existing = INITIAL_USERS.find((u) => u.role === 'supervisor');
      targetUser = existing || {
        uid: 'spv-siti',
        name: 'Siti Norhaliza (Supervisor)',
        email: 'siti.supervisor@rasaaqita.com',
        role: 'supervisor',
        outletId: 'outlet-1',
      };
    } else {
      const existing = INITIAL_USERS.find((u) => u.role === 'staff');
      targetUser = existing || {
        uid: 'staff-faiz',
        name: 'Ahmad Faiz (Staf)',
        email: 'faiz.staff@rasaaqita.com',
        role: 'staff',
        outletId: 'outlet-1',
      };
    }

    onLogin(targetUser);
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = cred.user;

        // Owner check: hairulshah899@gmail.com is always Admin
        if (isOwnerAdminEmail(fbUser.email)) {
          const ownerProfile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || 'Hairul Shah (Owner)',
            email: fbUser.email || 'hairulshah899@gmail.com',
            role: 'admin',
            outletId: 'all',
          };
          await setDoc(doc(db, 'users', fbUser.uid), ownerProfile, { merge: true });
          onLogin(ownerProfile);
          return;
        }

        // Check if user has an existing complete profile in Firestore
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data()?.role && snap.data()?.outletId) {
            const profile = snap.data() as UserProfile;
            if (profile.role === 'admin' && !isOwnerAdminEmail(profile.email)) {
              profile.role = 'staff';
              await setDoc(userRef, { role: 'staff' }, { merge: true });
            }
            onLogin(profile);
            return;
          }
        } catch (dbErr) {
          console.warn('Firestore profile lookup warning:', dbErr);
        }

        // Needs role & outlet selection popup
        onNewUserNeedsRole({
          uid: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0] || 'Pengguna',
          email: fbUser.email || email.trim(),
        });
      } else {
        // Register mode: create account, then prompt for role and outlet popup
        if (!name.trim()) {
          setErrorMessage('Sila masukkan nama penuh anda.');
          setIsLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = cred.user;

        if (isOwnerAdminEmail(fbUser.email)) {
          const ownerProfile: UserProfile = {
            uid: fbUser.uid,
            name: name.trim() || 'Hairul Shah (Owner)',
            email: fbUser.email || 'hairulshah899@gmail.com',
            role: 'admin',
            outletId: 'all',
          };
          await setDoc(doc(db, 'users', fbUser.uid), ownerProfile, { merge: true });
          onLogin(ownerProfile);
          return;
        }

        // Trigger the role & outlet selection popup
        onNewUserNeedsRole({
          uid: fbUser.uid,
          name: name.trim(),
          email: fbUser.email || email.trim().toLowerCase(),
        });
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes('auth/invalid-credential') ||
        errMsg.includes('auth/user-not-found') ||
        errMsg.includes('auth/wrong-password')
      ) {
        setErrorMessage('Emel atau kata laluan tidak sah. Anda boleh guna akses pantas demo di bawah atau daftar akaun baru.');
      } else if (errMsg.includes('auth/email-already-in-use')) {
        setErrorMessage('Alamat emel ini telah didaftarkan. Sila log masuk atau gunakan emel lain.');
      } else if (errMsg.includes('auth/weak-password')) {
        setErrorMessage('Kata laluan terlalu lemah. Sila gunakan sekurang-kurangnya 6 aksara.');
      } else {
        setErrorMessage(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (
    provider: typeof googleProvider | typeof appleProvider,
    providerName: string
  ) => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const cred = await signInWithPopup(auth, provider);
      const fbUser = cred.user;

      if (isOwnerAdminEmail(fbUser.email)) {
        const ownerProfile: UserProfile = {
          uid: fbUser.uid,
          name: fbUser.displayName || 'Hairul Shah (Owner)',
          email: fbUser.email || 'hairulshah899@gmail.com',
          role: 'admin',
          outletId: 'all',
        };
        await setDoc(doc(db, 'users', fbUser.uid), ownerProfile, { merge: true });
        onLogin(ownerProfile);
        return;
      }

      const userRef = doc(db, 'users', fbUser.uid);
      try {
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data()?.role && snap.data()?.outletId) {
          const profile = snap.data() as UserProfile;
          if (profile.role === 'admin' && !isOwnerAdminEmail(profile.email)) {
            profile.role = 'staff';
            await setDoc(userRef, { role: 'staff' }, { merge: true });
          }
          onLogin(profile);
          return;
        }
      } catch (dbErr) {
        console.warn(`${providerName} user Firestore check:`, dbErr);
      }

      // New user from Google or Apple: trigger Role & Outlet popup
      onNewUserNeedsRole({
        uid: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || `Pengguna ${providerName}`,
        email: fbUser.email || '',
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes('auth/popup-closed-by-user') ||
        errMsg.includes('auth/cancelled-popup-request')
      ) {
        return;
      }
      if (errMsg.includes('auth/popup-blocked')) {
        setErrorMessage('Tetingkap popup disekat oleh pelayar anda. Sila benarkan popup bagi laman ini.');
        return;
      }
      if (errMsg.includes('auth/unauthorized-domain')) {
        setErrorMessage('Domain aplikasi belum ditambah ke Authorized Domains di Firebase. Sila log masuk menggunakan emel dan kata laluan di atas.');
        return;
      }
      console.error(`${providerName} Sign-in error:`, err);
      setErrorMessage(`Gagal log masuk dengan ${providerName}. Sila guna log masuk emel atau cuba lagi.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background Cafe Image with Warm Dark Gradient Overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 -z-10"
        style={{ backgroundImage: `url(${cafeBackground})` }}
      >
        {/* Warm cafe vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-900/50 to-stone-950/75 backdrop-blur-[1.5px]" />
      </div>

      {/* Main Login Card - Exactly matching the attached mockup image */}
      <div className="relative w-full max-w-[420px] bg-white rounded-[32px] sm:rounded-[36px] shadow-2xl border border-white/50 p-7 sm:p-9 my-auto transition-all">
        {/* Logo Badge in rounded square with soft border & shadow */}
        <div className="w-20 h-20 rounded-2xl bg-white shadow-md border border-stone-100 mx-auto flex items-center justify-center p-2 mb-4 overflow-hidden">
          <img
            src="https://arleta.site/interactivelink/2841/Logo-Rasaaqita.jpeg"
            alt="Rasaaqita Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              if (target.parentElement) {
                target.parentElement.innerHTML = `
                  <div class="w-14 h-14 rounded-full bg-[#5e2713] text-white flex flex-col items-center justify-center text-center">
                    <span class="font-black text-base tracking-tighter leading-none">RQ</span>
                    <span class="text-[7px] font-bold tracking-widest uppercase mt-0.5">rasaaqita</span>
                  </div>
                `;
              }
            }}
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-stone-900 text-center tracking-tight leading-tight">
          {mode === 'login' ? 'Log Masuk Rasmi' : 'Daftar Akaun Rasmi'}
        </h1>

        {/* Subtitle */}
        <p className="text-xs text-stone-500 font-medium text-center mt-1.5 mb-6">
          Sistem Pemantauan Operasi Kafe Berbilang Outlet
        </p>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                Nama Penuh
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth: Kamarul Ariffin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white focus:bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>
            </div>
          )}

          {/* Username or email address */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              Username or email address
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cth: staf@rasaaqita.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white focus:bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
          </div>

          {/* Password with Forgot password? */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-800">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-950 transition cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white focus:bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition font-mono tracking-wider"
            />
          </div>

          {/* Sign In / Register Button - Green Accent */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-5 py-3 rounded-xl bg-[#208b58] hover:bg-[#1b754a] active:bg-[#16603d] text-white font-bold text-sm tracking-wide shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === 'login' ? 'Sign in' : 'Daftar Akaun'}</span>
          </button>
        </form>

        {/* Divider: OR */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200"></div>
          </div>
          <span className="relative bg-white px-3 text-[11px] font-bold text-stone-400 uppercase tracking-widest">
            OR
          </span>
        </div>

        {/* Social Buttons: Continue with Google & Continue with Apple */}
        <div className="space-y-2.5">
          {/* Continue with Google */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleSocialSignIn(googleProvider, 'Google')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#141b2d] hover:bg-[#1f2942] active:bg-[#0f1422] text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.56 0 2.97.55 4.08 1.45l3.05-3.05C17.29 1.7 14.82 1 12 1 7.54 1 3.73 3.53 1.83 7.22l3.66 2.84C6.46 7.03 8.98 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.67 2.85c2.14-1.98 3.75-4.89 3.75-8.67z"
              />
              <path
                fill="#FBBC05"
                d="M5.49 14.68A7.054 7.054 0 0 1 5.1 12c0-.94.16-1.85.44-2.68L1.88 6.48C.68 8.16 0 10 0 12c0 2.01.68 3.86 1.88 5.53l3.61-2.85z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.67-2.85c-1.07.72-2.45 1.16-4.26 1.16-3.02 0-5.54-2.03-6.51-4.78L1.83 16.4C3.73 20.08 7.54 23 12 23z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Continue with Apple */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleSocialSignIn(appleProvider, 'Apple')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#141b2d] hover:bg-[#1f2942] active:bg-[#0f1422] text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.73-7.85-12.09-14.32-6.53-9.74-11.66-20.73-15.39-32.96-3.73-12.23-5.6-23.71-5.6-34.45 0-14.28 3.58-26.17 10.74-35.67 7.16-9.5 16.08-14.35 26.77-14.55 4.8 0 10.13 1.25 15.98 3.76 5.86 2.5 9.7 3.82 11.53 3.94 1.48-.12 5.54-1.52 12.18-4.19 6.64-2.68 12.29-3.87 16.94-3.58 12.56.66 22.45 5.38 29.68 14.16-10.99 6.67-16.36 15.9-16.12 27.69.24 9.17 3.73 16.89 10.47 23.16 6.74 6.27 14.71 9.87 23.91 10.8-2.1 6.28-4.66 12.63-7.69 19.05zM119.22 33.09c0-6.9 2.53-13.52 7.59-19.86 5.06-6.33 11.39-10.42 19-12.23.47 2.02.7 4.1.7 6.24 0 6.84-2.6 13.54-7.81 20.1-5.21 6.56-11.71 10.51-19.48 11.86v-6.11z" />
            </svg>
            <span>Continue with Apple</span>
          </button>
        </div>

        {/* Footer Link: New to Rasaaqita? Create an account */}
        <div className="text-center mt-6 pt-2">
          {mode === 'login' ? (
            <p className="text-xs text-stone-600">
              New to Rasaaqita?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage('');
                }}
                className="font-bold text-amber-900 underline hover:text-amber-950 transition cursor-pointer"
              >
                Create an account
              </button>
            </p>
          ) : (
            <p className="text-xs text-stone-600">
              Sudah mempunyai akaun?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                }}
                className="font-bold text-emerald-800 underline hover:text-emerald-950 transition cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Quick Demo Access Bar (Convenient toggle for testing staff/supervisor/admin without typing) */}
        <div className="mt-5 pt-3.5 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setShowDemoOptions(!showDemoOptions)}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-stone-400 hover:text-stone-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{showDemoOptions ? 'Tutup Akses Pantas' : 'Pilihan Masuk Pantas (Demo / Ujian)'}</span>
          </button>

          {showDemoOptions && (
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 pt-1 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => handleQuickLogin('staff')}
                className="py-1.5 px-2 rounded-lg bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 text-[11px] font-bold text-stone-700 text-center transition cursor-pointer"
                title="Log masuk terus sebagai Staf Operasi (Faiz)"
              >
                Staf
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('supervisor')}
                className="py-1.5 px-2 rounded-lg bg-stone-50 hover:bg-blue-50 border border-stone-200 hover:border-blue-300 text-[11px] font-bold text-stone-700 text-center transition cursor-pointer"
                title="Log masuk terus sebagai Penyelia (Siti)"
              >
                Penyelia
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="py-1.5 px-2 rounded-lg bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-[11px] font-bold text-emerald-800 text-center transition cursor-pointer"
                title="Log masuk terus sebagai Pentadbir Utama (Hairul Shah)"
              >
                Admin
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Forgot Password Info */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-700" />
                <span>Lupa Kata Laluan?</span>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Bagi akaun rasmi Rasaaqita Cafe, penetapan semula kata laluan diuruskan oleh Pentadbir Sistem (Owner). Sila hubungi:
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <div className="font-bold text-stone-800">Hairul Shah (Pengurus Eksekutif)</div>
              <div className="font-mono text-stone-600 text-[11px]">hairulshah899@gmail.com</div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#208b58] hover:bg-[#19754a] text-white transition shadow-xs"
              >
                Faham & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

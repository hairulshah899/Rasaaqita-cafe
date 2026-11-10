import React, { useState } from 'react';
import { UserProfile, Outlet } from '../types';
import { User, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
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

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLogin: (user: UserProfile) => void;
  outlets: Outlet[];
  onNewUserNeedsRole: (user: { uid: string; name: string; email: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  outlets,
  onNewUserNeedsRole,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const isOwnerAdminEmail = (e?: string | null) =>
    Boolean(e && e.trim().toLowerCase() === 'hairulshah899@gmail.com');

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = cred.user;

        // Special owner check: hairulshah899@gmail.com is always Admin
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
            // Prevent non-owner from being admin
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

        // If registering as hairulshah899@gmail.com, auto-assign owner admin
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

        // Immediately trigger the role & branch selection popup as requested (staff/supervisor)
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
        setErrorMessage('Emel atau kata laluan tidak sah. Jika anda pengguna baru, sila klik Daftar Akaun.');
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

  const handleSocialSignIn = async (provider: typeof googleProvider | typeof appleProvider, providerName: string) => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const cred = await signInWithPopup(auth, provider);
      const fbUser = cred.user;

      // Special owner check: hairulshah899@gmail.com is always Admin
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
        setErrorMessage('Domain aplikasi belum ditambah ke Authorized Domains di Firebase Console. Sila log masuk menggunakan emel dan kata laluan di atas.');
        return;
      }

      console.error(`${providerName} Sign-in error:`, err);
      setErrorMessage(`Gagal log masuk dengan ${providerName}. Sila cuba lagi atau gunakan emel dan kata laluan.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#5e2713] to-[#3d180b] p-6 text-white text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-white p-1.5 shadow-md mb-3 items-center justify-center">
            <img
              src="https://arleta.site/interactivelink/2841/Logo-Rasaaqita.jpeg"
              alt="Rasaaqita Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.innerHTML = `<span class="text-[#5e2713] font-bold text-2xl tracking-tighter">RQ</span>`;
                }
              }}
            />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Rasaaqita Cafe Operations</h2>
          <p className="text-xs text-amber-200/90 mt-1">
            {mode === 'login'
              ? 'Log Masuk Rasmi Sistem Operasi'
              : 'Daftar Akaun Baharu (Staf / Penyelia)'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Penuh
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="cth: Siti Sarah"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Alamat Emel
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staf@rasaaqita.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-800"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-stone-700">Kata Laluan</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() =>
                      alert('Sila hubungi pihak pentadbir untuk menetapkan semula kata laluan anda.')
                    }
                    className="text-[11px] text-[#923b1b] hover:underline"
                  >
                    Lupa kata laluan?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold bg-[#2da44e] hover:bg-[#2c974b] text-white transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{mode === 'login' ? 'Log Masuk Sistem' : 'Daftar Akaun & Pilih Peranan'}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="w-full border-t border-stone-200"></div>
            <span className="absolute bg-white px-3 text-[11px] text-stone-400 uppercase tracking-widest font-medium">
              atau teruskan dengan
            </span>
          </div>

          {/* Social Logins: Google & Apple */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSocialSignIn(googleProvider, 'Google')}
              className="w-full py-2.5 px-3 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSocialSignIn(appleProvider, 'Apple')}
              className="w-full py-2.5 px-3 rounded-lg border border-stone-800 bg-stone-900 hover:bg-black text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.73-7.85-12.09-14.32-6.53-9.74-11.66-20.73-15.39-32.96-3.73-12.23-5.6-23.71-5.6-34.45 0-14.28 3.58-26.17 10.74-35.67 7.16-9.5 16.08-14.35 26.77-14.55 4.8 0 10.13 1.25 15.98 3.76 5.86 2.5 9.7 3.82 11.53 3.94 1.48-.12 5.54-1.52 12.18-4.19 6.64-2.68 12.29-3.87 16.94-3.58 12.56.66 22.45 5.38 29.68 14.16-10.99 6.67-16.36 15.9-16.12 27.69.24 9.17 3.73 16.89 10.47 23.16 6.74 6.27 14.71 9.87 23.91 10.8-2.1 6.28-4.66 12.63-7.69 19.05zM119.22 33.09c0-6.9 2.53-13.52 7.59-19.86 5.06-6.33 11.39-10.42 19-12.23.47 2.02.7 4.1.7 6.24 0 6.84-2.6 13.54-7.81 20.1-5.21 6.56-11.71 10.51-19.48 11.86v-6.11z" />
              </svg>
              <span>Continue with Apple</span>
            </button>
          </div>

          {/* Toggle login / register */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrorMessage('');
              }}
              className="text-xs text-stone-600 hover:text-stone-900 font-medium"
            >
              {mode === 'login' ? (
                <>
                  Pengguna baharu di Rasaaqita?{' '}
                  <span className="text-[#923b1b] font-semibold underline">
                    Daftar akaun
                  </span>
                </>
              ) : (
                <>
                  Sudah mempunyai akaun?{' '}
                  <span className="text-[#923b1b] font-semibold underline">
                    Log masuk di sini
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Outlet,
  SessionType,
  ReportRecord,
  AuditLog,
  UserRole,
} from './types';
import {
  OFFICIAL_OUTLETS,
  INITIAL_USERS,
  INITIAL_REPORTS,
  INITIAL_AUDIT_LOGS,
  isOwnerAdminEmail,
} from './data/initialData';
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  deleteDoc,
} from './firebase';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { AuthModal } from './components/AuthModal';
import { RoleSelectionModal } from './components/RoleSelectionModal';
import { StaffDashboard } from './components/StaffDashboard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ChecklistModal } from './components/ChecklistModal';
import { ReviewModal } from './components/ReviewModal';
import { PhotoZoomModal } from './components/PhotoZoomModal';
import { NotificationModal, NotificationState } from './components/NotificationModal';

export default function App() {
  // State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [outlets, setOutlets] = useState<Outlet[]>(OFFICIAL_OUTLETS);
  const [usersList, setUsersList] = useState<UserProfile[]>(INITIAL_USERS);
  const [reports, setReports] = useState<ReportRecord[]>(INITIAL_REPORTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // Current selected outlet for staff view
  const [selectedOutletId, setSelectedOutletId] = useState<string>('outlet-1');

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeChecklistSession, setActiveChecklistSession] = useState<SessionType | null>(null);
  const [activeReviewReport, setActiveReviewReport] = useState<ReportRecord | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title: string } | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // New user role selection popup state
  const [pendingNewUser, setPendingNewUser] = useState<{
    uid: string;
    name: string;
    email: string;
  } | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Handle when a new user signs up or logs in without role configuration
  const handleNewUserNeedsRole = (user: { uid: string; name: string; email: string }) => {
    setIsAuthModalOpen(false);
    setPendingNewUser(user);
    setIsRoleModalOpen(true);
  };

  // 1. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const isOwner = isOwnerAdminEmail(fbUser.email);
          const userRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userRef);

          if (isOwner) {
            // Both hairulshah@gmail.com & hairulshah899@gmail.com are unconditionally the Owner / Admin
            const ownerProfile: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || (fbUser.email?.includes('899') ? 'Hairul Shah (Owner)' : 'Hairul Shah (Admin)'),
              email: fbUser.email!,
              role: 'admin',
              outletId: 'all',
            };
            await setDoc(userRef, ownerProfile, { merge: true });
            setCurrentUser(ownerProfile);
            setIsAuthModalOpen(false);
            setIsRoleModalOpen(false);
          } else if (snap.exists() && snap.data()?.role && snap.data()?.outletId) {
            const profile = snap.data() as UserProfile;
            // Ensure no unauthorized admin role
            if (profile.role === 'admin' && !isOwnerAdminEmail(profile.email)) {
              profile.role = 'staff';
              await setDoc(userRef, { role: 'staff' }, { merge: true });
            }
            setCurrentUser(profile);
            if (profile.outletId && profile.outletId !== 'all') {
              setSelectedOutletId(profile.outletId);
            }
            setIsAuthModalOpen(false);
            setIsRoleModalOpen(false);
          } else {
            // New user requires role & outlet selection popup
            handleNewUserNeedsRole({
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna',
              email: fbUser.email || '',
            });
          }
        } catch (err) {
          console.warn('Gagal memuat profil pengguna Firestore:', err);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthInitialized(true);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore Sync for Reports
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeReports = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: ReportRecord[] = [];
          snapshot.forEach((d) => {
            fetched.push({ id: d.id, ...(d.data() as Omit<ReportRecord, 'id'>) });
          });
          fetched.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setReports(fetched);
        }
      },
      (error) => {
        console.warn('Firestore reports listener notice:', error);
      }
    );

    return () => unsubscribeReports();
  }, [currentUser]);

  // 3. Real-time Firestore Sync for Outlets
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeOutlets = onSnapshot(
      collection(db, 'outlets'),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: Outlet[] = [];
          snapshot.forEach((d) => {
            fetched.push({ id: d.id, ...(d.data() as Omit<Outlet, 'id'>) });
          });
          setOutlets(fetched);
        }
      },
      (error) => {
        console.warn('Outlets sync listener error:', error);
      }
    );

    return () => unsubscribeOutlets();
  }, [currentUser]);

  // 4. Real-time Firestore Sync for Users
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: UserProfile[] = [];
          snapshot.forEach((d) => {
            fetched.push(d.data() as UserProfile);
          });
          setUsersList(fetched);
        }
      },
      (error) => {
        console.warn('Users sync listener error:', error);
      }
    );

    return () => unsubscribeUsers();
  }, [currentUser]);

  // 5. Real-time Firestore Sync for Audit Logs
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeAudit = onSnapshot(
      collection(db, 'auditLogs'),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: AuditLog[] = [];
          snapshot.forEach((d) => {
            fetched.push({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) });
          });
          fetched.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setAuditLogs(fetched);
        }
      },
      (error) => {
        console.warn('Audit logs listener error:', error);
      }
    );

    return () => unsubscribeAudit();
  }, [currentUser]);

  // Log Audit helper
  const addAuditLog = async (action: string, outletName?: string) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      user: currentUser ? currentUser.name : 'Sistem',
      role: currentUser ? currentUser.role.toUpperCase() : 'SISTEM',
      action,
      outletName,
    };

    setAuditLogs((prev) => [newLog, ...prev]);

    try {
      await setDoc(doc(db, 'auditLogs', newLog.id), newLog);
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  };

  // Submit Role & Outlet Selection from Popup
  const handleConfirmRoleAndOutlet = async (role: UserRole, outletId: string) => {
    if (!pendingNewUser) return;
    setIsSavingRole(true);

    const isOwner = isOwnerAdminEmail(pendingNewUser.email);
    const finalRole: UserRole = isOwner ? 'admin' : (role === 'admin' ? 'staff' : role);
    const finalOutlet: string = isOwner ? 'all' : outletId;

    const profile: UserProfile = {
      uid: pendingNewUser.uid,
      name: pendingNewUser.name,
      email: pendingNewUser.email,
      role: finalRole,
      outletId: finalOutlet,
    };

    try {
      await setDoc(doc(db, 'users', profile.uid), profile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
    }

    setUsersList((prev) => {
      const filtered = prev.filter((u) => u.uid !== profile.uid);
      return [profile, ...filtered];
    });

    setCurrentUser(profile);
    if (profile.outletId && profile.outletId !== 'all') {
      setSelectedOutletId(profile.outletId);
    }

    setIsRoleModalOpen(false);
    setPendingNewUser(null);
    setIsSavingRole(false);

    const outletObj = outlets.find((o) => o.id === outletId);
    const outletName = outletObj ? outletObj.name : 'Semua Cawangan';

    addAuditLog(
      `Pengguna baharu ${profile.name} telah mendaftar jawatan ${profile.role.toUpperCase()} bagi cawangan ${outletName}.`,
      outletName
    );

    setNotification({
      title: 'Pendaftaran Berjaya',
      message: `Selamat datang! Profil anda sebagai ${role === 'supervisor' ? 'Penyelia' : 'Staf Operasi'} di ${outletName} telah disahkan.`,
      type: 'success',
    });
  };

  // Cancel Role Modal
  const handleCancelRoleModal = async () => {
    setIsRoleModalOpen(false);
    setPendingNewUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn(e);
    }
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  // Direct Login handler (for existing users with role)
  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.outletId && user.outletId !== 'all') {
      setSelectedOutletId(user.outletId);
    }
    setIsAuthModalOpen(false);
    addAuditLog(`Log masuk sistem Firebase berjaya sebagai ${user.name} (${user.role.toUpperCase()}).`);
    setNotification({
      title: 'Selamat Datang',
      message: `Log masuk Firebase berjaya sebagai ${user.name} (${user.role.toUpperCase()}).`,
      type: 'success',
    });
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }
    addAuditLog(`Pengguna ${currentUser?.name || ''} telah log keluar.`);
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  // Current outlet object
  const currentOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  // Open Checklist
  const handleOpenChecklist = (sessionType: SessionType) => {
    setActiveChecklistSession(sessionType);
  };

  // Save Report from Checklist Modal into Cloud Firestore
  const handleSaveReport = async (reportData: Partial<ReportRecord>, isDraft: boolean) => {
    if (!activeChecklistSession || !currentUser) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('ms-MY', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const existingIdx = reports.findIndex(
      (r) =>
        r.outletId === currentOutlet.id &&
        r.session === activeChecklistSession &&
        r.date === todayStr
    );

    const reportId = existingIdx >= 0 ? reports[existingIdx].id : `rep-${currentOutlet.id}-${activeChecklistSession}-${todayStr}`;

    const recordToSave: ReportRecord = {
      id: reportId,
      outletId: currentOutlet.id,
      session: activeChecklistSession,
      date: todayStr,
      time: timeStr,
      staffId: currentUser.uid,
      staffName: currentUser.name,
      status: isDraft ? 'Draf' : 'Dihantar',
      score: reportData.score ?? 100,
      answers: reportData.answers || {},
      supervisorNotes:
        existingIdx >= 0 && isDraft
          ? reports[existingIdx].supervisorNotes
          : '',
      createdAt:
        existingIdx >= 0
          ? reports[existingIdx].createdAt
          : new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      const updated = [...reports];
      updated[existingIdx] = recordToSave;
      setReports(updated);
    } else {
      setReports((prev) => [recordToSave, ...prev]);
    }

    try {
      await setDoc(doc(db, 'reports', recordToSave.id), recordToSave);
    } catch (err) {
      console.warn('Firestore setDoc notice for report:', err);
    }

    setActiveChecklistSession(null);

    const actionText = isDraft
      ? `Menyimpan Draf pemeriksaan sesi ${activeChecklistSession} (${currentOutlet.name}) ke Firestore.`
      : `Menghantar laporan rasmi sesi ${activeChecklistSession} (${currentOutlet.name}) dengan Skor: ${recordToSave.score}%.`;

    addAuditLog(actionText, currentOutlet.name);

    setNotification({
      title: isDraft ? 'Draf Disimpan' : 'Laporan Dihantar',
      message: isDraft
        ? 'Draf pemeriksaan berjaya disimpan dalam pangkalan data cloud Firestore.'
        : `Laporan rasmi ${activeChecklistSession} untuk ${currentOutlet.name} berjaya dihantar ke Firebase Firestore (Skor: ${recordToSave.score}%).`,
      type: 'success',
    });
  };

  // Supervisor Approves Report in Cloud Firestore
  const handleApproveReport = async (reportId: string, notes: string) => {
    const updated = reports.map((r) => {
      if (r.id === reportId) {
        return {
          ...r,
          status: 'Disahkan' as const,
          supervisorNotes: notes,
          supervisorName: currentUser?.name || 'Penyelia',
          reviewedAt: new Date().toLocaleTimeString('ms-MY', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      }
      return r;
    });

    setReports(updated);
    setActiveReviewReport(null);

    const target = updated.find((r) => r.id === reportId);
    if (target) {
      try {
        await setDoc(doc(db, 'reports', target.id), target);
      } catch (err) {
        console.warn('Firestore setDoc approve error notice:', err);
      }
    }

    const outletObj = outlets.find((o) => o.id === target?.outletId);

    addAuditLog(
      `Penyelia ${currentUser?.name || ''} telah mengesahkan laporan ${target?.session || ''} ${outletObj?.name || ''} sebagai DISAHKAN.`,
      outletObj?.name
    );

    setNotification({
      title: 'Laporan Disahkan',
      message: `Laporan sesi ${target?.session} bagi ${outletObj?.name || ''} telah diluluskan dan disahkan rasmi dalam Firestore.`,
      type: 'success',
    });
  };

  // Supervisor Requests Revision in Cloud Firestore
  const handleRejectReport = async (reportId: string, notes: string) => {
    const updated = reports.map((r) => {
      if (r.id === reportId) {
        return {
          ...r,
          status: 'Perlu Pembetulan' as const,
          supervisorNotes: notes,
          supervisorName: currentUser?.name || 'Penyelia',
          reviewedAt: new Date().toLocaleTimeString('ms-MY', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      }
      return r;
    });

    setReports(updated);
    setActiveReviewReport(null);

    const target = updated.find((r) => r.id === reportId);
    if (target) {
      try {
        await setDoc(doc(db, 'reports', target.id), target);
      } catch (err) {
        console.warn('Firestore setDoc reject error notice:', err);
      }
    }

    const outletObj = outlets.find((o) => o.id === target?.outletId);

    addAuditLog(
      `Penyelia ${currentUser?.name || ''} memulangkan laporan ${target?.session || ''} ${outletObj?.name || ''} dengan arahan pembetulan: "${notes}".`,
      outletObj?.name
    );

    setNotification({
      title: 'Laporan Dipulangkan',
      message: `Laporan telah dipulangkan kepada staf dengan arahan pembetulan dalam sistem Firebase.`,
      type: 'info',
    });
  };

  // Update Outlet Temp Ranges in Cloud Firestore
  const handleUpdateOutlet = async (updated: Outlet) => {
    setOutlets((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

    try {
      await setDoc(doc(db, 'outlets', updated.id), updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `outlets/${updated.id}`);
    }

    addAuditLog(`Mengemaskini julat suhu piawaian bagi ${updated.name}.`, updated.name);
    setNotification({
      title: 'Outlet Dikemaskini',
      message: `Piawaian ambang suhu bagi ${updated.name} berjaya disimpan dalam Firebase Firestore.`,
      type: 'success',
    });
  };

  // Add User from Admin into Cloud Firestore
  const handleAddUser = async (newUser: UserProfile) => {
    setUsersList((prev) => [...prev, newUser]);

    try {
      await setDoc(doc(db, 'users', newUser.uid), newUser);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${newUser.uid}`);
    }

    addAuditLog(`Pentadbir menambah pengguna baharu ke Firestore: ${newUser.name} (${newUser.role}).`);
    setNotification({
      title: 'Pengguna Ditambah',
      message: `Akaun ${newUser.name} sebagai ${newUser.role} berjaya didaftarkan dalam Firestore.`,
      type: 'success',
    });
  };

  // Delete Report from Cloud Firestore
  const handleDeleteReport = async (reportId: string) => {
    const target = reports.find((r) => r.id === reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));

    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (err) {
      console.warn('Firestore deleteDoc notice for report:', err);
    }

    const desc = target ? `fail laporan ${target.session} (${target.date})` : `laporan ${reportId}`;
    addAuditLog(`Pentadbir memadam ${desc} daripada Firestore.`);
    setNotification({
      title: 'Laporan Dipadam',
      message: `Rekod ${desc} telah berjaya dipadam dari sistem.`,
      type: 'info',
    });
  };

  // Delete User from Cloud Firestore
  const handleDeleteUser = async (userId: string) => {
    const target = usersList.find((u) => u.uid === userId);
    if (isOwnerAdminEmail(target?.email) || target?.role === 'admin') {
      setNotification({
        title: 'Tindakan Disekat',
        message: 'Akaun Pemilik Utama (Admin) dilindungi dan tidak boleh dipadam.',
        type: 'error',
      });
      return;
    }

    setUsersList((prev) => prev.filter((u) => u.uid !== userId));

    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.warn('Firestore deleteDoc notice for user:', err);
    }

    addAuditLog(`Pentadbir memadam pengguna: ${target?.name || userId} (${target?.role || 'user'}).`);
    setNotification({
      title: 'Pengguna Dipadam',
      message: `Akaun ${target?.name || 'Pengguna'} telah berjaya dikeluarkan dari pangkalan data.`,
      type: 'info',
    });
  };

  // Delete Individual Audit Log
  const handleDeleteAuditLog = async (logId: string) => {
    setAuditLogs((prev) => prev.filter((l) => l.id !== logId));
    try {
      await deleteDoc(doc(db, 'auditLogs', logId));
    } catch (err) {
      console.warn('Firestore deleteDoc notice for auditLog:', err);
    }
  };

  // Clear All Audit Logs
  const handleClearAuditLogs = async () => {
    const logIds = auditLogs.map((l) => l.id);
    setAuditLogs([]);
    for (const id of logIds) {
      try {
        await deleteDoc(doc(db, 'auditLogs', id));
      } catch (e) {
        // quiet ignore
      }
    }
    setNotification({
      title: 'Jejak Audit Dikosongkan',
      message: 'Semua rekod jejak audit aktiviti telah dikosongkan.',
      type: 'info',
    });
  };

  // Look up existing report for active session in checklist modal
  const existingReportForChecklist = activeChecklistSession
    ? reports.find(
        (r) =>
          r.outletId === currentOutlet.id &&
          r.session === activeChecklistSession &&
          r.date === new Date().toISOString().split('T')[0]
      )
    : undefined;

  return (
    <div className="min-h-full flex flex-col bg-stone-50 text-stone-800 dark:bg-stone-950 dark:text-stone-100 transition-colors duration-200">
      {/* Top Header - shown only when user is logged in */}
      {currentUser && (
        <Header
          currentUser={currentUser}
          currentOutlet={currentOutlet}
          onLogout={handleLogout}
          onSwitchUserClick={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {!authInitialized ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#773117] mb-3"></div>
            <p className="text-xs text-stone-500 font-medium">Menghubungkan ke pelayan Firebase...</p>
          </div>
        ) : !currentUser ? (
          <LoginScreen
            onLogin={handleLogin}
            outlets={outlets}
            onNewUserNeedsRole={handleNewUserNeedsRole}
          />
        ) : currentUser.role === 'staff' ? (
          <StaffDashboard
            currentUser={currentUser}
            currentOutlet={currentOutlet}
            outlets={outlets}
            onSelectOutlet={(id) => setSelectedOutletId(id)}
            reports={reports}
            onOpenChecklist={handleOpenChecklist}
            onRefresh={() => {
              setNotification({
                title: 'Diselaraskan',
                message: 'Data pemeriksaan telah disegerakkan dengan Firebase Firestore.',
                type: 'info',
              });
            }}
          />
        ) : currentUser.role === 'supervisor' ? (
          <SupervisorDashboard
            currentUser={currentUser}
            outlets={outlets}
            reports={reports}
            onOpenReview={(rep) => setActiveReviewReport(rep)}
            onRefresh={() => {
              setNotification({
                title: 'Diselaraskan',
                message: 'Senarai laporan telah disegerakkan dengan Firebase Firestore.',
                type: 'info',
              });
            }}
          />
        ) : (
          <AdminDashboard
            currentUser={currentUser}
            outlets={outlets}
            reports={reports}
            usersList={usersList}
            auditLogs={auditLogs}
            onOpenReview={(rep) => setActiveReviewReport(rep)}
            onUpdateOutlet={handleUpdateOutlet}
            onAddUser={handleAddUser}
            onDeleteReport={handleDeleteReport}
            onDeleteUser={handleDeleteUser}
            onDeleteAuditLog={handleDeleteAuditLog}
            onClearAuditLogs={handleClearAuditLogs}
            onViewPhoto={(url, title) => setZoomPhoto({ url, title })}
            onRefresh={() => {
              setNotification({
                title: 'Diselaraskan',
                message: 'Ringkasan eksekutif telah disegerakkan dengan Firebase Firestore.',
                type: 'info',
              });
            }}
          />
        )}
      </main>

      {/* MODAL 1: Auth Modal (Email/Password, Google, Apple) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
        outlets={outlets}
        onNewUserNeedsRole={handleNewUserNeedsRole}
      />

      {/* MODAL 2: New User Role & Outlet Selection Popup */}
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        user={pendingNewUser}
        outlets={outlets}
        isLoading={isSavingRole}
        onConfirm={handleConfirmRoleAndOutlet}
        onCancel={handleCancelRoleModal}
      />

      {/* MODAL 3: 12 Critical Point Inspection Checklist */}
      {activeChecklistSession && (
        <ChecklistModal
          isOpen={!!activeChecklistSession}
          onClose={() => setActiveChecklistSession(null)}
          sessionType={activeChecklistSession}
          outlet={currentOutlet}
          existingReport={existingReportForChecklist}
          onSaveReport={handleSaveReport}
        />
      )}

      {/* MODAL 4: Supervisor Review */}
      {activeReviewReport && (
        <ReviewModal
          isOpen={!!activeReviewReport}
          onClose={() => setActiveReviewReport(null)}
          report={activeReviewReport}
          outlet={outlets.find((o) => o.id === activeReviewReport.outletId)}
          onApprove={handleApproveReport}
          onReject={handleRejectReport}
          onViewPhoto={(url, title) => setZoomPhoto({ url, title })}
        />
      )}

      {/* MODAL 5: 1:1 Photo Zoom Lightbox */}
      {zoomPhoto && (
        <PhotoZoomModal
          imageUrl={zoomPhoto.url}
          title={zoomPhoto.title}
          onClose={() => setZoomPhoto(null)}
        />
      )}

      {/* MODAL 6: Notification / Toast Feedback */}
      <NotificationModal
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}

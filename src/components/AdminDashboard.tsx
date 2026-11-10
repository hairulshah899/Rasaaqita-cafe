import React, { useState } from 'react';
import {
  UserProfile,
  Outlet,
  ReportRecord,
  AuditLog,
  SessionType,
  UserRole,
} from '../types';
import { CHECKLIST_ITEMS } from '../data/initialData';
import {
  PieChart,
  Store,
  Users,
  FileText,
  Download,
  Printer,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Thermometer,
  Edit2,
  X,
  Search,
  Camera,
  ZoomIn,
  Eye,
  Filter,
  CheckCircle2,
  RotateCcw,
  Sun,
  Moon,
  XCircle,
  Hourglass,
  Bell,
  BarChart3,
  FileWarning,
  Check,
  FolderCheck,
  FolderOpen,
  Layers,
  LayoutGrid,
  UploadCloud,
  Cloud,
  Copy,
  FileJson,
  ExternalLink,
  Loader2,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { uploadReportDossierToStorage, uploadCustomFileToStorage } from '../firebase';

interface AdminDashboardProps {
  currentUser: UserProfile;
  outlets: Outlet[];
  reports: ReportRecord[];
  usersList: UserProfile[];
  auditLogs: AuditLog[];
  onOpenReview: (report: ReportRecord) => void;
  onUpdateOutlet?: (updated: Outlet) => void;
  onAddUser: (newUser: UserProfile) => void;
  onDeleteReport?: (reportId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onDeleteAuditLog?: (logId: string) => void;
  onClearAuditLogs?: () => void;
  onRefresh: () => void;
  onViewPhoto?: (imageUrl: string, title: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  outlets,
  reports,
  usersList,
  auditLogs,
  onOpenReview,
  onUpdateOutlet,
  onAddUser,
  onDeleteReport,
  onDeleteUser,
  onDeleteAuditLog,
  onClearAuditLogs,
  onRefresh,
  onViewPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'verifiedReports' | 'users' | 'reports'>('overview');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Deletion Confirmation Modal States
  const [reportToDelete, setReportToDelete] = useState<ReportRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [isConfirmClearLogs, setIsConfirmClearLogs] = useState(false);

  // Verified Reports (Laporan Operasi Disahkan Penyelia) Filter & Storage Upload State
  const [verifiedOutletFilter, setVerifiedOutletFilter] = useState<string>('all');
  const [verifiedSessionFilter, setVerifiedSessionFilter] = useState<string>('all');
  const [verifiedStorageStatusFilter, setVerifiedStorageStatusFilter] = useState<'all' | 'uploaded' | 'pending'>('all');
  const [verifiedSearchQuery, setVerifiedSearchQuery] = useState<string>('');
  const [uploadingReportId, setUploadingReportId] = useState<string | null>(null);
  const [isBatchUploading, setIsBatchUploading] = useState<boolean>(false);
  const [uploadSuccessMap, setUploadSuccessMap] = useState<Record<string, { storageUri: string; downloadUrl: string; time: string }>>({});
  const [copiedStorageUri, setCopiedStorageUri] = useState<string | null>(null);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
  const [newUserOutlet, setNewUserOutlet] = useState(outlets[0]?.id || 'outlet-1');

  const todayStr = new Date().toISOString().split('T')[0];

  // Dynamic status classifications
  const confirmedReports = reports.filter((r) => r.status === 'Disahkan');
  const pendingReports = reports.filter((r) => r.status === 'Dihantar');
  const correctionReports = reports.filter((r) => r.status === 'Perlu Pembetulan');

  // Overview metrics
  const totalOutlets = outlets.length;
  const pendingReviews = pendingReports.length;
  const todayReports = reports.filter((r) => r.date === todayStr);

  // Dynamic session counts: count outlets that have confirmed reports for each session (today or latest)
  const bosConfirmedCount = outlets.filter((o) =>
    reports.some((r) => r.outletId === o.id && r.session === 'BOS' && r.status === 'Disahkan')
  ).length;

  const mosConfirmedCount = outlets.filter((o) =>
    reports.some((r) => r.outletId === o.id && r.session === 'MOS' && r.status === 'Disahkan')
  ).length;

  const eosConfirmedCount = outlets.filter((o) =>
    reports.some((r) => r.outletId === o.id && r.session === 'EOS' && r.status === 'Disahkan')
  ).length;

  const validScores = reports.filter((r) => r.score !== undefined).map((r) => r.score);
  const averageCompliance =
    validScores.length > 0
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
      : '100';

  // Dynamic alerts derived from actual reports
  const dynamicAlerts = reports
    .flatMap((r) => {
      const outletObj = outlets.find((o) => o.id === r.outletId);
      const outletName = outletObj ? outletObj.name : r.outletId;
      const alerts: {
        id: string;
        title: string;
        location: string;
        time: string;
        type: 'temp' | 'report' | 'issue';
        report: ReportRecord;
      }[] = [];

      if (r.status === 'Perlu Pembetulan') {
        alerts.push({
          id: `${r.id}-correction`,
          title: `Laporan ${r.session} dipulangkan: ${r.supervisorNotes || 'Perlu pembetulan'}`,
          location: outletName,
          time: r.reviewedAt || r.time || r.date,
          type: 'issue',
          report: r,
        });
      }

      Object.entries(r.answers || {}).forEach(([idStr, ans]) => {
        const id = Number(idStr);
        const itemInfo = CHECKLIST_ITEMS.find((i) => i.id === id);
        if (ans.status === 'Tidak Patuh') {
          alerts.push({
            id: `${r.id}-item-${id}`,
            title: `${itemInfo?.name || `Titik #${id}`}: ${ans.notes || 'Tidak Patuh'}`,
            location: `${outletName} · Sesi ${r.session}`,
            time: r.time || r.date,
            type: itemInfo?.type === 'temp' ? 'temp' : 'issue',
            report: r,
          });
        }
      });

      return alerts;
    })
    .slice(0, 5);

  // Dossiers of verified reports for Admin Analysis & Storage archive
  const confirmedDossiers = confirmedReports.map((rep) => {
    const outletObj = outlets.find((o) => o.id === rep.outletId);
    const photos = Object.entries(rep.answers || {})
      .filter(([_, ans]) => Boolean(ans?.image && ans.image.trim().length > 0))
      .map(([idStr, ans]) => {
        const id = Number(idStr);
        const itemInfo = CHECKLIST_ITEMS.find((i) => i.id === id);
        return {
          id: `${rep.id}-${id}`,
          itemId: id,
          itemName: itemInfo ? itemInfo.name : `Titik #${id}`,
          desc: itemInfo?.desc,
          type: itemInfo?.type,
          status: ans.status,
          temp: ans.temp,
          notes: ans.notes,
          image: ans.image as string,
        };
      });

    return {
      report: rep,
      outlet: outletObj,
      outletName: outletObj?.name || rep.outletId,
      outletCode: outletObj?.code || 'RQ',
      photos,
      hasPhotos: photos.length > 0,
      totalItemsCount: Object.keys(rep.answers || {}).length,
    };
  });

  // Filtered confirmed reports for "Laporan Operasi Yang Telah Disahkan Penyelia (Untuk Analisis Admin)"
  const filteredConfirmedReports = confirmedReports.filter((rep) => {
    const outletObj = outlets.find((o) => o.id === rep.outletId);
    const outletName = outletObj?.name || rep.outletId;
    const outletCode = outletObj?.code || '';
    const hasStorage = Boolean(rep.storageUri || uploadSuccessMap[rep.id]);

    if (verifiedOutletFilter !== 'all' && rep.outletId !== verifiedOutletFilter) return false;
    if (verifiedSessionFilter !== 'all' && rep.session !== verifiedSessionFilter) return false;
    if (verifiedStorageStatusFilter === 'uploaded' && !hasStorage) return false;
    if (verifiedStorageStatusFilter === 'pending' && hasStorage) return false;

    if (verifiedSearchQuery.trim()) {
      const q = verifiedSearchQuery.toLowerCase();
      const matchStaff = (rep.staffName || '').toLowerCase().includes(q);
      const matchOutlet = outletName.toLowerCase().includes(q) || outletCode.toLowerCase().includes(q);
      const matchNotes = (rep.supervisorNotes || '').toLowerCase().includes(q);
      const matchSupervisor = (rep.supervisorName || '').toLowerCase().includes(q);
      const matchId = rep.id.toLowerCase().includes(q);
      if (!matchStaff && !matchOutlet && !matchNotes && !matchSupervisor && !matchId) return false;
    }
    return true;
  });

  // Upload an individual confirmed report to Firebase Storage (gs://cafe-operation.firebasestorage.app)
  const handleUploadToFirebaseStorage = async (rep: ReportRecord) => {
    setUploadingReportId(rep.id);
    const outletObj = outlets.find((o) => o.id === rep.outletId);

    const dossierPayload = {
      archiveHeader: {
        system: 'Rasaaqita Cafe Operations - Executive Audit Archive',
        targetBucket: 'gs://cafe-operation.firebasestorage.app',
        archivedAt: new Date().toISOString(),
        archivedBy: currentUser.email,
        reportId: rep.id,
        status: rep.status,
      },
      outlet: {
        id: rep.outletId,
        name: outletObj?.name || rep.outletId,
        code: outletObj?.code || 'RQ',
        location: outletObj?.location || '',
        manager: outletObj?.managerName || '',
      },
      session: {
        name: rep.session,
        date: rep.date,
        time: rep.time,
        timestamp: rep.createdAt,
      },
      personnel: {
        staffName: rep.staffName,
        staffId: rep.staffId,
        supervisorName: rep.supervisorName || 'Penyelia Cawangan',
        reviewedAt: rep.reviewedAt || '',
      },
      auditEvaluation: {
        complianceScore: rep.score ?? 100,
        supervisorNotes: rep.supervisorNotes || 'Disahkan mematuhi SOP operasi sepenuhnya.',
      },
      criticalPoints: CHECKLIST_ITEMS.map((item) => {
        const ans = rep.answers?.[item.id];
        return {
          id: item.id,
          name: item.name,
          type: item.type,
          description: item.desc,
          complianceStatus: ans?.status || 'Tidak Berkenaan',
          reading: ans?.temp ? `${ans.temp}${item.unit || '°C'}` : null,
          staffNotes: ans?.notes || '',
          evidencePhotoUrl: ans?.image || null,
        };
      }),
    };

    const jsonString = JSON.stringify(dossierPayload, null, 2);

    try {
      const result = await uploadReportDossierToStorage(
        rep.id,
        rep.outletId,
        rep.session,
        rep.date,
        jsonString,
        'application/json'
      );

      setUploadSuccessMap((prev) => ({
        ...prev,
        [rep.id]: {
          storageUri: result.storageUri,
          downloadUrl: result.downloadUrl,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      }));
    } catch (err) {
      console.warn('Gagal muat naik fail laporan ke Firebase Storage:', err);
    } finally {
      setUploadingReportId(null);
    }
  };

  // Batch upload all confirmed reports to Firebase Storage
  const handleBatchUploadAllConfirmed = async () => {
    if (confirmedReports.length === 0) return;
    setIsBatchUploading(true);
    for (const rep of confirmedReports) {
      await handleUploadToFirebaseStorage(rep);
    }
    setIsBatchUploading(false);
  };

  // Copy Storage URI helper
  const handleCopyStorageUri = (uri: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(uri);
      setCopiedStorageUri(uri);
      setTimeout(() => setCopiedStorageUri(null), 2500);
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,ID,Outlet,Sesi,Tarikh,Masa,Staf,Skor,Status,Catatan Penyelia\n';
    reports.forEach((r) => {
      const outletObj = outlets.find((o) => o.id === r.outletId);
      const outletName = outletObj ? outletObj.name : r.outletId;
      const cleanNotes = (r.supervisorNotes || '').replace(/"/g, '""');
      csvContent += `"${r.id}","${outletName}","${r.session}","${r.date}","${r.time || ''}","${r.staffName}",${r.score}%,"${r.status}","${cleanNotes}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_rasaaqita_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add User Submit
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const isOwner = newUserEmail.trim().toLowerCase() === 'hairulshah899@gmail.com';
    const finalRole: UserRole = isOwner ? 'admin' : (newUserRole === 'admin' ? 'staff' : newUserRole);

    const created: UserProfile = {
      uid: `u-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: finalRole,
      outletId: finalRole === 'admin' ? 'all' : newUserOutlet,
    };
    onAddUser(created);
    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserEmail('');
  };

  const getStatusIcon = (status?: string) => {
    if (!status) {
      return (
        <span className="text-stone-300 text-xs font-mono" title="Belum mula">
          —
        </span>
      );
    }
    if (status === 'Disahkan') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs" title="Disahkan">
          <CheckCircle className="w-4 h-4" />
        </span>
      );
    }
    if (status === 'Dihantar') {
      return (
        <span className="inline-flex items-center gap-1 text-blue-600 font-semibold text-xs" title="Menunggu semakan">
          <Clock className="w-4 h-4" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-xs" title="Perlu pembetulan">
        <AlertTriangle className="w-4 h-4" />
      </span>
    );
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#005a3c] text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>6. OWNER DASHBOARD</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('verifiedReports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'verifiedReports'
              ? 'bg-[#005a3c] text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <FolderCheck className="w-3.5 h-3.5" />
          <span>Laporan Disahkan Penyelia (Analisis Admin) ({confirmedReports.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-[#005a3c] text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Pengguna & Peranan ({usersList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-[#005a3c] text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Laporan & Jejak Audit</span>
        </button>
      </div>

      {/* TAB 1: 6. OWNER DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Banner Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2.5">
              <span className="bg-[#005a3c] text-white text-xs sm:text-sm font-black px-4 py-1.5 rounded-lg tracking-wider uppercase shadow-xs flex items-center gap-2">
                <span>6. OWNER DASHBOARD</span>
              </span>
              <span className="text-xs text-stone-500 font-medium hidden sm:inline">
                Pemantauan Langsung Masa Nyata Cawangan Rasaaqita Cafe
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400 font-mono text-[11px]">Tarikh: {todayStr}</span>
              <button
                type="button"
                onClick={onRefresh}
                className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                <span>Segerak Firestore</span>
              </button>
            </div>
          </div>

          {/* Top 5 KPI Cards (Dynamic & Exact match to mockup design) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Jumlah Outlet */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#005a3c] shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-500 block">Jumlah Outlet</span>
                <div className="text-2xl font-black text-stone-900 leading-tight font-mono">
                  {totalOutlets}
                </div>
                <span className="text-[10px] text-stone-400 font-medium">Outlet Aktif</span>
              </div>
            </div>

            {/* 2. BOS Selesai */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#208b58] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-500 block">BOS Selesai</span>
                <div className="text-2xl font-black text-stone-900 leading-tight font-mono">
                  {bosConfirmedCount} / {totalOutlets}
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">
                  {totalOutlets > 0 ? Math.round((bosConfirmedCount / totalOutlets) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* 3. MOS Selesai */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#f97316] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sun className="w-6 h-6 fill-white" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-500 block">MOS Selesai</span>
                <div className="text-2xl font-black text-stone-900 leading-tight font-mono">
                  {mosConfirmedCount} / {totalOutlets}
                </div>
                <span className="text-[10px] text-orange-600 font-bold">
                  {totalOutlets > 0 ? Math.round((mosConfirmedCount / totalOutlets) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* 4. EOS Selesai */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Moon className="w-6 h-6 fill-white" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-500 block">EOS Selesai</span>
                <div className="text-2xl font-black text-stone-900 leading-tight font-mono">
                  {eosConfirmedCount} / {totalOutlets}
                </div>
                <span className="text-[10px] text-blue-700 font-bold">
                  {totalOutlets > 0 ? Math.round((eosConfirmedCount / totalOutlets) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* 5. Isu / Alert */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-12 h-12 rounded-full bg-[#dc2626] text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6 fill-white" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-500 block">Isu / Alert</span>
                <div className="text-2xl font-black text-rose-600 leading-tight font-mono">
                  {correctionReports.length + dynamicAlerts.length}
                </div>
                <span className="text-[10px] text-rose-600 font-bold">Perlu Tindakan</span>
              </div>
            </div>
          </div>

          {/* Middle 3 Panels: Status Outlet | Prestasi Outlet | Alert & Isu Terkini */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 items-stretch">
            {/* Panel 1: Status Outlet (Hari Ini) */}
            <div className="md:col-span-2 xl:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#005a3c]" />
                  <h3 className="font-bold text-xs sm:text-sm text-stone-900">
                    Status Outlet (Hari Ini)
                  </h3>
                </div>
                <span className="text-[10px] text-stone-400 font-mono">BOS · MOS · EOS</span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-sky-50/50 text-stone-600 font-semibold border-b border-stone-200 text-[11px]">
                      <th className="py-2.5 px-4 font-bold">Outlet</th>
                      <th className="py-2.5 px-2 text-center font-bold">BOS</th>
                      <th className="py-2.5 px-2 text-center font-bold">MOS</th>
                      <th className="py-2.5 px-2 text-center font-bold">EOS</th>
                      <th className="py-2.5 px-3 text-center font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {outlets.map((o) => {
                      const outletReps = reports.filter((r) => r.outletId === o.id);
                      const bosRep = outletReps.find((r) => r.session === 'BOS');
                      const mosRep = outletReps.find((r) => r.session === 'MOS');
                      const eosRep = outletReps.find((r) => r.session === 'EOS');

                      const renderSessionIcon = (rep?: ReportRecord) => {
                        if (!rep) {
                          return (
                            <span title="Belum dilaksanakan" className="inline-block">
                              <Hourglass className="w-4 h-4 text-amber-500 mx-auto" />
                            </span>
                          );
                        }
                        if (rep.status === 'Disahkan') {
                          return (
                            <span title="Disahkan oleh penyelia" className="inline-block">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto fill-emerald-100" />
                            </span>
                          );
                        }
                        if (rep.status === 'Dihantar') {
                          return (
                            <span title="Dihantar staf (Menunggu semakan penyelia)" className="inline-block">
                              <Clock className="w-4 h-4 text-blue-600 mx-auto" />
                            </span>
                          );
                        }
                        return (
                          <span title="Perlu pembetulan" className="inline-block">
                            <XCircle className="w-4 h-4 text-rose-600 mx-auto fill-rose-100" />
                          </span>
                        );
                      };

                      const hasCorrection = [bosRep, mosRep, eosRep].some(
                        (r) => r?.status === 'Perlu Pembetulan'
                      );
                      const allDone =
                        bosRep?.status === 'Disahkan' &&
                        mosRep?.status === 'Disahkan' &&
                        eosRep?.status === 'Disahkan';

                      return (
                        <tr key={o.id} className="hover:bg-stone-50/60 transition">
                          <td className="py-3 px-4 font-bold text-stone-800 whitespace-nowrap">
                            {o.name}
                          </td>
                          <td className="py-3 px-2 text-center">{renderSessionIcon(bosRep)}</td>
                          <td className="py-3 px-2 text-center">{renderSessionIcon(mosRep)}</td>
                          <td className="py-3 px-2 text-center">{renderSessionIcon(eosRep)}</td>
                          <td className="py-3 px-3 text-center">
                            {hasCorrection ? (
                              <span className="bg-[#fee2e2] text-[#991b1b] px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-200 whitespace-nowrap">
                                Ada Isu
                              </span>
                            ) : allDone ? (
                              <span className="bg-[#d1f2d9] text-[#0f5132] px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 whitespace-nowrap">
                                Selesai
                              </span>
                            ) : (
                              <span className="bg-[#fef3c7] text-[#92400e] px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 whitespace-nowrap">
                                Dalam Proses
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel 2: Prestasi Outlet (Skor Outlet) */}
            <div className="md:col-span-1 xl:col-span-3 bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="w-4 h-4 text-[#005a3c] shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                    Prestasi Outlet
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-stone-500 font-mono shrink-0">
                  (Skor Purata)
                </span>
              </div>

              <div className="space-y-4 flex-1 justify-center flex flex-col">
                {outlets.map((o) => {
                  const oReports = reports.filter(
                    (r) => r.outletId === o.id && r.score !== undefined
                  );
                  const avg =
                    oReports.length > 0
                      ? Math.round(
                          oReports.reduce((sum, r) => sum + r.score, 0) / oReports.length
                        )
                      : 85;

                  const colorClass =
                    avg >= 90
                      ? 'bg-emerald-500'
                      : avg >= 75
                      ? 'bg-emerald-600'
                      : avg >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500';

                  const textClass =
                    avg >= 75
                      ? 'text-emerald-700'
                      : avg >= 60
                      ? 'text-amber-700'
                      : 'text-rose-700';

                  return (
                    <div key={o.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-stone-800 truncate pr-2" title={o.name}>{o.name}</span>
                        <span className={`font-mono font-bold shrink-0 ${textClass}`}>{avg}%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-3.5 overflow-hidden p-0.5">
                        <div
                          className={`${colorClass} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(10, avg))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel 3: Alert & Isu Terkini */}
            <div className="md:col-span-1 xl:col-span-4 bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#005a3c]" />
                  <h3 className="font-bold text-xs sm:text-sm text-stone-900">
                    Alert & Isu Terkini
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 shrink-0">
                  {correctionReports.length + dynamicAlerts.length} Perlu Tindakan
                </span>
              </div>

              <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                {dynamicAlerts.length > 0 ? (
                  dynamicAlerts.map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => onOpenReview(alt.report)}
                      className="bg-[#fff1f2] border border-[#fecdd3] rounded-xl p-3 flex items-start gap-2.5 cursor-pointer hover:bg-rose-100/60 transition"
                      title="Klik untuk membuka laporan ini"
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                        {alt.type === 'temp' ? (
                          <Thermometer className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-rose-950 leading-snug">
                          {alt.title}
                        </h4>
                        <p className="text-[10px] text-rose-800/80 mt-1">
                          {alt.location} • {alt.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center my-auto">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                    <span className="font-bold text-xs text-emerald-900 block">
                      Semua Titik Patuh
                    </span>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      Tiada alert kritikal dikesan pada operasi semasa.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Mint Green Realtime Banner */}
          <div className="bg-[#e5f6ee] border border-[#a6e5c8] text-[#0f5132] px-5 py-3.5 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-xs">
            <BarChart3 className="w-5 h-5 text-[#0f5132] shrink-0" />
            <span>
              Owner boleh pantau status outlet, gambar, isu kritikal dan tindakan pembetulan secara realtime.
            </span>
          </div>

          {/* Dedicated Section: Laporan Yang Telah Disahkan Penyelia untuk Analisis & Review Owner */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-stone-900">
                    Laporan Operasi Yang Telah Disahkan Penyelia (Untuk Analisis Admin)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {confirmedReports.length} Disahkan
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Laporan dan bukti bergambar yang telah disemak & disahkan oleh penyelia cawangan sedia untuk analisis eksekutif.
                </p>
              </div>

              {pendingReports.length > 0 && (
                <div className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5 self-start sm:self-auto">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>{pendingReports.length} laporan masih menunggu semakan penyelia</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-600 uppercase text-[11px] font-semibold border-b border-stone-200">
                    <th className="py-3 px-6">Outlet</th>
                    <th className="py-3 px-4">Sesi & Tarikh</th>
                    <th className="py-3 px-4">Staf Pelapor</th>
                    <th className="py-3 px-4">Penyelia Pengesah</th>
                    <th className="py-3 px-4 text-center">Skor Pematuhan</th>
                    <th className="py-3 px-4">Ulasan Penyelia</th>
                    <th className="py-3 px-6 text-right">Tindakan Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {confirmedReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-stone-400">
                        Belum ada laporan yang disahkan oleh penyelia. Laporan yang disahkan akan dipaparkan di sini secara automatik.
                      </td>
                    </tr>
                  ) : (
                    confirmedReports.map((r) => {
                      const outletObj = outlets.find((o) => o.id === r.outletId);
                      const photoCount = Object.values(r.answers || {}).filter(
                        (a) => a?.image && a.image.length > 0
                      ).length;

                      return (
                        <tr key={r.id} className="hover:bg-emerald-50/30 transition">
                          <td className="py-3.5 px-6 font-bold text-stone-900">
                            <div className="flex items-center gap-2">
                              <Store className="w-3.5 h-3.5 text-amber-800" />
                              <span>{outletObj ? outletObj.name : r.outletId}</span>
                              <span className="text-[10px] font-mono text-stone-400 font-normal">
                                ({outletObj?.code || 'RQ'})
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-stone-700">
                            <span className="font-bold text-stone-900 font-mono">{r.session}</span>
                            <div className="text-[11px] text-stone-400">
                              {r.date} {r.time ? `· ${r.time}` : ''}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-stone-800 font-medium">{r.staffName}</td>
                          <td className="py-3.5 px-4 text-emerald-800 font-semibold">
                            {r.supervisorName || 'Penyelia'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`font-bold font-mono text-xs ${
                                r.score >= 90
                                  ? 'text-emerald-700'
                                  : r.score >= 75
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {r.score}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-stone-600 italic max-w-xs truncate">
                            {r.supervisorNotes || 'Disahkan mematuhi piawaian SOP.'}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <button
                              type="button"
                              onClick={() => onOpenReview(r)}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#005a3c] hover:bg-[#00472f] text-white transition shadow-2xs flex items-center gap-1.5 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Analisis & Semak ({photoCount} Foto)</span>
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

          {/* Integrated Laporan Operasi Yang Telah Disahkan Penyelia Section inside Owner Dashboard */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <FolderCheck className="w-5 h-5 text-[#005a3c]" />
                  <h3 className="font-bold text-sm text-stone-900">
                    Laporan Operasi Yang Telah Disahkan Penyelia (Untuk Analisis Admin)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {confirmedDossiers.length} Fail Laporan Disahkan
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Fail laporan operasi cawangan yang disahkan oleh penyelia, sedia untuk dianalisis dan disimpan terus ke Firebase Storage di <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-emerald-800 font-bold">gs://cafe-operation.firebasestorage.app</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('verifiedReports')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#005a3c] text-white hover:bg-[#00472f] transition shadow-2xs flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <FolderCheck className="w-3.5 h-3.5" />
                <span>Buka Semua Laporan Disahkan ({confirmedDossiers.length})</span>
              </button>
            </div>

            {/* Quick Preview of Latest Verified Reports */}
            {confirmedDossiers.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200">
                <CheckCircle2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs text-stone-500">Belum ada laporan operasi yang telah disahkan penyelia.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {confirmedDossiers.slice(0, 2).map((dossier) => {
                  const rep = dossier.report;
                  const isStored = Boolean(rep.storageUri || uploadSuccessMap[rep.id]);
                  const isUploading = uploadingReportId === rep.id;

                  return (
                    <div
                      key={rep.id}
                      className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-white font-mono text-xs font-black ${
                              rep.session === 'BOS'
                                ? 'bg-[#005a3c]'
                                : rep.session === 'MOS'
                                ? 'bg-[#f97316]'
                                : 'bg-[#1e3a8a]'
                            }`}
                          >
                            {rep.session}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-stone-900">
                              {dossier.outletName} ({dossier.outletCode})
                            </span>
                            <span className="text-[11px] text-stone-500 ml-2 font-mono">
                              {rep.date} {rep.time ? `· ${rep.time}` : ''} • Staf: {rep.staffName}
                              {rep.supervisorName && ` • Sah: ${rep.supervisorName}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Storage Status Pill */}
                          {isStored ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
                              <Cloud className="w-3 h-3 text-sky-600" />
                              <span>Di Firebase Storage</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUploadToFirebaseStorage(rep)}
                              disabled={isUploading}
                              className="px-2.5 py-1 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-300 rounded-lg hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer"
                            >
                              {isUploading ? (
                                <Loader2 className="w-3 h-3 animate-spin text-sky-700" />
                              ) : (
                                <UploadCloud className="w-3 h-3 text-sky-700" />
                              )}
                              <span>Upload ke Storage</span>
                            </button>
                          )}

                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Disahkan (Skor: {rep.score ?? 100}%)
                          </span>

                          <button
                            type="button"
                            onClick={() => onOpenReview(rep)}
                            className="px-2.5 py-1 text-[11px] font-bold text-[#005a3c] bg-white border border-[#005a3c]/30 rounded-lg hover:bg-emerald-50 transition flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Semak Fail</span>
                          </button>
                        </div>
                      </div>

                      {/* Photo Thumbnails in this File */}
                      {dossier.photos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                          {dossier.photos.map((item) => (
                            <div
                              key={item.id}
                              className="group relative rounded-lg overflow-hidden border border-stone-200 bg-stone-100 aspect-square cursor-pointer shadow-2xs hover:shadow-md transition"
                              onClick={() =>
                                onViewPhoto?.(
                                  item.image,
                                  `${dossier.outletName} (${dossier.outletCode}) · Sesi ${rep.session} #${item.itemId} (${item.itemName})`
                                )
                              }
                            >
                              <img
                                src={item.image}
                                alt={item.itemName}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent p-1.5 flex flex-col justify-between text-white pointer-events-none">
                                <span
                                  className={`self-start px-1 py-0.2 rounded text-[8px] font-bold ${
                                    item.status === 'Patuh' ? 'bg-emerald-600' : 'bg-rose-600'
                                  }`}
                                >
                                  #{item.itemId}
                                </span>
                                <p className="text-[10px] font-bold leading-tight truncate">
                                  {item.itemName}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}



      {/* TAB 3: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Pengurusan Profil Pengguna & Penugasan Peranan
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Kawalan akses keselamatan ketat bagi Staf Operasi, Penyelia Cawangan dan Pengurus Eksekutif.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2da44e] hover:bg-[#2c974b] text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pengguna Baharu</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-600 uppercase text-[11px] font-semibold border-b border-stone-200">
                    <th className="py-3 px-6">Nama Pengguna</th>
                    <th className="py-3 px-4">Alamat Emel</th>
                    <th className="py-3 px-4">Peranan Sistem</th>
                    <th className="py-3 px-4">Cawangan Ditugaskan</th>
                    <th className="py-3 px-4">Status Akaun</th>
                    <th className="py-3 px-6 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {usersList.map((u) => {
                    const outletObj = outlets.find((o) => o.id === u.outletId);
                    const isMainOwner = u.email?.trim().toLowerCase() === 'hairulshah899@gmail.com' || u.role === 'admin';
                    return (
                      <tr key={u.uid} className="hover:bg-stone-50/80 transition">
                        <td className="py-3.5 px-6 font-bold text-stone-900">{u.name}</td>
                        <td className="py-3.5 px-4 text-stone-600 font-mono">{u.email}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'supervisor'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-200 text-stone-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-800 font-medium">
                          {outletObj ? outletObj.name : 'Semua Cawangan (Global)'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Aktif</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          {isMainOwner ? (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 inline-block">
                              Owner Utama (Kekal)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Padam akaun pengguna ini"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Padam</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REPORTS & AUDIT TRAIL */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Eksport Data & Jejak Audit Sistem
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Muat turun rekod pematuhan cawangan untuk arkib atau cetak laporan rasmi.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#773117] hover:bg-[#5e2713] text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>

          {/* Card 1: Semua Rekod Laporan Pemeriksaan Operasi */}
          <div className="bg-white rounded-2xl shadow-xs border border-stone-200 overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#005a3c]" />
                  <span>Semua Rekod Laporan Pemeriksaan Operasi ({reports.length} Rekod)</span>
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Senarai semua draf, laporan dihantar, dipulangkan atau disahkan. Pentadbir boleh menyemak atau memadam rekod.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-600 uppercase text-[11px] font-semibold border-b border-stone-200">
                    <th className="py-3 px-6">Sesi & Cawangan</th>
                    <th className="py-3 px-4">Tarikh & Masa</th>
                    <th className="py-3 px-4">Staf Pelapor</th>
                    <th className="py-3 px-4">Skor & Status</th>
                    <th className="py-3 px-6 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-stone-400">
                        Tiada rekod laporan ditemui dalam sistem.
                      </td>
                    </tr>
                  ) : (
                    reports.map((rep) => {
                      const outletObj = outlets.find((o) => o.id === rep.outletId);
                      return (
                        <tr key={rep.id} className="hover:bg-stone-50/80 transition">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black font-mono text-white ${
                                  rep.session === 'BOS'
                                    ? 'bg-[#005a3c]'
                                    : rep.session === 'MOS'
                                    ? 'bg-[#f97316]'
                                    : 'bg-[#1e3a8a]'
                                }`}
                              >
                                {rep.session}
                              </span>
                              <span className="font-bold text-stone-900">
                                {outletObj?.name || rep.outletId}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-stone-600">
                            {rep.date} {rep.time ? `· ${rep.time}` : ''}
                          </td>
                          <td className="py-3.5 px-4 text-stone-700 font-medium">
                            {rep.staffName}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rep.status === 'Disahkan'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rep.status === 'Perlu Pembetulan'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {rep.status}
                              </span>
                              <span className="text-[11px] font-bold font-mono text-stone-600">
                                ({rep.score ?? 100}%)
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => onOpenReview(rep)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition flex items-center gap-1 cursor-pointer"
                                title="Buka Semakan Laporan"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Semak</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setReportToDelete(rep)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 transition flex items-center gap-1 cursor-pointer"
                                title="Padam Laporan Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Padam</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Jejak Audit Aktiviti Terkini (System Audit Logs) */}
          <div className="bg-white rounded-2xl shadow-xs border border-stone-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-stone-100">
              <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-800" />
                <span>Jejak Audit Aktiviti Terkini ({auditLogs.length} Rekod)</span>
              </h4>

              {auditLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConfirmClearLogs(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  title="Kosongkan semua rekod jejak audit"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Kosongkan Semua Log</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  Tiada rekod jejak audit aktiviti.
                </div>
              ) : (
                auditLogs.slice().reverse().map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start justify-between text-xs gap-3 hover:bg-stone-100/70 transition"
                  >
                    <div className="flex-1">
                      <span className="font-bold text-stone-800">{log.user}</span>
                      <span className="text-stone-400 mx-1">({log.role})</span>
                      <span className="text-stone-600">: {log.action}</span>
                      {log.outletName && (
                        <span className="ml-2 px-2 py-0.2 rounded bg-amber-50 text-amber-800 font-medium text-[10px] border border-amber-200/60">
                          {log.outletName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-stone-400">
                        {log.timestamp}
                      </span>
                      {onDeleteAuditLog && (
                        <button
                          type="button"
                          onClick={() => onDeleteAuditLog(log.id)}
                          className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Padam log ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LAPORAN OPERASI YANG TELAH DISAHKAN PENYELIA (UNTUK ANALISIS ADMIN) */}
      {activeTab === 'verifiedReports' && (
        <div className="space-y-6">
          {/* Header & Metric Banner */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="p-2 rounded-xl bg-emerald-50 text-[#005a3c] border border-emerald-200">
                    <FolderCheck className="w-5 h-5" />
                  </span>
                  <h3 className="font-bold text-base sm:text-lg text-stone-900">
                    Laporan Operasi Yang Telah Disahkan Penyelia (Untuk Analisis Admin)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {filteredConfirmedReports.length} Laporan Disahkan
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1.5 max-w-3xl leading-relaxed">
                  Laporan operasi lengkap yang telah disemak dan diluluskan oleh penyelia cawangan sedia untuk analisis eksekutif pemilik serta arkib rasmi.
                </p>
              </div>

              {/* Action Buttons: Batch Upload & Refresh */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleBatchUploadAllConfirmed}
                  disabled={isBatchUploading || confirmedReports.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-[#005a3c] hover:bg-[#00472f] text-white text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
                  title="Muat naik semua laporan yang telah disahkan ke Firebase Storage"
                >
                  {isBatchUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memuat Naik Semua...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Muat Naik Semua ke Storage</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 transition shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                  <span>Segerak Firestore</span>
                </button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-stone-100">
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-800">Laporan Disahkan</span>
                <div className="text-2xl font-black text-emerald-800 mt-0.5 font-mono">
                  {confirmedReports.length}
                </div>
                <span className="text-[10px] text-emerald-700">Telah diluluskan penyelia</span>
              </div>

              <div className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-200">
                <span className="text-[10px] font-bold uppercase text-sky-800">Tersimpan di Storage</span>
                <div className="text-2xl font-black text-sky-800 mt-0.5 font-mono">
                  {confirmedReports.filter((r) => r.storageUri || uploadSuccessMap[r.id]).length}
                </div>
                <span className="text-[10px] text-sky-700">Fail telah dimuat naik</span>
              </div>

              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-900">Belum Disimpan</span>
                <div className="text-2xl font-black text-amber-900 mt-0.5 font-mono">
                  {confirmedReports.filter((r) => !r.storageUri && !uploadSuccessMap[r.id]).length}
                </div>
                <span className="text-[10px] text-amber-800">Sedia untuk dimuat naik</span>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-500">Purata Pematuhan</span>
                <div className="text-2xl font-black text-stone-900 mt-0.5 font-mono">
                  {averageCompliance}%
                </div>
                <span className="text-[10px] text-stone-500">Gred cemerlang piawaian</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-stone-500 mr-1">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <span className="font-semibold">Penapis:</span>
              </div>

              {/* Outlet Filter */}
              <select
                value={verifiedOutletFilter}
                onChange={(e) => setVerifiedOutletFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white text-stone-700 focus:outline-hidden focus:ring-1 focus:ring-[#005a3c]"
              >
                <option value="all">Semua Cawangan ({outlets.length})</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>

              {/* Session Filter */}
              <select
                value={verifiedSessionFilter}
                onChange={(e) => setVerifiedSessionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white text-stone-700 focus:outline-hidden focus:ring-1 focus:ring-[#005a3c]"
              >
                <option value="all">Semua Sesi Operasi</option>
                <option value="BOS">BOS (Buka Operasi)</option>
                <option value="MOS">MOS (Pertengahan Operasi)</option>
                <option value="EOS">EOS (Tutup Operasi)</option>
              </select>

              {/* Storage Status Filter */}
              <select
                value={verifiedStorageStatusFilter}
                onChange={(e) => setVerifiedStorageStatusFilter(e.target.value as 'all' | 'uploaded' | 'pending')}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white text-stone-700 focus:outline-hidden focus:ring-1 focus:ring-[#005a3c]"
              >
                <option value="all">Semua Status Storage</option>
                <option value="uploaded">Tersimpan di Storage Sahaja</option>
                <option value="pending">Belum Dimuat Naik Sahaja</option>
              </select>

              {(verifiedOutletFilter !== 'all' ||
                verifiedSessionFilter !== 'all' ||
                verifiedStorageStatusFilter !== 'all' ||
                verifiedSearchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setVerifiedOutletFilter('all');
                    setVerifiedSessionFilter('all');
                    setVerifiedStorageStatusFilter('all');
                    setVerifiedSearchQuery('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Set Semula</span>
                </button>
              )}
            </div>

            {/* Keyword Search & CSV */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={verifiedSearchQuery}
                  onChange={(e) => setVerifiedSearchQuery(e.target.value)}
                  placeholder="Cari ID, cawangan, staf, ulasan..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#005a3c]"
                />
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1 transition shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* List of Verified Report Files */}
          <div className="space-y-5">
            {filteredConfirmedReports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-xs">
                <FolderOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h4 className="font-bold text-sm text-stone-800">
                  Tiada Laporan Disahkan Dijumpai
                </h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4">
                  {confirmedReports.length === 0
                    ? 'Belum ada laporan yang disahkan oleh penyelia. Sebaik sahaja penyelia mengesahkan laporan di paparan penyelia, ia akan muncul di sini.'
                    : 'Tiada laporan menepati kriteria tapisan semasa. Sila tukar tapisan cawangan atau sesi.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVerifiedOutletFilter('all');
                    setVerifiedSessionFilter('all');
                    setVerifiedStorageStatusFilter('all');
                    setVerifiedSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#005a3c] text-white hover:bg-[#00472f] transition"
                >
                  Tunjukkan Semua Laporan Disahkan
                </button>
              </div>
            ) : (
              filteredConfirmedReports.map((rep) => {
                const outletObj = outlets.find((o) => o.id === rep.outletId);
                const outletName = outletObj ? outletObj.name : rep.outletId;
                const outletCode = outletObj?.code || 'RQ';
                const isUploading = uploadingReportId === rep.id;
                const uploadInfo = uploadSuccessMap[rep.id];
                const storageUri = rep.storageUri || uploadInfo?.storageUri;
                const downloadUrl = rep.storageUrl || uploadInfo?.downloadUrl;
                const isStored = Boolean(storageUri);

                const sessionColor =
                  rep.session === 'BOS'
                    ? 'bg-[#005a3c]'
                    : rep.session === 'MOS'
                    ? 'bg-[#f97316]'
                    : 'bg-[#1e3a8a]';

                // Extract all photos attached to this report
                const photos = Object.entries(rep.answers || {})
                  .filter(([_, ans]) => Boolean(ans?.image && ans.image.trim().length > 0))
                  .map(([idStr, ans]) => {
                    const id = Number(idStr);
                    const itemInfo = CHECKLIST_ITEMS.find((i) => i.id === id);
                    return {
                      id: `${rep.id}-${id}`,
                      itemId: id,
                      itemName: itemInfo ? itemInfo.name : `Titik #${id}`,
                      type: itemInfo?.type,
                      status: ans.status,
                      temp: ans.temp,
                      notes: ans.notes,
                      image: ans.image as string,
                    };
                  });

                return (
                  <div
                    key={rep.id}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden flex flex-col hover:border-emerald-400/80 transition"
                  >
                    {/* Dossier Header */}
                    <div className="bg-gradient-to-r from-stone-50 via-stone-50 to-emerald-50/40 p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl ${sessionColor} text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 font-mono`}
                        >
                          {rep.session}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base text-stone-900 leading-tight">
                              {outletName}
                            </h4>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-200/80 text-stone-700 font-bold">
                              {outletCode}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>
                              Dihantar oleh: <strong className="text-stone-800">{rep.staffName}</strong>
                            </span>
                            <span>•</span>
                            <span className="font-mono text-stone-600">
                              {rep.date} {rep.time ? `pada ${rep.time}` : ''}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Header Right: Compliance Score & Status */}
                      <div className="flex items-center gap-2.5 self-start sm:self-auto">
                        <div className="text-right px-3 py-1 bg-white rounded-xl border border-stone-200 shadow-2xs">
                          <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wide">
                            Skor Pematuhan
                          </span>
                          <span className="text-sm font-black font-mono text-emerald-700">
                            {rep.score ?? 100}%
                          </span>
                        </div>

                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Telah Disahkan Penyelia</span>
                        </span>
                      </div>
                    </div>

                    {/* Supervisor Sign-Off Box */}
                    <div className="px-5 py-3 bg-stone-50/70 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-[#005a3c] mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-stone-700">Ulasan / Arahan Penyelia: </span>
                          <span className="italic text-stone-600">
                            {rep.supervisorNotes
                              ? `"${rep.supervisorNotes}"`
                              : '"Disahkan mematuhi semua spesifikasi dan standard SOP operasi cawangan."'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-stone-500 shrink-0 font-medium sm:text-right">
                        Disahkan oleh: <strong className="text-stone-800">{rep.supervisorName || 'Penyelia Bertugas'}</strong>{' '}
                        {rep.reviewedAt && `(${rep.reviewedAt})`}
                      </div>
                    </div>

                    {/* Inspection Photos Grid */}
                    <div className="p-5 flex-1">
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-stone-500" />
                          <h5 className="font-bold text-xs text-stone-800 uppercase tracking-wide">
                            Foto Bukti Pemeriksaan Yang Disahkan ({photos.length} Keping)
                          </h5>
                        </div>
                        <span className="text-[11px] text-stone-400 hidden sm:inline">
                          Klik mana-mana foto untuk zum 1:1
                        </span>
                      </div>

                      {photos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                          {photos.map((photo) => (
                            <div
                              key={photo.id}
                              onClick={() =>
                                onViewPhoto?.(
                                  photo.image,
                                  `${outletName} (${outletCode}) · Sesi ${rep.session} · #${photo.itemId} (${photo.itemName})`
                                )
                              }
                              className="group relative rounded-xl border border-stone-200 overflow-hidden bg-stone-100 hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex flex-col"
                            >
                              {/* 1:1 Square Thumbnail */}
                              <div className="aspect-square w-full overflow-hidden relative bg-stone-900">
                                <img
                                  src={photo.image}
                                  alt={`Bukti #${photo.itemId} ${photo.itemName}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                  <ZoomIn className="w-5 h-5 drop-shadow-md" />
                                </div>

                                <div className="absolute top-1.5 left-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-xs ${
                                      photo.status === 'Patuh' ? 'bg-emerald-600' : 'bg-rose-600'
                                    }`}
                                  >
                                    #{photo.itemId} {photo.status}
                                  </span>
                                </div>

                                {photo.temp && (
                                  <div className="absolute bottom-1.5 right-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/75 text-amber-300 font-mono">
                                      {photo.temp}°C
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="p-2.5 bg-white flex-1 flex flex-col justify-between">
                                <div>
                                  <p className="font-bold text-[11px] text-stone-900 truncate leading-tight">
                                    #{photo.itemId} {photo.itemName}
                                  </p>
                                  {photo.notes ? (
                                    <p className="text-[10px] text-stone-600 line-clamp-2 mt-1 italic">
                                      "{photo.notes}"
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-stone-400 mt-1">Tiada catatan staf</p>
                                  )}
                                </div>

                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center text-xs text-stone-400">
                          Laporan ini disahkan tanpa foto bukti tambahan (semua 12 titik disahkan secara manual & bacaan suhu).
                        </div>
                      )}
                    </div>

                    {/* Dossier Footer Actions: Muat Naik / Kemaskini, Padam, Buka Laporan Penuh */}
                    <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-stone-500 flex items-center gap-2 flex-wrap">
                        <span>Fail ID:</span>
                        <span className="font-mono text-stone-800 font-bold">{rep.id}</span>
                        <span>•</span>
                        <span>12 Titik Disemak & Diluluskan</span>
                        <span>•</span>
                        {isStored ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Tersimpan di Cloud</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-800 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <span>Belum Disimpan</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 1. Butang Muat Naik (jika belum disimpan) */}
                        {!isStored && (
                          <button
                            type="button"
                            onClick={() => handleUploadToFirebaseStorage(rep)}
                            disabled={isUploading}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#005a3c] hover:bg-[#00472f] text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Muat naik fail laporan ini"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Memuat Naik...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Muat Naik</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* 2. Butang Kemaskini (jika telah disimpan) */}
                        {isStored && (
                          <button
                            type="button"
                            onClick={() => handleUploadToFirebaseStorage(rep)}
                            disabled={isUploading}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Kemas kini fail laporan ini di Cloud Storage"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                <span>Mengemaskini...</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                                <span>Kemaskini</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* 3. Butang Padam */}
                        <button
                          type="button"
                          onClick={() => setReportToDelete(rep)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Padam fail laporan ini"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Padam</span>
                        </button>

                        {/* 4. Butang Buka Laporan Penuh */}
                        <button
                          type="button"
                          onClick={() => onOpenReview(rep)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#005a3c] hover:bg-[#00472f] text-white transition flex items-center gap-2 shadow-xs cursor-pointer"
                          title="Buka laporan penuh untuk semakan dan analisis"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Buka Laporan Penuh</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add New User */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-base text-stone-900">Daftar Pengguna Baharu</h3>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Penuh
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="cth: Kamarul Ariffin"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-stone-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Alamat Emel
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="kamarul@rasaaqita.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-stone-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Peranan
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-stone-50"
                  >
                    <option value="staff">Staf Operasi</option>
                    <option value="supervisor">Penyelia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Cawangan
                  </label>
                  <select
                    value={newUserOutlet}
                    onChange={(e) => setNewUserOutlet(e.target.value)}
                    disabled={newUserRole === 'admin'}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-stone-50 disabled:opacity-50"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#2da44e] hover:bg-[#2c974b] text-white shadow-xs"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete Report */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900">Padam Fail Laporan Operasi?</h3>
                <p className="text-xs text-stone-500">Tindakan ini tidak boleh diundur</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 text-xs space-y-1 text-stone-700">
              <div><strong>Cawangan:</strong> {outlets.find((o) => o.id === reportToDelete.outletId)?.name || reportToDelete.outletId}</div>
              <div><strong>Sesi & Tarikh:</strong> Sesi {reportToDelete.session} · {reportToDelete.date} {reportToDelete.time ? `(${reportToDelete.time})` : ''}</div>
              <div><strong>Staf Pelapor:</strong> {reportToDelete.staffName}</div>
              <div><strong>Status:</strong> {reportToDelete.status} (Skor: {reportToDelete.score ?? 100}%)</div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Adakah anda pasti mahu memadam fail laporan ini? Rekod akan dikeluarkan daripada pangkalan data Firestore dan arkib analisis eksekutif.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteReport) onDeleteReport(reportToDelete.id);
                  setReportToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Padam Fail</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete User */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900">Padam Pengguna Sistem?</h3>
                <p className="text-xs text-stone-500">Keluarkan akses pengguna ini</p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 text-xs space-y-1 text-stone-700">
              <div><strong>Nama Pengguna:</strong> {userToDelete.name}</div>
              <div><strong>Alamat Emel:</strong> {userToDelete.email}</div>
              <div><strong>Peranan:</strong> {userToDelete.role.toUpperCase()}</div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Adakah anda pasti mahu memadam akaun pengguna ini? Pengguna tidak akan dapat mengakses aplikasi lagi.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteUser) onDeleteUser(userToDelete.uid);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Padam Pengguna</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Clear Audit Logs */}
      {isConfirmClearLogs && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900">Kosongkan Semua Jejak Audit?</h3>
                <p className="text-xs text-stone-500">Tindakan ini akan memadam semua rekod log aktiviti</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Adakah anda pasti mahu mengosongkan semua {auditLogs.length} rekod aktiviti audit sistem? Rekod yang dipadam tidak boleh dipulihkan.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmClearLogs(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAuditLogs) onClearAuditLogs();
                  setIsConfirmClearLogs(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Kosongkan Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

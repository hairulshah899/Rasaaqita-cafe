import { Outlet, ChecklistItemDef, UserProfile, ReportRecord, AuditLog } from '../types';

export const OFFICIAL_OUTLETS: Outlet[] = [
  {
    id: 'outlet-1',
    name: 'KPJ Larkin',
    location: 'Lobby Utama Hospital Pakar KPJ Puteri, Johor Bahru',
    code: 'RQ-LKN',
    tempRange: {
      chiller: { min: 2, max: 4 },
      freezer: { min: -20, max: -15 },
      bainMarie: { min: 60, max: 85 }
    },
    managerName: 'Penyelia Siti Zulaikha',
    phone: '+60 12-789 4421'
  },
  {
    id: 'outlet-2',
    name: 'KPJ Bandar Dato On',
    location: 'Aras Bawah, Hospital Pakar KPJ Bandar Dato Onn, Johor Bahru',
    code: 'RQ-BDO',
    tempRange: {
      chiller: { min: 2, max: 4 },
      freezer: { min: -20, max: -15 },
      bainMarie: { min: 60, max: 85 }
    },
    managerName: 'Penyelia Siti Zulaikha',
    phone: '+60 13-982 1102'
  },
  {
    id: 'outlet-3',
    name: 'Central Kitchen',
    location: 'Kawasan Perindustrian Tebrau II, Johor Bahru',
    code: 'RQ-CK',
    tempRange: {
      chiller: { min: 1, max: 3 },
      freezer: { min: -22, max: -18 },
      bainMarie: { min: 65, max: 90 }
    },
    managerName: 'Chef Eksekutif Radzi',
    phone: '+60 17-331 9904'
  },
  {
    id: 'outlet-4',
    name: 'Kiosk RnR Gombak',
    location: 'Hentian Sebelah Rawang/Gombak Arah Timur, Lebuhraya KL-Karak',
    code: 'RQ-GBK',
    tempRange: {
      chiller: { min: 2, max: 5 },
      freezer: { min: -18, max: -15 },
      bainMarie: { min: 60, max: 85 }
    },
    managerName: 'Penyelia Azman Shah',
    phone: '+60 19-450 7712'
  }
];

export const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  {
    id: 1,
    name: 'Keadaan Dapur',
    type: 'general',
    desc: 'Kebersihan lantai, dinding, hood ventilasi dan susun atur peralatan memasak.'
  },
  {
    id: 2,
    name: 'Hand wash area',
    type: 'general',
    desc: 'Bekalan sabun pencuci tangan anti-bakteria, tisu pengering dan air paip berfungsi lancar.'
  },
  {
    id: 3,
    name: 'sink/ washing area',
    type: 'general',
    desc: 'Kawasan sinki bersih, tiada sisa makanan tersumbat, perangkap gris teratur dan saliran baik.'
  },
  {
    id: 4,
    name: 'chiller 1 & 2',
    type: 'temp',
    tempKey: 'chiller',
    unit: '°C',
    desc: 'Pemeriksaan suhu unit chiller mengikut julat standard kelulusan kesegaran bahan mentah.'
  },
  {
    id: 5,
    name: 'Freezer',
    type: 'temp',
    tempKey: 'freezer',
    unit: '°C',
    desc: 'Pemeriksaan suhu peti sejuk beku (freezer) penyimpanan daging/ayam/ais krim.'
  },
  {
    id: 6,
    name: 'Bain Marie',
    type: 'temp',
    tempKey: 'bainMarie',
    unit: '°C',
    desc: 'Suhu pemanas makanan hidangan panas beroperasi dengan betul (kekalkan kualiti hidangan panas).'
  },
  {
    id: 7,
    name: 'Food Display',
    type: 'general',
    desc: 'Kebersihan kabinet pameran pastri, roti dan kek, pelindung akrilik serta pencahayaan bersih.'
  },
  {
    id: 8,
    name: 'Dry Storage',
    type: 'general',
    desc: 'Stor kering teratur, jarak 15cm dari lantai, bebas perosak, dan amalan susunan bertarikh (FIFO).'
  },
  {
    id: 9,
    name: 'Staf Uniform/ PPE',
    type: 'general',
    desc: 'Pemakaian apron bersih, penutup rambut/topi, kasut bertutup keselamatan dan tanda nama staf.'
  },
  {
    id: 10,
    name: 'Dining Area',
    type: 'general',
    desc: 'Kebersihan meja makan, kerusi, susunan kondimen, lantai ruang pelanggan dan muzik latar bersesuaian.'
  },
  {
    id: 11,
    name: 'Waste Area',
    type: 'general',
    desc: 'Tong sampah berlapik plastik hitam tertutup, tong sanitasi berasingan, dan kawasan cuci sisa.'
  },
  {
    id: 12,
    name: 'Fly Trap/ Pest control',
    type: 'general',
    desc: 'Lampu perangkap lalat UV aktif, pelekat bersih, dan tiada sebarang tanda kehadiran serangga/perosak.'
  }
];

export const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'u-staff-1',
    name: 'Ahmad Faiz (Staf Larkin)',
    email: 'staf@rasaaqita.com',
    role: 'staff',
    outletId: 'outlet-1'
  },
  {
    uid: 'u-staff-2',
    name: 'Nurul Huda (Staf Dato On)',
    email: 'huda@rasaaqita.com',
    role: 'staff',
    outletId: 'outlet-2'
  },
  {
    uid: 'u-staff-3',
    name: 'Chef Firdaus (Central Kitchen)',
    email: 'firdaus@rasaaqita.com',
    role: 'staff',
    outletId: 'outlet-3'
  },
  {
    uid: 'u-sup',
    name: 'Penyelia Siti Zulaikha',
    email: 'penyelia@rasaaqita.com',
    role: 'supervisor',
    outletId: 'all'
  },
  {
    uid: 'u-owner-admin-1',
    name: 'Hairul Shah (Admin)',
    email: 'hairulshah@gmail.com',
    role: 'admin',
    outletId: 'all'
  },
  {
    uid: 'u-owner-admin-2',
    name: 'Hairul Shah (Owner)',
    email: 'hairulshah899@gmail.com',
    role: 'admin',
    outletId: 'all'
  }
];

export const ADMIN_EMAILS = [
  'hairulshah@gmail.com',
  'hairulshah899@gmail.com',
];

export const isOwnerAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean);
};

const createSamplePhoto = (title: string, sub: string, accentColor: string, iconLabel: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#1c1917"/>
    <rect x="14" y="14" width="372" height="372" rx="18" fill="#292524" stroke="#44403c" stroke-width="2"/>
    <circle cx="200" cy="155" r="56" fill="${accentColor}" fill-opacity="0.18" stroke="${accentColor}" stroke-width="2.5"/>
    <text x="200" y="162" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="bold" fill="#f5f5f4" text-anchor="middle">${iconLabel}</text>
    <rect x="36" y="246" width="328" height="92" rx="14" fill="#1c1917" fill-opacity="0.95" stroke="#44403c" stroke-width="1"/>
    <text x="200" y="278" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#fafaf9" text-anchor="middle">${title}</text>
    <text x="200" y="304" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#a8a29e" text-anchor="middle">${sub}</text>
    <rect x="28" y="28" width="90" height="26" rx="7" fill="${accentColor}"/>
    <text x="73" y="45" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">BUKTI 1:1</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const getTodayDateStr = () => new Date().toISOString().split('T')[0];

export const INITIAL_REPORTS: ReportRecord[] = [
  {
    id: 'rep-init-01',
    outletId: 'outlet-1',
    session: 'BOS',
    date: getTodayDateStr(),
    time: '07:30',
    staffId: 'u-staff-1',
    staffName: 'Ahmad Faiz',
    status: 'Disahkan',
    score: 100,
    supervisorNotes: 'Pemeriksaan bukaan awal lengkap dan mematuhi SOP kebersihan sepenuhnya.',
    supervisorName: 'Penyelia Siti Zulaikha',
    reviewedAt: '08:15',
    createdAt: `${getTodayDateStr()}T07:35:00Z`,
    answers: {
      1: { status: 'Patuh', notes: 'Lantai disapu dan dimop sanitasi.', image: createSamplePhoto('Dapur Bersih Bukaan Pagi', 'KPJ Larkin · Sesi BOS', '#16a34a', 'DAPUR') },
      2: { status: 'Patuh', notes: 'Sabun & tisu penuh.', image: createSamplePhoto('Stesen Cuci Tangan Pagi', 'Bekalan Sabun Lengkap', '#0284c7', 'SINKI') },
      3: { status: 'Patuh', notes: 'Saliran sinki lancar tiada sisa.', image: '' },
      4: { status: 'Patuh', temp: '3.1', notes: 'Suhu chiller stabil pada 3.1°C.', image: createSamplePhoto('Bacaan Chiller 3.1°C', 'Piawaian 2.0°C - 4.0°C', '#16a34a', '3.1°C') },
      5: { status: 'Patuh', temp: '-18.5', notes: 'Freezer beku optimum.', image: createSamplePhoto('Freezer Beku -18.5°C', 'Piawaian -20°C - -15°C', '#0284c7', '-18.5°C') },
      6: { status: 'Patuh', temp: '68.0', notes: 'Bain marie air mencukupi.', image: '' },
      7: { status: 'Patuh', notes: 'Cermin kabinet berkilat tiada habuk.', image: '' },
      8: { status: 'Patuh', notes: 'Barangan disusun kemas FIFO.', image: '' },
      9: { status: 'Patuh', notes: 'Semua 3 staf lengkap berapron & topi.', image: '' },
      10: { status: 'Patuh', notes: 'Meja dilap sanitized cleaner.', image: '' },
      11: { status: 'Patuh', notes: 'Beg sampah baru dipasang.', image: '' },
      12: { status: 'Patuh', notes: 'Fly trap UV menyala elok.', image: '' }
    }
  },
  {
    id: 'rep-init-02',
    outletId: 'outlet-1',
    session: 'MOS',
    date: getTodayDateStr(),
    time: '13:45',
    staffId: 'u-staff-1',
    staffName: 'Ahmad Faiz',
    status: 'Dihantar',
    score: 91.7,
    createdAt: `${getTodayDateStr()}T13:45:00Z`,
    answers: {
      1: { status: 'Patuh', notes: 'Dapur kemas selepas lonjakan makan tengah hari.', image: createSamplePhoto('Keadaan Dapur Tengah Hari', 'KPJ Larkin · Sesi MOS', '#16a34a', 'DAPUR') },
      2: { status: 'Patuh', notes: 'Sabun diisi semula.', image: createSamplePhoto('Kawasan Cuci Tangan', 'Sabun Ditambah Baru', '#0284c7', 'HAND WASH') },
      3: { status: 'Patuh', notes: 'Pinggan mangkuk dicuci berjadual.', image: '' },
      4: { status: 'Patuh', temp: '3.6', notes: 'Chiller 3.6°C normal.', image: createSamplePhoto('Termometer Chiller 3.6°C', 'Status Normal (Julat 2-4°C)', '#d97706', '3.6°C') },
      5: { status: 'Patuh', temp: '-17.2', notes: 'Freezer terkawal.', image: '' },
      6: { status: 'Patuh', temp: '72.0', notes: 'Sup & lauk panas.', image: createSamplePhoto('Bain Marie Panas 72°C', 'Pemanas Hidangan Berfungsi', '#ea580c', 'WARMER') },
      7: { status: 'Patuh', notes: 'Dulang pastri ditambah.', image: '' },
      8: { status: 'Patuh', notes: 'Kemas.', image: '' },
      9: { status: 'Patuh', notes: 'PPE teratur.', image: '' },
      10: { status: 'Tidak Patuh', notes: 'Tumpahan minuman pelanggan meja 4 sedang dalam tindakan pembersihan.', image: createSamplePhoto('Kawasan Meja 4 Bersih', 'Tindakan Selesai', '#dc2626', 'MEJA 4') },
      11: { status: 'Patuh', notes: 'Sisa tengah hari dibuang ke tong pusat.', image: '' },
      12: { status: 'Patuh', notes: 'Tiada lalat dikesan.', image: '' }
    }
  },
  {
    id: 'rep-init-03',
    outletId: 'outlet-2',
    session: 'BOS',
    date: getTodayDateStr(),
    time: '07:45',
    staffId: 'u-staff-2',
    staffName: 'Nurul Huda',
    status: 'Disahkan',
    score: 100,
    supervisorNotes: 'Bagus. Teruskan kawalan suhu optimum.',
    supervisorName: 'Penyelia Siti Zulaikha',
    reviewedAt: '08:20',
    createdAt: `${getTodayDateStr()}T07:48:00Z`,
    answers: {
      1: { status: 'Patuh', notes: 'Kawasan dapur siap sedia.', image: createSamplePhoto('Kawasan Dapur Siap Sedia', 'KPJ Bandar Dato On · Sesi BOS', '#16a34a', 'DAPUR') },
      2: { status: 'Patuh', notes: 'Lengkap sabun dan sanitizer.', image: '' },
      3: { status: 'Patuh', notes: 'Saliran bersih.', image: '' },
      4: { status: 'Patuh', temp: '2.8', notes: 'Chiller 2.8°C.', image: createSamplePhoto('Peti Chiller Dato On', 'Suhu 2.8°C Mematuhi Julat', '#16a34a', '2.8°C') },
      5: { status: 'Patuh', temp: '-19.0', notes: 'Freezer -19.0°C.', image: '' },
      6: { status: 'Patuh', temp: '65.5', notes: 'Bain marie stabil.', image: '' },
      7: { status: 'Patuh', notes: 'Paparan kek segar.', image: createSamplePhoto('Kabinet Pameran Kek & Pastri', 'Pencahayaan & Suhu Segar', '#d97706', 'DISPLAY') },
      8: { status: 'Patuh', notes: 'Susunan teratur.', image: '' },
      9: { status: 'Patuh', notes: 'Seragam bersih.', image: '' },
      10: { status: 'Patuh', notes: 'Kawasan makan kemas.', image: '' },
      11: { status: 'Patuh', notes: 'Sisa kosong.', image: '' },
      12: { status: 'Patuh', notes: 'Fly trap aktif.', image: '' }
    }
  },
  {
    id: 'rep-init-04',
    outletId: 'outlet-3',
    session: 'BOS',
    date: getTodayDateStr(),
    time: '06:00',
    staffId: 'u-staff-3',
    staffName: 'Chef Firdaus',
    status: 'Disahkan',
    score: 100,
    supervisorNotes: 'Central Kitchen mematuhi piawaian pengeluaran HACCP.',
    supervisorName: 'Tuan Amir',
    reviewedAt: '07:00',
    createdAt: `${getTodayDateStr()}T06:10:00Z`,
    answers: {
      1: { status: 'Patuh', notes: 'Lantai produksi dipolish sanitasi.', image: createSamplePhoto('Lantai Produksi Sanitasi', 'Central Kitchen · Sesi BOS', '#0f766e', 'PRODUKSI') },
      2: { status: 'Patuh', notes: 'Stesen cuci tangan 3 unit lengkap.', image: '' },
      3: { status: 'Patuh', notes: 'Sinki industri bersih.', image: '' },
      4: { status: 'Patuh', temp: '2.0', notes: 'Cold room chiller 2.0°C.', image: createSamplePhoto('Cold Room Chiller 2.0°C', 'Kawasan Penyimpanan Utama', '#0f766e', '2.0°C') },
      5: { status: 'Patuh', temp: '-21.5', notes: 'Walk-in freezer -21.5°C.', image: '' },
      6: { status: 'Patuh', temp: '75.0', notes: 'Holding warmer bersuhu tinggi.', image: '' },
      7: { status: 'Patuh', notes: 'Kawasan packing bersih.', image: '' },
      8: { status: 'Patuh', notes: 'Palet FIFO teratur.', image: '' },
      9: { status: 'Patuh', notes: 'Hairnet, apron & but getah wajib.', image: '' },
      10: { status: 'Tidak Berkenaan', notes: 'Central Kitchen tiada kawasan pelanggan.', image: '' },
      11: { status: 'Patuh', notes: 'Kawasan sisa luaran dibasmi kuman.', image: '' },
      12: { status: 'Patuh', notes: 'Perangkap perosak profesional beroperasi.', image: '' }
    }
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    timestamp: '07:48:12',
    user: 'Ahmad Faiz',
    role: 'Staf',
    action: 'Menghantar laporan pemeriksaan sesi BOS untuk KPJ Larkin (Skor: 100%).',
    outletName: 'KPJ Larkin'
  },
  {
    id: 'aud-2',
    timestamp: '08:15:30',
    user: 'Penyelia Siti Zulaikha',
    role: 'Penyelia',
    action: 'Mengesahkan laporan BOS KPJ Larkin dengan status DISAHKAN.',
    outletName: 'KPJ Larkin'
  },
  {
    id: 'aud-3',
    timestamp: '08:20:05',
    user: 'Penyelia Siti Zulaikha',
    role: 'Penyelia',
    action: 'Mengesahkan laporan BOS KPJ Bandar Dato On dengan status DISAHKAN.',
    outletName: 'KPJ Bandar Dato On'
  },
  {
    id: 'aud-4',
    timestamp: '13:45:22',
    user: 'Ahmad Faiz',
    role: 'Staf',
    action: 'Menghantar laporan sesi MOS KPJ Larkin (Skor: 91.7%) menunggu semakan.',
    outletName: 'KPJ Larkin'
  }
];

export type UserRole = 'staff' | 'supervisor' | 'admin';

export type SessionType = 'BOS' | 'MOS' | 'EOS';

export type ReportStatus = 'Draf' | 'Dihantar' | 'Disahkan' | 'Perlu Pembetulan';

export type ChecklistItemStatus = 'Patuh' | 'Tidak Patuh' | 'Tidak Berkenaan';

export interface TempRange {
  min: number;
  max: number;
}

export interface Outlet {
  id: string;
  name: string;
  location: string;
  code: string;
  tempRange: {
    chiller: TempRange;
    freezer: TempRange;
    bainMarie?: TempRange;
  };
  managerName?: string;
  phone?: string;
}

export interface ChecklistItemDef {
  id: number;
  name: string;
  type: 'general' | 'temp';
  desc: string;
  unit?: string;
  tempKey?: 'chiller' | 'freezer' | 'bainMarie';
}

export interface ChecklistAnswer {
  status: ChecklistItemStatus;
  temp?: string;
  notes: string;
  image?: string;
}

export interface ReportRecord {
  id: string;
  outletId: string;
  session: SessionType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  staffId: string;
  staffName: string;
  status: ReportStatus;
  score: number; // Percentage 0 - 100
  answers: Record<number, ChecklistAnswer>;
  supervisorNotes?: string;
  supervisorName?: string;
  reviewedAt?: string;
  createdAt: string;
  storageUrl?: string;
  storageUri?: string;
  storageUploadedAt?: string;
  uploadedFiles?: { name: string; url: string; uri: string; uploadedAt: string }[];
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  outletId: string; // 'outlet-1', 'outlet-2', etc. or 'all' for admin/supervisors
  avatar?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  outletName?: string;
}

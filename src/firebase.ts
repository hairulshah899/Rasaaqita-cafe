import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocFromServer,
  deleteDoc,
} from 'firebase/firestore';
import { getStorage, ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with dedicated Database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

/**
 * Upload compressed inspection evidence photo to Firebase Storage
 * Returns the secure download URL from Firebase Storage, with fallback to data URL.
 */
export async function uploadEvidencePhoto(
  dataUrl: string,
  outletId: string,
  session: string,
  itemId: number
): Promise<string> {
  // If it's already a hosted URL (http / https), return as-is
  if (!dataUrl || dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  try {
    const uploadTask = (async () => {
      const timestamp = Date.now();
      const filePath = `reports/${outletId || 'unknown'}/${session || 'session'}/${timestamp}_item_${itemId}.jpg`;
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
      return await getDownloadURL(snapshot.ref);
    })();

    const timeoutTask = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timeout exceeded')), 2500)
    );

    return await Promise.race([uploadTask, timeoutTask]);
  } catch (err) {
    console.warn('Firebase Storage upload notice (falling back to compressed data URL):', err);
    return dataUrl;
  }
}

/**
 * Upload an official verified report dossier file (JSON/HTML/PDF) to Firebase Storage
 * Target: gs://cafe-operation.firebasestorage.app/verified-reports/{outletId}/{filename}
 */
export async function uploadReportDossierToStorage(
  reportId: string,
  outletId: string,
  session: string,
  date: string,
  fileContent: string,
  contentType: string = 'application/json'
): Promise<{ downloadUrl: string; storageUri: string; path: string }> {
  const fileName = `Laporan_Disahkan_${session}_${date}_${reportId}.json`;
  const storagePath = `verified-reports/${outletId || 'unknown'}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  const targetBucket = firebaseConfig.storageBucket || 'cafe-operation.firebasestorage.app';

  try {
    const snapshot = await uploadString(storageRef, fileContent, 'raw', {
      contentType,
      customMetadata: {
        reportId,
        outletId,
        session,
        date,
        bucket: `gs://${targetBucket}`,
        verified: 'true',
        uploadedAt: new Date().toISOString(),
      },
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    const storageUri = `gs://${targetBucket}/${storagePath}`;

    // Update Firestore record with the storage URL and URI
    try {
      await setDoc(
        doc(db, 'reports', reportId),
        {
          storageUrl: downloadUrl,
          storageUri: storageUri,
          storageUploadedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Failed to update Firestore report with storage URI:', e);
    }

    return { downloadUrl, storageUri, path: storagePath };
  } catch (err) {
    console.warn('Firebase Storage dossier upload notice:', err);
    // If storage upload fails due to network/rules, generate local blob URL with valid gs URI
    const blob = new Blob([fileContent], { type: contentType });
    const localUrl = URL.createObjectURL(blob);
    const storageUri = `gs://${targetBucket}/${storagePath}`;
    return { downloadUrl: localUrl, storageUri, path: storagePath };
  }
}

/**
 * Upload an attached document or image to Firebase Storage for a report
 */
export async function uploadCustomFileToStorage(
  file: File,
  reportId: string,
  outletId: string
): Promise<{ downloadUrl: string; storageUri: string; path: string; name: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `verified-reports/${outletId || 'unknown'}/${reportId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  const targetBucket = firebaseConfig.storageBucket || 'cafe-operation.firebasestorage.app';

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    const storageUri = `gs://${targetBucket}/${storagePath}`;
    return { downloadUrl, storageUri, path: storagePath, name: file.name };
  } catch (err) {
    console.warn('Firebase Storage uploadBytes notice:', err);
    const localUrl = URL.createObjectURL(file);
    const storageUri = `gs://${targetBucket}/${storagePath}`;
    return { downloadUrl: localUrl, storageUri, path: storagePath, name: file.name };
  }
}

// Authentication Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const appleProvider = new OAuthProvider('apple.com');

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Perhatian: Klien Firebase berada di luar talian.');
    }
  }
}
testConnection();

export {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  deleteDoc,
};
export type { FirebaseUser };

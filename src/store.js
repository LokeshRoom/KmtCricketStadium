import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from './firebase';

const CHANGE = 'kmt-data-changed';
const emit = () => window.dispatchEvent(new Event(CHANGE));
const fromDoc = (snap) => ({ id: snap.id, ...snap.data() });

export const onDataChange = (callback) => { window.addEventListener(CHANGE, callback); return () => window.removeEventListener(CHANGE, callback); };

export async function listTournaments(admin = false) {
  const q = admin ? query(collection(db, 'tournaments'), orderBy('startsAt'), limit(100)) : query(collection(db, 'tournaments'), where('status', '==', 'published'), limit(100));
  const rows = (await getDocs(q)).docs.map(fromDoc);
  return admin ? rows : rows.sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
}

export async function listRegistrations(user) {
  const q = user.isAdmin
    ? query(collection(db, 'registrations'), orderBy('createdAt', 'desc'), limit(200))
    : query(collection(db, 'registrations'), where('ownerUid', '==', user.uid), limit(100));
  const rows = (await getDocs(q)).docs.map(fromDoc);
  return user.isAdmin ? rows : rows.sort((a, b) => String(b.createdAt?.toMillis?.() ?? b.createdAt ?? '').localeCompare(String(a.createdAt?.toMillis?.() ?? a.createdAt ?? '')));
}

export async function createRegistration(registration) {
  const ownerUid = auth.currentUser?.emailVerified ? auth.currentUser.uid : null;
  const ref = await addDoc(collection(db, 'registrations'), { ...registration, ownerUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  emit();
  return ref.id;
}

export async function saveTournament(tournament) {
  const { id, ...values } = tournament;
  await setDoc(doc(db, 'tournaments', id), { ...values, updatedAt: serverTimestamp() }, { merge: true });
  emit();
}

export async function addTournament(tournament) {
  const { id: _id, ...values } = tournament;
  const ref = await addDoc(collection(db, 'tournaments'), { ...values, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  emit();
  return ref.id;
}

export async function reviewRegistration(id, status, adminNote) {
  await updateDoc(doc(db, 'registrations', id), { status, adminNote, reviewedAt: serverTimestamp() });
  emit();
}

export async function claimGuestRegistrations(user) {
  if (!user?.emailVerified) return;
  const q = query(collection(db, 'registrations'), where('email', '==', user.email.toLowerCase()), where('ownerUid', '==', null), limit(100));
  const rows = await getDocs(q);
  await Promise.all(rows.docs.map((row) => updateDoc(row.ref, { ownerUid: user.uid })));
  if (rows.size) emit();
}

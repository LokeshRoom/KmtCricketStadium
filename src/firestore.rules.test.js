import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, where, query } from 'firebase/firestore';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const rulesSuite = emulatorHost ? describe : describe.skip;
let env;

rulesSuite('Firestore security rules', () => {
  beforeAll(async () => {
    const [host, port] = emulatorHost.split(':');
    env = await initializeTestEnvironment({ projectId: 'kmt-rules-test', firestore: { host, port: Number(port), rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  });
  afterAll(async () => { await env?.cleanup(); });

  it('limits public reads to published tournaments and keeps registrations private', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'tournaments/open'), { status: 'published' });
      await setDoc(doc(context.firestore(), 'tournaments/draft'), { status: 'draft' });
      await setDoc(doc(context.firestore(), 'registrations/private'), { ownerUid: 'player-1', email: 'player@example.com' });
    });
    const guest = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(guest, 'tournaments/open')));
    await assertFails(getDoc(doc(guest, 'tournaments/draft')));
    await assertFails(getDoc(doc(guest, 'registrations/private')));
  });

  it('accepts a complete guest entry and rejects missing consent or invalid contact data', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'tournaments/open'), { status: 'published' });
      await setDoc(doc(context.firestore(), 'tournaments/draft'), { status: 'draft' });
    });
    const guest = env.unauthenticatedContext().firestore();
    const entry = {
      teamName: 'KMT XI', captainName: 'Arjun Rao', email: 'arjun@example.com', phone: '+91 90000 11111',
      players: [{ name: 'Arjun Rao', jersey: '18', role: 'Captain' }], customAnswers: {}, paymentMethod: 'offline',
      reference: '', acceptedTerms: true, tournamentId: 'open', ownerUid: null, status: 'PENDING', adminNote: '',
      attribution: {}, submittedAt: new Date().toISOString(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(doc(guest, 'registrations/valid-entry'), entry));
    await assertFails(setDoc(doc(guest, 'registrations/no-consent'), { ...entry, acceptedTerms: false }));
    await assertFails(setDoc(doc(guest, 'registrations/invalid-phone'), { ...entry, phone: 'not a phone' }));
    await assertFails(setDoc(doc(guest, 'registrations/draft-tournament'), { ...entry, tournamentId: 'draft' }));
  });

  it('allows a verified owner to claim and read their own guest registration', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'registrations/claim-me'), { email: 'player@example.com', ownerUid: null, status: 'PENDING' });
    });
    const player = env.authenticatedContext('player-1', { email: 'player@example.com', email_verified: true }).firestore();
    await assertSucceeds(getDocs(query(collection(player, 'registrations'), where('email', '==', 'player@example.com'), where('ownerUid', '==', null))));
    await assertSucceeds(updateDoc(doc(player, 'registrations/claim-me'), { ownerUid: 'player-1' }));
    await assertSucceeds(getDoc(doc(player, 'registrations/claim-me')));
    const stranger = env.authenticatedContext('player-2', { email: 'other@example.com', email_verified: true }).firestore();
    await assertFails(getDoc(doc(stranger, 'registrations/claim-me')));
  });

  it('allows the verified allowlisted admin to review registrations', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'registrations/review-me'), { status: 'PENDING', adminNote: '' });
    });
    const admin = env.authenticatedContext('organizer', { email: 'k.lokeshmail@gmail.com', email_verified: true }).firestore();
    await assertSucceeds(updateDoc(doc(admin, 'registrations/review-me'), { status: 'CONFIRMED', adminNote: '', reviewedAt: serverTimestamp() }));
    const unverified = env.authenticatedContext('organizer-2', { email: 'k.lokeshmail@gmail.com', email_verified: false }).firestore();
    await assertFails(updateDoc(doc(unverified, 'registrations/review-me'), { status: 'REJECTED', adminNote: '', reviewedAt: serverTimestamp() }));
  });
});

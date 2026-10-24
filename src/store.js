import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { computeInningsFromTimeline, createSampleTournamentMatches, determineMatchResult } from './scoring';

const CHANGE = 'kmt-data-changed';
const emit = () => window.dispatchEvent(new Event(CHANGE));
const fromDoc = (snap) => ({ id: snap.id, ...snap.data() });

export const onDataChange = (callback) => {
  window.addEventListener(CHANGE, callback);
  return () => window.removeEventListener(CHANGE, callback);
};

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------
export async function listTournaments(admin = false) {
  const q = admin
    ? query(collection(db, 'tournaments'), orderBy('startsAt'), limit(100))
    : query(collection(db, 'tournaments'), where('status', '==', 'published'), limit(100));
  const rows = (await getDocs(q)).docs.map(fromDoc);
  return admin ? rows : rows.sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
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

// ---------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------
export async function listRegistrations(user) {
  const q = user.isAdmin
    ? query(collection(db, 'registrations'), orderBy('createdAt', 'desc'), limit(200))
    : query(collection(db, 'registrations'), where('ownerUid', '==', user.uid), limit(100));
  const rows = (await getDocs(q)).docs.map(fromDoc);
  return user.isAdmin
    ? rows
    : rows.sort((a, b) =>
        String(b.createdAt?.toMillis?.() ?? b.createdAt ?? '').localeCompare(
          String(a.createdAt?.toMillis?.() ?? a.createdAt ?? '')
        )
      );
}

export async function createRegistration(registration) {
  const currentUser = auth.currentUser;
  const normalizedEmail = String(registration.email || '').trim().toLowerCase();

  // In Firestore rules:
  // (data.ownerUid == null || (verifiedEmail() && data.ownerUid == request.auth.uid && data.email == request.auth.token.email))
  // Therefore, ownerUid can ONLY be set if the currentUser is email-verified AND their email matches the form email.
  const isMatchingVerifiedOwner = Boolean(
    currentUser?.emailVerified &&
    currentUser?.uid &&
    currentUser?.email &&
    currentUser.email.trim().toLowerCase() === normalizedEmail
  );
  const ownerUid = isMatchingVerifiedOwner ? currentUser.uid : null;

  // Build clean attribution map with max 2 keys
  const attribution = {};
  if (registration.attribution && typeof registration.attribution === 'object') {
    if (registration.attribution.source) {
      attribution.source = String(registration.attribution.source).slice(0, 50);
    }
    if (registration.attribution.campaign) {
      attribution.campaign = String(registration.attribution.campaign).slice(0, 50);
    }
  }

  // Sanitize player roster
  const rawPlayers = Array.isArray(registration.players) && registration.players.length > 0
    ? registration.players
    : [{ name: registration.captainName || 'Captain', role: 'Batter' }];

  const players = rawPlayers.map((p, idx) => ({
    id: String(p.id || `p_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`),
    name: String(p.name || '').trim(),
    jersey: String(p.jersey || '').trim(),
    role: String(p.role || 'Batter'),
    battingStyle: String(p.battingStyle || ''),
    bowlingStyle: String(p.bowlingStyle || ''),
  }));

  const paymentMethod = registration.paymentMethod === 'offline' ? 'offline' : 'upi';
  const reference = String(registration.reference || '').trim();

  // Firestore rules strictly enforce:
  // data.keys().hasOnly([
  //   'teamName', 'captainName', 'email', 'phone', 'players', 'customAnswers',
  //   'paymentMethod', 'reference', 'acceptedTerms', 'tournamentId', 'ownerUid',
  //   'status', 'adminNote', 'attribution', 'submittedAt', 'createdAt', 'updatedAt'
  // ])
  const payload = {
    teamName: String(registration.teamName || '').trim(),
    captainName: String(registration.captainName || '').trim(),
    email: normalizedEmail,
    phone: String(registration.phone || '').trim(),
    players,
    customAnswers: (registration.customAnswers && typeof registration.customAnswers === 'object')
      ? registration.customAnswers
      : {},
    paymentMethod,
    reference,
    acceptedTerms: true,
    tournamentId: String(registration.tournamentId),
    ownerUid,
    status: 'PENDING',
    adminNote: '',
    attribution,
    submittedAt: typeof registration.submittedAt === 'string'
      ? registration.submittedAt
      : new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'registrations'), payload);
  emit();
  return ref.id;
}

export async function reviewRegistration(id, status, adminNote) {
  await updateDoc(doc(db, 'registrations', id), { status, adminNote, reviewedAt: serverTimestamp() });
  emit();
}

export async function claimGuestRegistrations(user) {
  if (!user?.emailVerified) return;
  const q = query(
    collection(db, 'registrations'),
    where('email', '==', user.email.toLowerCase()),
    where('ownerUid', '==', null),
    limit(100)
  );
  const rows = await getDocs(q);
  await Promise.all(rows.docs.map((row) => updateDoc(row.ref, { ownerUid: user.uid })));
  if (rows.size) emit();
}

// ---------------------------------------------------------------------------
// User Teams & Squads (Feature 1)
// ---------------------------------------------------------------------------
export async function listUserTeams(user) {
  if (!user) return [];
  try {
    const q = user.isAdmin
      ? query(collection(db, 'teams'), limit(100))
      : query(collection(db, 'teams'), where('ownerUid', '==', user.uid), limit(50));
    const rows = (await getDocs(q)).docs.map(fromDoc);
    return rows.sort((a, b) => String(a.teamName || '').localeCompare(String(b.teamName || '')));
  } catch (err) {
    console.warn('Could not list teams, falling back:', err);
    return [];
  }
}

export async function createTeam(team) {
  const ownerUid = auth.currentUser?.uid || null;
  const ref = await addDoc(collection(db, 'teams'), {
    ...team,
    ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  emit();
  return ref.id;
}

export async function saveTeam(team) {
  const { id, ...values } = team;
  await setDoc(doc(db, 'teams', id), { ...values, updatedAt: serverTimestamp() }, { merge: true });
  emit();
}

export async function deleteTeam(teamId) {
  await deleteDoc(doc(db, 'teams', teamId));
  emit();
}

// ---------------------------------------------------------------------------
// Matches, Fixtures & Scorecard (Features 2, 3, 4)
// ---------------------------------------------------------------------------
export async function listMatches(tournamentId = null) {
  try {
    const q = tournamentId
      ? query(collection(db, 'matches'), where('tournamentId', '==', tournamentId), limit(100))
      : query(collection(db, 'matches'), limit(100));
    const rows = (await getDocs(q)).docs.map(fromDoc);
    if (rows.length > 0) {
      return rows.sort((a, b) =>
        String(a.scheduledTime || a.createdAt || '').localeCompare(String(b.scheduledTime || b.createdAt || ''))
      );
    }
    const samples = createSampleTournamentMatches();
    return tournamentId ? samples.filter((m) => m.tournamentId === tournamentId) : samples;
  } catch (err) {
    console.warn('Could not list matches:', err);
    const samples = createSampleTournamentMatches();
    return tournamentId ? samples.filter((m) => m.tournamentId === tournamentId) : samples;
  }
}

export async function getMatch(matchId) {
  try {
    const snap = await getDoc(doc(db, 'matches', matchId));
    if (snap.exists()) return fromDoc(snap);
  } catch (err) {
    console.warn('Could not get match from db:', err);
  }
  const samples = createSampleTournamentMatches();
  return samples.find((m) => m.id === matchId) || null;
}

export function onMatchSnapshot(matchId, callback) {
  return onSnapshot(doc(db, 'matches', matchId), (snap) => {
    if (snap.exists()) {
      callback(fromDoc(snap));
    }
  });
}

export async function addMatch(match) {
  const { id: _id, ...values } = match;
  const ref = await addDoc(collection(db, 'matches'), {
    ...values,
    status: values.status || 'scheduled',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  emit();
  return ref.id;
}

export async function saveMatch(match) {
  const { id, ...values } = match;
  await setDoc(doc(db, 'matches', id), { ...values, updatedAt: serverTimestamp() }, { merge: true });
  emit();
}

export async function deleteMatch(matchId) {
  await deleteDoc(doc(db, 'matches', matchId));
  emit();
}

/**
 * Real-time Ball Recording Engine for Live Match Scorers
 */
export async function recordBallInMatch(matchId, ball) {
  const match = await getMatch(matchId);
  if (!match) throw new Error('Match not found');

  const inningsList = match.innings || [];
  const currIdx = match.currentInningsIndex ?? 0;
  let currInnings = inningsList[currIdx];

  if (!currInnings) {
    currInnings = {
      teamId: currIdx === 0 ? match.team1.id : match.team2.id,
      teamName: currIdx === 0 ? match.team1.name : match.team2.name,
      bowlingTeamId: currIdx === 0 ? match.team2.id : match.team1.id,
      bowlingTeamName: currIdx === 0 ? match.team2.name : match.team1.name,
      timeline: [],
    };
    inningsList[currIdx] = currInnings;
  }

  const newTimeline = [...(currInnings.timeline || []), ball];
  const battingLineup = currIdx === 0 ? match.team1.players : match.team2.players;
  const bowlingLineup = currIdx === 0 ? match.team2.players : match.team1.players;

  const computed = computeInningsFromTimeline(newTimeline, battingLineup, bowlingLineup, match.oversLimit || 20);
  inningsList[currIdx] = {
    ...currInnings,
    ...computed,
    timeline: newTimeline,
  };

  const updatedMatch = {
    ...match,
    innings: inningsList,
  };

  // Evaluate match conclusion
  const result = determineMatchResult(updatedMatch);
  if (result.status === 'completed') {
    updatedMatch.status = 'completed';
    updatedMatch.result = result;
  } else if (computed.isCompleted && currIdx === 0) {
    // 1st innings finished -> prompt/transition to innings break
    updatedMatch.status = 'innings_break';
    updatedMatch.currentInningsIndex = 1;
    if (!updatedMatch.innings[1]) {
      updatedMatch.innings[1] = {
        teamId: match.team2.id,
        teamName: match.team2.name,
        bowlingTeamId: match.team1.id,
        bowlingTeamName: match.team1.name,
        timeline: [],
        target: computed.totalRuns + 1,
      };
    }
  } else {
    updatedMatch.status = 'live';
  }

  await saveMatch(updatedMatch);
  return updatedMatch;
}

/**
 * Undo Last Ball (Essential for scorers on mobile devices)
 */
export async function undoLastBallInMatch(matchId) {
  const match = await getMatch(matchId);
  if (!match) throw new Error('Match not found');

  const inningsList = match.innings || [];
  const currIdx = match.currentInningsIndex ?? 0;
  const currInnings = inningsList[currIdx];

  if (!currInnings || !currInnings.timeline || currInnings.timeline.length === 0) {
    if (currIdx === 1) {
      match.currentInningsIndex = 0;
      match.status = 'live';
      await saveMatch(match);
      return match;
    }
    return match;
  }

  const newTimeline = currInnings.timeline.slice(0, -1);
  const battingLineup = currIdx === 0 ? match.team1.players : match.team2.players;
  const bowlingLineup = currIdx === 0 ? match.team2.players : match.team1.players;

  const computed = computeInningsFromTimeline(newTimeline, battingLineup, bowlingLineup, match.oversLimit || 20);
  inningsList[currIdx] = {
    ...currInnings,
    ...computed,
    timeline: newTimeline,
  };

  const updatedMatch = {
    ...match,
    status: 'live',
    result: null,
    innings: inningsList,
  };

  await saveMatch(updatedMatch);
  return updatedMatch;
}

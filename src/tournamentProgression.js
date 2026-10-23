/**
 * KMT Cricket Stadium — Tournament Progression, Brackets & Elimination Engine
 * Handles stage progression, knockout brackets, elimination tracking, and user team spotlight.
 */

export const TOURNAMENT_STAGES = [
  { id: 'group', label: 'Group / League Stage', order: 1 },
  { id: 'round_of_16', label: 'Round of 16', order: 2 },
  { id: 'quarter_final', label: 'Quarter-Finals', order: 3 },
  { id: 'semi_final', label: 'Semi-Finals', order: 4 },
  { id: 'final', label: 'Championship Final', order: 5 },
];

/**
 * Determine elimination and progression status for all teams in a tournament
 */
export function computeTournamentTeamProgression(tournament, matches = [], registrations = []) {
  const teamStatusMap = {};

  // Initialize with all confirmed registered teams
  (registrations || []).forEach((reg) => {
    if (reg.status === 'CONFIRMED' || reg.status === 'PENDING') {
      const teamId = reg.teamId || reg.id || reg.teamName;
      teamStatusMap[teamId] = {
        teamId,
        teamName: reg.teamName,
        captainName: reg.captainName,
        registrationId: reg.id,
        ownerUid: reg.ownerUid,
        status: 'ACTIVE', // 'ACTIVE' | 'QUALIFIED' | 'ELIMINATED' | 'RUNNER_UP' | 'CHAMPION'
        currentStage: 'Registered',
        eliminatedInStage: null,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        nextMatch: null,
        lastMatch: null,
        journey: [], // chronological match results
      };
    }
  });

  // Sort matches chronologically
  const sortedMatches = [...(matches || [])].sort((a, b) => {
    return String(a.scheduledTime || a.createdAt || '').localeCompare(String(b.scheduledTime || b.createdAt || ''));
  });

  sortedMatches.forEach((match) => {
    const t1Id = match.team1?.id || match.team1?.name;
    const t2Id = match.team2?.id || match.team2?.name;

    // Ensure teams exist in map
    if (t1Id && !teamStatusMap[t1Id]) {
      teamStatusMap[t1Id] = {
        teamId: t1Id,
        teamName: match.team1.name || t1Id,
        status: 'ACTIVE',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        nextMatch: null,
        lastMatch: null,
        journey: [],
      };
    }
    if (t2Id && !teamStatusMap[t2Id]) {
      teamStatusMap[t2Id] = {
        teamId: t2Id,
        teamName: match.team2.name || t2Id,
        status: 'ACTIVE',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        nextMatch: null,
        lastMatch: null,
        journey: [],
      };
    }

    const t1 = teamStatusMap[t1Id];
    const t2 = teamStatusMap[t2Id];

    if (match.status === 'completed') {
      const winnerId = match.result?.winnerTeamId;
      const loserId = match.result?.loserTeamId;
      const stageLower = (match.stageName || match.stage || '').toLowerCase().trim();
      const isFinal = match.stage === 'final' || (stageLower.includes('final') && !stageLower.includes('semi') && !stageLower.includes('quarter'));

      if (t1) {
        t1.matchesPlayed += 1;
        t1.lastMatch = match;
      }
      if (t2) {
        t2.matchesPlayed += 1;
        t2.lastMatch = match;
      }

      if (winnerId) {
        const winner = teamStatusMap[winnerId];
        const loser = teamStatusMap[loserId];

        if (winner) {
          winner.wins += 1;
          winner.journey.push({
            matchId: match.id,
            stage: match.stageName || match.stage || 'Match',
            opponentName: loser?.teamName || 'Opponent',
            result: 'WON',
            summary: match.result?.summary,
          });

          if (isFinal) {
            winner.status = 'CHAMPION';
            winner.currentStage = 'Champions 🏆';
          } else {
            winner.status = 'QUALIFIED';
            winner.currentStage = `Advanced from ${match.stageName || match.stage || 'Round'}`;
          }
        }

        if (loser) {
          loser.losses += 1;
          loser.journey.push({
            matchId: match.id,
            stage: match.stageName || match.stage || 'Match',
            opponentName: winner?.teamName || 'Opponent',
            result: 'LOST',
            summary: match.result?.summary,
          });

          if (isFinal) {
            loser.status = 'RUNNER_UP';
            loser.currentStage = 'Runners-Up 🥈';
          } else {
            loser.status = 'ELIMINATED';
            loser.eliminatedInStage = match.stageName || match.stage || 'Knockout';
            loser.currentStage = `Eliminated in ${loser.eliminatedInStage}`;
          }
        }
      }
    } else if (match.status === 'live' || match.status === 'upcoming' || match.status === 'scheduled') {
      // Upcoming or live match
      if (t1 && !t1.nextMatch && t1.status !== 'ELIMINATED') {
        t1.nextMatch = match;
        t1.currentStage = match.stageName || match.stage || 'Upcoming Fixture';
      }
      if (t2 && !t2.nextMatch && t2.status !== 'ELIMINATED') {
        t2.nextMatch = match;
        t2.currentStage = match.stageName || match.stage || 'Upcoming Fixture';
      }
    }
  });

  return Object.values(teamStatusMap);
}

/**
 * Filter and spotlight logged-in user's team progress
 */
export function getMyTeamProgression(user, tournamentProgressList = [], userRegistrations = []) {
  if (!user) return null;

  // Find user's confirmed registration for this tournament
  const userReg = userRegistrations.find(
    (r) => (r.ownerUid === user.uid || (user.email && r.email?.toLowerCase() === user.email.toLowerCase()))
  );

  if (!userReg) return null;

  const userTeamName = userReg.teamName?.trim().toLowerCase();
  const found = tournamentProgressList.find(
    (t) => (t.registrationId === userReg.id || t.teamName?.trim().toLowerCase() === userTeamName)
  );

  return found || {
    teamName: userReg.teamName,
    captainName: userReg.captainName,
    registrationId: userReg.id,
    status: userReg.status === 'CONFIRMED' ? 'ACTIVE' : 'PENDING',
    currentStage: userReg.status === 'CONFIRMED' ? 'Awaiting Fixture Draw' : 'Pending Desk Verification',
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    journey: [],
  };
}

/**
 * Group matches by stage for visual bracket presentation
 */
export function groupMatchesByStage(matches = []) {
  const stageOrder = ['round_of_16', 'quarter_final', 'semi_final', 'final'];
  const stageLabels = {
    group: 'Group / League Stage',
    round_of_16: 'Round of 16',
    quarter_final: 'Quarter-Finals',
    semi_final: 'Semi-Finals',
    final: 'Championship Final',
  };

  const groups = {};

  (matches || []).forEach((m) => {
    const s = m.stage || 'other';
    if (!groups[s]) {
      groups[s] = {
        stageId: s,
        title: m.stageName || stageLabels[s] || s.replace(/_/g, ' ').toUpperCase(),
        matches: [],
      };
    }
    groups[s].matches.push(m);
  });

  // Sort groups by stage sequence
  return Object.values(groups).sort((a, b) => {
    const idxA = stageOrder.indexOf(a.stageId);
    const idxB = stageOrder.indexOf(b.stageId);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });
}

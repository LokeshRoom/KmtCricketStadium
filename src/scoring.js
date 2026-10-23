/**
 * KMT Cricket Stadium — Cricket Scoring Engine & Stats Aggregator
 * Production-ready mobile scoring logic, ball-by-ball resolution, and stats.
 */

export const WICKET_TYPES = [
  { id: 'bowled', label: 'Bowled', bowlerCredit: true },
  { id: 'caught', label: 'Caught', bowlerCredit: true, requiresFielder: true },
  { id: 'lbw', label: 'LBW', bowlerCredit: true },
  { id: 'runOut', label: 'Run Out', bowlerCredit: false, requiresFielder: true, canDismissNonStriker: true },
  { id: 'stumped', label: 'Stumped', bowlerCredit: true, requiresFielder: true },
  { id: 'hitWicket', label: 'Hit Wicket', bowlerCredit: true },
  { id: 'retired', label: 'Retired Hurt', bowlerCredit: false },
];

export const EXTRA_TYPES = [
  { id: 'none', label: 'None', isLegal: true, defaultRuns: 0 },
  { id: 'wide', label: 'Wide', isLegal: false, defaultRuns: 1 },
  { id: 'noBall', label: 'No Ball', isLegal: false, defaultRuns: 1 },
  { id: 'bye', label: 'Bye', isLegal: true, defaultRuns: 0 },
  { id: 'legBye', label: 'Leg Bye', isLegal: true, defaultRuns: 0 },
];

/**
 * Format legal balls to cricket overs string (e.g. 15 balls => "2.3")
 */
export function ballsToOvers(legalBalls = 0) {
  const completeOvers = Math.floor(legalBalls / 6);
  const remainingBalls = legalBalls % 6;
  return `${completeOvers}.${remainingBalls}`;
}

/**
 * Calculate Current Run Rate (CRR)
 */
export function calculateCRR(totalRuns = 0, legalBalls = 0) {
  if (legalBalls === 0) return '0.00';
  const overs = legalBalls / 6;
  return (totalRuns / overs).toFixed(2);
}

/**
 * Calculate Required Run Rate (RRR)
 */
export function calculateRRR(runsNeeded = 0, ballsRemaining = 0) {
  if (runsNeeded <= 0) return '0.00';
  if (ballsRemaining <= 0) return '∞';
  const overs = ballsRemaining / 6;
  return (runsNeeded / overs).toFixed(2);
}

/**
 * Generate commentary description for a ball
 */
export function generateBallCommentary(ball, strikerName, bowlerName, fielderName) {
  const overStr = `${Math.floor(ball.overIndex)}.${ball.ballNumberInOver}`;
  let text = '';

  if (ball.isWicket) {
    const w = ball.wicket || {};
    if (w.type === 'bowled') text = `OUT! Bowled! Cleaned him up. ${bowlerName} strikes!`;
    else if (w.type === 'caught') text = `OUT! Caught by ${fielderName || 'fielder'}! ${strikerName} departs off ${bowlerName}.`;
    else if (w.type === 'lbw') text = `OUT! LBW! Trapped in front by ${bowlerName}.`;
    else if (w.type === 'runOut') text = `OUT! Run out! Direct hit from ${fielderName || 'the deep'}.`;
    else if (w.type === 'stumped') text = `OUT! Stumped by ${fielderName || 'the keeper'}! Quick hands behind the stumps.`;
    else if (w.type === 'hitWicket') text = `OUT! Hit wicket! Smashed the bails off.`;
    else text = `OUT! ${strikerName} is dismissed.`;
  } else if (ball.extraType === 'wide') {
    text = `Wide ball from ${bowlerName}. Drifting outside. ${ball.runs > 0 ? `Plus ${ball.runs} runs taken.` : ''}`;
  } else if (ball.extraType === 'noBall') {
    text = `No ball! Overstepping by ${bowlerName}. Free hit coming up!`;
  } else if (ball.runs === 6) {
    text = `SIX! Smashed high and handsome over the ropes by ${strikerName}!`;
  } else if (ball.runs === 4) {
    text = `FOUR! Glorious stroke from ${strikerName}, beats the infield to the fence.`;
  } else if (ball.runs === 0) {
    text = `Dot ball. Defended cleanly by ${strikerName}.`;
  } else {
    text = `${ball.runs} run${ball.runs > 1 ? 's' : ''} pushed into the gap by ${strikerName}.`;
  }

  return `${overStr} • ${bowlerName} to ${strikerName}: ${text}`;
}

/**
 * Pure calculation function to reconstruct full innings state from timeline of balls.
 * Guarantees zero state drift, perfect undo capability, and 100% data integrity.
 */
export function computeInningsFromTimeline(timeline = [], battingLineup = [], bowlingLineup = [], oversLimit = 20) {
  let totalRuns = 0;
  let wickets = 0;
  let legalBalls = 0;
  const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 };

  // Map of player stats
  const batters = {};
  const bowlers = {};
  const fallOfWickets = [];
  const partnerships = [];
  const oversHistory = [];

  let currentOverBalls = [];
  let currentOverIndex = 0;
  let activePartnershipRuns = 0;
  let activePartnershipBalls = 0;

  // Initialize batters from lineup
  (battingLineup || []).forEach((player, idx) => {
    const id = player.id || player.name;
    batters[id] = {
      id,
      name: player.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: '0.00',
      isOut: false,
      dismissalText: 'not out',
      battingOrder: idx + 1,
    };
  });

  // Track active bowlers dynamically or from lineup
  (bowlingLineup || []).forEach((player) => {
    const id = player.id || player.name;
    bowlers[id] = {
      id,
      name: player.name,
      legalBalls: 0,
      overs: '0.0',
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
      economy: '0.00',
    };
  });

  let currentStrikerId = null;
  let currentNonStrikerId = null;
  let currentBowlerId = null;

  timeline.forEach((ball, idx) => {
    const isWide = ball.extraType === 'wide';
    const isNoBall = ball.extraType === 'noBall';
    const isBye = ball.extraType === 'bye';
    const isLegBye = ball.extraType === 'legBye';
    const isLegal = !isWide && !isNoBall;

    currentStrikerId = ball.strikerId || currentStrikerId;
    currentNonStrikerId = ball.nonStrikerId || currentNonStrikerId;
    currentBowlerId = ball.bowlerId || currentBowlerId;

    // Ensure batter object exists
    if (currentStrikerId && !batters[currentStrikerId]) {
      batters[currentStrikerId] = {
        id: currentStrikerId,
        name: ball.strikerName || currentStrikerId,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: '0.00',
        isOut: false,
        dismissalText: 'not out',
      };
    }

    // Ensure bowler object exists
    if (currentBowlerId && !bowlers[currentBowlerId]) {
      bowlers[currentBowlerId] = {
        id: currentBowlerId,
        name: ball.bowlerName || currentBowlerId,
        legalBalls: 0,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
        economy: '0.00',
      };
    }

    const striker = batters[currentStrikerId];
    const bowler = bowlers[currentBowlerId];

    // Runs attribution
    const batRuns = ball.runs || 0;
    let ballExtras = 0;

    if (isWide) {
      const extraCount = 1 + (ball.extraRuns || 0);
      extras.wides += extraCount;
      extras.total += extraCount;
      ballExtras += extraCount;
      if (bowler) {
        bowler.runsConceded += extraCount;
        bowler.wides += 1;
      }
    } else if (isNoBall) {
      const extraCount = 1 + (ball.extraRuns || 0);
      extras.noBalls += extraCount;
      extras.total += extraCount;
      ballExtras += extraCount;
      if (bowler) {
        bowler.runsConceded += extraCount;
        bowler.noBalls += 1;
      }
      // Runs scored off no-ball bat
      if (striker) {
        striker.runs += batRuns;
        striker.balls += 1;
        if (batRuns === 4) striker.fours += 1;
        if (batRuns === 6) striker.sixes += 1;
      }
      if (bowler) bowler.runsConceded += batRuns;
    } else if (isBye) {
      extras.byes += batRuns;
      extras.total += batRuns;
      ballExtras += batRuns;
      if (striker) striker.balls += 1; // counts as ball faced
    } else if (isLegBye) {
      extras.legByes += batRuns;
      extras.total += batRuns;
      ballExtras += batRuns;
      if (striker) striker.balls += 1; // counts as ball faced
    } else {
      // Normal off the bat
      if (striker) {
        striker.runs += batRuns;
        striker.balls += 1;
        if (batRuns === 4) striker.fours += 1;
        if (batRuns === 6) striker.sixes += 1;
      }
      if (bowler) bowler.runsConceded += batRuns;
    }

    const ballTotalRuns = (isWide ? ballExtras : batRuns + (isNoBall ? 1 + (ball.extraRuns || 0) : 0));
    totalRuns += (isWide || isBye || isLegBye ? ballExtras : (isNoBall ? batRuns + (ball.extraRuns || 0) + 1 : batRuns));

    if (isLegal) {
      legalBalls += 1;
      if (bowler) bowler.legalBalls += 1;
      activePartnershipBalls += 1;
    }
    activePartnershipRuns += ballTotalRuns;

    // Handle Wickets
    if (ball.isWicket) {
      wickets += 1;
      const w = ball.wicket || {};
      const dismissedPlayerId = w.playerOutId || currentStrikerId;
      const dismissedBatter = batters[dismissedPlayerId] || striker;

      if (dismissedBatter) {
        dismissedBatter.isOut = true;
        if (w.type === 'bowled') dismissedBatter.dismissalText = `b ${bowler?.name || 'bowler'}`;
        else if (w.type === 'caught') dismissedBatter.dismissalText = `c ${w.fielderName || 'sub'} b ${bowler?.name || 'bowler'}`;
        else if (w.type === 'lbw') dismissedBatter.dismissalText = `lbw b ${bowler?.name || 'bowler'}`;
        else if (w.type === 'runOut') dismissedBatter.dismissalText = `run out (${w.fielderName || 'field'})`;
        else if (w.type === 'stumped') dismissedBatter.dismissalText = `st ${w.fielderName || 'wk'} b ${bowler?.name || 'bowler'}`;
        else if (w.type === 'hitWicket') dismissedBatter.dismissalText = `hit wicket b ${bowler?.name || 'bowler'}`;
        else dismissedBatter.dismissalText = `out`;
      }

      if (bowler && w.bowlerCredit !== false && w.type !== 'runOut' && w.type !== 'retired') {
        bowler.wickets += 1;
      }

      fallOfWickets.push({
        score: totalRuns,
        wickets,
        batterName: dismissedBatter?.name || 'Batter',
        overs: ballsToOvers(legalBalls),
      });

      partnerships.push({
        wicket: wickets,
        runs: activePartnershipRuns,
        balls: activePartnershipBalls,
      });
      activePartnershipRuns = 0;
      activePartnershipBalls = 0;
    }

    // Ball display badge
    let ballBadge = String(batRuns);
    if (ball.isWicket) ballBadge = 'W';
    else if (isWide) ballBadge = ballExtras > 1 ? `${ballExtras}Wd` : 'Wd';
    else if (isNoBall) ballBadge = batRuns > 0 ? `${batRuns}Nb` : 'Nb';
    else if (isBye) ballBadge = `${batRuns}B`;
    else if (isLegBye) ballBadge = `${batRuns}Lb`;

    currentOverBalls.push({
      badge: ballBadge,
      runs: ballTotalRuns,
      isWicket: ball.isWicket,
      isLegal,
    });

    // Check if over completed (6 legal balls)
    if (isLegal && legalBalls % 6 === 0) {
      // Check for maiden over: if all 6 legal balls in this over had 0 bowler runs
      const overRuns = currentOverBalls.reduce((acc, b) => acc + b.runs, 0);
      if (overRuns === 0 && bowler) {
        bowler.maidens += 1;
      }
      oversHistory.push({
        overNumber: Math.floor(legalBalls / 6),
        bowlerName: bowler?.name || 'Bowler',
        balls: [...currentOverBalls],
        totalRunsAtEnd: totalRuns,
        wicketsAtEnd: wickets,
      });
      currentOverBalls = [];
      currentOverIndex += 1;
    }
  });

  // Calculate strike rates and economy rates
  Object.values(batters).forEach((b) => {
    b.strikeRate = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
  });

  Object.values(bowlers).forEach((bw) => {
    bw.overs = ballsToOvers(bw.legalBalls);
    bw.economy = bw.legalBalls > 0 ? ((bw.runsConceded / (bw.legalBalls / 6))).toFixed(2) : '0.00';
  });

  return {
    totalRuns,
    wickets,
    legalBalls,
    oversFormatted: ballsToOvers(legalBalls),
    oversLimit,
    extras,
    battersList: Object.values(batters),
    bowlersList: Object.values(bowlers),
    fallOfWickets,
    partnerships,
    currentOverBalls,
    oversHistory,
    currentRunRate: calculateCRR(totalRuns, legalBalls),
    isCompleted: wickets >= 10 || (oversLimit && legalBalls >= oversLimit * 6),
  };
}

/**
 * Determine match outcome and winner description
 */
export function determineMatchResult(match) {
  if (!match || !match.innings || match.innings.length === 0) {
    return { status: 'upcoming', summary: 'Match not started' };
  }

  const inn1 = match.innings[0];
  const inn2 = match.innings[1];

  if (!inn2) {
    return {
      status: match.status || 'live',
      summary: `1st Innings: ${inn1.teamName} ${inn1.totalRuns}/${inn1.wickets} (${inn1.oversFormatted || '0.0'} ov)`,
    };
  }

  const target = inn1.totalRuns + 1;
  const runsNeeded = target - inn2.totalRuns;
  const maxBalls = (match.oversLimit || 20) * 6;
  const ballsRemaining = Math.max(0, maxBalls - inn2.legalBalls);

  // If Innings 2 reached or surpassed target
  if (inn2.totalRuns >= target) {
    const wicketsInHand = Math.max(0, 10 - inn2.wickets);
    return {
      status: 'completed',
      winnerTeamId: match.team2.id,
      winnerTeamName: match.team2.name,
      loserTeamId: match.team1.id,
      loserTeamName: match.team1.name,
      winMargin: `${wicketsInHand} wicket${wicketsInHand !== 1 ? 's' : ''}`,
      summary: `${match.team2.name} won by ${wicketsInHand} wicket${wicketsInHand !== 1 ? 's' : ''} (${ballsRemaining} balls left)`,
    };
  }

  // If Innings 2 is completed (all out or overs finished) and score is less than target
  if (inn2.wickets >= 10 || ballsRemaining <= 0) {
    if (inn2.totalRuns === inn1.totalRuns) {
      return {
        status: 'completed',
        isTie: true,
        summary: `Match Tied! (${inn1.totalRuns} vs ${inn2.totalRuns})`,
      };
    }

    const runsMargin = inn1.totalRuns - inn2.totalRuns;
    return {
      status: 'completed',
      winnerTeamId: match.team1.id,
      winnerTeamName: match.team1.name,
      loserTeamId: match.team2.id,
      loserTeamName: match.team2.name,
      winMargin: `${runsMargin} run${runsMargin !== 1 ? 's' : ''}`,
      summary: `${match.team1.name} won by ${runsMargin} run${runsMargin !== 1 ? 's' : ''}`,
    };
  }

  // Still live
  return {
    status: 'live',
    target,
    runsNeeded,
    ballsRemaining,
    requiredRunRate: calculateRRR(runsNeeded, ballsRemaining),
    summary: `${match.team2.name} need ${runsNeeded} run${runsNeeded !== 1 ? 's' : ''} in ${ballsRemaining} ball${ballsRemaining !== 1 ? 's' : ''} to win (RRR: ${calculateRRR(runsNeeded, ballsRemaining)})`,
  };
}

/**
 * Aggregate player career statistics across all played matches
 */
export function aggregatePlayerCareerStats(matches = []) {
  const stats = {};

  const ensurePlayer = (id, name, teamName) => {
    if (!stats[id]) {
      stats[id] = {
        id,
        name,
        teamName,
        matchesPlayed: 0,
        batting: {
          innings: 0,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          fifties: 0,
          hundreds: 0,
          highestScore: 0,
          notOuts: 0,
          average: '0.00',
          strikeRate: '0.00',
        },
        bowling: {
          innings: 0,
          legalBalls: 0,
          overs: '0.0',
          maidens: 0,
          runsConceded: 0,
          wickets: 0,
          bestBowlingRuns: 999,
          bestBowlingWickets: 0,
          economy: '0.00',
          average: '0.00',
        },
        fielding: {
          catches: 0,
          runOuts: 0,
          stumpings: 0,
        },
      };
    }
    return stats[id];
  };

  matches.forEach((match) => {
    if (match.status !== 'completed' && match.status !== 'live') return;

    const matchPlayersSeen = new Set();

    (match.innings || []).forEach((inn) => {
      // Batters
      (inn.battersList || []).forEach((b) => {
        if (!b.id && !b.name) return;
        const pid = b.id || b.name;
        matchPlayersSeen.add(pid);
        const p = ensurePlayer(pid, b.name, inn.teamName);

        if (b.balls > 0 || b.isOut) {
          p.batting.innings += 1;
          p.batting.runs += b.runs;
          p.batting.balls += b.balls;
          p.batting.fours += b.fours;
          p.batting.sixes += b.sixes;
          if (!b.isOut) p.batting.notOuts += 1;
          if (b.runs >= 100) p.batting.hundreds += 1;
          else if (b.runs >= 50) p.batting.fifties += 1;
          if (b.runs > p.batting.highestScore) p.batting.highestScore = b.runs;
        }
      });

      // Bowlers
      (inn.bowlersList || []).forEach((bw) => {
        if (!bw.id && !bw.name) return;
        const pid = bw.id || bw.name;
        matchPlayersSeen.add(pid);
        const p = ensurePlayer(pid, bw.name, inn.bowlingTeamName);

        if (bw.legalBalls > 0) {
          p.bowling.innings += 1;
          p.bowling.legalBalls += bw.legalBalls;
          p.bowling.maidens += bw.maidens || 0;
          p.bowling.runsConceded += bw.runsConceded || 0;
          p.bowling.wickets += bw.wickets || 0;

          // Check Best Bowling
          if (
            bw.wickets > p.bowling.bestBowlingWickets ||
            (bw.wickets === p.bowling.bestBowlingWickets && bw.runsConceded < p.bowling.bestBowlingRuns)
          ) {
            p.bowling.bestBowlingWickets = bw.wickets;
            p.bowling.bestBowlingRuns = bw.runsConceded;
          }
        }
      });

      // Fielding from timeline
      (inn.timeline || []).forEach((ball) => {
        if (ball.isWicket && ball.wicket) {
          const w = ball.wicket;
          if (w.fielderId || w.fielderName) {
            const fid = w.fielderId || w.fielderName;
            const p = ensurePlayer(fid, w.fielderName || fid, inn.bowlingTeamName);
            if (w.type === 'caught') p.fielding.catches += 1;
            else if (w.type === 'runOut') p.fielding.runOuts += 1;
            else if (w.type === 'stumped') p.fielding.stumpings += 1;
          }
        }
      });
    });

    matchPlayersSeen.forEach((pid) => {
      if (stats[pid]) stats[pid].matchesPlayed += 1;
    });
  });

  // Calculate averages and strike rates
  Object.values(stats).forEach((p) => {
    const batDismissals = p.batting.innings - p.batting.notOuts;
    p.batting.average = batDismissals > 0 ? (p.batting.runs / batDismissals).toFixed(2) : p.batting.runs > 0 ? `${p.batting.runs}*` : '0.00';
    p.batting.strikeRate = p.batting.balls > 0 ? ((p.batting.runs / p.batting.balls) * 100).toFixed(1) : '0.00';

    p.bowling.overs = ballsToOvers(p.bowling.legalBalls);
    const bowlingOversFloat = p.bowling.legalBalls / 6;
    p.bowling.economy = bowlingOversFloat > 0 ? (p.bowling.runsConceded / bowlingOversFloat).toFixed(2) : '0.00';
    p.bowling.average = p.bowling.wickets > 0 ? (p.bowling.runsConceded / p.bowling.wickets).toFixed(2) : '—';
    p.bowling.bestBowlingFigures = p.bowling.bestBowlingWickets > 0 ? `${p.bowling.bestBowlingWickets}/${p.bowling.bestBowlingRuns}` : '—';
  });

  return stats;
}

/**
 * Generate a realistic tournament sample match set (Live Grand Final, Semi-Finals, Quarter-Finals)
 * so that users, spectators, and organizers can immediately test all scorecard and progression features.
 */
export function createSampleTournamentMatches(
  tournamentId = 'DqC4W0dQCI1q2kJxxKDg',
  tournamentTitle = 'KMT Champions Trophy 2026'
) {
  const t1 = {
    id: 'team_blr_strikers',
    name: 'Bangalore Strikers XI',
    captainName: 'Virat R.',
    phone: '+91 98450 12345',
    players: [
      { id: 'p_blr_1', name: 'Virat R.', jersey: '18', role: 'Batsman', battingStyle: 'Right-hand bat' },
      { id: 'p_blr_2', name: 'Rohit K.', jersey: '45', role: 'Batsman', battingStyle: 'Right-hand bat' },
      { id: 'p_blr_3', name: 'Surya Y.', jersey: '63', role: 'Batsman', battingStyle: 'Right-hand bat' },
      { id: 'p_blr_4', name: 'Rishabh P.', jersey: '17', role: 'Wicketkeeper Batsman', battingStyle: 'Left-hand bat' },
      { id: 'p_blr_5', name: 'Hardik P.', jersey: '33', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
      { id: 'p_blr_6', name: 'Ravindra J.', jersey: '8', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm orthodox' },
      { id: 'p_blr_7', name: 'Jasprit B.', jersey: '93', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
      { id: 'p_blr_8', name: 'Mohammed S.', jersey: '11', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
      { id: 'p_blr_9', name: 'Kuldeep Y.', jersey: '23', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm wrist-spin' },
      { id: 'p_blr_10', name: 'Arshdeep S.', jersey: '2', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast' },
      { id: 'p_blr_11', name: 'Axar P.', jersey: '20', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm orthodox' },
    ],
  };

  const t2 = {
    id: 'team_vjr_royals',
    name: 'Vajralapuram Royals',
    captainName: 'Kishore Kumar',
    phone: '+91 98860 98765',
    players: [
      { id: 'p_vjr_1', name: 'Kishore Kumar', jersey: '7', role: 'Wicketkeeper Batsman', battingStyle: 'Right-hand bat' },
      { id: 'p_vjr_2', name: 'David W.', jersey: '31', role: 'Batsman', battingStyle: 'Left-hand bat' },
      { id: 'p_vjr_3', name: 'Steve S.', jersey: '49', role: 'Batsman', battingStyle: 'Right-hand bat' },
      { id: 'p_vjr_4', name: 'Glenn M.', jersey: '32', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm off-spin' },
      { id: 'p_vjr_5', name: 'Marcus S.', jersey: '17', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium' },
      { id: 'p_vjr_6', name: 'Mitchell S.', jersey: '56', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast' },
      { id: 'p_vjr_7', name: 'Pat C.', jersey: '30', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast' },
      { id: 'p_vjr_8', name: 'Josh H.', jersey: '38', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm fast' },
      { id: 'p_vjr_9', name: 'Adam Z.', jersey: '88', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm leg-spin' },
      { id: 'p_vjr_10', name: 'Travis H.', jersey: '62', role: 'Batsman', battingStyle: 'Left-hand bat' },
      { id: 'p_vjr_11', name: 'Mitch M.', jersey: '8', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium' },
    ],
  };

  const t3 = { id: 'team_tpt_kings', name: 'Tirupati Super Kings', captainName: 'Suresh R.' };
  const t4 = { id: 'team_ctr_blasters', name: 'Chittoor Blasters', captainName: 'Manoj Reddy' };
  const t5 = { id: 'team_klr_knights', name: 'Kolar Knights', captainName: 'Pradeep Gowda' };
  const t6 = { id: 'team_plm_panthers', name: 'Palamaner Panthers', captainName: 'Dinesh Naidu' };

  // Sample Ball Timeline for 2nd innings live match
  const inn1Timeline = [];
  // Build a realistic 20-over 1st innings for Vajralapuram Royals (164/8)
  for (let o = 0; o < 20; o++) {
    for (let b = 1; b <= 6; b++) {
      const ballNum = o * 6 + b;
      let runs = (ballNum % 7 === 0) ? 4 : (ballNum % 11 === 0) ? 6 : (ballNum % 3 === 0) ? 2 : (ballNum % 2 === 0) ? 1 : 0;
      let isW = [18, 42, 60, 84, 102, 114, 118, 120].includes(ballNum);
      inn1Timeline.push({
        ballNumber: b,
        overNumber: o,
        strikerId: t2.players[o % 4].id,
        strikerName: t2.players[o % 4].name,
        nonStrikerId: t2.players[(o % 4) + 1].id,
        nonStrikerName: t2.players[(o % 4) + 1].name,
        bowlerId: t1.players[6 + (o % 4)].id,
        bowlerName: t1.players[6 + (o % 4)].name,
        runs: isW ? 0 : runs,
        extraType: 'none',
        extraRuns: 0,
        isWicket: isW,
        wicket: isW ? { type: 'caught', playerOutId: t2.players[o % 4].id, fielderName: t1.players[o % 5].name } : null,
      });
    }
  }

  // 2nd innings timeline for Bangalore Strikers XI (158/3 in 18.2 overs)
  const inn2Timeline = [];
  for (let o = 0; o < 18; o++) {
    for (let b = 1; b <= 6; b++) {
      const ballNum = o * 6 + b;
      let runs = (ballNum % 5 === 0) ? 4 : (ballNum % 9 === 0) ? 6 : (ballNum % 2 === 0) ? 1 : 0;
      let isW = [24, 54, 88].includes(ballNum);
      inn2Timeline.push({
        ballNumber: b,
        overNumber: o,
        strikerId: t1.players[0].id,
        strikerName: t1.players[0].name,
        nonStrikerId: t1.players[2].id,
        nonStrikerName: t1.players[2].name,
        bowlerId: t2.players[6 + (o % 4)].id,
        bowlerName: t2.players[6 + (o % 4)].name,
        runs: isW ? 0 : runs,
        extraType: 'none',
        extraRuns: 0,
        isWicket: isW,
        wicket: isW ? { type: 'bowled', playerOutId: t1.players[1].id } : null,
      });
    }
  }
  // 19th over: 2 balls bowled
  inn2Timeline.push(
    { ballNumber: 1, overNumber: 18, strikerId: t1.players[0].id, strikerName: t1.players[0].name, nonStrikerId: t1.players[2].id, nonStrikerName: t1.players[2].name, bowlerId: t2.players[6].id, bowlerName: t2.players[6].name, runs: 4, extraType: 'none', extraRuns: 0, isWicket: false },
    { ballNumber: 2, overNumber: 18, strikerId: t1.players[0].id, strikerName: t1.players[0].name, nonStrikerId: t1.players[2].id, nonStrikerName: t1.players[2].name, bowlerId: t2.players[6].id, bowlerName: t2.players[6].name, runs: 1, extraType: 'none', extraRuns: 0, isWicket: false }
  );

  const inn1 = computeInningsFromTimeline(inn1Timeline, t2.players, t1.players, 20);
  inn1.teamId = t2.id;
  inn1.teamName = t2.name;
  inn1.bowlingTeamId = t1.id;
  inn1.bowlingTeamName = t1.name;

  const inn2 = computeInningsFromTimeline(inn2Timeline, t1.players, t2.players, 20);
  inn2.teamId = t1.id;
  inn2.teamName = t1.name;
  inn2.bowlingTeamId = t2.id;
  inn2.bowlingTeamName = t2.name;

  return [
    // 1. Grand Final (LIVE)
    {
      id: 'match_final_live',
      tournamentId,
      tournamentTitle,
      stage: 'final',
      stageName: 'Championship Grand Final',
      matchNumber: 15,
      scheduledTime: 'Today • 7:30 PM IST (Floodlit)',
      pitchNumber: 'Turf Pitch 1 (Main Arena)',
      oversLimit: 20,
      status: 'live',
      team1: t2,
      team2: t1,
      toss: { winnerTeamId: t2.id, winnerTeamName: t2.name, decision: 'bat' },
      currentInningsIndex: 1,
      innings: [inn1, inn2],
      result: null,
      venue: 'KMT Cricket Ground, Vajralapuram',
    },

    // 2. Semi-Final 1 (Completed)
    {
      id: 'match_sf_1',
      tournamentId,
      tournamentTitle,
      stage: 'semi_final',
      stageName: 'Semi-Final 1',
      matchNumber: 13,
      scheduledTime: 'Yesterday • 3:00 PM',
      pitchNumber: 'Turf Pitch 1',
      oversLimit: 20,
      status: 'completed',
      team1: t1,
      team2: t3,
      currentInningsIndex: 1,
      innings: [
        { teamId: t1.id, teamName: t1.name, totalRuns: 174, wickets: 6, oversFormatted: '20.0', legalBalls: 120 },
        { teamId: t3.id, teamName: t3.name, totalRuns: 142, wickets: 9, oversFormatted: '20.0', legalBalls: 120 },
      ],
      result: {
        winnerTeamId: t1.id,
        winnerTeamName: t1.name,
        loserTeamId: t3.id,
        loserTeamName: t3.name,
        summary: 'Bangalore Strikers XI won by 32 runs',
      },
      venue: 'KMT Cricket Ground, Vajralapuram',
    },

    // 3. Semi-Final 2 (Completed)
    {
      id: 'match_sf_2',
      tournamentId,
      tournamentTitle,
      stage: 'semi_final',
      stageName: 'Semi-Final 2',
      matchNumber: 14,
      scheduledTime: 'Yesterday • 7:30 PM (Under Lights)',
      pitchNumber: 'Turf Pitch 1',
      oversLimit: 20,
      status: 'completed',
      team1: t4,
      team2: t2,
      currentInningsIndex: 1,
      innings: [
        { teamId: t4.id, teamName: t4.name, totalRuns: 168, wickets: 7, oversFormatted: '20.0', legalBalls: 120 },
        { teamId: t2.id, teamName: t2.name, totalRuns: 172, wickets: 4, oversFormatted: '19.1', legalBalls: 115 },
      ],
      result: {
        winnerTeamId: t2.id,
        winnerTeamName: t2.name,
        loserTeamId: t4.id,
        loserTeamName: t4.name,
        summary: 'Vajralapuram Royals won by 6 wickets',
      },
      venue: 'KMT Cricket Ground, Vajralapuram',
    },

    // 4. Quarter-Final 1 (Completed)
    {
      id: 'match_qf_1',
      tournamentId,
      tournamentTitle,
      stage: 'quarter_final',
      stageName: 'Quarter-Final 1',
      matchNumber: 9,
      scheduledTime: '22 Oct • 10:00 AM',
      pitchNumber: 'Turf Pitch 2',
      oversLimit: 20,
      status: 'completed',
      team1: t1,
      team2: t5,
      currentInningsIndex: 1,
      innings: [
        { teamId: t1.id, teamName: t1.name, totalRuns: 185, wickets: 5, oversFormatted: '20.0', legalBalls: 120 },
        { teamId: t5.id, teamName: t5.name, totalRuns: 130, wickets: 10, oversFormatted: '17.4', legalBalls: 106 },
      ],
      result: {
        winnerTeamId: t1.id,
        winnerTeamName: t1.name,
        loserTeamId: t5.id,
        loserTeamName: t5.name,
        summary: 'Bangalore Strikers XI won by 55 runs',
      },
      venue: 'KMT Cricket Ground, Vajralapuram',
    },

    // 5. Quarter-Final 2 (Completed)
    {
      id: 'match_qf_2',
      tournamentId,
      tournamentTitle,
      stage: 'quarter_final',
      stageName: 'Quarter-Final 2',
      matchNumber: 10,
      scheduledTime: '22 Oct • 2:30 PM',
      pitchNumber: 'Turf Pitch 2',
      oversLimit: 20,
      status: 'completed',
      team1: t3,
      team2: t6,
      currentInningsIndex: 1,
      innings: [
        { teamId: t3.id, teamName: t3.name, totalRuns: 154, wickets: 6, oversFormatted: '20.0', legalBalls: 120 },
        { teamId: t6.id, teamName: t6.name, totalRuns: 141, wickets: 8, oversFormatted: '20.0', legalBalls: 120 },
      ],
      result: {
        winnerTeamId: t3.id,
        winnerTeamName: t3.name,
        loserTeamId: t6.id,
        loserTeamName: t6.name,
        summary: 'Tirupati Super Kings won by 13 runs',
      },
      venue: 'KMT Cricket Ground, Vajralapuram',
    },
  ];
}

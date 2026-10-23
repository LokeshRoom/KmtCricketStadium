import { describe, expect, it } from 'vitest';
import {
  aggregatePlayerCareerStats,
  ballsToOvers,
  calculateCRR,
  calculateRRR,
  computeInningsFromTimeline,
  determineMatchResult,
} from './scoring';

describe('Cricket Scoring Engine', () => {
  it('correctly formats overs and calculates run rates', () => {
    expect(ballsToOvers(0)).toBe('0.0');
    expect(ballsToOvers(5)).toBe('0.5');
    expect(ballsToOvers(6)).toBe('1.0');
    expect(ballsToOvers(17)).toBe('2.5');
    expect(ballsToOvers(120)).toBe('20.0');

    expect(calculateCRR(60, 36)).toBe('10.00'); // 60 runs in 6 overs = 10.00
    expect(calculateCRR(150, 120)).toBe('7.50');

    expect(calculateRRR(36, 18)).toBe('12.00'); // 36 runs needed in 18 balls (3 ov) = 12.00
    expect(calculateRRR(0, 10)).toBe('0.00');
  });

  it('accurately resolves batting, bowling, and extras from ball timeline', () => {
    const battingLineup = [
      { id: 'p1', name: 'Virat' },
      { id: 'p2', name: 'Rohit' },
      { id: 'p3', name: 'Rahul' },
    ];
    const bowlingLineup = [
      { id: 'b1', name: 'Bumrah' },
    ];

    // Over 1:
    // Ball 1: 4 runs by Virat
    // Ball 2: 1 run by Virat (strike rotates to Rohit)
    // Ball 3: Wide (+1) (does not rotate strike, doesn't increment legal balls)
    // Ball 4: 0 runs by Rohit
    // Ball 5: Wicket! Rohit bowled by Bumrah
    // Ball 6: 2 runs by Rahul
    // Ball 7: 6 runs by Rahul (6th legal ball, end of over)
    const timeline = [
      { strikerId: 'p1', nonStrikerId: 'p2', bowlerId: 'b1', runs: 4, extraType: 'none', isWicket: false },
      { strikerId: 'p1', nonStrikerId: 'p2', bowlerId: 'b1', runs: 1, extraType: 'none', isWicket: false },
      { strikerId: 'p2', nonStrikerId: 'p1', bowlerId: 'b1', runs: 0, extraType: 'wide', extraRuns: 0, isWicket: false },
      { strikerId: 'p2', nonStrikerId: 'p1', bowlerId: 'b1', runs: 0, extraType: 'none', isWicket: false },
      {
        strikerId: 'p2',
        nonStrikerId: 'p1',
        bowlerId: 'b1',
        runs: 0,
        extraType: 'none',
        isWicket: true,
        wicket: { type: 'bowled', bowlerCredit: true },
      },
      { strikerId: 'p3', nonStrikerId: 'p1', bowlerId: 'b1', runs: 2, extraType: 'none', isWicket: false },
      { strikerId: 'p3', nonStrikerId: 'p1', bowlerId: 'b1', runs: 6, extraType: 'none', isWicket: false },
    ];

    const innings = computeInningsFromTimeline(timeline, battingLineup, bowlingLineup, 20);

    // Total runs: 4 + 1 + 1 (wide) + 0 + 0 + 2 + 6 = 14 runs
    expect(innings.totalRuns).toBe(14);
    expect(innings.wickets).toBe(1);
    expect(innings.legalBalls).toBe(6);
    expect(innings.oversFormatted).toBe('1.0');
    expect(innings.extras.wides).toBe(1);

    // Virat: 5 runs off 2 balls (4, 1)
    const virat = innings.battersList.find((b) => b.id === 'p1');
    expect(virat.runs).toBe(5);
    expect(virat.balls).toBe(2);
    expect(virat.fours).toBe(1);
    expect(virat.isOut).toBe(false);

    // Rohit: 0 runs off 2 balls, dismissed bowled
    const rohit = innings.battersList.find((b) => b.id === 'p2');
    expect(rohit.runs).toBe(0);
    expect(rohit.balls).toBe(2);
    expect(rohit.isOut).toBe(true);
    expect(rohit.dismissalText).toContain('b Bumrah');

    // Rahul: 8 runs off 2 balls (2, 6)
    const rahul = innings.battersList.find((b) => b.id === 'p3');
    expect(rahul.runs).toBe(8);
    expect(rahul.balls).toBe(2);
    expect(rahul.sixes).toBe(1);

    // Bowler Bumrah: 1 over, 14 runs, 1 wicket, 1 wide
    const bumrah = innings.bowlersList.find((b) => b.id === 'b1');
    expect(bumrah.legalBalls).toBe(6);
    expect(bumrah.runsConceded).toBe(14);
    expect(bumrah.wickets).toBe(1);
    expect(bumrah.wides).toBe(1);

    // Fall of wickets
    expect(innings.fallOfWickets.length).toBe(1);
    expect(innings.fallOfWickets[0].score).toBe(6); // 4 + 1 + 1(wd) + 0
    expect(innings.fallOfWickets[0].batterName).toBe('Rohit');
  });

  it('determines match results when chasing team wins', () => {
    const match = {
      team1: { id: 't1', name: 'Vajrala Kings' },
      team2: { id: 't2', name: 'Royal Strikers' },
      oversLimit: 20,
      innings: [
        { teamName: 'Vajrala Kings', totalRuns: 160, wickets: 8, oversFormatted: '20.0', legalBalls: 120 },
        { teamName: 'Royal Strikers', totalRuns: 164, wickets: 4, oversFormatted: '18.4', legalBalls: 112 },
      ],
    };

    const res = determineMatchResult(match);
    expect(res.status).toBe('completed');
    expect(res.winnerTeamId).toBe('t2');
    expect(res.summary).toContain('Royal Strikers won by 6 wickets');
  });

  it('determines match results when defending team wins', () => {
    const match = {
      team1: { id: 't1', name: 'Vajrala Kings' },
      team2: { id: 't2', name: 'Royal Strikers' },
      oversLimit: 20,
      innings: [
        { teamName: 'Vajrala Kings', totalRuns: 180, wickets: 6, oversFormatted: '20.0', legalBalls: 120 },
        { teamName: 'Royal Strikers', totalRuns: 155, wickets: 10, oversFormatted: '18.2', legalBalls: 110 },
      ],
    };

    const res = determineMatchResult(match);
    expect(res.status).toBe('completed');
    expect(res.winnerTeamId).toBe('t1');
    expect(res.summary).toContain('Vajrala Kings won by 25 runs');
  });

  it('aggregates player career statistics across matches', () => {
    const matches = [
      {
        status: 'completed',
        innings: [
          {
            teamName: 'Team A',
            bowlingTeamName: 'Team B',
            battersList: [
              { id: 'p_kl', name: 'KL Rahul', runs: 75, balls: 45, fours: 7, sixes: 3, isOut: true },
            ],
            bowlersList: [
              { id: 'p_steyrn', name: 'Dale Steyn', legalBalls: 24, runsConceded: 28, wickets: 2, maidens: 0 },
            ],
            timeline: [],
          },
        ],
      },
      {
        status: 'completed',
        innings: [
          {
            teamName: 'Team A',
            bowlingTeamName: 'Team C',
            battersList: [
              { id: 'p_kl', name: 'KL Rahul', runs: 52, balls: 30, fours: 4, sixes: 2, isOut: false },
            ],
            bowlersList: [],
            timeline: [],
          },
        ],
      },
    ];

    const stats = aggregatePlayerCareerStats(matches);
    const kl = stats['p_kl'];
    expect(kl.matchesPlayed).toBe(2);
    expect(kl.batting.innings).toBe(2);
    expect(kl.batting.runs).toBe(127);
    expect(kl.batting.fifties).toBe(2);
    expect(kl.batting.highestScore).toBe(75);
    // Dismissed once, so average = 127 / 1 = 127.00
    expect(kl.batting.average).toBe('127.00');

    const steyn = stats['p_steyrn'];
    expect(steyn.matchesPlayed).toBe(1);
    expect(steyn.bowling.wickets).toBe(2);
    expect(steyn.bowling.overs).toBe('4.0');
  });
});

import { describe, expect, it } from 'vitest';
import {
  computeTournamentTeamProgression,
  getMyTeamProgression,
  groupMatchesByStage,
} from './tournamentProgression';

describe('Tournament Progression Engine', () => {
  it('identifies eliminated teams and progressing teams in knockout matches', () => {
    const tournament = { id: 'tour1', title: 'KMT Gold Cup' };
    const registrations = [
      { id: 'reg1', teamName: 'Vajrala Warriors', captainName: 'Lokesh', status: 'CONFIRMED' },
      { id: 'reg2', teamName: 'Thunder Strikers', captainName: 'Karthik', status: 'CONFIRMED' },
      { id: 'reg3', teamName: 'Royal Challengers', captainName: 'Ravi', status: 'CONFIRMED' },
      { id: 'reg4', teamName: 'Super Kings', captainName: 'Dhoni', status: 'CONFIRMED' },
    ];

    const matches = [
      // Semi Final 1: Vajrala Warriors beats Thunder Strikers
      {
        id: 'm1',
        stage: 'semi_final',
        stageName: 'Semi-Final 1',
        status: 'completed',
        team1: { id: 'reg1', name: 'Vajrala Warriors' },
        team2: { id: 'reg2', name: 'Thunder Strikers' },
        result: {
          winnerTeamId: 'reg1',
          loserTeamId: 'reg2',
          summary: 'Vajrala Warriors won by 18 runs',
        },
      },
      // Semi Final 2: Royal Challengers beats Super Kings
      {
        id: 'm2',
        stage: 'semi_final',
        stageName: 'Semi-Final 2',
        status: 'completed',
        team1: { id: 'reg3', name: 'Royal Challengers' },
        team2: { id: 'reg4', name: 'Super Kings' },
        result: {
          winnerTeamId: 'reg3',
          loserTeamId: 'reg4',
          summary: 'Royal Challengers won by 4 wickets',
        },
      },
      // Championship Final: Vajrala Warriors beats Royal Challengers
      {
        id: 'm3',
        stage: 'final',
        stageName: 'Championship Final',
        status: 'completed',
        team1: { id: 'reg1', name: 'Vajrala Warriors' },
        team2: { id: 'reg3', name: 'Royal Challengers' },
        result: {
          winnerTeamId: 'reg1',
          loserTeamId: 'reg3',
          summary: 'Vajrala Warriors won by 6 wickets',
        },
      },
    ];

    const progression = computeTournamentTeamProgression(tournament, matches, registrations);

    const warriors = progression.find((t) => t.teamName === 'Vajrala Warriors');
    expect(warriors.status).toBe('CHAMPION');
    expect(warriors.wins).toBe(2);
    expect(warriors.currentStage).toContain('Champions');

    const challengers = progression.find((t) => t.teamName === 'Royal Challengers');
    expect(challengers.status).toBe('RUNNER_UP');
    expect(challengers.wins).toBe(1);
    expect(challengers.losses).toBe(1);

    const thunder = progression.find((t) => t.teamName === 'Thunder Strikers');
    expect(thunder.status).toBe('ELIMINATED');
    expect(thunder.eliminatedInStage).toBe('Semi-Final 1');

    const superKings = progression.find((t) => t.teamName === 'Super Kings');
    expect(superKings.status).toBe('ELIMINATED');
    expect(superKings.eliminatedInStage).toBe('Semi-Final 2');
  });

  it('spotlights logged-in user team status', () => {
    const user = { uid: 'u_123', email: 'lokesh@kmt.com' };
    const userRegistrations = [
      { id: 'reg1', ownerUid: 'u_123', teamName: 'Vajrala Warriors', captainName: 'Lokesh', status: 'CONFIRMED' },
    ];
    const progressionList = [
      {
        teamName: 'Vajrala Warriors',
        registrationId: 'reg1',
        status: 'QUALIFIED',
        currentStage: 'Advanced to Semi-Finals',
        wins: 1,
        losses: 0,
      },
    ];

    const myTeam = getMyTeamProgression(user, progressionList, userRegistrations);
    expect(myTeam).not.toBeNull();
    expect(myTeam.teamName).toBe('Vajrala Warriors');
    expect(myTeam.status).toBe('QUALIFIED');
    expect(myTeam.currentStage).toBe('Advanced to Semi-Finals');
  });

  it('groups matches into stages correctly', () => {
    const matches = [
      { id: 'm1', stage: 'quarter_final', stageName: 'Quarter-Final 1' },
      { id: 'm2', stage: 'quarter_final', stageName: 'Quarter-Final 2' },
      { id: 'm3', stage: 'semi_final', stageName: 'Semi-Final 1' },
      { id: 'm4', stage: 'final', stageName: 'Championship Final' },
    ];

    const grouped = groupMatchesByStage(matches);
    expect(grouped.length).toBe(3);
    expect(grouped[0].stageId).toBe('quarter_final');
    expect(grouped[0].matches.length).toBe(2);
    expect(grouped[1].stageId).toBe('semi_final');
    expect(grouped[2].stageId).toBe('final');
  });
});

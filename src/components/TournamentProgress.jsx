import React from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  Navigation,
  Shield,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  computeTournamentTeamProgression,
  getMyTeamProgression,
  groupMatchesByStage,
} from '../tournamentProgression';
import { STADIUM_MAP } from '../App';

export function TournamentProgressView({
  tournament,
  matches = [],
  registrations = [],
  user = null,
  userRegistrations = [],
  onOpenScorecard,
}) {
  const progressionList = computeTournamentTeamProgression(tournament, matches, registrations);
  const myTeam = getMyTeamProgression(user, progressionList, userRegistrations);
  const stageGroups = groupMatchesByStage(matches);

  const champions = progressionList.filter((t) => t.status === 'CHAMPION');
  const runnersUp = progressionList.filter((t) => t.status === 'RUNNER_UP');
  const advancing = progressionList.filter((t) => t.status === 'QUALIFIED' || t.status === 'ACTIVE');
  const eliminated = progressionList.filter((t) => t.status === 'ELIMINATED');

  return (
    <div className="tournament-progress-wrapper">
      {/* 1. Personalized "My Team's Tournament Progress" (User Request) */}
      {user && myTeam && (
        <section className="my-team-progress-banner">
          <div className="my-team-banner-glow" />
          <div className="my-team-banner-inner">
            <div className="my-team-header-row">
              <div className="my-team-badge-wrap">
                <Shield size={24} className="text-gold" />
                <span className="live-dot" />
              </div>
              <div className="my-team-names">
                <span className="my-team-kicker">My Squad Progress</span>
                <h3 className="my-team-title">{myTeam.teamName}</h3>
                <p className="my-team-captain">Captain: {myTeam.captainName || user.displayName || 'Captain'}</p>
              </div>

              <div className="my-team-status-tag">
                {myTeam.status === 'CHAMPION' && (
                  <span className="status-badge status-champion">
                    <Trophy size={16} />
                    <span>Tournament Champions! 🏆</span>
                  </span>
                )}
                {myTeam.status === 'RUNNER_UP' && (
                  <span className="status-badge status-runnerup">
                    <Award size={16} />
                    <span>Runners-Up 🥈</span>
                  </span>
                )}
                {myTeam.status === 'QUALIFIED' && (
                  <span className="status-badge status-qualified">
                    <CheckCircle2 size={16} />
                    <span>Progressing • Qualified</span>
                  </span>
                )}
                {myTeam.status === 'ACTIVE' && (
                  <span className="status-badge status-active">
                    <Zap size={16} />
                    <span>In The Hunt • Active</span>
                  </span>
                )}
                {myTeam.status === 'ELIMINATED' && (
                  <span className="status-badge status-eliminated">
                    <XCircle size={16} />
                    <span>Eliminated</span>
                  </span>
                )}
              </div>
            </div>

            {/* Stage & Next Match Info */}
            <div className="my-team-body-grid">
              <div className="my-team-stat-tile">
                <span className="tile-lbl">Current Stage</span>
                <strong className="tile-val text-gold">{myTeam.currentStage || 'Round 1'}</strong>
              </div>
              <div className="my-team-stat-tile">
                <span className="tile-lbl">Matches</span>
                <strong className="tile-val">
                  {myTeam.matchesPlayed} <small>({myTeam.wins}W - {myTeam.losses}L)</small>
                </strong>
              </div>

              {myTeam.nextMatch ? (
                <div className="my-team-next-fixture-tile">
                  <div className="next-fixture-top">
                    <span className="next-badge">Next Fixture</span>
                    <span className="fixture-time">
                      <Clock size={12} />
                      <span>{myTeam.nextMatch.scheduledTime || 'Matchday TBA'}</span>
                    </span>
                  </div>
                  <div className="next-teams-vs">
                    <span>vs</span>
                    <strong>
                      {myTeam.nextMatch.team1?.name === myTeam.teamName
                        ? myTeam.nextMatch.team2?.name
                        : myTeam.nextMatch.team1?.name}
                    </strong>
                  </div>
                  <div className="next-fixture-actions">
                    <a
                      href={STADIUM_MAP.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-xs btn-gold"
                    >
                      <Navigation size={12} />
                      <span>Pitch Directions</span>
                    </a>
                    {myTeam.nextMatch.id && (
                      <Link to={`/matches/${myTeam.nextMatch.id}`} className="btn btn-xs btn-outline">
                        <span>Match Center</span>
                      </Link>
                    )}
                  </div>
                </div>
              ) : myTeam.status === 'ELIMINATED' ? (
                <div className="my-team-eliminated-note">
                  <span className="elim-stage">Exit: {myTeam.eliminatedInStage || 'Knockouts'}</span>
                  <p>Well played! Check tournament fixtures & full match stats below.</p>
                </div>
              ) : (
                <div className="my-team-waiting-tile">
                  <span>Awaiting next round opponent draw.</span>
                </div>
              )}
            </div>

            {/* Match Journey History */}
            {myTeam.journey?.length > 0 && (
              <div className="my-team-journey-strip">
                <span className="journey-title">Matchday Journey:</span>
                <div className="journey-items">
                  {myTeam.journey.map((j, idx) => (
                    <span
                      key={idx}
                      className={`journey-chip ${j.result === 'WON' ? 'journey-chip--won' : 'journey-chip--lost'}`}
                    >
                      <strong>{j.result}</strong> vs {j.opponentName} ({j.stage})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Tournament Progression & Elimination Overview (Who is Eliminated vs Who is Progressing) */}
      <section className="progression-overview-section">
        <div className="progression-overview-head">
          <div>
            <span className="badge badge-gold">
              <Trophy size={13} />
              <span>Live Elimination Board</span>
            </span>
            <h3 className="section-title">Tournament Progress & Standings</h3>
            <p className="section-subtitle">
              Live tracking of progressing teams, knockout brackets, and eliminated contenders.
            </p>
          </div>
        </div>

        {/* Champions Podium if finished */}
        {champions.length > 0 && (
          <div className="podium-card">
            <div className="podium-crown">
              <Trophy size={36} className="text-gold" />
            </div>
            <span className="podium-kicker">Champions of {tournament?.title}</span>
            <h2 className="podium-champ-name">{champions[0].teamName}</h2>
            {runnersUp.length > 0 && (
              <p className="podium-runnerup">
                Runner-Up: <strong>{runnersUp[0].teamName}</strong>
              </p>
            )}
          </div>
        )}

        <div className="progression-split-grid">
          {/* Column A: Progressing / Active Teams */}
          <div className="progression-col progression-col-active">
            <div className="col-header">
              <div className="col-icon col-icon-green">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4>Progressing & Active ({advancing.length})</h4>
                <p>Teams advancing through the knockout stages</p>
              </div>
            </div>

            <div className="teams-progression-cards">
              {advancing.length === 0 ? (
                <div className="empty-col-note">No active teams remaining.</div>
              ) : (
                advancing.map((t) => (
                  <div key={t.teamId} className="team-progress-card card-progressing">
                    <div className="team-progress-top">
                      <div className="team-avatar-box">
                        <Users size={16} />
                      </div>
                      <div className="team-info-box">
                        <strong className="team-name">{t.teamName}</strong>
                        <span className="team-stage-text">{t.currentStage}</span>
                      </div>
                      <span className="progress-badge-green">In Contention</span>
                    </div>
                    <div className="team-record-bar">
                      <span>Matches: <strong>{t.matchesPlayed}</strong></span>
                      <span>Won: <strong className="text-green">{t.wins}</strong></span>
                      <span>Lost: <strong>{t.losses}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column B: Eliminated Teams */}
          <div className="progression-col progression-col-eliminated">
            <div className="col-header">
              <div className="col-icon col-icon-red">
                <XCircle size={18} />
              </div>
              <div>
                <h4>Eliminated Teams ({eliminated.length})</h4>
                <p>Teams knocked out in earlier rounds</p>
              </div>
            </div>

            <div className="teams-progression-cards">
              {eliminated.length === 0 ? (
                <div className="empty-col-note">No teams eliminated yet. Knockout stage begins soon!</div>
              ) : (
                eliminated.map((t) => (
                  <div key={t.teamId} className="team-progress-card card-eliminated">
                    <div className="team-progress-top">
                      <div className="team-avatar-box muted-avatar">
                        <Users size={16} />
                      </div>
                      <div className="team-info-box">
                        <strong className="team-name text-muted">{t.teamName}</strong>
                        <span className="elim-stage-pill">
                          Eliminated in {t.eliminatedInStage || 'Knockouts'}
                        </span>
                      </div>
                      <span className="progress-badge-red">Eliminated</span>
                    </div>
                    <div className="team-record-bar">
                      <span>Played: {t.matchesPlayed}</span>
                      <span>Wins: {t.wins}</span>
                      <span>Losses: {t.losses}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Visual Stage Brackets & Match Scorecards */}
      <section className="stage-brackets-section">
        <div className="brackets-section-head">
          <span className="badge badge-gold">
            <Zap size={13} />
            <span>Tournament Brackets</span>
          </span>
          <h3 className="section-title">Knockout Stage Fixtures & Results</h3>
          <p className="section-subtitle">Tap any fixture to view the live mobile scorecard and commentary.</p>
        </div>

        {stageGroups.length === 0 ? (
          <div className="empty-fixtures-card">
            <Calendar size={32} className="text-gold" />
            <h4>Knockout Fixtures Being Scheduled</h4>
            <p>The stadium tournament desk will announce fixtures, pitch allocations and timings once team registrations conclude.</p>
          </div>
        ) : (
          <div className="brackets-stages-scroller">
            {stageGroups.map((group) => (
              <div key={group.stageId} className="stage-bracket-column">
                <div className="stage-bracket-header">
                  <h4>{group.title}</h4>
                  <span className="stage-match-count">{group.matches.length} Match{group.matches.length > 1 ? 'es' : ''}</span>
                </div>

                <div className="stage-matches-list">
                  {group.matches.map((m) => {
                    const isLive = m.status === 'live' || m.status === 'innings_break';
                    const isCompleted = m.status === 'completed';
                    const inn1 = m.innings?.[0];
                    const inn2 = m.innings?.[1];

                    return (
                      <div
                        key={m.id}
                        className={`bracket-match-card ${isLive ? 'bracket-match--live' : ''} ${isCompleted ? 'bracket-match--completed' : ''}`}
                      >
                        <div className="match-card-topline">
                          <span className="match-num-tag">{m.matchNumber ? `Match #${m.matchNumber}` : m.stageName || 'Fixture'}</span>
                          {isLive && (
                            <span className="live-pill-pulsing">
                              <span className="live-dot" /> LIVE
                            </span>
                          )}
                          {isCompleted && <span className="status-badge-done">Final</span>}
                          {!isLive && !isCompleted && (
                            <span className="match-time-tag">
                              <Clock size={11} />
                              <span>{m.scheduledTime || 'Scheduled'}</span>
                            </span>
                          )}
                        </div>

                        {/* Team 1 Row */}
                        <div className={`bracket-team-row ${m.result?.winnerTeamId === m.team1?.id ? 'team-won' : ''}`}>
                          <div className="team-row-meta">
                            <span className="team-flag">🏏</span>
                            <strong>{m.team1?.name || 'TBD'}</strong>
                          </div>
                          {inn1 ? (
                            <span className="team-score-num">
                              {inn1.totalRuns}/{inn1.wickets} <small>({inn1.oversFormatted || '0.0'})</small>
                            </span>
                          ) : (
                            <span className="team-score-tbd">—</span>
                          )}
                        </div>

                        {/* Team 2 Row */}
                        <div className={`bracket-team-row ${m.result?.winnerTeamId === m.team2?.id ? 'team-won' : ''}`}>
                          <div className="team-row-meta">
                            <span className="team-flag">🏏</span>
                            <strong>{m.team2?.name || 'TBD'}</strong>
                          </div>
                          {inn2 ? (
                            <span className="team-score-num">
                              {inn2.totalRuns}/{inn2.wickets} <small>({inn2.oversFormatted || '0.0'})</small>
                            </span>
                          ) : (
                            <span className="team-score-tbd">—</span>
                          )}
                        </div>

                        {/* Result or Live Status */}
                        {m.result?.summary ? (
                          <div className="bracket-result-line">
                            <span>{m.result.summary}</span>
                          </div>
                        ) : isLive ? (
                          <div className="bracket-live-line">
                            <span>Live: {inn2 ? `${inn2.teamName} chasing` : `${inn1?.teamName || '1st'} batting`}</span>
                          </div>
                        ) : null}

                        <div className="bracket-card-action">
                          <Link to={`/matches/${m.id}`} className="btn btn-sm btn-outline btn-block">
                            <span>{isLive ? 'Watch Live Scorecard' : 'View Match Details'}</span>
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

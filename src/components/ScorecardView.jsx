import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Layers,
  MapPin,
  Navigation,
  RefreshCw,
  Share2,
  Shield,
  Ticket,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { getMatch, onMatchSnapshot } from '../store';
import { ballsToOvers, calculateCRR, calculateRRR } from '../scoring';
import { STADIUM_MAP } from '../App';
import { PlayerProfileModal } from './PlayerProfileModal';

export function MatchScorecardPage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard' | 'commentary' | 'info' | 'squads'
  const [activeInningsTab, setActiveInningsTab] = useState(0); // 0 = Innings 1, 1 = Innings 2
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);

    // Initial fetch
    getMatch(matchId)
      .then((data) => {
        if (!data) setError('Match not found.');
        else {
          setMatch(data);
          // Auto select active innings tab if 2nd innings is ongoing
          if (data.currentInningsIndex === 1 || data.innings?.length > 1) {
            setActiveInningsTab(data.currentInningsIndex ?? (data.innings?.length - 1));
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Could not load live match scorecard.');
      })
      .finally(() => setLoading(false));

    // Real-time listener for live ball updates
    const unsubscribe = onMatchSnapshot(matchId, (liveData) => {
      setMatch(liveData);
      if (liveData?.currentInningsIndex !== undefined) {
        setActiveInningsTab(liveData.currentInningsIndex);
      }
    });

    return () => unsubscribe?.();
  }, [matchId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${match?.team1?.name} vs ${match?.team2?.name} - Live Scorecard`,
          text: `Follow live cricket score: ${match?.team1?.name} vs ${match?.team2?.name} at KMT Cricket Ground, Vajralapuram!`,
          url,
        });
        return;
      } catch (err) {
        // Fallback
      }
    }
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="page-shell">
        <main className="main-content">
          <div className="state-card loading-state">
            <div className="spinner" />
            <p>Loading live match scorecard…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="page-shell">
        <main className="main-content">
          <div className="state-card error-state">
            <p>{error || 'Match not found'}</p>
            <Link to="/tournaments" className="btn btn-gold">
              Back to Tournaments
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isLive = match.status === 'live' || match.status === 'innings_break';
  const isCompleted = match.status === 'completed';
  const inn1 = match.innings?.[0];
  const inn2 = match.innings?.[1];
  const currentInnings = match.innings?.[match.currentInningsIndex ?? 0] || inn1;
  const viewingInnings = match.innings?.[activeInningsTab] || inn1;

  // Active batter & bowler in current live innings
  const activeTimeline = currentInnings?.timeline || [];
  const lastBall = activeTimeline.length > 0 ? activeTimeline[activeTimeline.length - 1] : null;
  const currentOverBalls = currentInnings?.currentOverBalls || [];

  return (
    <div className="page-shell page-scorecard">
      {/* Sticky Mobile Match Bar */}
      <header className="scorecard-top-bar">
        <div className="scorecard-bar-inner">
          <Link to={match.tournamentId ? `/t/${match.tournamentId}` : '/tournaments'} className="btn-back-link">
            <ArrowLeft size={18} />
            <span>Tournament</span>
          </Link>
          <div className="match-title-center">
            <span className="match-num-pill">{match.stageName || match.stage || 'Fixture'}</span>
            <span className="match-venue-sub">{match.venue || STADIUM_MAP.name}</span>
          </div>
          <button type="button" className="btn-icon" onClick={handleShare} aria-label="Share scorecard">
            {copied ? <Check size={18} className="text-green" /> : <Share2 size={18} />}
          </button>
        </div>
      </header>

      <main className="main-content scorecard-content">
        {/* 1. Hero Live Scorecard Header Card */}
        <section className="live-match-hero-card">
          <div className="match-status-row">
            <span className="match-tournament-tag">{match.tournamentTitle || 'KMT Tournament'}</span>
            {isLive ? (
              <span className="live-pill-pulsing">
                <span className="live-dot" /> LIVE MATCH
              </span>
            ) : isCompleted ? (
              <span className="status-badge-done">Match Completed</span>
            ) : (
              <span className="status-badge-scheduled">Upcoming Match</span>
            )}
          </div>

          {/* Teams & Scores Comparison */}
          <div className="score-teams-matrix">
            {/* Team 1 */}
            <div className={`score-team-col ${match.result?.winnerTeamId === match.team1?.id ? 'team-winner' : ''}`}>
              <div className="team-flag-avatar">
                <span>{(match.team1?.name || 'T1').slice(0, 2).toUpperCase()}</span>
              </div>
              <h3 className="score-team-name">{match.team1?.name}</h3>
              {inn1 ? (
                <div className="score-digits-box">
                  <span className="runs-wickets">
                    {inn1.totalRuns}
                    <small>/{inn1.wickets}</small>
                  </span>
                  <span className="overs-sub">({inn1.oversFormatted || '0.0'} ov)</span>
                </div>
              ) : (
                <div className="score-digits-box">
                  <span className="runs-wickets text-muted">Yet to bat</span>
                </div>
              )}
            </div>

            <div className="score-vs-divider">
              <span>VS</span>
            </div>

            {/* Team 2 */}
            <div className={`score-team-col ${match.result?.winnerTeamId === match.team2?.id ? 'team-winner' : ''}`}>
              <div className="team-flag-avatar">
                <span>{(match.team2?.name || 'T2').slice(0, 2).toUpperCase()}</span>
              </div>
              <h3 className="score-team-name">{match.team2?.name}</h3>
              {inn2 ? (
                <div className="score-digits-box">
                  <span className="runs-wickets">
                    {inn2.totalRuns}
                    <small>/{inn2.wickets}</small>
                  </span>
                  <span className="overs-sub">({inn2.oversFormatted || '0.0'} ov)</span>
                </div>
              ) : (
                <div className="score-digits-box">
                  <span className="runs-wickets text-muted">{inn1 ? 'Target ' + (inn1.totalRuns + 1) : 'Yet to bat'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Equation or Result Announcement Banner */}
          {match.result?.summary ? (
            <div className="match-result-banner">
              <Trophy size={18} className="text-gold" />
              <span>{match.result.summary}</span>
            </div>
          ) : isLive && inn2 ? (
            <div className="match-equation-banner">
              <Zap size={16} className="text-gold" />
              <span>
                {match.team2?.name} need {Math.max(0, inn1.totalRuns + 1 - inn2.totalRuns)} runs in{' '}
                {Math.max(0, (match.oversLimit || 20) * 6 - inn2.legalBalls)} balls
                {inn2.legalBalls > 0 && ` (CRR: ${inn2.currentRunRate} • RRR: ${calculateRRR(inn1.totalRuns + 1 - inn2.totalRuns, (match.oversLimit || 20) * 6 - inn2.legalBalls)})`}
              </span>
            </div>
          ) : isLive && match.status === 'innings_break' ? (
            <div className="match-equation-banner">
              <span>Innings Break • Target: {inn1 ? inn1.totalRuns + 1 : '—'} runs</span>
            </div>
          ) : match.toss?.winnerTeamName ? (
            <div className="match-toss-banner">
              <span>Toss: {match.toss.winnerTeamName} elected to {match.toss.decision} first</span>
            </div>
          ) : null}

          {/* Current Over Balls Strip (Cricbuzz / CricHeroes Style) */}
          {isLive && currentOverBalls.length > 0 && (
            <div className="current-over-strip-box">
              <span className="over-label">This Over:</span>
              <div className="balls-badge-row">
                {currentOverBalls.map((b, idx) => (
                  <span
                    key={idx}
                    className={`ball-badge-circle ${
                      b.isWicket
                        ? 'ball-wicket'
                        : b.badge.includes('Wd') || b.badge.includes('Nb')
                        ? 'ball-extra'
                        : b.runs === 4
                        ? 'ball-four'
                        : b.runs === 6
                        ? 'ball-six'
                        : b.runs === 0
                        ? 'ball-dot'
                        : 'ball-runs'
                    }`}
                  >
                    {b.badge}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 2. Mobile Tab Bar: Scorecard | Commentary | Match Info | Squads */}
        <div className="scorecard-tabs-bar">
          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'scorecard' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('scorecard')}
          >
            <span>Full Scorecard</span>
          </button>
          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'commentary' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('commentary')}
          >
            <span>Commentary</span>
          </button>
          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'info' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <span>Match Info & Map</span>
          </button>
          <button
            type="button"
            className={`sc-tab-btn ${activeTab === 'squads' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('squads')}
          >
            <span>Playing XI</span>
          </button>
        </div>

        {/* 3. TAB 1: FULL SCORECARD */}
        {activeTab === 'scorecard' && (
          <div className="tab-pane-scorecard">
            {/* Innings Selector Segmented Control */}
            {match.innings?.length > 1 && (
              <div className="innings-segmented-bar">
                <button
                  type="button"
                  className={`innings-btn ${activeInningsTab === 0 ? 'is-active' : ''}`}
                  onClick={() => setActiveInningsTab(0)}
                >
                  <span>1st Inn: {inn1?.teamName || match.team1?.name}</span>
                  <strong>{inn1 ? `${inn1.totalRuns}/${inn1.wickets}` : ''}</strong>
                </button>
                <button
                  type="button"
                  className={`innings-btn ${activeInningsTab === 1 ? 'is-active' : ''}`}
                  onClick={() => setActiveInningsTab(1)}
                >
                  <span>2nd Inn: {inn2?.teamName || match.team2?.name}</span>
                  <strong>{inn2 ? `${inn2.totalRuns}/${inn2.wickets}` : ''}</strong>
                </button>
              </div>
            )}

            {viewingInnings ? (
              <div className="innings-scorecard-card">
                <div className="innings-card-header">
                  <div>
                    <h4>{viewingInnings.teamName} Innings</h4>
                    <span className="innings-summary-meta">
                      {viewingInnings.totalRuns} runs for {viewingInnings.wickets} wickets ({viewingInnings.oversFormatted || '0.0'} overs)
                    </span>
                  </div>
                  <span className="crr-badge">CRR: {viewingInnings.currentRunRate || '0.00'}</span>
                </div>

                {/* Batters Table */}
                <div className="scorecard-table-wrap">
                  <table className="scorecard-table batters-table">
                    <thead>
                      <tr>
                        <th className="th-name">Batter</th>
                        <th className="th-num">R</th>
                        <th className="th-num">B</th>
                        <th className="th-num">4s</th>
                        <th className="th-num">6s</th>
                        <th className="th-num">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingInnings.battersList || []).map((b, idx) => (
                        <tr key={b.id || idx}>
                          <td className="td-name">
                            <button
                              type="button"
                              className="player-name-link"
                              onClick={() => setSelectedPlayerForStats({ ...b, teamName: viewingInnings.teamName })}
                              title="View player career stats"
                            >
                              <strong>{b.name}</strong>
                            </button>
                            <span className="dismissal-subtext">{b.dismissalText || (b.isOut ? 'out' : 'not out')}</span>
                          </td>
                          <td className="td-num">
                            <strong>{b.runs}</strong>
                          </td>
                          <td className="td-num">{b.balls}</td>
                          <td className="td-num">{b.fours}</td>
                          <td className="td-num text-green">{b.sixes}</td>
                          <td className="td-num text-muted">{b.strikeRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Extras & Total Summary */}
                <div className="innings-totals-box">
                  <div className="total-row-line">
                    <span>Extras</span>
                    <strong>
                      {viewingInnings.extras?.total || 0}{' '}
                      <small className="extras-breakdown">
                        (b {viewingInnings.extras?.byes || 0}, lb {viewingInnings.extras?.legByes || 0}, w{' '}
                        {viewingInnings.extras?.wides || 0}, nb {viewingInnings.extras?.noBalls || 0})
                      </small>
                    </strong>
                  </div>
                  <div className="total-row-line total-main">
                    <span>Total Score</span>
                    <strong className="total-score-badge">
                      {viewingInnings.totalRuns} / {viewingInnings.wickets}{' '}
                      <small>({viewingInnings.oversFormatted || '0.0'} Ov, RR: {viewingInnings.currentRunRate})</small>
                    </strong>
                  </div>
                </div>

                {/* Fall of Wickets (FOW) */}
                {viewingInnings.fallOfWickets?.length > 0 && (
                  <div className="fow-section">
                    <span className="fow-title">Fall of Wickets:</span>
                    <div className="fow-chips-scroller">
                      {viewingInnings.fallOfWickets.map((fow, idx) => (
                        <span key={idx} className="fow-chip">
                          <strong>{fow.score}-{fow.wickets}</strong> ({fow.batterName}, {fow.overs} ov)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bowlers Table */}
                <div className="scorecard-table-wrap bowlers-wrap">
                  <table className="scorecard-table bowlers-table">
                    <thead>
                      <tr>
                        <th className="th-name">Bowler</th>
                        <th className="th-num">O</th>
                        <th className="th-num">M</th>
                        <th className="th-num">R</th>
                        <th className="th-num">W</th>
                        <th className="th-num">Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingInnings.bowlersList || []).map((bw, idx) => (
                        <tr key={bw.id || idx}>
                          <td className="td-name">
                            <button
                              type="button"
                              className="player-name-link"
                              onClick={() => setSelectedPlayerForStats({ ...bw, teamName: viewingInnings.bowlingTeamName })}
                              title="View player career stats"
                            >
                              <strong>{bw.name}</strong>
                            </button>
                          </td>
                          <td className="td-num">{bw.overs}</td>
                          <td className="td-num">{bw.maidens || 0}</td>
                          <td className="td-num">{bw.runsConceded || 0}</td>
                          <td className="td-num">
                            <strong className="text-gold">{bw.wickets || 0}</strong>
                          </td>
                          <td className="td-num text-muted">{bw.economy || '0.00'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-innings-card">
                <p>This innings has not started yet.</p>
              </div>
            )}
          </div>
        )}

        {/* 4. TAB 2: COMMENTARY */}
        {activeTab === 'commentary' && (
          <div className="tab-pane-commentary">
            {(!currentInnings?.timeline || currentInnings.timeline.length === 0) ? (
              <div className="empty-commentary-box">
                <Clock size={32} className="text-gold" />
                <h4>No Balls Bowled Yet</h4>
                <p>Live ball-by-ball commentary and updates will appear here once the match starts.</p>
              </div>
            ) : (
              <div className="commentary-stream">
                {[...(currentInnings.timeline || [])].reverse().map((ball, idx) => (
                  <div key={idx} className={`commentary-ball-item ${ball.isWicket ? 'ball-item--wicket' : ''}`}>
                    <div className="ball-left-indicator">
                      <span className={`ball-bubble ${ball.isWicket ? 'bubble-wicket' : ball.runs === 4 || ball.runs === 6 ? 'bubble-boundary' : ''}`}>
                        {ball.isWicket ? 'W' : ball.extraType === 'wide' ? 'Wd' : ball.extraType === 'noBall' ? 'Nb' : ball.runs}
                      </span>
                    </div>
                    <div className="ball-right-desc">
                      <p className="ball-text">
                        {ball.commentary || `${ball.strikerName || 'Striker'} faced ${ball.bowlerName || 'Bowler'}. ${ball.runs} run(s).`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. TAB 3: MATCH INFO & GROUND MAP */}
        {activeTab === 'info' && (
          <div className="tab-pane-info">
            <div className="match-info-card">
              <div className="info-row">
                <span className="info-lbl">Tournament</span>
                <strong>{match.tournamentTitle || 'KMT Cricket Tournament'}</strong>
              </div>
              <div className="info-row">
                <span className="info-lbl">Stage & Match</span>
                <strong>{match.stageName || match.stage || 'Knockout Fixture'}</strong>
              </div>
              <div className="info-row">
                <span className="info-lbl">Overs Limit</span>
                <strong>{match.oversLimit || 20} Overs per innings</strong>
              </div>
              <div className="info-row">
                <span className="info-lbl">Ball Type</span>
                <strong>{match.ballType || 'Leather Ball'}</strong>
              </div>
              {match.toss && (
                <div className="info-row">
                  <span className="info-lbl">Toss</span>
                  <strong>{match.toss.winnerTeamName} won the toss and elected to {match.toss.decision}</strong>
                </div>
              )}
            </div>

            {/* Stadium Google Map & Navigation block */}
            <div className="match-venue-directions-card">
              <div className="venue-card-header">
                <div>
                  <span className="kicker-gold">Matchday Venue</span>
                  <h4>{STADIUM_MAP.name}</h4>
                  <p className="venue-address-line">
                    <MapPin size={14} className="text-gold" />
                    <span>{STADIUM_MAP.venue}</span>
                  </p>
                </div>
                <span className="pitch-badge">Pitch #{match.pitchNumber || '1'}</span>
              </div>

              <div className="scorecard-embedded-map">
                <iframe
                  src={STADIUM_MAP.embedUrl}
                  title="KMT Cricket Stadium Vajralapuram Map"
                  width="100%"
                  height="220"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="venue-actions-row">
                <a
                  href={STADIUM_MAP.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gold btn-sm"
                >
                  <Navigation size={15} />
                  <span>Get Directions (GPS)</span>
                </a>
                <a
                  href={STADIUM_MAP.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <ExternalLink size={15} />
                  <span>Google Maps App</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 6. TAB 4: SQUADS / PLAYING XI */}
        {activeTab === 'squads' && (
          <div className="tab-pane-squads">
            <div className="squads-dual-grid">
              {/* Team 1 Squad */}
              <div className="team-squad-box">
                <div className="team-squad-head">
                  <h4>{match.team1?.name}</h4>
                  <span>Captain: {match.team1?.captainName || 'Captain'}</span>
                </div>
                <div className="squad-players-rows">
                  {(match.team1?.players || []).map((p, idx) => (
                    <button
                      key={p.id || idx}
                      type="button"
                      className="squad-player-item-btn"
                      onClick={() => setSelectedPlayerForStats({ ...p, teamName: match.team1?.name })}
                    >
                      <span className="p-num">{idx + 1}</span>
                      <div className="p-meta">
                        <strong>{p.name}</strong>
                        {p.jersey && <small>#{p.jersey}</small>}
                      </div>
                      <span className="p-role-tag">{p.role || 'Player'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Team 2 Squad */}
              <div className="team-squad-box">
                <div className="team-squad-head">
                  <h4>{match.team2?.name}</h4>
                  <span>Captain: {match.team2?.captainName || 'Captain'}</span>
                </div>
                <div className="squad-players-rows">
                  {(match.team2?.players || []).map((p, idx) => (
                    <button
                      key={p.id || idx}
                      type="button"
                      className="squad-player-item-btn"
                      onClick={() => setSelectedPlayerForStats({ ...p, teamName: match.team2?.name })}
                    >
                      <span className="p-num">{idx + 1}</span>
                      <div className="p-meta">
                        <strong>{p.name}</strong>
                        {p.jersey && <small>#{p.jersey}</small>}
                      </div>
                      <span className="p-role-tag">{p.role || 'Player'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Player Career Stats Profile Modal */}
      {selectedPlayerForStats && (
        <PlayerProfileModal
          player={selectedPlayerForStats}
          stats={selectedPlayerForStats}
          onClose={() => setSelectedPlayerForStats(null)}
        />
      )}
    </div>
  );
}

/**
 * Compact Live Match Widget for Home Page and Tournament Fixtures
 */
export function LiveMatchCard({ match }) {
  if (!match) return null;
  const isLive = match.status === 'live' || match.status === 'innings_break';
  const inn1 = match.innings?.[0];
  const inn2 = match.innings?.[1];

  return (
    <div className={`compact-live-match-card ${isLive ? 'is-live-pulse' : ''}`}>
      <div className="compact-card-top">
        <span className="compact-stage-tag">{match.stageName || match.stage || 'Match'}</span>
        {isLive ? (
          <span className="live-pill-pulsing">
            <span className="live-dot" /> LIVE
          </span>
        ) : (
          <span className="match-status-pill">{match.status}</span>
        )}
      </div>

      <div className="compact-teams-body">
        <div className="compact-team-line">
          <strong>{match.team1?.name}</strong>
          <span>{inn1 ? `${inn1.totalRuns}/${inn1.wickets} (${inn1.oversFormatted || '0.0'})` : '—'}</span>
        </div>
        <div className="compact-team-line">
          <strong>{match.team2?.name}</strong>
          <span>{inn2 ? `${inn2.totalRuns}/${inn2.wickets} (${inn2.oversFormatted || '0.0'})` : '—'}</span>
        </div>
      </div>

      {match.result?.summary && (
        <div className="compact-result-text">
          <span>{match.result.summary}</span>
        </div>
      )}

      <Link to={`/matches/${match.id}`} className="btn btn-xs btn-gold btn-block">
        <span>{isLive ? 'Watch Live Scorecard' : 'View Scorecard'}</span>
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  addMatch,
  deleteMatch,
  getMatch,
  listMatches,
  listTournaments,
  onMatchSnapshot,
  recordBallInMatch,
  saveMatch,
  undoLastBallInMatch,
} from '../store';
import { generateBallCommentary, WICKET_TYPES } from '../scoring';

export function AdminMatchScorer() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Active scorer state
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  // Modal states
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showTossModal, setShowTossModal] = useState(false);
  const [showEndInningsModal, setShowEndInningsModal] = useState(false);

  // Wicket form
  const [wicketData, setWicketData] = useState({
    type: 'caught',
    playerOutId: '',
    fielderName: '',
    nextBatterId: '',
  });

  // Toss form
  const [tossData, setTossData] = useState({
    winnerTeamId: '',
    decision: 'bat',
  });

  const refreshMatch = async () => {
    try {
      const data = await getMatch(matchId);
      setMatch(data);
      if (data) {
        initPlayersFromMatch(data);
      }
    } catch (err) {
      setError(err.message || 'Could not load match');
    } finally {
      setLoading(false);
    }
  };

  const initPlayersFromMatch = (data) => {
    const currIdx = data.currentInningsIndex ?? 0;
    const battingTeam = currIdx === 0 ? data.team1 : data.team2;
    const bowlingTeam = currIdx === 0 ? data.team2 : data.team1;
    const inn = data.innings?.[currIdx];
    const timeline = inn?.timeline || [];

    if (timeline.length > 0) {
      const last = timeline[timeline.length - 1];
      setStrikerId(last.strikerId || battingTeam?.players?.[0]?.id || '');
      setNonStrikerId(last.nonStrikerId || battingTeam?.players?.[1]?.id || '');
      setBowlerId(last.bowlerId || bowlingTeam?.players?.[0]?.id || '');
    } else {
      setStrikerId(battingTeam?.players?.[0]?.id || '');
      setNonStrikerId(battingTeam?.players?.[1]?.id || '');
      setBowlerId(bowlingTeam?.players?.[0]?.id || '');
    }
  };

  useEffect(() => {
    refreshMatch();
    const unsub = onMatchSnapshot(matchId, (liveData) => {
      setMatch(liveData);
    });
    return () => unsub?.();
  }, [matchId]);

  const currInningsIndex = match?.currentInningsIndex ?? 0;
  const battingTeam = currInningsIndex === 0 ? match?.team1 : match?.team2;
  const bowlingTeam = currInningsIndex === 0 ? match?.team2 : match?.team1;
  const currentInnings = match?.innings?.[currInningsIndex] || match?.innings?.[0];

  const handleRecordBall = async (runs = 0, extraType = 'none', extraRuns = 0) => {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError('Please select Striker, Non-Striker, and Bowler first.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const strikerObj = battingTeam?.players?.find((p) => (p.id ? p.id === strikerId : p.name === strikerId));
      const bowlerObj = bowlingTeam?.players?.find((p) => (p.id ? p.id === bowlerId : p.name === bowlerId));

      const legalBalls = currentInnings?.legalBalls || 0;
      const isLegal = extraType !== 'wide' && extraType !== 'noBall';

      const ballObj = {
        strikerId,
        strikerName: strikerObj?.name || strikerId,
        nonStrikerId,
        bowlerId,
        bowlerName: bowlerObj?.name || bowlerId,
        runs,
        extraType,
        extraRuns,
        isWicket: false,
        overIndex: Math.floor(legalBalls / 6),
        ballNumberInOver: (legalBalls % 6) + 1,
        timestamp: Date.now(),
      };

      ballObj.commentary = generateBallCommentary(ballObj, ballObj.strikerName, ballObj.bowlerName);
      await recordBallInMatch(matchId, ballObj);

      // Auto strike rotation on odd runs (1, 3, 5)
      const runsThatRotate = extraType === 'wide' || extraType === 'bye' || extraType === 'legBye' ? extraRuns : runs;
      if (runsThatRotate % 2 !== 0) {
        const temp = strikerId;
        setStrikerId(nonStrikerId);
        setNonStrikerId(temp);
      }

      // Check if over ended with this ball
      if (isLegal && (legalBalls + 1) % 6 === 0) {
        // Rotate strike at end of over
        const temp = strikerId;
        setStrikerId(nonStrikerId);
        setNonStrikerId(temp);
        setNotice('Over Completed! Rotate strike & select next bowler.');
        setTimeout(() => setNotice(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to record ball.');
    } finally {
      setBusy(false);
    }
  };

  const handleRecordWicket = async () => {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError('Please select current players first.');
      return;
    }

    const dismissedId = wicketData.playerOutId || strikerId;
    const isStrikerOut = dismissedId === strikerId;

    if (!wicketData.nextBatterId && (currentInnings?.wickets || 0) < 9) {
      setError('Please select the incoming batsman.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const strikerObj = battingTeam?.players?.find((p) => (p.id ? p.id === strikerId : p.name === strikerId));
      const bowlerObj = bowlingTeam?.players?.find((p) => (p.id ? p.id === bowlerId : p.name === bowlerId));
      const outBatterObj = battingTeam?.players?.find((p) => (p.id ? p.id === dismissedId : p.name === dismissedId));

      const legalBalls = currentInnings?.legalBalls || 0;
      const ballObj = {
        strikerId,
        strikerName: strikerObj?.name || strikerId,
        nonStrikerId,
        bowlerId,
        bowlerName: bowlerObj?.name || bowlerId,
        runs: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: true,
        wicket: {
          type: wicketData.type,
          playerOutId: dismissedId,
          playerOutName: outBatterObj?.name || dismissedId,
          fielderName: wicketData.fielderName.trim(),
          bowlerCredit: wicketData.type !== 'runOut' && wicketData.type !== 'retired',
        },
        overIndex: Math.floor(legalBalls / 6),
        ballNumberInOver: (legalBalls % 6) + 1,
        timestamp: Date.now(),
      };

      ballObj.commentary = generateBallCommentary(ballObj, outBatterObj?.name || strikerObj?.name, bowlerObj?.name, wicketData.fielderName);
      await recordBallInMatch(matchId, ballObj);

      // Replace dismissed batter with next batter
      if (isStrikerOut) {
        setStrikerId(wicketData.nextBatterId);
      } else {
        setNonStrikerId(wicketData.nextBatterId);
      }

      setShowWicketModal(false);
      setWicketData({
        type: 'caught',
        playerOutId: '',
        fielderName: '',
        nextBatterId: '',
      });
    } catch (err) {
      setError(err.message || 'Failed to record wicket.');
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!window.confirm('Undo the last ball recorded?')) return;
    setBusy(true);
    try {
      await undoLastBallInMatch(matchId);
      setNotice('Last ball undone.');
      setTimeout(() => setNotice(''), 2000);
    } catch (err) {
      setError(err.message || 'Failed to undo ball.');
    } finally {
      setBusy(false);
    }
  };

  const handleSetToss = async () => {
    if (!tossData.winnerTeamId) {
      setError('Select toss winner.');
      return;
    }
    setBusy(true);
    try {
      const winnerName = tossData.winnerTeamId === match.team1?.id ? match.team1?.name : match.team2?.name;
      // If team elected to bowl, swap innings order
      let team1 = match.team1;
      let team2 = match.team2;

      if (
        (tossData.winnerTeamId === match.team1?.id && tossData.decision === 'bowl') ||
        (tossData.winnerTeamId === match.team2?.id && tossData.decision === 'bat')
      ) {
        team1 = match.team2;
        team2 = match.team1;
      }

      await saveMatch({
        ...match,
        team1,
        team2,
        toss: {
          winnerTeamId: tossData.winnerTeamId,
          winnerTeamName: winnerName,
          decision: tossData.decision,
        },
        status: 'live',
        currentInningsIndex: 0,
      });
      setShowTossModal(false);
      refreshMatch();
    } catch (err) {
      setError(err.message || 'Failed to update toss.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-shell">
        <div className="state-card loading-state">
          <div className="spinner" />
          <p>Loading scoring console…</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="admin-page-shell">
        <div className="state-card error-state">
          <p>Match not found.</p>
          <Link to="/admin" className="btn btn-gold">
            Return to Admin
          </Link>
        </div>
      </div>
    );
  }

  const dismissedPlayerIds = new Set(
    (currentInnings?.battersList || []).filter((b) => b.isOut).map((b) => b.id)
  );
  const availableBatters = (battingTeam?.players || []).filter(
    (p) => !dismissedPlayerIds.has(p.id) && p.id !== strikerId && p.id !== nonStrikerId
  );

  return (
    <div className="scorer-mobile-container">
      {/* Handheld Top Header */}
      <header className="scorer-top-header">
        <button type="button" className="btn-icon" onClick={() => navigate('/admin')}>
          <ArrowLeft size={18} />
        </button>
        <div className="scorer-match-header-text">
          <span className="sc-stage-tag">{match.stageName || match.stage || 'Live Scorer'}</span>
          <span className="sc-teams-text">
            {match.team1?.name} vs {match.team2?.name}
          </span>
        </div>
        <Link to={`/matches/${matchId}`} target="_blank" className="btn-icon" title="Preview Public Scorecard">
          <ExternalLink size={18} />
        </Link>
      </header>

      {/* Live Match Scoreboard Tile */}
      <section className="scorer-scoreboard-tile">
        <div className="sc-scoreboard-top">
          <div>
            <span className="sc-batting-kicker">{battingTeam?.name} (Innings {currInningsIndex + 1})</span>
            <div className="sc-big-score">
              {currentInnings?.totalRuns || 0}
              <small>/{currentInnings?.wickets || 0}</small>
            </div>
          </div>
          <div className="sc-overs-box">
            <span className="sc-overs-num">{currentInnings?.oversFormatted || '0.0'} ov</span>
            <span className="sc-crr">CRR: {currentInnings?.currentRunRate || '0.00'}</span>
          </div>
        </div>

        {/* Target & Equations in 2nd Innings */}
        {currInningsIndex === 1 && match.innings?.[0] && (
          <div className="sc-target-strip">
            <span>
              Target: {match.innings[0].totalRuns + 1} • Need{' '}
              {Math.max(0, match.innings[0].totalRuns + 1 - (currentInnings?.totalRuns || 0))} runs in{' '}
              {Math.max(0, (match.oversLimit || 20) * 6 - (currentInnings?.legalBalls || 0))} balls
            </span>
          </div>
        )}

        {/* This Over Mini Balls */}
        <div className="sc-over-balls-row">
          <span>Over:</span>
          <div className="sc-balls-list">
            {(currentInnings?.currentOverBalls || []).map((b, idx) => (
              <span key={idx} className={`sc-ball-pill ${b.isWicket ? 'sc-ball-w' : ''}`}>
                {b.badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {error && <div className="alert alert-danger mx-3 my-2">{error}</div>}
      {notice && <div className="alert alert-warning mx-3 my-2">{notice}</div>}

      {/* Crease Active Players Controller (Striker, Non-Striker, Bowler) */}
      <section className="crease-controller-card">
        <div className="crease-player-row">
          <div className="crease-player-info">
            <span className="crease-lbl">Striker (*)</span>
            <select
              value={strikerId}
              onChange={(e) => setStrikerId(e.target.value)}
              className="select-crease-player"
            >
              <option value="">-- Select Striker --</option>
              {(battingTeam?.players || []).map((p) => (
                <option key={p.id || p.name} value={p.id || p.name}>
                  {p.name} {p.jersey ? `(#${p.jersey})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-swap-strike"
            onClick={() => {
              const temp = strikerId;
              setStrikerId(nonStrikerId);
              setNonStrikerId(temp);
            }}
            title="Swap Striker & Non-Striker"
          >
            ⇄ Swap
          </button>

          <div className="crease-player-info">
            <span className="crease-lbl">Non-Striker</span>
            <select
              value={nonStrikerId}
              onChange={(e) => setNonStrikerId(e.target.value)}
              className="select-crease-player"
            >
              <option value="">-- Select Non-Striker --</option>
              {(battingTeam?.players || []).map((p) => (
                <option key={p.id || p.name} value={p.id || p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="crease-bowler-row">
          <span className="crease-lbl">Current Bowler</span>
          <select
            value={bowlerId}
            onChange={(e) => setBowlerId(e.target.value)}
            className="select-crease-bowler"
          >
            <option value="">-- Select Current Bowler --</option>
            {(bowlingTeam?.players || []).map((p) => (
              <option key={p.id || p.name} value={p.id || p.name}>
                {p.name} ({p.bowlingStyle || 'Bowler'})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 1-Tap Scorepad Keypad (Optimized for Mobile Handheld) */}
      <section className="scorer-keypad-section">
        {/* Runs Buttons */}
        <div className="keypad-runs-grid">
          <button
            type="button"
            className="key-btn key-dot"
            onClick={() => handleRecordBall(0)}
            disabled={busy}
          >
            0
          </button>
          <button
            type="button"
            className="key-btn key-run"
            onClick={() => handleRecordBall(1)}
            disabled={busy}
          >
            1
          </button>
          <button
            type="button"
            className="key-btn key-run"
            onClick={() => handleRecordBall(2)}
            disabled={busy}
          >
            2
          </button>
          <button
            type="button"
            className="key-btn key-run"
            onClick={() => handleRecordBall(3)}
            disabled={busy}
          >
            3
          </button>
          <button
            type="button"
            className="key-btn key-four"
            onClick={() => handleRecordBall(4)}
            disabled={busy}
          >
            4
          </button>
          <button
            type="button"
            className="key-btn key-six"
            onClick={() => handleRecordBall(6)}
            disabled={busy}
          >
            6
          </button>
        </div>

        {/* Extras & Wicket Action Buttons */}
        <div className="keypad-extras-grid">
          <button
            type="button"
            className="key-btn key-extra"
            onClick={() => handleRecordBall(0, 'wide', 0)}
            disabled={busy}
          >
            Wide (+1)
          </button>
          <button
            type="button"
            className="key-btn key-extra"
            onClick={() => handleRecordBall(0, 'noBall', 0)}
            disabled={busy}
          >
            No Ball (+1)
          </button>
          <button
            type="button"
            className="key-btn key-extra"
            onClick={() => handleRecordBall(1, 'bye', 0)}
            disabled={busy}
          >
            1 Bye
          </button>
          <button
            type="button"
            className="key-btn key-extra"
            onClick={() => handleRecordBall(1, 'legBye', 0)}
            disabled={busy}
          >
            1 Leg Bye
          </button>
        </div>

        {/* Big WICKET & UNDO Row */}
        <div className="keypad-wicket-undo-row">
          <button
            type="button"
            className="key-btn key-wicket"
            onClick={() => {
              setWicketData({
                type: 'caught',
                playerOutId: strikerId,
                fielderName: '',
                nextBatterId: availableBatters[0]?.id || '',
              });
              setShowWicketModal(true);
            }}
            disabled={busy}
          >
            OUT / WICKET
          </button>
          <button
            type="button"
            className="key-btn key-undo"
            onClick={handleUndo}
            disabled={busy || !currentInnings?.timeline?.length}
          >
            <RotateCcw size={16} />
            <span>Undo Ball</span>
          </button>
        </div>
      </section>

      {/* Auxiliary Match Management Buttons */}
      <footer className="scorer-aux-actions">
        {!match.toss && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowTossModal(true)}>
            Record Toss
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            const nextIdx = currInningsIndex === 0 ? 1 : 0;
            saveMatch({
              ...match,
              currentInningsIndex: nextIdx,
              status: nextIdx === 1 ? 'innings_break' : 'live',
            }).then(refreshMatch);
          }}
        >
          {currInningsIndex === 0 ? 'End 1st Innings' : 'Switch To 1st Innings'}
        </button>
      </footer>

      {/* Wicket Modal */}
      {showWicketModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog-card">
            <div className="modal-head">
              <h3>Record Wicket / Dismissal</h3>
              <button type="button" className="btn-close" onClick={() => setShowWicketModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-form-content">
              <label className="input-field">
                <span>Dismissal Type</span>
                <select
                  value={wicketData.type}
                  onChange={(e) => setWicketData({ ...wicketData, type: e.target.value })}
                >
                  {WICKET_TYPES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="input-field">
                <span>Who is OUT?</span>
                <select
                  value={wicketData.playerOutId}
                  onChange={(e) => setWicketData({ ...wicketData, playerOutId: e.target.value })}
                >
                  <option value={strikerId}>Striker: {battingTeam?.players?.find((p) => p.id === strikerId)?.name || strikerId}</option>
                  <option value={nonStrikerId}>Non-Striker: {battingTeam?.players?.find((p) => p.id === nonStrikerId)?.name || nonStrikerId}</option>
                </select>
              </label>

              {(wicketData.type === 'caught' || wicketData.type === 'runOut' || wicketData.type === 'stumped') && (
                <label className="input-field">
                  <span>Fielder / Wicketkeeper Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Karthik / Sub"
                    value={wicketData.fielderName}
                    onChange={(e) => setWicketData({ ...wicketData, fielderName: e.target.value })}
                  />
                </label>
              )}

              {(currentInnings?.wickets || 0) < 9 && (
                <label className="input-field">
                  <span>Next Incoming Batter</span>
                  <select
                    value={wicketData.nextBatterId}
                    onChange={(e) => setWicketData({ ...wicketData, nextBatterId: e.target.value })}
                  >
                    <option value="">-- Choose Next Batter --</option>
                    {availableBatters.map((p) => (
                      <option key={p.id || p.name} value={p.id || p.name}>
                        {p.name} {p.role ? `(${p.role})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="modal-actions-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowWicketModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-gold" onClick={handleRecordWicket} disabled={busy}>
                  Confirm Wicket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toss Modal */}
      {showTossModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog-card">
            <div className="modal-head">
              <h3>Record Match Toss</h3>
              <button type="button" className="btn-close" onClick={() => setShowTossModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-form-content">
              <label className="input-field">
                <span>Toss Winner</span>
                <select
                  value={tossData.winnerTeamId}
                  onChange={(e) => setTossData({ ...tossData, winnerTeamId: e.target.value })}
                >
                  <option value="">-- Select Winner --</option>
                  <option value={match.team1?.id}>{match.team1?.name}</option>
                  <option value={match.team2?.id}>{match.team2?.name}</option>
                </select>
              </label>

              <label className="input-field">
                <span>Elected To</span>
                <select
                  value={tossData.decision}
                  onChange={(e) => setTossData({ ...tossData, decision: e.target.value })}
                >
                  <option value="bat">Bat First</option>
                  <option value="bowl">Bowl First</option>
                </select>
              </label>

              <div className="modal-actions-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowTossModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-gold" onClick={handleSetToss} disabled={busy}>
                  Save Toss & Start Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Admin Match Manager & Fixture Creator
 */
export function AdminMatchesManager({ tournament: initialTournament, registrations: initialRegistrations = [] }) {
  const [tournamentsList, setTournamentsList] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(initialTournament?.id || '');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listTournaments(true).then((list) => {
      setTournamentsList(list);
      if (!selectedTournamentId && list.length > 0) {
        setSelectedTournamentId(list[0].id);
      }
    });
  }, []);

  const activeTournament = initialTournament || tournamentsList.find((t) => t.id === selectedTournamentId) || tournamentsList[0];

  const [form, setForm] = useState({
    tournamentId: activeTournament?.id || '',
    stage: 'quarter_final',
    stageName: 'Quarter-Final 1',
    matchNumber: '1',
    scheduledTime: '',
    pitchNumber: '1',
    oversLimit: activeTournament?.format === 'T10' ? 10 : 20,
    team1Id: '',
    team2Id: '',
  });

  const loadMatches = async () => {
    setLoading(true);
    try {
      const list = await listMatches(activeTournament?.id || null);
      setMatches(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTournament?.id) {
      setForm((curr) => ({
        ...curr,
        tournamentId: activeTournament.id,
        oversLimit: activeTournament.format === 'T10' ? 10 : 20,
      }));
      loadMatches();
    }
  }, [activeTournament?.id]);

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!form.team1Id || !form.team2Id) {
      setError('Select Team 1 and Team 2.');
      return;
    }
    if (form.team1Id === form.team2Id) {
      setError('Team 1 and Team 2 must be different.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const regList = initialRegistrations.length > 0 ? initialRegistrations : [];
      const reg1 = regList.find((r) => r.id === form.team1Id || r.teamName === form.team1Id);
      const reg2 = regList.find((r) => r.id === form.team2Id || r.teamName === form.team2Id);

      const newMatch = {
        tournamentId: activeTournament?.id || '',
        tournamentTitle: activeTournament?.title || 'Cricket Tournament',
        stage: form.stage,
        stageName: form.stageName,
        matchNumber: form.matchNumber,
        scheduledTime: form.scheduledTime,
        pitchNumber: form.pitchNumber,
        oversLimit: Number(form.oversLimit || 20),
        status: 'scheduled',
        team1: {
          id: reg1?.id || form.team1Id,
          name: reg1?.teamName || form.team1Id,
          captainName: reg1?.captainName || 'Captain',
          players: reg1?.players || [],
        },
        team2: {
          id: reg2?.id || form.team2Id,
          name: reg2?.teamName || form.team2Id,
          captainName: reg2?.captainName || 'Captain',
          players: reg2?.players || [],
        },
        innings: [],
        currentInningsIndex: 0,
        result: null,
      };

      await addMatch(newMatch);
      setShowModal(false);
      loadMatches();
    } catch (err) {
      setError(err.message || 'Could not create match.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMatch = async (mId) => {
    if (!window.confirm('Delete this match and all its scorecard records?')) return;
    try {
      await deleteMatch(mId);
      loadMatches();
    } catch (err) {
      alert(err.message || 'Could not delete match.');
    }
  };

  return (
    <div className="admin-matches-manager">
      <div className="matches-head-row">
        <div>
          <span className="kicker-tag">Live Scoring & Match Desk</span>
          <h3>Fixtures & Live Scorecards ({matches.length})</h3>
          <p className="matches-subtitle">
            Schedule knockout fixtures, manage pitches, and launch the handheld mobile scorer console.
          </p>
        </div>
        <div className="matches-header-actions">
          {tournamentsList.length > 1 && (
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="select-tourn-filter"
            >
              {tournamentsList.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn-gold btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Schedule New Match</span>
          </button>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="empty-matches-card">
          <Calendar size={36} className="text-gold" />
          <h4>No Matches Scheduled Yet</h4>
          <p>Schedule your tournament matches using confirmed team registrations.</p>
          <button type="button" className="btn btn-gold" onClick={() => setShowModal(true)}>
            Schedule First Match
          </button>
        </div>
      ) : (
        <div className="admin-matches-grid">
          {matches.map((m) => (
            <div key={m.id} className="admin-match-card">
              <div className="admin-match-top">
                <span className="sc-stage-tag">{m.stageName || m.stage}</span>
                <span className={`status-pill status-${m.status}`}>{m.status}</span>
              </div>
              <div className="admin-match-teams">
                <strong>{m.team1?.name}</strong>
                <span>vs</span>
                <strong>{m.team2?.name}</strong>
              </div>
              <div className="admin-match-details">
                <span>Pitch #{m.pitchNumber || 1} • {m.oversLimit || 20} Overs</span>
                {m.scheduledTime && <span> • {m.scheduledTime}</span>}
              </div>

              {m.result?.summary && (
                <div className="admin-match-res">
                  <Trophy size={14} className="text-gold" />
                  <span>{m.result.summary}</span>
                </div>
              )}

              <div className="admin-match-actions">
                <Link to={`/admin/matches/${m.id}/scorer`} className="btn btn-sm btn-gold">
                  <Play size={14} />
                  <span>Open Scorer Console</span>
                </Link>
                <Link to={`/matches/${m.id}`} className="btn btn-sm btn-outline">
                  <span>View Public Scorecard</span>
                </Link>
                <button
                  type="button"
                  className="btn-icon text-red"
                  onClick={() => handleDeleteMatch(m.id)}
                  title="Delete Match"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Match Modal */}
      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog-card modal-lg">
            <div className="modal-head">
              <h3>Schedule New Tournament Match</h3>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="modal-form-content">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="form-grid-2">
                <label className="input-field">
                  <span>Stage / Knockout Round</span>
                  <select
                    value={form.stage}
                    onChange={(e) => {
                      const s = e.target.value;
                      const labels = {
                        round_of_16: 'Round of 16',
                        quarter_final: 'Quarter-Final',
                        semi_final: 'Semi-Final',
                        final: 'Championship Final',
                        group: 'Group Match',
                      };
                      setForm({ ...form, stage: s, stageName: labels[s] || s });
                    }}
                  >
                    <option value="group">Group / League Stage</option>
                    <option value="round_of_16">Round of 16</option>
                    <option value="quarter_final">Quarter-Final</option>
                    <option value="semi_final">Semi-Final</option>
                    <option value="final">Championship Final</option>
                  </select>
                </label>

                <label className="input-field">
                  <span>Match Name / Label</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quarter-Final 1"
                    value={form.stageName}
                    onChange={(e) => setForm({ ...form, stageName: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-grid-2">
                <label className="input-field">
                  <span>Team 1 (Batting/Bowling) *</span>
                  <select
                    required
                    value={form.team1Id}
                    onChange={(e) => setForm({ ...form, team1Id: e.target.value })}
                  >
                    <option value="">-- Choose Team 1 --</option>
                    {registrations.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.teamName} (Capt: {r.captainName})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="input-field">
                  <span>Team 2 (Opponent) *</span>
                  <select
                    required
                    value={form.team2Id}
                    onChange={(e) => setForm({ ...form, team2Id: e.target.value })}
                  >
                    <option value="">-- Choose Team 2 --</option>
                    {registrations.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.teamName} (Capt: {r.captainName})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid-3">
                <label className="input-field">
                  <span>Overs Limit</span>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={form.oversLimit}
                    onChange={(e) => setForm({ ...form, oversLimit: e.target.value })}
                  />
                </label>
                <label className="input-field">
                  <span>Pitch Number</span>
                  <input
                    type="text"
                    placeholder="e.g. Pitch 1 (Main Turf)"
                    value={form.pitchNumber}
                    onChange={(e) => setForm({ ...form, pitchNumber: e.target.value })}
                  />
                </label>
                <label className="input-field">
                  <span>Match Date & Time</span>
                  <input
                    type="text"
                    placeholder="e.g. Sun, Oct 26 • 3:30 PM"
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                  />
                </label>
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" disabled={busy}>
                  {busy ? 'Creating Fixture…' : 'Create & Schedule Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

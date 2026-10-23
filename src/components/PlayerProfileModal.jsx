import React from 'react';
import { Award, Shield, Target, User, X, Zap } from 'lucide-react';

export function PlayerProfileModal({ player, stats, onClose }) {
  if (!player && !stats) return null;

  const name = player?.name || stats?.name || 'Player';
  const role = player?.role || 'All-Rounder';
  const jersey = player?.jersey ? `#${player.jersey}` : '';
  const battingStyle = player?.battingStyle || 'Right-hand bat';
  const bowlingStyle = player?.bowlingStyle || 'Right-arm medium';
  const teamName = player?.teamName || stats?.teamName || 'KMT Squad';

  const b = stats?.batting || {
    innings: 0,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    fifties: 0,
    hundreds: 0,
    highestScore: 0,
    average: '0.00',
    strikeRate: '0.00',
  };

  const bw = stats?.bowling || {
    innings: 0,
    overs: '0.0',
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    bestBowlingFigures: '—',
    economy: '0.00',
    average: '—',
  };

  const f = stats?.fielding || { catches: 0, runOuts: 0, stumpings: 0 };
  const matchesPlayed = stats?.matchesPlayed || 0;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="player-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="player-modal-header">
          <div className="player-avatar-circle">
            <User size={32} />
          </div>
          <div className="player-modal-meta">
            <div className="player-modal-topline">
              <span className="player-team-tag">{teamName}</span>
              {jersey && <span className="player-jersey-tag">{jersey}</span>}
            </div>
            <h3 className="player-modal-name">{name}</h3>
            <p className="player-modal-roles">
              <span>{role}</span> • <span>{battingStyle}</span> • <span>{bowlingStyle}</span>
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="player-stats-scroller">
          {/* Matches & Highlights Pill Row */}
          <div className="player-overview-grid">
            <div className="overview-stat-pill">
              <span className="pill-val">{matchesPlayed}</span>
              <span className="pill-lbl">Matches</span>
            </div>
            <div className="overview-stat-pill">
              <span className="pill-val">{b.runs}</span>
              <span className="pill-lbl">Runs</span>
            </div>
            <div className="overview-stat-pill">
              <span className="pill-val">{bw.wickets}</span>
              <span className="pill-lbl">Wickets</span>
            </div>
            <div className="overview-stat-pill">
              <span className="pill-val">{f.catches + f.stumpings}</span>
              <span className="pill-lbl">Dismissals</span>
            </div>
          </div>

          {/* Batting Career Section */}
          <div className="stat-card-block">
            <div className="stat-block-head">
              <Zap size={16} className="text-gold" />
              <h4>Batting Statistics</h4>
            </div>
            <div className="stats-data-grid">
              <div className="stat-cell">
                <span className="cell-lbl">Innings</span>
                <strong className="cell-val">{b.innings}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Runs</span>
                <strong className="cell-val text-gold">{b.runs}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Balls</span>
                <strong className="cell-val">{b.balls}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Strike Rate</span>
                <strong className="cell-val">{b.strikeRate}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Average</span>
                <strong className="cell-val">{b.average}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Highest Score</span>
                <strong className="cell-val">{b.highestScore}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Fours (4s)</span>
                <strong className="cell-val">{b.fours}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Sixes (6s)</span>
                <strong className="cell-val text-green">{b.sixes}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">50s / 100s</span>
                <strong className="cell-val">{b.fifties} / {b.hundreds}</strong>
              </div>
            </div>
          </div>

          {/* Bowling Career Section */}
          <div className="stat-card-block">
            <div className="stat-block-head">
              <Target size={16} className="text-primary-light" />
              <h4>Bowling Statistics</h4>
            </div>
            <div className="stats-data-grid">
              <div className="stat-cell">
                <span className="cell-lbl">Innings</span>
                <strong className="cell-val">{bw.innings}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Overs</span>
                <strong className="cell-val">{bw.overs}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Maidens</span>
                <strong className="cell-val">{bw.maidens}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Runs Conceded</span>
                <strong className="cell-val">{bw.runsConceded}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Wickets</span>
                <strong className="cell-val text-gold">{bw.wickets}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Economy</span>
                <strong className="cell-val">{bw.economy}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Average</span>
                <strong className="cell-val">{bw.average}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Best Bowling</span>
                <strong className="cell-val text-green">{bw.bestBowlingFigures}</strong>
              </div>
            </div>
          </div>

          {/* Fielding Section */}
          <div className="stat-card-block">
            <div className="stat-block-head">
              <Shield size={16} className="text-muted" />
              <h4>Fielding Records</h4>
            </div>
            <div className="stats-data-grid stats-data-grid--3">
              <div className="stat-cell">
                <span className="cell-lbl">Catches</span>
                <strong className="cell-val">{f.catches}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Run Outs</span>
                <strong className="cell-val">{f.runOuts}</strong>
              </div>
              <div className="stat-cell">
                <span className="cell-lbl">Stumpings</span>
                <strong className="cell-val">{f.stumpings}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="player-modal-footer">
          <button type="button" className="btn btn-outline btn-block" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}

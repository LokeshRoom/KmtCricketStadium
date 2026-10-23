import React, { useState } from 'react';
import { Check, Edit2, Plus, Shield, Trash2, User, Users, X, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { createTeam, deleteTeam, saveTeam } from '../store';

export const PLAYER_ROLES = [
  'Batsman',
  'Bowler',
  'All-Rounder',
  'Wicketkeeper Batsman',
];

export const BATTING_STYLES = [
  'Right-hand bat',
  'Left-hand bat',
];

export const BOWLING_STYLES = [
  'Right-arm fast',
  'Right-arm medium',
  'Right-arm off-spin',
  'Right-arm leg-spin',
  'Left-arm fast',
  'Left-arm orthodox',
  'Left-arm wrist-spin',
  'None / Occasional',
];

export function UserTeamsManager({
  user,
  currentUser,
  teams = [],
  onRefresh,
  onRefreshTeams,
  onSelectPlayerForStats,
  onSelectPlayerStats,
}) {
  const activeUser = user || currentUser;
  const doRefresh = onRefresh || onRefreshTeams;
  const doSelectStats = onSelectPlayerForStats || onSelectPlayerStats;

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    teamName: '',
    shortCode: '',
    captainName: '',
    phone: '',
    players: [],
  });

  const [newPlayer, setNewPlayer] = useState({
    name: '',
    jersey: '',
    role: 'All-Rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm medium',
    phone: '',
  });

  const openNewTeamModal = () => {
    setEditingTeam(null);
    setForm({
      teamName: '',
      shortCode: '',
      captainName: user?.displayName || '',
      phone: '',
      players: [],
    });
    setError('');
    setShowModal(true);
  };

  const openEditTeamModal = (team) => {
    setEditingTeam(team);
    setForm({
      id: team.id,
      teamName: team.teamName || '',
      shortCode: team.shortCode || '',
      captainName: team.captainName || '',
      phone: team.phone || '',
      players: team.players || [],
    });
    setError('');
    setShowModal(true);
  };

  const handleAddPlayer = () => {
    if (!newPlayer.name.trim() || newPlayer.name.trim().length < 2) {
      setError('Player name must be at least 2 characters.');
      return;
    }
    const playerObj = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newPlayer.name.trim(),
      jersey: newPlayer.jersey.trim(),
      role: newPlayer.role,
      battingStyle: newPlayer.battingStyle,
      bowlingStyle: newPlayer.bowlingStyle,
      phone: newPlayer.phone.trim(),
    };
    setForm((curr) => ({
      ...curr,
      players: [...curr.players, playerObj],
    }));
    setNewPlayer({
      name: '',
      jersey: '',
      role: 'All-Rounder',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm medium',
      phone: '',
    });
    setError('');
  };

  const handleRemovePlayer = (idx) => {
    setForm((curr) => ({
      ...curr,
      players: curr.players.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!form.teamName.trim()) {
      setError('Enter team name.');
      return;
    }
    if (!form.captainName.trim()) {
      setError('Enter captain name.');
      return;
    }
    if (form.players.length === 0) {
      setError('Add at least 1 player to your team squad.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (editingTeam) {
        await saveTeam({
          ...editingTeam,
          ...form,
        });
      } else {
        await createTeam({
          ...form,
        });
      }
      setShowModal(false);
      doRefresh?.();
    } catch (err) {
      setError(err.message || 'Failed to save team.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team squad?')) return;
    try {
      await deleteTeam(teamId);
      doRefresh?.();
    } catch (err) {
      alert(err.message || 'Could not delete team.');
    }
  };

  return (
    <div className="user-teams-section">
      <div className="teams-header-row">
        <div>
          <span className="kicker-tag">My Cricket Teams</span>
          <h3>Saved Squad Rosters ({teams.length})</h3>
          <p className="teams-subtitle">
            Manage your team players, jerseys, and roles. When registering for tournaments, select your team to pre-fill players instantly!
          </p>
        </div>
        <button type="button" className="btn btn-gold btn-sm" onClick={openNewTeamModal}>
          <Plus size={16} />
          <span>Create New Team</span>
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="empty-teams-box">
          <div className="empty-teams-icon">
            <Users size={36} />
          </div>
          <h4>No Squads Created Yet</h4>
          <p>
            Create your team roster once with player names, jersey numbers, and bowling/batting roles.
            You can then register for tournaments in 1-tap without retyping players!
          </p>
          <button type="button" className="btn btn-gold" onClick={openNewTeamModal}>
            <Plus size={16} />
            <span>Create Your First Team</span>
          </button>
        </div>
      ) : (
        <div className="teams-cards-grid">
          {teams.map((team) => (
            <div key={team.id} className="team-squad-card">
              <div className="team-card-head">
                <div className="team-badge-circle">
                  <span>{(team.shortCode || team.teamName.slice(0, 2)).toUpperCase()}</span>
                </div>
                <div className="team-head-details">
                  <h4 className="team-title">{team.teamName}</h4>
                  <p className="team-meta-line">
                    <span>Captain: <strong>{team.captainName}</strong></span>
                    {team.phone && <span> • {team.phone}</span>}
                  </p>
                </div>
                <div className="team-actions-btn-group">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => openEditTeamModal(team)}
                    title="Edit Team & Squad"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon text-red"
                    onClick={() => handleDeleteTeam(team.id)}
                    title="Delete Team"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="team-squad-summary">
                <div className="squad-count-bar">
                  <span>Squad Players ({team.players?.length || 0})</span>
                  <span className="squad-subtext">Tap any player to view career stats</span>
                </div>
                <div className="squad-players-chips">
                  {(team.players || []).map((p, idx) => (
                    <button
                      key={p.id || idx}
                      type="button"
                      className="squad-chip-btn"
                      onClick={() => doSelectStats?.(p, team.teamName)}
                    >
                      <User size={12} className="text-gold" />
                      <strong>{p.name}</strong>
                      {p.jersey && <small className="chip-jersey">#{p.jersey}</small>}
                      <small className="chip-role">({p.role || 'Player'})</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Create/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog-card modal-lg">
            <div className="modal-head">
              <h3>{editingTeam ? 'Edit Team & Squad Roster' : 'Create New Team Squad'}</h3>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="modal-form-content">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="form-grid-2">
                <label className="input-field">
                  <span>Team Name *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vajrala Warriors"
                    value={form.teamName}
                    onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                  />
                </label>
                <label className="input-field">
                  <span>Short Code (Abbreviation)</span>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. VW"
                    value={form.shortCode}
                    onChange={(e) => setForm({ ...form, shortCode: e.target.value.toUpperCase() })}
                  />
                </label>
              </div>

              <div className="form-grid-2">
                <label className="input-field">
                  <span>Captain Name *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lokesh K"
                    value={form.captainName}
                    onChange={(e) => setForm({ ...form, captainName: e.target.value })}
                  />
                </label>
                <label className="input-field">
                  <span>Contact Phone</span>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </label>
              </div>

              {/* Player Builder */}
              <div className="squad-builder-box">
                <div className="squad-builder-head">
                  <h4>Squad Players ({form.players.length})</h4>
                  <span className="helper-note">Add your XI and reserve players</span>
                </div>

                <div className="add-player-row">
                  <input
                    type="text"
                    placeholder="Player Name"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                    className="input-player-name"
                  />
                  <input
                    type="text"
                    placeholder="Jersey #"
                    value={newPlayer.jersey}
                    onChange={(e) => setNewPlayer({ ...newPlayer, jersey: e.target.value })}
                    className="input-player-jersey"
                  />
                  <select
                    value={newPlayer.role}
                    onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                    className="select-player-role"
                  >
                    {PLAYER_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <select
                    value={newPlayer.battingStyle}
                    onChange={(e) => setNewPlayer({ ...newPlayer, battingStyle: e.target.value })}
                    className="select-player-bat"
                  >
                    {BATTING_STYLES.map((bs) => (
                      <option key={bs} value={bs}>{bs}</option>
                    ))}
                  </select>
                  <select
                    value={newPlayer.bowlingStyle}
                    onChange={(e) => setNewPlayer({ ...newPlayer, bowlingStyle: e.target.value })}
                    className="select-player-bowl"
                  >
                    {BOWLING_STYLES.map((bw) => (
                      <option key={bw} value={bw}>{bw}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-gold btn-sm" onClick={handleAddPlayer}>
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Squad List */}
                <div className="squad-list-table">
                  {form.players.length === 0 ? (
                    <div className="squad-empty-hint">No players added yet. Enter player name and click Add.</div>
                  ) : (
                    form.players.map((p, idx) => (
                      <div key={p.id || idx} className="squad-list-row">
                        <span className="row-num">{idx + 1}</span>
                        <div className="row-name-block">
                          <strong>{p.name}</strong>
                          {p.jersey && <span className="row-jersey">#{p.jersey}</span>}
                        </div>
                        <span className="row-pill">{p.role}</span>
                        <span className="row-style">{p.battingStyle} • {p.bowlingStyle}</span>
                        <button
                          type="button"
                          className="btn-row-del"
                          onClick={() => handleRemovePlayer(idx)}
                          aria-label="Remove player"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" disabled={busy}>
                  {busy ? 'Saving Team…' : editingTeam ? 'Update Team' : 'Save New Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Dropdown and Multi-Select component inside RegistrationForm
 * Allows captains to pick from their saved teams and toggle squad players with checkboxes!
 */
export function SavedTeamSelector({
  teams = [],
  onSelectTeam,
  selectedTeamId,
  selectedPlayers = [],
  onTogglePlayer,
  onSelectAllPlayers,
  onDeselectAllPlayers,
}) {
  if (!teams || teams.length === 0) return null;

  return (
    <div className="saved-team-picker-card">
      <div className="picker-head">
        <Users size={16} className="text-gold" />
        <div>
          <strong>Auto-Fill From Saved Teams</strong>
          <p>Choose an existing team squad to populate details and players in 1 tap:</p>
        </div>
      </div>

      <div className="picker-selector-row">
        <select
          value={selectedTeamId || ''}
          onChange={(e) => onSelectTeam(e.target.value)}
          className="select-saved-team"
        >
          <option value="">-- Choose From My Saved Teams --</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.teamName} ({t.players?.length || 0} players)
            </option>
          ))}
        </select>
      </div>

      {selectedTeamId && (
        <div className="squad-checkboxes-panel">
          <div className="checkboxes-header">
            <span>Select Players For This Tournament:</span>
            <div className="check-actions-btns">
              <button type="button" className="btn-link" onClick={onSelectAllPlayers}>
                Select All
              </button>
              <span>•</span>
              <button type="button" className="btn-link" onClick={onDeselectAllPlayers}>
                Clear
              </button>
            </div>
          </div>

          <div className="checkboxes-grid">
            {(teams.find((t) => t.id === selectedTeamId)?.players || []).map((player) => {
              const isChecked = selectedPlayers.some((p) => (p.id ? p.id === player.id : p.name === player.name));
              return (
                <label key={player.id || player.name} className={`player-check-label ${isChecked ? 'is-checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onTogglePlayer(player)}
                  />
                  <div className="player-check-info">
                    <strong>{player.name}</strong>
                    {player.jersey && <small>#{player.jersey}</small>}
                    <span className="role-mini-tag">{player.role || 'Player'}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

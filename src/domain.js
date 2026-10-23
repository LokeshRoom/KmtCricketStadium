export const FORMATS = ['T10', 'T20', 'ODI', 'Box Cricket', 'Others'];
export const STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED'];

export function validateRoster(players) {
  return Array.isArray(players) && players.length >= 1 && players.length <= 40 &&
    players.every((player) => typeof player.name === 'string' && player.name.trim().length >= 2 && player.name.trim().length <= 80);
}

export function validateRegistration(tournament, registration) {
  const errors = {};
  if (!registration.teamName?.trim() || registration.teamName.trim().length > 80) errors.teamName = 'Enter a team name (80 characters maximum).';
  if (!registration.captainName?.trim() || registration.captainName.trim().length > 80) errors.captainName = 'Enter the captain’s name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.email || '')) errors.email = 'Enter a valid email address.';
  if (!/^[+\d\s()-]{7,24}$/.test(registration.phone || '')) errors.phone = 'Enter a valid phone number.';
  if (!validateRoster(registration.players)) errors.players = 'Add 1–40 players. Every player needs a name of at least 2 characters.';
  if (registration.acceptedTerms !== true) errors.acceptedTerms = 'Accept the tournament terms to continue.';
  if (registration.paymentMethod === 'upi' && (registration.reference || '').trim().length < 6) errors.reference = 'Enter the UTR or bank reference (at least 6 characters).';
  if (tournament?.deadline && new Date(tournament.deadline).getTime() < Date.now()) errors.deadline = 'Registration has closed.';
  for (const field of tournament?.formFields || []) {
    if (field.required && field.type !== 'checkbox' && !String(registration.customAnswers?.[field.id] ?? '').trim()) errors[field.id] = `${field.label} is required.`;
    if (field.required && field.type === 'checkbox' && registration.customAnswers?.[field.id] !== true) errors[field.id] = `${field.label} is required.`;
  }
  return errors;
}

export function toCsv(rows) {
  const columns = ['teamName', 'captainName', 'email', 'phone', 'players', 'paymentMethod', 'reference', 'status', 'adminNote'];
  const value = (input) => {
    const text = String(input ?? '').replace(/[\r\n]+/g, ' ');
    const safe = /^[=+\-@\t]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [columns.map(value).join(','), ...rows.map((row) => columns.map((key) => value(key === 'players' ? (row.players || []).map((player) => player.name).join('; ') : row[key])).join(','))].join('\r\n');
}

export function campaignUrl(tournamentId, source, campaign, origin = window.location.origin) {
  const url = new URL(`/t/${encodeURIComponent(tournamentId)}`, origin);
  if (source) url.searchParams.set('utm_source', source);
  if (campaign) url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}

export function safeReturnPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/user/dashboard';
}

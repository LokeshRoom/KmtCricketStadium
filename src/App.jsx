import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleHelp, Copy, Download, ExternalLink, LogOut, Menu, Plus, Search, ShieldCheck, SlidersHorizontal, TicketCheck, X } from 'lucide-react';
import QRCode from 'qrcode';
import Markdown from 'react-markdown';
import { useAuth } from './AuthContext';
import { addTournament, createRegistration, listRegistrations, listTournaments, onDataChange, reviewRegistration, saveTournament } from './store';
import { FORMATS, campaignUrl, safeReturnPath, toCsv, validateRegistration } from './domain';

const money = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount || 0));
const dateLabel = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => value ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...options }).format(new Date(value)) : 'Date to be announced';
const dateTimeValue = (value) => { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const dateIso = (value) => value ? new Date(value).toISOString() : '';
const ballTypes = ['Leather Ball', 'Tennis Ball'];

function CricketPhoto({ crop, alt, className = '' }) {
  return <div className={`photo-crop crop-${crop} ${className}`} role="img" aria-label={alt}><img src="/images/cricket-contact-sheet.png" alt="" /></div>;
}

function BrandMark({ light = false }) {
  return <Link className={`brand-mark ${light ? 'brand-mark--light' : ''}`} to="/" aria-label="KMT Cricket Stadium home">
    <span className="wicket-mark" aria-hidden="true"><i /><i /><i /><b /></span>
    <span>KMT <em>CRICKET STADIUM</em></span>
  </Link>;
}

function PublicHeader() {
  return <header className="public-header wrap"><BrandMark /><nav aria-label="Main navigation"><Link to="/tournaments">Tournaments</Link><Link to="/status">My entry</Link><Link className="nav-action" to="/auth">Sign in <ArrowUpRight size={16} /></Link></nav></header>;
}

function PublicFooter() {
  return <footer className="public-footer"><div className="wrap footer-grid"><BrandMark light /><div><p>Competition starts at the crease.</p></div><nav aria-label="Footer"><Link to="/tournaments">Tournaments</Link><Link to="/status">Entry status</Link><Link to="/auth">Organizer sign in</Link></nav><small>© {new Date().getFullYear()} KMT Cricket Stadium</small></div></footer>;
}

function useData() {
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const admin = Boolean(user?.isAdmin);
  const refresh = async () => {
    setLoading(true);
    try {
      const [events, entries] = await Promise.all([listTournaments(admin), user ? listRegistrations(user) : Promise.resolve([])]);
      setTournaments(events);
      setRegistrations(entries);
      setError('');
    } catch (cause) {
      console.error(cause);
      setError('We could not load the tournament desk. Check your connection and try again.');
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [user?.uid, admin]);
  useEffect(() => onDataChange(refresh), [user?.uid, admin]);
  return { tournaments, registrations, loading, error, refresh };
}

function LoadingState() { return <div className="state-block"><span className="loader" />Loading matchday details…</div>; }
function ErrorState({ message, retry }) { return <div className="state-block error-state" role="alert"><p>{message}</p>{retry && <button className="button button--outline" onClick={retry}>Try again</button>}</div>; }
function EmptyState({ title, copy, action }) { return <div className="empty-state"><span className="empty-glyph"><TicketCheck size={22} /></span><h2>{title}</h2><p>{copy}</p>{action}</div>; }

function EventMeta({ tournament }) {
  return <div className="event-meta"><span>{tournament.format}</span><span>{tournament.ballType}</span><span>{dateLabel(tournament.startsAt, { day: 'numeric', month: 'short' })}{tournament.endsAt && new Date(tournament.endsAt).toDateString() !== new Date(tournament.startsAt).toDateString() ? `–${dateLabel(tournament.endsAt, { day: 'numeric', month: 'short' })}` : ''}</span></div>;
}

function EventRow({ tournament, index = 0 }) {
  const imageCrop = ['pitch', 'ball', 'practice', 'pavilion'][index % 4];
  return <article className="event-row">
    <CricketPhoto crop={imageCrop} alt={`${tournament.format} cricket tournament at a stadium`} className="event-photo" />
    <div className="event-row-main"><h3><Link to={`/t/${tournament.id}`}>{tournament.title}</Link></h3><EventMeta tournament={tournament} /><p>{tournament.venue} <span>·</span> {tournament.description}</p></div>
    <div className="event-row-action"><strong>{money(tournament.entryFee)}</strong><span>team entry</span><Link className="text-link" to={`/t/${tournament.id}`}>Tournament details <ArrowUpRight size={16} /></Link></div>
  </article>;
}

function HomePage() {
  const { tournaments, loading, error, refresh } = useData();
  const [format, setFormat] = useState('All formats');
  const [ball, setBall] = useState('All balls');
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => tournaments.filter((t) => (format === 'All formats' || t.format === format) && (ball === 'All balls' || t.ballType === ball) && `${t.title} ${t.venue}`.toLowerCase().includes(search.toLowerCase())), [tournaments, format, ball, search]);
  return <><PublicHeader /><main>
    <section className="matchday-hero"><CricketPhoto crop="pitch" alt="Floodlit cricket ground with a match underway" className="matchday-hero-photo" /><div className="matchday-hero-shade" /><div className="wrap matchday-hero-content"><p className="matchday-location">KMT Cricket Stadium <span>·</span> Bengaluru</p><CricketPhoto crop="ball" alt="Red leather cricket ball ready for play" className="matchday-ball-closeup" /><h1><span className="hero-line-accent">YOUR XI.</span><br /><span>UNDER LIGHTS.</span></h1><div className="matchday-hero-bottom"><p>Every match has a first ball.<br />Make yours count at KMT.</p><Link to="#tournaments" className="button button--light">Find your fixture <ArrowDownRight size={18} /></Link></div><div className="matchday-tally"><span>{loading ? '—' : String(tournaments.length)}<small>Tournaments</small></span><span>One<small>Home ground</small></span><span>Your XI<small>Your innings</small></span></div></div><div className="hero-delivery" aria-hidden="true"><i /></div></section>
    <section id="tournaments" className="event-list-section wrap"><div className="section-heading"><div><h2>Upcoming tournaments at KMT.</h2></div><p>Choose your format. Entry fees are per team; the stadium desk confirms each place after payment review.</p></div>
      <div className="filters"><label className="search-box"><Search size={17} /><input aria-label="Search tournaments" placeholder="Search tournaments" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label><span className="sr-only">Format</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option>All formats</option>{FORMATS.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={15} /></label><label><span className="sr-only">Ball type</span><select value={ball} onChange={(event) => setBall(event.target.value)}><option>All balls</option>{ballTypes.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={15} /></label><span className="filter-count">{filtered.length} {filtered.length === 1 ? 'tournament' : 'tournaments'}</span></div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={refresh} /> : filtered.length ? <div className="event-list">{filtered.map((tournament, index) => <EventRow key={tournament.id} tournament={tournament} index={index} />)}</div> : <EmptyState title="No tournaments match those filters" copy="Try another format or clear your search." action={<button className="button button--outline" onClick={() => { setSearch(''); setFormat('All formats'); setBall('All balls'); }}>Clear filters</button>} />}
    </section>
    <MatchdayStory tournamentCount={tournaments.length} />
  </main><PublicFooter /></>;
}

function MatchdayStory({ tournamentCount }) {
  return <section className="innings-story" aria-labelledby="innings-title"><div className="innings-stage"><CricketPhoto crop="practice" alt="Cricket players training in the evening light" className="innings-photo" /><div className="innings-shade" /><svg className="delivery-trail" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true"><path d="M-30 570 C 220 180, 480 130, 720 270 S 1000 420, 1170 240" /></svg><div className="flight-ball" aria-hidden="true"><i /></div><div className="story-stumps" aria-hidden="true"><i /><i /><i /><b /></div><div className="wrap innings-content"><div className="innings-lead"><p>Before the first ball</p><h2 id="innings-title">One ground.<br />Your innings.</h2></div><div className="innings-steps"><div><span>The fixture</span><strong>Choose the format for your XI.</strong></div><div><span>Your squad</span><strong>Put your players on the sheet.</strong></div><div><span>Matchday</span><strong>Get verified. Walk out ready.</strong></div><Link to="/status" className="story-status-link">Follow your entry <ArrowUpRight size={16} /></Link></div><div className="innings-count"><strong>{String(tournamentCount)}</strong><span>Fixtures on the board</span></div></div></div></section>;
}

function TournamentPage() {
  const { tournamentId } = useParams();
  const { tournaments, loading, error, refresh } = useData();
  const [searchParams] = useSearchParams();
  const tournament = tournaments.find((item) => item.id === tournamentId);
  if (loading) return <><PublicHeader /><main><LoadingState /></main><PublicFooter /></>;
  if (error) return <><PublicHeader /><main className="wrap"><ErrorState message={error} retry={refresh} /></main><PublicFooter /></>;
  if (!tournament) return <><PublicHeader /><main className="wrap"><EmptyState title="Tournament not found" copy="This campaign may have ended or its link may be incomplete." action={<Link to="/tournaments" className="button button--dark">Browse tournaments</Link>} /></main><PublicFooter /></>;
  return <><PublicHeader /><main className="campaign-page">
    <div className="campaign-ribbon"><div className="wrap"><span>{tournament.format} · {tournament.ballType}</span><span>Registration closes <strong>{dateLabel(tournament.deadline)}</strong></span><a href="#register">Register your team <ArrowDownRight size={16} /></a></div></div>
    <section className="campaign-hero"><div className="wrap campaign-hero-grid"><div className="campaign-copy"><Link to="/tournaments" className="back-link"><ArrowLeft size={16} /> All tournaments</Link><h1>{tournament.title}</h1><EventMeta tournament={tournament} /><p className="campaign-description">{tournament.description}</p><div className="campaign-price"><strong>{money(tournament.entryFee)}</strong><span>entry per team</span></div><a className="button button--dark" href="#register">Enter the tournament <ArrowDownRight size={18} /></a></div><CricketPhoto crop="pitch" alt="Tournament cricket ground under floodlights" className="campaign-photo" /></div></section>
    <section className="campaign-facts"><div className="wrap facts-grid"><div><span>Match dates</span><strong>{dateLabel(tournament.startsAt)}{tournament.endsAt && new Date(tournament.startsAt).toDateString() !== new Date(tournament.endsAt).toDateString() ? ` – ${dateLabel(tournament.endsAt)}` : ''}</strong></div><div><span>Format</span><strong>{tournament.format} · {tournament.ballType}</strong></div><div><span>Venue</span><strong>{tournament.venue}</strong></div></div></section>
    <section className="matchday-rundown"><div className="wrap rundown-grid"><div><p>Fixture details</p><h2>Make the<br />dates yours.</h2><span>Keep the details close. We’ll see you at the ground.</span></div><div className="rundown-dates"><div><span>Registration closes</span><strong>{dateLabel(tournament.deadline)}</strong><small>Entries must be submitted before the deadline.</small></div><div><span>First match</span><strong>{dateLabel(tournament.startsAt)}</strong><small>{tournament.format} · {tournament.ballType}</small></div>{tournament.endsAt && new Date(tournament.endsAt).toDateString() !== new Date(tournament.startsAt).toDateString() && <div><span>Final match date</span><strong>{dateLabel(tournament.endsAt)}</strong><small>{tournament.venue}</small></div>}</div></div></section>
    <section id="register" className="register-section wrap"><div className="register-intro"><p className="section-kicker">Put your XI on the sheet</p><h2>Walk out<br />together.</h2><p>Share your team and squad details, then submit your payment reference. The stadium desk will review it and update your entry.</p><div className="support-box"><CircleHelp size={19} /><div><strong>Need a hand?</strong>{tournament.payment?.supportPhone ? <a href={`tel:${tournament.payment.supportPhone.replace(/\s/g, '')}`}>{tournament.payment.supportPhone}</a> : <span>Contact the stadium desk</span>}{tournament.payment?.supportEmail && <a href={`mailto:${tournament.payment.supportEmail}`}>{tournament.payment.supportEmail}</a>}</div></div><div className="campaign-side-score"><span>YOUR MATCH</span><strong>{tournament.title}</strong><p>{dateLabel(tournament.startsAt)} · {tournament.venue}</p><b>{money(tournament.entryFee)} <small>per team</small></b></div></div>
      <RegistrationForm tournament={tournament} attribution={{ source: searchParams.get('utm_source') || '', campaign: searchParams.get('utm_campaign') || '' }} />
    </section>
    <section className="terms-section"><div className="wrap terms-grid"><h2>Before you play</h2><div className="markdown-copy"><Markdown>{tournament.termsMarkdown || 'Tournament terms will be shared by the organizer.'}</Markdown></div></div></section>
  </main><PublicFooter /></>;
}

function RegistrationForm({ tournament, attribution }) {
  const [values, setValues] = useState({ teamName: '', captainName: '', email: '', phone: '', players: [{ name: '', jersey: '', role: '' }], customAnswers: {}, paymentMethod: 'upi', reference: '', acceptedTerms: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const setPlayer = (index, key, value) => setValues((current) => ({ ...current, players: current.players.map((player, i) => i === index ? { ...player, [key]: value } : player) }));
  const submit = async (event) => {
    event.preventDefault();
    const next = validateRegistration(tournament, values);
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const id = await createRegistration({ ...values, tournamentId: tournament.id, email: values.email.trim().toLowerCase(), ownerUid: null, status: 'PENDING', adminNote: '', attribution, submittedAt: new Date().toISOString() });
      setResult(id);
    } catch (error) {
      console.error(error);
      setErrors({ submit: 'Registration could not be saved. Check your connection and try again.' });
    } finally { setBusy(false); }
  };
  if (result) return <div className="registration-success" role="status"><span className="success-mark"><Check size={24} /></span><p className="section-kicker">Entry received</p><h3>You’re on the sheet.</h3><p>Your registration ID is <strong>{result}</strong>. Payment status is pending until the stadium desk checks your reference.</p><Link to={`/auth?returnTo=${encodeURIComponent('/user/dashboard')}`} className="button button--dark">Sign in to track it <ArrowRight size={17} /></Link><button className="text-link" onClick={() => navigator.clipboard?.writeText(result)}>Copy registration ID <Copy size={15} /></button></div>;
  const fieldError = (key) => errors[key] ? <span className="field-error">{errors[key]}</span> : null;
  return <form className="registration-form" onSubmit={submit} noValidate>
    <div className="form-heading"><div><h3>Team registration</h3><p>Fields marked required must be completed.</p></div><span className="form-fee">{money(tournament.entryFee)}</span></div>
    {errors.deadline && <div className="form-alert" role="alert">{errors.deadline}</div>}
    <div className="form-subsection form-contact"><div className="subsection-title"><h4>Team contact</h4><span>Captain and team</span></div><div className="field-grid"><label>Team name *<input value={values.teamName} maxLength={80} onChange={(event) => set('teamName', event.target.value)} />{fieldError('teamName')}</label><label>Captain name *<input value={values.captainName} maxLength={80} onChange={(event) => set('captainName', event.target.value)} />{fieldError('captainName')}</label><label>Email address *<input type="email" autoComplete="email" value={values.email} onChange={(event) => set('email', event.target.value)} />{fieldError('email')}</label><label>Phone number *<input type="tel" autoComplete="tel" value={values.phone} onChange={(event) => set('phone', event.target.value)} />{fieldError('phone')}</label></div></div>
    <div className="form-subsection"><div className="subsection-title"><h4>Your squad</h4><span>{values.players.length} of 40 players</span></div>{values.players.map((player, index) => <div className="player-row" key={index}><label className="player-name">Player {index + 1} name *<input value={player.name} maxLength={80} onChange={(event) => setPlayer(index, 'name', event.target.value)} /></label><label>Jersey<input value={player.jersey} maxLength={8} onChange={(event) => setPlayer(index, 'jersey', event.target.value)} /></label><label>Role<input value={player.role} maxLength={24} placeholder="Batter" onChange={(event) => setPlayer(index, 'role', event.target.value)} /></label>{values.players.length > 1 && <button type="button" className="icon-button remove-player" aria-label={`Remove player ${index + 1}`} onClick={() => set('players', values.players.filter((_, i) => i !== index))}><X size={17} /></button>}</div>)}{fieldError('players')}<button type="button" className="text-link" disabled={values.players.length >= 40} onClick={() => set('players', [...values.players, { name: '', jersey: '', role: '' }])}><Plus size={16} /> Add player</button></div>
    {(tournament.formFields || []).length > 0 && <div className="form-subsection"><div className="subsection-title"><h4>Team details</h4><span>Organizer questions</span></div><div className="field-grid">{tournament.formFields.map((field) => <label key={field.id}>{field.label}{field.required ? ' *' : ''}{field.type === 'select' ? <select value={values.customAnswers[field.id] || ''} onChange={(event) => setValues((current) => ({ ...current, customAnswers: { ...current.customAnswers, [field.id]: event.target.value } }))}><option value="">Choose one</option>{(field.options || []).map((option) => <option key={option}>{option}</option>)}</select> : field.type === 'checkbox' ? <span className="checkbox-field"><input type="checkbox" checked={Boolean(values.customAnswers[field.id])} onChange={(event) => setValues((current) => ({ ...current, customAnswers: { ...current.customAnswers, [field.id]: event.target.checked } }))} /> Yes</span> : <input type={field.type === 'number' ? 'number' : 'text'} value={values.customAnswers[field.id] || ''} onChange={(event) => setValues((current) => ({ ...current, customAnswers: { ...current.customAnswers, [field.id]: event.target.value } }))} />}{fieldError(field.id)}</label>)}</div></div>}
    <div className="form-subsection payment-section"><div className="subsection-title"><h4>Entry payment</h4><span>Manual verification</span></div><div className="payment-options"><label className={values.paymentMethod === 'upi' ? 'payment-option is-selected' : 'payment-option'}><input type="radio" name="payment" value="upi" checked={values.paymentMethod === 'upi'} onChange={() => set('paymentMethod', 'upi')} /><span><strong>UPI transfer</strong><small>{tournament.payment?.upiId || 'Ask the stadium desk for the UPI ID'}</small></span></label><label className={values.paymentMethod === 'offline' ? 'payment-option is-selected' : 'payment-option'}><input type="radio" name="payment" value="offline" checked={values.paymentMethod === 'offline'} onChange={() => set('paymentMethod', 'offline')} /><span><strong>Pay at stadium</strong><small>{tournament.payment?.offlineInstructions || 'Contact the stadium desk.'}</small></span></label></div>{values.paymentMethod === 'upi' && tournament.payment?.upiId && <UPIPaymentQR tournament={tournament} />}<label>UTR or bank reference{values.paymentMethod === 'upi' ? ' *' : ''}<input value={values.reference} maxLength={100} onChange={(event) => set('reference', event.target.value)} placeholder="Enter the 6–30 digit reference" />{fieldError('reference')}</label></div>
    <label className="terms-check"><input type="checkbox" checked={values.acceptedTerms} onChange={(event) => set('acceptedTerms', event.target.checked)} /> <span>I have read and agree to the tournament terms above. *</span></label>{fieldError('acceptedTerms')}
    {errors.submit && <div className="form-alert" role="alert">{errors.submit}</div>}
    <button className="button button--dark button--wide" disabled={busy || Boolean(errors.deadline)}>{busy ? 'Saving your entry…' : 'Submit team registration'} <ArrowUpRight size={17} /></button>
  </form>;
}

function StatusPage() {
  const { user } = useAuth();
  return <><PublicHeader /><main className="status-page wrap"><div className="status-message"><div className="status-icon"><ShieldCheck size={25} /></div><p className="section-kicker">Registration status</p><h1>Keep your team<br />in the loop.</h1><p>Sign in with the verified email used for your registration. We’ll link your guest entry to your dashboard so you can follow payment review, see your roster and open a confirmed pass.</p>{user ? <Link className="button button--dark" to="/user/dashboard">Go to your dashboard <ArrowRight size={17} /></Link> : <Link className="button button--dark" to={`/auth?returnTo=${encodeURIComponent('/user/dashboard')}`}>Sign in to view status <ArrowRight size={17} /></Link>}</div><CricketPhoto crop="pavilion" alt="Cricket pavilion and empty field in morning light" className="status-photo" /></main><PublicFooter /></>;
}

function UPIPaymentQR({ tournament }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    const payee = tournament.payment?.upiId;
    if (!payee) { setImage(''); return; }
    const params = new URLSearchParams({ pa: payee, pn: 'KMT Cricket Stadium', am: String(Number(tournament.entryFee || 0).toFixed(2)), cu: 'INR', tn: tournament.title });
    QRCode.toDataURL(`upi://pay?${params}`, { width: 176, margin: 1, color: { dark: '#17392d', light: '#ffffff' } }).then(setImage).catch(() => setImage(''));
  }, [tournament.id, tournament.payment?.upiId, tournament.entryFee, tournament.title]);
  return image ? <div className="upi-qr"><img src={image} alt={`UPI payment QR for ${money(tournament.entryFee)} to ${tournament.payment.upiId}`} /><p>Scan to pay {money(tournament.entryFee)}. Enter the UTR below; the organizer confirms it manually.</p></div> : null;
}

function AuthPage() {
  const { user, signInEmail, registerEmail, signInGoogle, resendVerification } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = safeReturnPath(params.get('returnTo'));
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) navigate(user.isAdmin ? '/admin' : returnTo, { replace: true, state: { from: location.pathname } });
  }, [user?.uid, user?.isAdmin]);
  const run = async (action) => { setBusy(true); setError(''); setMessage(''); try { await action(); } catch (cause) { setError(cause.message?.replace('Firebase: ', '') || 'Sign-in failed. Please try again.'); } finally { setBusy(false); } };
  return <><PublicHeader /><main className="auth-page wrap"><div className="auth-poster"><p>KMT · PLAY THE NEXT INNINGS</p><h1>Your team.<br />Your score.</h1><CricketPhoto crop="practice" alt="Local players warming up together" /></div><section className="auth-panel"><Link className="back-link" to="/tournaments"><ArrowLeft size={16} /> Back to tournaments</Link><h2>{mode === 'signin' ? 'Sign in to KMT' : 'Create your account'}</h2><p>Use the verified email from your team registration to find your entry.</p>
    <button className="button button--outline button--wide google-button" onClick={() => run(signInGoogle)} disabled={busy}><GoogleMark /> Continue with Google</button><div className="form-divider"><span>or use email</span></div><form className="auth-form" onSubmit={(event) => { event.preventDefault(); run(() => mode === 'signin' ? signInEmail(email, password) : registerEmail(email, password).then(() => setMessage('Check your inbox to verify your email. Then sign in to claim your registration.'))); }}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" required minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="button button--dark button--wide" disabled={busy}>{busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button></form><button className="text-link auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}>{mode === 'signin' ? 'New to KMT? Create an account' : 'Already registered? Sign in'}</button>{user && !user.emailVerified && <button className="text-link" onClick={() => run(resendVerification)}>Resend verification email</button>}
    {error && <p className="form-alert" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
  </section></main><PublicFooter /></>;
}

function GoogleMark() { return <span className="google-mark" aria-hidden="true">G</span>; }

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (location.pathname === '/user/dashboard' || location.pathname.startsWith('/admin')) {
    if (loading) return <LoadingState />;
    if (!user) return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
    if (location.pathname.startsWith('/admin') && !user.isAdmin) return <Navigate to="/user/dashboard" replace />;
    if (location.pathname === '/user/dashboard' && user.isAdmin) return <Navigate to="/admin" replace />;
  }
  return <Routes><Route path="/" element={<HomePage />} /><Route path="/tournaments" element={<HomePage />} /><Route path="/t/:tournamentId" element={<TournamentPage />} /><Route path="/status" element={<StatusPage />} /><Route path="/auth" element={<AuthPage />} /><Route path="/user/dashboard" element={<UserDashboard />} /><Route path="/admin" element={<AdminDashboard />} /><Route path="/admin/tournaments" element={<AdminTournaments />} /><Route path="/admin/registrations" element={<AdminRegistrations />} /><Route path="*" element={<NotFound />} /></Routes>;
}

function AppShell({ children, active }) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = user?.isAdmin ? [['Overview', '/admin'], ['Tournaments', '/admin/tournaments'], ['Registrations', '/admin/registrations']] : [['My entries', '/user/dashboard']];
  return <div className="app-frame"><aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`}><div className="side-brand"><BrandMark /></div><div className="side-context"><span>KMT CRICKET STADIUM</span><strong>{user?.isAdmin ? 'Organizer desk' : 'Player dashboard'}</strong></div><nav aria-label="Dashboard navigation">{links.map(([label, to]) => <Link key={to} className={active === to ? 'active' : ''} to={to} onClick={() => setMobileOpen(false)}>{label}{to === '/admin/registrations' && <span className="nav-count">Review</span>}</Link>)}</nav><div className="side-bottom"><Link to="/tournaments">Public tournaments <ExternalLink size={14} /></Link><button onClick={signOut}><LogOut size={16} /> Sign out</button></div></aside><div className="app-stage"><header className="app-topbar"><button className="icon-button menu-toggle" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button><span>{active === '/admin' ? 'Overview' : active === '/admin/tournaments' ? 'Tournament setup' : active === '/admin/registrations' ? 'Payment verification' : 'My entries'}</span><div className="top-user"><span>{user?.displayName || user?.email}</span><span className="avatar-letter">{(user?.displayName || user?.email || 'K').slice(0, 1).toUpperCase()}</span></div></header><main className="app-sheet"><div className="app-content">{children}</div></main></div></div>;
}

function Kpi({ label, value, note }) { return <div className="kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function StatusChip({ status }) { return <span className={`status-chip status-${String(status).toLowerCase()}`}>{status === 'PENDING' ? 'Pending review' : status === 'CONFIRMED' ? 'Confirmed' : 'Rejected'}</span>; }

function AdminDashboard() {
  const { tournaments, registrations, loading, error, refresh } = useData();
  const pending = registrations.filter((row) => row.status === 'PENDING');
  return <AppShell active="/admin"><div className="app-title-row"><div><p className="app-breadcrumb">KMT / Organizer desk</p><h1>Overview</h1><p>Payment references waiting for a stadium check.</p></div><Link to="/admin/registrations" className="button button--dark">Review queue <ArrowRight size={16} /></Link></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={refresh} /> : <><div className="kpi-strip"><Kpi label="Pending payment checks" value={pending.length} note="Needs organizer review" /><Kpi label="Confirmed teams" value={registrations.filter((row) => row.status === 'CONFIRMED').length} note="Across all tournaments" /><Kpi label="Open tournaments" value={tournaments.filter((row) => row.status === 'published').length} note="Published for registration" /></div>
      <div className="overview-grid"><section className="work-panel queue-panel"><div className="panel-heading"><div><h2>Payment queue</h2><p>Check the UTR or receipt before confirming.</p></div><Link to="/admin/registrations" className="text-link">All registrations <ArrowRight size={15} /></Link></div>{pending.length ? <div className="queue-list">{pending.slice(0, 5).map((row) => <QueueRow key={row.id} row={row} tournament={tournaments.find((item) => item.id === row.tournamentId)} />)}</div> : <p className="inline-empty">No payment references need a check.</p>}</section>
      <section className="work-panel tournament-panel"><div className="panel-heading"><div><h2>Upcoming tournaments</h2><p>{tournaments.length} configured</p></div><Link to="/admin/tournaments" className="icon-link" aria-label="Manage tournaments"><ArrowUpRight size={18} /></Link></div>{tournaments.slice(0, 4).map((event) => <div className="mini-event" key={event.id}><div><strong>{event.title}</strong><span>{event.format} · {dateLabel(event.startsAt, { day: 'numeric', month: 'short' })}</span></div><span>{money(event.entryFee)}</span></div>)}<Link to="/admin/tournaments" className="panel-foot-link">Configure tournaments <ArrowRight size={15} /></Link></section></div>
    </>}
  </AppShell>;
}

function QueueRow({ row, tournament }) { return <div className="queue-row"><div className="queue-ident"><span className="queue-mark">{row.teamName.slice(0, 1)}</span><div><strong>{row.teamName}</strong><span>{tournament?.title || 'Tournament'} · {row.captainName}</span></div></div><div className="queue-reference"><span>{row.paymentMethod === 'upi' ? 'UPI reference' : 'Offline receipt'}</span><strong>{row.reference || '—'}</strong></div><StatusChip status={row.status} /></div>; }

function UserDashboard() {
  const { user, resendVerification, refreshVerification } = useAuth();
  const { tournaments, registrations, loading, error, refresh } = useData();
  return <AppShell active="/user/dashboard"><div className="app-title-row"><div><p className="app-breadcrumb">KMT / Player desk</p><h1>My entries</h1><p>Your team’s registrations, payment checks and confirmed passes.</p></div><Link to="/tournaments" className="button button--outline">Find a tournament <ArrowUpRight size={16} /></Link></div>
    {!user?.emailVerified && <div className="notice-banner"><ShieldCheck size={18} /><span>Verify your email to link guest registrations to this account.</span><button className="text-link" onClick={resendVerification}>Resend verification</button><button className="text-link" onClick={refreshVerification}>I verified</button></div>}
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={refresh} /> : registrations.length ? <div className="registration-cards">{registrations.map((row) => <UserRegistration key={row.id} row={row} tournament={tournaments.find((item) => item.id === row.tournamentId)} />)}</div> : <EmptyState title="No team entries yet" copy="Once you register with this verified email, your tournament entry will appear here." action={<Link to="/tournaments" className="button button--dark">Explore tournaments <ArrowRight size={16} /></Link>} />}
  </AppShell>;
}

function UserRegistration({ row, tournament }) {
  const [copied, setCopied] = useState(false);
  return <article className="user-registration"><div className="user-registration-top"><div><EventMeta tournament={tournament || { format: 'Tournament', ballType: '', startsAt: '' }} /><h2>{tournament?.title || 'Tournament entry'}</h2><p>{row.teamName} · Captain {row.captainName}</p></div><StatusChip status={row.status} /></div><div className="roster-preview"><strong>Team roster</strong><div>{(row.players || []).map((player) => <span key={player.name}>{player.name}{player.role ? ` · ${player.role}` : ''}</span>)}</div></div><div className="registration-meta"><span>Registration ID <code>{row.id}</code><button className="copy-id" aria-label="Copy registration ID" onClick={() => { navigator.clipboard?.writeText(row.id); setCopied(true); }}>{copied ? <Check size={14} /> : <Copy size={14} />}</button></span><span>Match date <strong>{tournament ? dateLabel(tournament.startsAt) : 'To be announced'}</strong></span><span>Payment <strong>{row.paymentMethod === 'upi' ? `UPI · ${row.reference || 'Reference submitted'}` : `Offline · ${row.reference || 'At stadium'}`}</strong></span></div>{row.adminNote && <p className="admin-note"><strong>Organizer note:</strong> {row.adminNote}</p>}{row.status === 'CONFIRMED' && <ConfirmationPass row={row} tournament={tournament} />}</article>;
}

function ConfirmationPass({ row, tournament }) { return <div className="confirmation-pass"><div><p className="pass-caption">KMT · CONFIRMED TEAM PASS</p><h3>{row.teamName}</h3><p>{tournament?.title} · {dateLabel(tournament?.startsAt)} · {tournament?.venue}</p><span>Captain {row.captainName} · {row.players.length} players</span></div><button className="button button--outline" onClick={(event) => { const pass = event.currentTarget.closest('.confirmation-pass'); pass.classList.add('print-target'); window.print(); pass.classList.remove('print-target'); }}><Download size={16} /> Save pass as PDF</button></div>; }

function AdminTournaments() {
  const { tournaments, loading, error, refresh } = useData();
  const [selectedId, setSelectedId] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => blankTournament());
  const [campaignSource, setCampaignSource] = useState('whatsapp');
  const [campaignName, setCampaignName] = useState('');
  const [qr, setQr] = useState('');
  const [copyState, setCopyState] = useState('Copy link');
  const [formError, setFormError] = useState('');
  useEffect(() => { if (selectedId) { const found = tournaments.find((item) => item.id === selectedId); if (found) setForm({ ...found, startsAtInput: dateTimeValue(found.startsAt), endsAtInput: dateTimeValue(found.endsAt), deadlineInput: dateTimeValue(found.deadline) }); } }, [selectedId, tournaments]);
  function blankTournament() { return { id: '', title: '', format: 'T20', ballType: 'Leather Ball', venue: 'KMT Cricket Stadium', startsAtInput: '', endsAtInput: '', deadlineInput: '', entryFee: '', status: 'draft', description: '', termsMarkdown: '## Tournament terms\n\n- Arrive 45 minutes before play.\n- Captains are responsible for player eligibility.\n- Organizer decisions are final.', payment: { upiId: '', offlineInstructions: '', supportPhone: '', supportEmail: '' }, formFields: [] }; }
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const changePayment = (key, value) => setForm((current) => ({ ...current, payment: { ...current.payment, [key]: value } }));
  const save = async (event) => { event.preventDefault(); setFormError(''); if (!form.title.trim() || !form.venue.trim() || !form.startsAtInput || !form.deadlineInput || !Number.isFinite(Number(form.entryFee)) || Number(form.entryFee) < 0) { setFormError('Add a title, venue, match date, registration deadline and valid entry fee.'); return; } if (form.formFields.some((field) => !field.label.trim() || (field.type === 'select' && !field.options?.some((option) => option.trim())))) { setFormError('Every custom field needs a label, and dropdowns need at least one option.'); return; } setBusy(true); setNotice(''); try { const { startsAtInput, endsAtInput, deadlineInput, ...details } = form; const value = { ...details, title: form.title.trim(), venue: form.venue.trim(), entryFee: Number(form.entryFee), startsAt: dateIso(startsAtInput), endsAt: dateIso(endsAtInput || startsAtInput), deadline: dateIso(deadlineInput) }; if (!form.id) { const id = await addTournament(value); setSelectedId(id); } else { await saveTournament(value); } setNotice('Tournament saved.'); } catch (cause) { console.error(cause); setFormError('Could not save tournament. Check the live admin allowlist and try again.'); } finally { setBusy(false); } };
  const selectEvent = (id) => { setSelectedId(id); setNotice(''); setQr(''); setFormError(''); };
  const addField = () => { const id = `field-${crypto.randomUUID().slice(0, 8)}`; change('formFields', [...form.formFields, { id, label: '', type: 'text', required: false, options: [] }]); };
  const updateField = (id, key, value) => change('formFields', form.formFields.map((field) => field.id === id ? { ...field, [key]: value } : field));
  const removeField = (id) => change('formFields', form.formFields.filter((field) => field.id !== id));
  const generateQr = async () => { if (!form.id) return; const url = campaignUrl(form.id, campaignSource, campaignName); try { setQr(await QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: '#17392d', light: '#ffffff' } })); } catch { setFormError('Could not generate this campaign QR code.'); } };
  const shareUrl = form.id ? campaignUrl(form.id, campaignSource, campaignName) : '';
  return <AppShell active="/admin/tournaments"><div className="app-title-row"><div><p className="app-breadcrumb">KMT / Organizer desk</p><h1>Tournament setup</h1><p>Dates, entry details and the questions your teams answer.</p></div><button className="button button--dark" onClick={() => { setForm(blankTournament()); setSelectedId(''); setNotice(''); setQr(''); }}><Plus size={17} /> New tournament</button></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={refresh} /> : <div className="setup-layout"><aside className="setup-list"><div className="setup-list-heading"><h2>Configured</h2><span>{tournaments.length}</span></div>{tournaments.map((event) => <button className={selectedId === event.id ? 'setup-item is-selected' : 'setup-item'} key={event.id} onClick={() => selectEvent(event.id)}><strong>{event.title}</strong><span>{event.format} · {money(event.entryFee)}</span><StatusText status={event.status} /></button>)}</aside>
      <div className="setup-work"><form className="settings-form" onSubmit={save}><section className="settings-row"><div><h2>Match details</h2><p>What teams see on the campaign page.</p></div><div className="settings-panel"><div className="field-grid"><label>Tournament name *<input required maxLength={80} value={form.title} onChange={(event) => change('title', event.target.value)} /></label><label>Format<select value={form.format} onChange={(event) => change('format', event.target.value)}>{FORMATS.map((value) => <option key={value}>{value}</option>)}</select></label><label>Ball type<select value={form.ballType} onChange={(event) => change('ballType', event.target.value)}>{ballTypes.map((value) => <option key={value}>{value}</option>)}</select></label><label>Venue *<input required value={form.venue} onChange={(event) => change('venue', event.target.value)} /></label><label>First match *<input type="datetime-local" required value={form.startsAtInput} onChange={(event) => change('startsAtInput', event.target.value)} /></label><label>Last match<input type="datetime-local" value={form.endsAtInput} onChange={(event) => change('endsAtInput', event.target.value)} /></label><label>Registration deadline *<input type="datetime-local" required value={form.deadlineInput} onChange={(event) => change('deadlineInput', event.target.value)} /></label><label>Entry fee (INR) *<input type="number" required min="0" step="50" value={form.entryFee} onChange={(event) => change('entryFee', event.target.value)} /></label><label>Visibility<select value={form.status} onChange={(event) => change('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label><label className="field-span">Campaign description<textarea rows="3" maxLength={500} value={form.description} onChange={(event) => change('description', event.target.value)} /></label></div></div></section>
        <section className="settings-row"><div><h2>Team form</h2><p>Standard fields, player roster and extra questions.</p></div><div className="settings-panel"><div className="builder-fields">{form.formFields.map((field, index) => <div className="builder-field" key={field.id}><span className="builder-index">{index + 1}</span><label>Field label<input value={field.label} onChange={(event) => updateField(field.id, 'label', event.target.value)} placeholder="e.g. Club city" /></label><label>Answer type<select value={field.type} onChange={(event) => updateField(field.id, 'type', event.target.value)}><option value="text">Text</option><option value="number">Number</option><option value="select">Dropdown</option><option value="checkbox">Checkbox</option></select></label><label className="required-toggle"><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, 'required', event.target.checked)} /> Required</label><button type="button" className="icon-button" aria-label="Remove form field" onClick={() => removeField(field.id)}><X size={17} /></button>{field.type === 'select' && <label className="field-span">Dropdown options (one per line)<textarea rows="2" value={(field.options || []).join('\n')} onChange={(event) => updateField(field.id, 'options', event.target.value.split('\n').filter(Boolean))} /></label>}</div>)}{form.formFields.length === 0 && <p className="inline-empty">No extra questions. Team name, captain and roster are always collected.</p>}<button type="button" className="button button--outline" onClick={addField}><Plus size={16} /> Add custom field</button></div></div></section>
        <section className="settings-row"><div><h2>Payment & support</h2><p>Manual UPI verification and stadium desk details.</p></div><div className="settings-panel"><div className="field-grid"><label>Stadium UPI ID<input value={form.payment?.upiId || ''} onChange={(event) => changePayment('upiId', event.target.value)} placeholder="stadium@upi" /></label><label>Support phone<input type="tel" value={form.payment?.supportPhone || ''} onChange={(event) => changePayment('supportPhone', event.target.value)} /></label><label>Support email<input type="email" value={form.payment?.supportEmail || ''} onChange={(event) => changePayment('supportEmail', event.target.value)} /></label><label className="field-span">Offline payment instructions<textarea rows="2" value={form.payment?.offlineInstructions || ''} onChange={(event) => changePayment('offlineInstructions', event.target.value)} /></label></div><div className="field-preview"><span>UPI QR preview</span><p>Teams scan this payment QR and enter their reference. The organizer checks it manually.</p>{form.payment?.upiId && <UPIPaymentQR tournament={form} />}</div></div></section>
        <section className="settings-row"><div><h2>Terms & conditions</h2><p>Markdown is shown before the required acceptance checkbox.</p></div><div className="settings-panel"><label>Tournament terms (Markdown)<textarea rows="8" value={form.termsMarkdown} onChange={(event) => change('termsMarkdown', event.target.value)} /></label><div className="terms-preview"><span>Preview</span><Markdown>{form.termsMarkdown}</Markdown></div></div></section>
        {formError && <p className="form-alert" role="alert">{formError}</p>}{notice && <p className="form-success" role="status">{notice}</p>}<div className="save-row"><button className="button button--dark" disabled={busy}>{busy ? 'Saving…' : 'Save tournament'} <Check size={16} /></button><span>Campaign URL becomes available after saving.</span></div></form>
        {form.id && <section className="campaign-tools"><div className="campaign-tools-heading"><div><h2>Campaign link & QR</h2><p>Build a channel-specific share link for this tournament.</p></div><span className="campaign-tools-icon"><SlidersHorizontal size={18} /></span></div><div className="campaign-controls"><label>Channel<select value={campaignSource} onChange={(event) => { setCampaignSource(event.target.value); setQr(''); }}><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="poster">Printed poster</option><option value="website">Website</option></select></label><label>Campaign name<input value={campaignName} onChange={(event) => { setCampaignName(event.target.value); setQr(''); }} placeholder="e.g. summer-cup" /></label><button className="button button--outline" onClick={generateQr}>Generate QR <ArrowRight size={15} /></button></div>{shareUrl && <div className="share-row"><input readOnly value={shareUrl} aria-label="Campaign URL" /><button className="button button--dark" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setCopyState('Copied'); setTimeout(() => setCopyState('Copy link'), 1600); } catch { setCopyState('Select and copy URL'); } }}>{copyState === 'Copied' ? <Check size={15} /> : <Copy size={15} />}{copyState}</button></div>}{qr && <div className="qr-output"><img src={qr} alt="Scannable campaign link QR code" /><p>Scan to open this campaign. The final link includes {campaignSource}{campaignName ? ` and ${campaignName}` : ''} attribution.</p><a className="text-link" href={qr} download={`${form.id}-campaign-qr.png`}>Download QR image <Download size={15} /></a></div>}</section>}
      </div></div>}
  </AppShell>;
}

function StatusText({ status }) { return <span className={`status-text ${status === 'published' ? 'published' : ''}`}>{status === 'published' ? 'Published' : 'Draft'}</span>; }

function AdminRegistrations() {
  const { tournaments, registrations, loading, error, refresh } = useData();
  const [filter, setFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewError, setReviewError] = useState('');
  const visible = registrations.filter((row) => (filter === 'ALL' || row.status === filter) && `${row.teamName} ${row.captainName} ${row.reference}`.toLowerCase().includes(search.toLowerCase()));
  const downloadCsv = () => { const blob = new Blob([toCsv(visible)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'kmt-team-registrations.csv'; anchor.click(); URL.revokeObjectURL(url); };
  const decide = async (row, status) => { const note = notes[row.id] ?? row.adminNote ?? ''; if (status === 'REJECTED' && !note.trim()) { setReviewError('Add a note explaining why a registration is rejected.'); return; } setBusyId(row.id); setNotice(''); setReviewError(''); try { await reviewRegistration(row.id, status, note.trim()); setNotice(`${row.teamName} marked ${status.toLowerCase()}.`); } catch (cause) { console.error(cause); setReviewError('Review could not be saved. Check your live admin permissions.'); } finally { setBusyId(''); } };
  return <AppShell active="/admin/registrations"><div className="app-title-row"><div><p className="app-breadcrumb">KMT / Organizer desk</p><h1>Payment verification</h1><p>Match each team’s UTR or bank receipt to the entry fee.</p></div><button className="button button--outline" onClick={downloadCsv} disabled={!visible.length}><Download size={16} /> Export roster CSV</button></div>
    <div className="list-toolbar"><div className="filter-tabs" role="tablist" aria-label="Registration status">{[['PENDING', 'Pending'], ['CONFIRMED', 'Confirmed'], ['REJECTED', 'Rejected'], ['ALL', 'All entries']].map(([value, label]) => <button role="tab" aria-selected={filter === value} className={filter === value ? 'is-active' : ''} key={value} onClick={() => setFilter(value)}>{label} <span>{value === 'ALL' ? registrations.length : registrations.filter((row) => row.status === value).length}</span></button>)}</div><label className="search-box"><Search size={16} /><input placeholder="Search teams, captains, UTR" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
    {notice && <p className="form-success" role="status">{notice}</p>}{reviewError && <p className="form-alert" role="alert">{reviewError}</p>}{loading ? <LoadingState /> : error ? <ErrorState message={error} retry={refresh} /> : visible.length ? <div className="registration-table-wrap"><table className="registration-table"><thead><tr><th>Team / captain</th><th>Tournament</th><th>Roster</th><th>Payment reference</th><th>Status</th><th>Review</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id}><td><strong>{row.teamName}</strong><span>{row.captainName} · {row.email}</span><small>{row.phone}</small></td><td>{tournaments.find((event) => event.id === row.tournamentId)?.title || '—'}</td><td>{row.players?.length || 0} players<details className="roster-details"><summary>View roster</summary><ul>{(row.players || []).map((player, index) => <li key={`${player.name}-${index}`}>{player.name}{player.jersey ? ` · #${player.jersey}` : ''}{player.role ? ` · ${player.role}` : ''}</li>)}</ul></details></td><td><span>{row.paymentMethod === 'upi' ? 'UPI / bank' : 'Offline'}</span><code>{row.reference || '—'}</code></td><td><StatusChip status={row.status} /></td><td>{row.status === 'PENDING' ? <div className="review-actions"><textarea aria-label={`Review note for ${row.teamName}`} rows="2" value={notes[row.id] ?? row.adminNote ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="Optional organizer note" /><button disabled={busyId === row.id} className="button button--confirm" onClick={() => decide(row, 'CONFIRMED')}>Confirm</button><button disabled={busyId === row.id} className="button button--reject" onClick={() => decide(row, 'REJECTED')}>Reject</button></div> : <span className="reviewed-label">{row.adminNote || 'Reviewed'}</span>}</td></tr>)}</tbody></table></div> : <EmptyState title="No registrations in this view" copy={filter === 'PENDING' ? 'New team entries will appear here when submitted.' : 'Try another status or search term.'} action={filter !== 'PENDING' && <button className="button button--outline" onClick={() => { setFilter('ALL'); setSearch(''); }}>Show all entries</button>} />}
  </AppShell>;
}

function NotFound() { return <><PublicHeader /><main className="not-found wrap"><p className="section-kicker">KMT / 404</p><h1>That ball<br />went wide.</h1><p>The page doesn’t exist or this tournament is no longer listed.</p><Link to="/tournaments" className="button button--dark">Back to tournaments <ArrowRight size={16} /></Link></main><PublicFooter /></>; }

export default function App() { return <AppRoutes />; }

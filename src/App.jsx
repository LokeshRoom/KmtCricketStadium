import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Phone,
  Plus,
  QrCode,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Ticket,
  TicketCheck,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import Markdown from 'react-markdown';
import { useAuth } from './AuthContext';
import { addTournament, createRegistration, listRegistrations, listTournaments, onDataChange, reviewRegistration, saveTournament } from './store';
import { FORMATS, campaignUrl, safeReturnPath, toCsv, validateRegistration } from './domain';

const money = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount || 0));

const dateLabel = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  value ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...options }).format(new Date(value)) : 'TBA';

const dateTimeValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const dateIso = (value) => (value ? new Date(value).toISOString() : '');
const ballTypes = ['Leather Ball', 'Tennis Ball'];

export const STADIUM_MAP = {
  name: 'KMT Cricket Ground',
  venue: 'KMT Cricket Stadium, Vajralapuram',
  address: 'Vajralapuram (Near Karnataka - Andhra Border)',
  shortUrl: 'https://maps.app.goo.gl/zcPCHoWqW8Ve2ARY6',
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=13.2306051,78.9124111',
  embedUrl: 'https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s13.2306051,78.9124111!6i15!3m1!1sen!5m1!1sen',
  lat: 13.2306051,
  lng: 78.9124111,
};

function StadiumLocationCard({ compact = false }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KMT Cricket Ground, Vajralapuram',
          text: 'Location for KMT Cricket Ground, Vajralapuram',
          url: STADIUM_MAP.shortUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }
    navigator.clipboard?.writeText(STADIUM_MAP.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`stadium-map-card ${compact ? 'stadium-map-card--compact' : ''}`}>
      <div className="stadium-map-frame-box">
        <iframe
          src={STADIUM_MAP.embedUrl}
          title="KMT Cricket Ground, Vajralapuram Location on Google Maps"
          width="100%"
          height="100%"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          aria-label="Google Map showing KMT Cricket Ground Vajralapuram"
        />
        <div className="map-badge-overlay">
          <span className="live-dot" />
          <span>KMT Cricket Ground</span>
        </div>
      </div>

      <div className="stadium-map-info-pane">
        <div className="stadium-info-header">
          <div>
            <div className="stadium-kicker">Matchday Destination</div>
            <h3 className="stadium-title">{STADIUM_MAP.name}</h3>
            <p className="stadium-address">
              <MapPin size={15} className="text-gold" />
              <span>{STADIUM_MAP.venue}</span>
            </p>
          </div>
          <span className="ground-pill">Vajralapuram</span>
        </div>

        <div className="stadium-perks-list">
          <div className="perk-item">
            <span className="perk-icon">🏏</span>
            <div>
              <strong>Main Turf Pitch</strong>
              <small>Pro 22-yard turf with practice nets</small>
            </div>
          </div>
          <div className="perk-item">
            <span className="perk-icon">💡</span>
            <div>
              <strong>Night Floodlights</strong>
              <small>High-intensity lighting for day/night matches</small>
            </div>
          </div>
          <div className="perk-item">
            <span className="perk-icon">🚗</span>
            <div>
              <strong>Dedicated Parking</strong>
              <small>Spacious parking for team cars & two-wheelers</small>
            </div>
          </div>
          <div className="perk-item">
            <span className="perk-icon">🥤</span>
            <div>
              <strong>Pavilions & Dugouts</strong>
              <small>Covered player dugouts & clean amenities</small>
            </div>
          </div>
        </div>

        <div className="stadium-actions-group">
          <a
            href={STADIUM_MAP.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gold btn-action"
          >
            <Navigation size={16} />
            <span>Get Directions (GPS)</span>
          </a>
          <a
            href={STADIUM_MAP.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-action"
          >
            <ExternalLink size={16} />
            <span>Open in Google Maps</span>
          </a>
          <button
            type="button"
            className="btn btn-outline btn-action"
            onClick={handleShare}
            aria-label="Share stadium map link"
          >
            {copied ? <Check size={16} className="text-green" /> : <Share2 size={16} />}
            <span>{copied ? 'Link Copied!' : 'Share Ground'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom Hook for PWA Installation
function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(Boolean(isStandaloneMode));

    const handler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return {
    canInstall: Boolean(deferredPrompt) && !isStandalone && !dismissed,
    isStandalone,
    promptInstall,
    dismiss: () => setDismissed(true),
  };
}

function CricketPhoto({ crop, alt, className = '' }) {
  return (
    <div className={`photo-crop crop-${crop} ${className}`} role="img" aria-label={alt}>
      <img src="/images/cricket-contact-sheet.png" alt="" loading="lazy" />
    </div>
  );
}

function BrandMark({ light = false }) {
  return (
    <Link className={`brand-mark ${light ? 'brand-mark--light' : ''}`} to="/" aria-label="KMT Cricket Stadium home">
      <span className="brand-icon">
        <svg viewBox="0 0 32 32" fill="none" width="26" height="26" aria-hidden="true">
          <rect x="7" y="10" width="3" height="17" rx="1.5" fill="currentColor" />
          <rect x="14.5" y="7" width="3" height="20" rx="1.5" fill="var(--color-gold)" />
          <rect x="22" y="10" width="3" height="17" rx="1.5" fill="currentColor" />
          <rect x="5" y="7" width="22" height="2.5" rx="1.2" fill="var(--color-gold)" />
          <circle cx="21" cy="21" r="3.5" fill="var(--color-accent-red)" />
        </svg>
      </span>
      <span className="brand-text">
        <span className="brand-title">KMT CRICKET</span>
        <span className="brand-sub">STADIUM • VAJRALAPURAM</span>
      </span>
    </Link>
  );
}

function PwaInstallBanner() {
  const { canInstall, promptInstall, dismiss } = usePwaInstall();
  if (!canInstall) return null;

  return (
    <div className="pwa-banner" role="region" aria-label="Install App">
      <div className="pwa-banner-content">
        <div className="pwa-icon">
          <Smartphone size={20} />
        </div>
        <div className="pwa-text">
          <strong>Install KMT Cricket App</strong>
          <span>Instant match passes, fast registration & offline access</span>
        </div>
      </div>
      <div className="pwa-actions">
        <button type="button" className="pwa-btn-install" onClick={promptInstall}>
          Install App
        </button>
        <button type="button" className="pwa-btn-dismiss" onClick={dismiss} aria-label="Dismiss banner">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="site-header">
      <div className="header-inner">
        <BrandMark />
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link to="/tournaments" className="nav-link">
            Tournaments
          </Link>
          <a href="/#location" className="nav-link">
            Stadium Map
          </a>
          <Link to="/status" className="nav-link">
            My Match Pass
          </Link>
          {user ? (
            <Link to={user.isAdmin ? '/admin' : '/user/dashboard'} className="nav-pill">
              <User size={15} />
              <span>{user.isAdmin ? 'Organizer' : 'Dashboard'}</span>
            </Link>
          ) : (
            <Link to="/auth" className="nav-pill">
              <span>Sign in</span>
              <ArrowUpRight size={14} />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const path = location.pathname;

  // Hide bottom tab bar on fixture details page so action bar has full bottom clearance
  if (path.startsWith('/t/')) return null;

  const isTournaments = path === '/' || path.startsWith('/tournaments');
  const isPasses = path === '/status' || path === '/user/dashboard';
  const isAdmin = path.startsWith('/admin');
  const isAuth = path === '/auth';

  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom Navigation">
      <Link to="/tournaments" className={`bottom-tab ${isTournaments ? 'is-active' : ''}`}>
        <Trophy size={20} />
        <span>Tournaments</span>
      </Link>
      <Link to="/status" className={`bottom-tab ${isPasses ? 'is-active' : ''}`}>
        <Ticket size={20} />
        <span>My Pass</span>
      </Link>
      <a href="/#location" className="bottom-tab">
        <MapPin size={20} />
        <span>Location</span>
      </a>
      {user?.isAdmin ? (
        <Link to="/admin" className={`bottom-tab ${isAdmin ? 'is-active' : ''}`}>
          <ShieldCheck size={20} />
          <span>Organizer</span>
        </Link>
      ) : user ? (
        <Link to="/user/dashboard" className={`bottom-tab ${isPasses ? 'is-active' : ''}`}>
          <User size={20} />
          <span>Profile</span>
        </Link>
      ) : (
        <Link to="/auth" className={`bottom-tab ${isAuth ? 'is-active' : ''}`}>
          <User size={20} />
          <span>Sign In</span>
        </Link>
      )}
    </nav>
  );
}

function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-top">
          <BrandMark light />
          <p className="footer-tagline">
            Premier floodlit cricket stadium in Vajralapuram with natural turf, leather ball tournaments & digital matchday desk.
          </p>
        </div>
        <div className="footer-nav">
          <Link to="/tournaments">Tournaments</Link>
          <a href="/#location">Stadium Map & Location</a>
          <a href={STADIUM_MAP.shortUrl} target="_blank" rel="noopener noreferrer">Google Maps App</a>
          <a href={STADIUM_MAP.directionsUrl} target="_blank" rel="noopener noreferrer">Get Directions</a>
          <Link to="/status">Check Entry Status</Link>
          <Link to="/auth">Organizer Desk</Link>
        </div>
        <div className="footer-bottom">
          <small>© {new Date().getFullYear()} KMT Cricket Stadium. Vajralapuram.</small>
          <div className="pwa-indicator">
            <span className="dot-green" /> PWA Enabled • Offline Ready
          </div>
        </div>
      </div>
    </footer>
  );
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
      const [events, entries] = await Promise.all([
        listTournaments(admin),
        user ? listRegistrations(user) : Promise.resolve([]),
      ]);
      setTournaments(events);
      setRegistrations(entries);
      setError('');
    } catch (cause) {
      console.error(cause);
      setError('We could not load tournament fixtures. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user?.uid, admin]);

  useEffect(() => onDataChange(refresh), [user?.uid, admin]);
  return { tournaments, registrations, loading, error, refresh };
}

function LoadingState({ label = 'Loading matchday fixtures…' }) {
  return (
    <div className="state-card loading-state">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

function ErrorState({ message, retry }) {
  return (
    <div className="state-card error-state" role="alert">
      <ShieldAlert size={28} />
      <p>{message}</p>
      {retry && (
        <button type="button" className="btn btn-outline" onClick={retry}>
          Try Again
        </button>
      )}
    </div>
  );
}

function EmptyState({ title, copy, action }) {
  return (
    <div className="state-card empty-state">
      <div className="empty-icon-wrap">
        <TicketCheck size={28} />
      </div>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}

function EventBadge({ format, ballType }) {
  return (
    <div className="event-badges">
      <span className="badge badge-format">{format}</span>
      <span className="badge badge-ball">{ballType}</span>
    </div>
  );
}

function TournamentCard({ tournament, index = 0 }) {
  const crops = ['pitch', 'ball', 'practice', 'pavilion'];
  const imageCrop = crops[index % crops.length];
  const isClosingSoon = tournament.deadline && new Date(tournament.deadline).getTime() - Date.now() < 3 * 86400000;

  return (
    <article className="tournament-card">
      <div className="card-media">
        <CricketPhoto crop={imageCrop} alt={tournament.title} className="card-photo" />
        <div className="card-overlay" />
        <div className="card-top-tags">
          <EventBadge format={tournament.format} ballType={tournament.ballType} />
          {isClosingSoon && <span className="tag-urgent">Closing Soon</span>}
        </div>
        <div className="card-price-pill">
          <strong>{money(tournament.entryFee)}</strong>
          <span>/ team</span>
        </div>
      </div>

      <div className="card-body">
        <div className="card-dates">
          <Calendar size={14} />
          <span>
            {dateLabel(tournament.startsAt, { day: 'numeric', month: 'short' })}
            {tournament.endsAt && new Date(tournament.endsAt).toDateString() !== new Date(tournament.startsAt).toDateString()
              ? ` – ${dateLabel(tournament.endsAt, { day: 'numeric', month: 'short' })}`
              : ''}
          </span>
        </div>

        <h3 className="card-title">
          <Link to={`/t/${tournament.id}`}>{tournament.title}</Link>
        </h3>

        <div className="card-venue">
          <MapPin size={14} />
          <span>{tournament.venue || STADIUM_MAP.venue}</span>
        </div>

        {tournament.description && <p className="card-desc">{tournament.description}</p>}

        <div className="card-footer">
          <div className="card-deadline">
            <span>Registration deadline:</span>
            <strong>{dateLabel(tournament.deadline, { day: 'numeric', month: 'short' })}</strong>
          </div>
          <Link to={`/t/${tournament.id}`} className="btn btn-primary btn-sm">
            <span>View & Enter</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function HomePage() {
  const { tournaments, loading, error, refresh } = useData();
  const [format, setFormat] = useState('All');
  const [ball, setBall] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      const matchFormat = format === 'All' || t.format === format;
      const matchBall = ball === 'All' || t.ballType === ball;
      const matchSearch = `${t.title} ${t.venue} ${t.format}`.toLowerCase().includes(search.toLowerCase());
      return matchFormat && matchBall && matchSearch;
    });
  }, [tournaments, format, ball, search]);

  const activeTournamentsCount = tournaments.filter((t) => t.status === 'published').length;

  return (
    <div className="page-shell">
      <PwaInstallBanner />
      <PublicHeader />
      <main className="main-content">
        {/* Compact, Clean Mobile-First Sports Hero */}
        <section className="hero-compact">
          <div className="hero-container">
            <div className="hero-pill-badge">
              <span className="live-dot" />
              <span>Vajralapuram Matchday Portal</span>
            </div>
            <h1 className="hero-headline">
              YOUR XI. <span className="text-gold">UNDER LIGHTS.</span>
            </h1>
            <p className="hero-subtext">
              Official tournaments at KMT Cricket Stadium. Choose your fixture, register your team, and receive verified digital passes.
            </p>

            <div className="hero-stats-row">
              <div className="hero-stat">
                <strong>{loading ? '—' : activeTournamentsCount || tournaments.length}</strong>
                <span>Open Tournaments</span>
              </div>
              <div className="hero-stat-sep" />
              <div className="hero-stat">
                <strong>11</strong>
                <span>Players In XI</span>
              </div>
              <div className="hero-stat-sep" />
              <div className="hero-stat">
                <strong>4K</strong>
                <span>Floodlit Arena</span>
              </div>
            </div>

            <div className="hero-cta-group">
              <a href="#fixtures" className="btn btn-gold">
                <span>Browse Tournaments</span>
                <ArrowDownRight size={18} />
              </a>
              <Link to="/status" className="btn btn-outline-light">
                <Ticket size={16} />
                <span>My Team Pass</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Fixtures & Filters Section */}
        <section id="fixtures" className="fixtures-section">
          <div className="fixtures-header">
            <div>
              <h2 className="section-title">Upcoming Tournaments</h2>
              <p className="section-subtitle">Select a tournament format below to view team slots and register.</p>
            </div>
            <span className="results-count">
              {filtered.length} {filtered.length === 1 ? 'Tournament' : 'Tournaments'}
            </span>
          </div>

          {/* Clean Mobile Search & Filter Chips */}
          <div className="filter-panel">
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search tournaments, formats, venues…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search tournaments"
              />
              {search && (
                <button type="button" className="btn-clear" onClick={() => setSearch('')} aria-label="Clear search">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Horizontal Scrollable Format Chips */}
            <div className="chips-scroller" role="tablist" aria-label="Format filter">
              {['All', ...FORMATS].map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  role="tab"
                  aria-selected={format === fmt}
                  className={`chip ${format === fmt ? 'chip-active' : ''}`}
                  onClick={() => setFormat(fmt)}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Ball Type Chips */}
            <div className="chips-scroller-ball">
              {['All', ...ballTypes].map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`chip-sub ${ball === b ? 'chip-sub-active' : ''}`}
                  onClick={() => setBall(b)}
                >
                  {b === 'All' ? 'All Balls' : b}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} retry={refresh} />
          ) : filtered.length > 0 ? (
            <div className="tournaments-grid">
              {filtered.map((tournament, idx) => (
                <TournamentCard key={tournament.id} tournament={tournament} index={idx} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tournaments found"
              copy="Try adjusting your format or ball filters, or clear your search query."
              action={
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setFormat('All');
                    setBall('All');
                    setSearch('');
                  }}
                >
                  Reset All Filters
                </button>
              }
            />
          )}
        </section>

        {/* Stadium Location & Google Maps Section */}
        <section id="location" className="stadium-location-section">
          <div className="section-head-center">
            <span className="badge badge-gold">
              <MapPin size={13} />
              <span>Official Stadium Ground</span>
            </span>
            <h2 className="section-title">KMT Cricket Ground, Vajralapuram</h2>
            <p className="section-subtitle">
              Premier floodlit cricket venue with pro 22-yard turf, practice nets, player pavilions & ample parking. Tap below for turn-by-turn Google Maps navigation.
            </p>
          </div>
          <StadiumLocationCard />
        </section>

        {/* Clean Matchday Guide */}
        <section className="matchday-guide">
          <div className="guide-card">
            <div className="guide-header">
              <span className="guide-kicker">Matchday Process</span>
              <h3>Three Steps To The Crease</h3>
            </div>
            <div className="guide-steps">
              <div className="step-item">
                <span className="step-number">1</span>
                <div className="step-content">
                  <strong>Choose & Register</strong>
                  <p>Pick your fixture, fill your captain details and squad roster of up to 40 players.</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-number">2</span>
                <div className="step-content">
                  <strong>UPI / Desk Verification</strong>
                  <p>Submit your payment UTR reference. The stadium desk reviews and verifies your slot.</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-number">3</span>
                <div className="step-content">
                  <strong>Digital Team Pass</strong>
                  <p>Receive your confirmed matchday pass with QR code, match timings, and pitch allocation.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
      <MobileBottomNav />
    </div>
  );
}

function TournamentPage() {
  const { tournamentId } = useParams();
  const { tournaments, loading, error, refresh } = useData();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'rules' | 'venue'

  const tournament = tournaments.find((item) => item.id === tournamentId);

  if (loading) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <main className="main-content">
          <LoadingState label="Loading tournament details…" />
        </main>
        <PublicFooter />
        <MobileBottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <main className="main-content">
          <ErrorState message={error} retry={refresh} />
        </main>
        <PublicFooter />
        <MobileBottomNav />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <main className="main-content">
          <EmptyState
            title="Tournament fixture not found"
            copy="This tournament may have ended or the link is invalid."
            action={
              <Link to="/tournaments" className="btn btn-primary">
                Browse Tournaments
              </Link>
            }
          />
        </main>
        <PublicFooter />
        <MobileBottomNav />
      </div>
    );
  }

  const isClosed = tournament.deadline && new Date(tournament.deadline).getTime() < Date.now();

  return (
    <div className="page-shell">
      <PwaInstallBanner />
      <PublicHeader />
      <main className="main-content">
        {/* Sticky Sub-Header on Desktop */}
        <div className="fixture-topbar">
          <div className="fixture-topbar-inner">
            <Link to="/tournaments" className="back-button">
              <ArrowLeft size={16} />
              <span>All Tournaments</span>
            </Link>
            <div className="topbar-fee">
              <span>Entry Fee:</span>
              <strong>{money(tournament.entryFee)}</strong>
            </div>
          </div>
        </div>

        {/* Fixture Hero Card */}
        <section className="fixture-hero-card">
          <div className="fixture-hero-header">
            <EventBadge format={tournament.format} ballType={tournament.ballType} />
            <h1 className="fixture-title">{tournament.title}</h1>
            <div className="fixture-meta-grid">
              <div className="meta-item">
                <Calendar size={16} />
                <div>
                  <span>Tournament Dates</span>
                  <strong>
                    {dateLabel(tournament.startsAt)}
                    {tournament.endsAt && new Date(tournament.startsAt).toDateString() !== new Date(tournament.endsAt).toDateString()
                      ? ` – ${dateLabel(tournament.endsAt)}`
                      : ''}
                  </strong>
                </div>
              </div>
              <div className="meta-item">
                <MapPin size={16} />
                <div>
                  <span>Venue</span>
                  <strong>{tournament.venue || STADIUM_MAP.venue}</strong>
                  <a
                    href={STADIUM_MAP.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="venue-map-link"
                  >
                    <span>View Map & Directions</span>
                    <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
              <div className="meta-item">
                <Clock size={16} />
                <div>
                  <span>Registration Deadline</span>
                  <strong className={isClosed ? 'text-red' : ''}>
                    {isClosed ? 'Closed' : dateLabel(tournament.deadline)}
                  </strong>
                </div>
              </div>
            </div>
            {tournament.description && <p className="fixture-description">{tournament.description}</p>}
          </div>

          {/* Quick Segmented Tabs for Mobile */}
          <div className="tab-bar">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'register' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              <Ticket size={16} />
              <span>Team Registration</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'rules' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              <ShieldCheck size={16} />
              <span>Rules & Terms</span>
            </button>
          </div>
        </section>

        {/* Tab Content */}
        {activeTab === 'register' ? (
          <section id="register-form" className="registration-container">
            <RegistrationForm
              tournament={tournament}
              attribution={{
                source: searchParams.get('utm_source') || '',
                campaign: searchParams.get('utm_campaign') || '',
              }}
            />
          </section>
        ) : (
          <section className="rules-container">
            <div className="rules-card">
              <h3>Tournament Terms & Playing Conditions</h3>
              <div className="markdown-render">
                <Markdown>{tournament.termsMarkdown || 'Standard KMT Cricket Stadium tournament rules apply.'}</Markdown>
              </div>
              <div className="support-card">
                <Phone size={18} />
                <div>
                  <strong>Tournament Desk Assistance</strong>
                  {tournament.payment?.supportPhone && (
                    <a href={`tel:${tournament.payment.supportPhone.replace(/\s/g, '')}`}>{tournament.payment.supportPhone}</a>
                  )}
                  {tournament.payment?.supportEmail && (
                    <a href={`mailto:${tournament.payment.supportEmail}`}>{tournament.payment.supportEmail}</a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Floating Bottom Action Bar for Mobile */}
      <aside className="mobile-action-bar">
        <div className="action-bar-info">
          <span>Fee per team</span>
          <strong>{money(tournament.entryFee)}</strong>
        </div>
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            setActiveTab('register');
            document.getElementById('register-form')?.scrollIntoView({ behavior: 'smooth' });
          }}
          disabled={isClosed}
        >
          {isClosed ? 'Closed' : 'Register Team'}
        </button>
      </aside>

      <PublicFooter />
      <MobileBottomNav />
    </div>
  );
}

function RegistrationForm({ tournament, attribution }) {
  const [values, setValues] = useState({
    teamName: '',
    captainName: '',
    email: '',
    phone: '',
    players: [{ name: '', jersey: '', role: 'Batter' }],
    customAnswers: {},
    paymentMethod: 'upi',
    reference: '',
    acceptedTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const setPlayer = (index, key, value) =>
    setValues((current) => ({
      ...current,
      players: current.players.map((player, i) => (i === index ? { ...player, [key]: value } : player)),
    }));

  const submit = async (event) => {
    event.preventDefault();
    const next = validateRegistration(tournament, values);
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const id = await createRegistration({
        ...values,
        tournamentId: tournament.id,
        email: values.email.trim().toLowerCase(),
        ownerUid: null,
        status: 'PENDING',
        adminNote: '',
        attribution,
        submittedAt: new Date().toISOString(),
      });
      setResult(id);
    } catch (error) {
      console.error(error);
      setErrors({ submit: 'Registration could not be saved. Check connection and retry.' });
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="success-ticket-card" role="status">
        <div className="ticket-cutout-top" />
        <div className="success-badge-wrap">
          <Check size={32} />
        </div>
        <span className="success-kicker">Registration Submitted</span>
        <h2 className="success-title">Your Team Is On The Sheet</h2>
        <p className="success-desc">
          Your entry ID is <strong className="id-code">{result}</strong>. The stadium desk will verify your payment reference and issue your match pass.
        </p>

        <div className="ticket-summary">
          <div>
            <span>Team:</span>
            <strong>{values.teamName}</strong>
          </div>
          <div>
            <span>Captain:</span>
            <strong>{values.captainName}</strong>
          </div>
          <div>
            <span>Payment:</span>
            <strong>{values.paymentMethod === 'upi' ? `UPI (${values.reference})` : 'Offline at Desk'}</strong>
          </div>
        </div>

        <div className="ticket-actions">
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => {
              navigator.clipboard?.writeText(result);
              setCopiedId(true);
              setTimeout(() => setCopiedId(false), 2000);
            }}
          >
            {copiedId ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedId ? 'Copied ID' : 'Copy Registration ID'}</span>
          </button>
          <a
            href={STADIUM_MAP.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-block"
          >
            <Navigation size={16} />
            <span>Get Directions to Stadium (Google Maps)</span>
          </a>
          <Link to={`/auth?returnTo=${encodeURIComponent('/user/dashboard')}`} className="btn btn-primary btn-block">
            <span>Sign In To Track Pass</span>
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="ticket-cutout-bottom" />
      </div>
    );
  }

  const fieldError = (key) => (errors[key] ? <span className="field-error-text">{errors[key]}</span> : null);

  return (
    <form className="modern-form" onSubmit={submit} noValidate>
      {errors.deadline && <div className="alert alert-danger">{errors.deadline}</div>}
      {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}

      {/* Step 1: Team & Captain */}
      <fieldset className="form-step-card">
        <legend className="step-legend">
          <span className="step-tag">1</span>
          <div>
            <h3>Team & Captain Contact</h3>
            <p>Official contact details for tournament communications.</p>
          </div>
        </legend>

        <div className="inputs-grid">
          <label className="input-field">
            <span>Team Name *</span>
            <input
              type="text"
              placeholder="e.g. Bangalore Strikers XI"
              value={values.teamName}
              maxLength={80}
              onChange={(e) => set('teamName', e.target.value)}
              className={errors.teamName ? 'has-error' : ''}
            />
            {fieldError('teamName')}
          </label>

          <label className="input-field">
            <span>Captain Name *</span>
            <input
              type="text"
              placeholder="Full name of Captain"
              value={values.captainName}
              maxLength={80}
              onChange={(e) => set('captainName', e.target.value)}
              className={errors.captainName ? 'has-error' : ''}
            />
            {fieldError('captainName')}
          </label>

          <label className="input-field">
            <span>Email Address *</span>
            <input
              type="email"
              placeholder="captain@example.com"
              value={values.email}
              autoComplete="email"
              onChange={(e) => set('email', e.target.value)}
              className={errors.email ? 'has-error' : ''}
            />
            {fieldError('email')}
          </label>

          <label className="input-field">
            <span>Phone / WhatsApp *</span>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={values.phone}
              autoComplete="tel"
              onChange={(e) => set('phone', e.target.value)}
              className={errors.phone ? 'has-error' : ''}
            />
            {fieldError('phone')}
          </label>
        </div>
      </fieldset>

      {/* Step 2: Squad Roster */}
      <fieldset className="form-step-card">
        <legend className="step-legend">
          <span className="step-tag">2</span>
          <div>
            <h3>Squad Roster</h3>
            <p>
              {values.players.length} of 40 players registered. Minimum 1 player required.
            </p>
          </div>
        </legend>

        <div className="players-list">
          {values.players.map((player, idx) => (
            <div className="player-row-card" key={idx}>
              <span className="player-index">#{idx + 1}</span>
              <div className="player-inputs">
                <input
                  type="text"
                  placeholder={`Player ${idx + 1} Name *`}
                  value={player.name}
                  maxLength={80}
                  onChange={(e) => setPlayer(idx, 'name', e.target.value)}
                  className="player-input-name"
                />
                <input
                  type="text"
                  placeholder="Jersey #"
                  value={player.jersey}
                  maxLength={5}
                  onChange={(e) => setPlayer(idx, 'jersey', e.target.value)}
                  className="player-input-jersey"
                />
                <select
                  value={player.role || 'Batter'}
                  onChange={(e) => setPlayer(idx, 'role', e.target.value)}
                  className="player-input-role"
                >
                  <option value="Batter">Batter</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-rounder">All-rounder</option>
                  <option value="Wicket-keeper">WK / Batter</option>
                </select>
              </div>
              {values.players.length > 1 && (
                <button
                  type="button"
                  className="btn-delete-player"
                  onClick={() => set('players', values.players.filter((_, i) => i !== idx))}
                  aria-label={`Remove Player ${idx + 1}`}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {fieldError('players')}

          <button
            type="button"
            className="btn btn-outline btn-block mt-2"
            disabled={values.players.length >= 40}
            onClick={() => set('players', [...values.players, { name: '', jersey: '', role: 'Batter' }])}
          >
            <Plus size={16} />
            <span>Add Another Player</span>
          </button>
        </div>
      </fieldset>

      {/* Step 3: Custom Organizer Questions */}
      {(tournament.formFields || []).length > 0 && (
        <fieldset className="form-step-card">
          <legend className="step-legend">
            <span className="step-tag">3</span>
            <div>
              <h3>Additional Information</h3>
              <p>Questions required by the stadium organizer.</p>
            </div>
          </legend>

          <div className="inputs-grid">
            {tournament.formFields.map((field) => (
              <label key={field.id} className="input-field">
                <span>
                  {field.label} {field.required && '*'}
                </span>
                {field.type === 'select' ? (
                  <select
                    value={values.customAnswers[field.id] || ''}
                    onChange={(e) =>
                      setValues((curr) => ({
                        ...curr,
                        customAnswers: { ...curr.customAnswers, [field.id]: e.target.value },
                      }))
                    }
                  >
                    <option value="">Select option</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={Boolean(values.customAnswers[field.id])}
                      onChange={(e) =>
                        setValues((curr) => ({
                          ...curr,
                          customAnswers: { ...curr.customAnswers, [field.id]: e.target.checked },
                        }))
                      }
                    />
                    <span>Yes / Confirm</span>
                  </label>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={values.customAnswers[field.id] || ''}
                    onChange={(e) =>
                      setValues((curr) => ({
                        ...curr,
                        customAnswers: { ...curr.customAnswers, [field.id]: e.target.value },
                      }))
                    }
                  />
                )}
                {fieldError(field.id)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Step 4: Payment Verification */}
      <fieldset className="form-step-card">
        <legend className="step-legend">
          <span className="step-tag">{tournament.formFields?.length ? '4' : '3'}</span>
          <div>
            <h3>Entry Fee Payment</h3>
            <p>Choose your payment method and enter your transfer reference.</p>
          </div>
        </legend>

        <div className="payment-selector-tabs">
          <label className={`payment-pill ${values.paymentMethod === 'upi' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="payment"
              value="upi"
              checked={values.paymentMethod === 'upi'}
              onChange={() => set('paymentMethod', 'upi')}
            />
            <div className="payment-pill-text">
              <strong>UPI Direct Transfer</strong>
              <span>Instant QR payment verification</span>
            </div>
          </label>
          <label className={`payment-pill ${values.paymentMethod === 'offline' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="payment"
              value="offline"
              checked={values.paymentMethod === 'offline'}
              onChange={() => set('paymentMethod', 'offline')}
            />
            <div className="payment-pill-text">
              <strong>Pay at Stadium Desk</strong>
              <span>Cash or card on matchday</span>
            </div>
          </label>
        </div>

        {values.paymentMethod === 'upi' && (
          <div className="upi-box">
            {tournament.payment?.upiId ? (
              <UPIPaymentQR tournament={tournament} />
            ) : (
              <p className="upi-fallback-note">Please ask the stadium organizer for the official UPI ID.</p>
            )}
            <label className="input-field mt-3">
              <span>UPI UTR / Bank Reference Number *</span>
              <input
                type="text"
                placeholder="12-digit transaction ID or UTR"
                value={values.reference}
                maxLength={60}
                onChange={(e) => set('reference', e.target.value)}
                className={errors.reference ? 'has-error' : ''}
              />
              {fieldError('reference')}
              <small className="field-hint">Found in Google Pay, PhonePe, Paytm, or bank transfer confirmation.</small>
            </label>
          </div>
        )}

        {values.paymentMethod === 'offline' && (
          <div className="offline-box">
            <p>
              {tournament.payment?.offlineInstructions ||
                'Pay the entry fee at the KMT Cricket Stadium registration counter at least 1 hour prior to your first fixture.'}
            </p>
            <label className="input-field mt-3">
              <span>Receipt Number / Notes (Optional)</span>
              <input
                type="text"
                placeholder="Optional desk receipt or payer note"
                value={values.reference}
                maxLength={60}
                onChange={(e) => set('reference', e.target.value)}
              />
            </label>
          </div>
        )}
      </fieldset>

      {/* Step 5: Terms & Submit */}
      <div className="form-submit-card">
        <label className="terms-checkbox-label">
          <input
            type="checkbox"
            checked={values.acceptedTerms}
            onChange={(e) => set('acceptedTerms', e.target.checked)}
          />
          <span>
            I accept the tournament playing conditions, conduct rules, and stadium desk decisions. *
          </span>
        </label>
        {fieldError('acceptedTerms')}

        <button type="submit" className="btn btn-gold btn-block btn-lg" disabled={busy || Boolean(errors.deadline)}>
          {busy ? (
            <span>Submitting Registration…</span>
          ) : (
            <>
              <span>Submit Team Registration</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function UPIPaymentQR({ tournament }) {
  const [image, setImage] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmt, setCopiedAmt] = useState(false);
  const upiId = tournament.payment?.upiId;

  const upiParams = useMemo(() => {
    if (!upiId) return '';
    const params = new URLSearchParams({
      pa: upiId.trim(),
      pn: 'KMT Cricket Stadium',
      am: String(Number(tournament.entryFee || 0).toFixed(2)),
      cu: 'INR',
      tn: tournament.title || 'Tournament Entry Fee',
    });
    return params.toString();
  }, [upiId, tournament.entryFee, tournament.title]);

  const upiUri = upiParams ? `upi://pay?${upiParams}` : '';

  useEffect(() => {
    if (!upiUri) {
      setImage('');
      return;
    }
    QRCode.toDataURL(upiUri, {
      width: 200,
      margin: 1,
      color: { dark: '#0b3829', light: '#ffffff' },
    })
      .then(setImage)
      .catch(() => setImage(''));
  }, [upiUri]);

  if (!upiId) return null;

  return (
    <div className="upi-payment-block">
      {/* 1. Mobile Direct UPI App Pay Button */}
      <div className="upi-pay-direct-card">
        <div className="upi-direct-top">
          <span className="direct-kicker">Instant Mobile Payment</span>
          <h4>Pay directly via your UPI App</h4>
          <p>Tap below to launch Google Pay, PhonePe, Paytm, CRED or BHIM with pre-filled amount and recipient.</p>
        </div>

        <a href={upiUri} className="btn btn-gold btn-block btn-lg upi-main-launch-btn">
          <Smartphone size={20} />
          <span>Pay {money(tournament.entryFee)} in UPI App</span>
          <ExternalLink size={17} />
        </a>

        {/* Quick App Intent Selectors */}
        <div className="upi-apps-row">
          <span className="apps-label">Supported payment apps:</span>
          <div className="upi-apps-grid">
            <a href={upiUri} className="app-intent-btn gpay">
              <span>Google Pay</span>
              <ArrowUpRight size={13} />
            </a>
            <a href={upiUri} className="app-intent-btn phonepe">
              <span>PhonePe</span>
              <ArrowUpRight size={13} />
            </a>
            <a href={upiUri} className="app-intent-btn paytm">
              <span>Paytm</span>
              <ArrowUpRight size={13} />
            </a>
            <a href={upiUri} className="app-intent-btn bhim">
              <span>BHIM / CRED</span>
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>

      <div className="upi-or-divider">
        <span>or scan QR code from camera / another phone</span>
      </div>

      {/* 2. QR Code Widget & Copy Details */}
      <div className="upi-qr-widget">
        {image && (
          <div className="qr-box-wrap">
            <div className="qr-box">
              <img src={image} alt={`UPI payment QR for ${tournament.title}`} />
            </div>
            <a
              href={image}
              download={`${(tournament.title || 'kmt-tournament').replace(/\s+/g, '-').toLowerCase()}-upi-qr.png`}
              className="btn-download-qr"
            >
              <Download size={13} /> Save QR Image
            </a>
          </div>
        )}
        <div className="upi-info">
          <div className="upi-row">
            <span>Stadium Payee UPI ID:</span>
            <div className="upi-id-copy-row">
              <code>{upiId}</code>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  navigator.clipboard?.writeText(upiId);
                  setCopiedUpi(true);
                  setTimeout(() => setCopiedUpi(false), 2000);
                }}
              >
                {copiedUpi ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedUpi ? 'Copied' : 'Copy ID'}</span>
              </button>
            </div>
          </div>

          <div className="upi-amount-row">
            <div>
              <span>Amount:</span>
              <strong className="text-gold">{money(tournament.entryFee)}</strong>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                navigator.clipboard?.writeText(String(Number(tournament.entryFee || 0).toFixed(0)));
                setCopiedAmt(true);
                setTimeout(() => setCopiedAmt(false), 2000);
              }}
            >
              {copiedAmt ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedAmt ? 'Copied' : 'Copy Amt'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Post-Payment Guidance */}
      <div className="upi-post-guide">
        <span className="guide-badge">Step 2: Submit UTR</span>
        <p>
          After paying, copy the <strong>12-digit UTR / Transaction ID</strong> from your UPI app receipt and paste it below so the stadium desk can confirm your team entry.
        </p>
      </div>
    </div>
  );
}

function StatusPage() {
  const { user } = useAuth();
  return (
    <div className="page-shell">
      <PwaInstallBanner />
      <PublicHeader />
      <main className="main-content">
        <div className="status-hero">
          <div className="status-hero-card">
            <div className="status-icon-badge">
              <ShieldCheck size={28} />
            </div>
            <h1>Track Your Match Pass</h1>
            <p>
              Check your team registration status, view confirmed matchday entry passes, and download printable roster cards.
            </p>
            {user ? (
              <Link to="/user/dashboard" className="btn btn-gold btn-lg">
                <span>View My Entries Dashboard</span>
                <ArrowRight size={18} />
              </Link>
            ) : (
              <div className="status-auth-box">
                <p>Sign in with your verified email to automatically link guest registrations:</p>
                <Link to={`/auth?returnTo=${encodeURIComponent('/user/dashboard')}`} className="btn btn-gold btn-lg">
                  <span>Sign In To View Status</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
      <MobileBottomNav />
    </div>
  );
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
    if (user) {
      navigate(user.isAdmin ? '/admin' : returnTo, { replace: true, state: { from: location.pathname } });
    }
  }, [user?.uid, user?.isAdmin]);

  const run = async (action) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (cause) {
      setError(cause.message?.replace('Firebase: ', '') || 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell">
      <PublicHeader />
      <main className="main-content auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-brand-pill">KMT Stadium Account</span>
            <h2>{mode === 'signin' ? 'Sign In To KMT Cricket' : 'Create Your Player Account'}</h2>
            <p>Track team registrations, verify entry fees, and view matchday passes.</p>
          </div>

          <button
            type="button"
            className="btn btn-google btn-block"
            onClick={() => run(signInGoogle)}
            disabled={busy}
          >
            <span className="google-icon">G</span>
            <span>Continue with Google</span>
          </button>

          <div className="divider">
            <span>or with email</span>
          </div>

          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              run(() =>
                mode === 'signin'
                  ? signInEmail(email, password)
                  : registerEmail(email, password).then(() =>
                      setMessage('Verification email sent! Check your inbox to verify before claiming registrations.')
                    )
              );
            }}
          >
            <label className="input-field">
              <span>Email Address</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="captain@example.com"
              />
            </label>

            <label className="input-field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </label>

            <button type="submit" className="btn btn-gold btn-block" disabled={busy}>
              {busy ? 'Processing…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {error && <div className="alert alert-danger mt-3">{error}</div>}
          {message && <div className="alert alert-success mt-3">{message}</div>}

          <div className="auth-footer-toggle">
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
                setMessage('');
              }}
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already registered? Sign in here'}
            </button>
            {user && !user.emailVerified && (
              <button type="button" className="text-link mt-1" onClick={() => run(resendVerification)}>
                Resend verification email
              </button>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
      <MobileBottomNav />
    </div>
  );
}

function StatusChip({ status }) {
  const s = String(status || '').toLowerCase();
  return (
    <span className={`status-pill status-${s}`}>
      {status === 'PENDING' ? 'Pending Review' : status === 'CONFIRMED' ? 'Confirmed Pass' : 'Rejected'}
    </span>
  );
}

function AppShell({ children, active }) {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = user?.isAdmin
    ? [
        ['Overview', '/admin', Trophy],
        ['Tournaments', '/admin/tournaments', Layers],
        ['Payment Queue', '/admin/registrations', TicketCheck],
      ]
    : [['My Entries', '/user/dashboard', Ticket]];

  return (
    <div className="admin-shell">
      {/* Top Navbar */}
      <header className="admin-header">
        <button
          type="button"
          className="btn-icon mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <BrandMark />

        <div className="admin-user-info">
          <span className="user-email">{user?.displayName || user?.email}</span>
          <button type="button" className="btn-signout" onClick={signOut} aria-label="Sign out">
            <LogOut size={16} />
            <span className="signout-text">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Nav Tabs Bar */}
      <div className={`admin-nav-tabs ${mobileMenuOpen ? 'is-open' : ''}`}>
        <div className="nav-tabs-scroller">
          {links.map(([label, to, Icon]) => (
            <Link
              key={to}
              to={to}
              className={`nav-tab-item ${active === to ? 'is-active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
          <Link to="/tournaments" className="nav-tab-item nav-tab-external">
            <ExternalLink size={14} />
            <span>View Public Site</span>
          </Link>
        </div>
      </div>

      <main className="admin-content-stage">{children}</main>
    </div>
  );
}

function AdminDashboard() {
  const { tournaments, registrations, loading, error, refresh } = useData();
  const pending = registrations.filter((row) => row.status === 'PENDING');
  const confirmed = registrations.filter((row) => row.status === 'CONFIRMED');

  return (
    <AppShell active="/admin">
      <div className="dashboard-container">
        <div className="page-title-row">
          <div>
            <span className="kicker-tag">KMT Desk</span>
            <h2>Organizer Overview</h2>
          </div>
          <Link to="/admin/registrations" className="btn btn-gold btn-sm">
            <span>Review Payment Queue ({pending.length})</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card highlight-kpi">
                <span>Pending Review</span>
                <strong>{pending.length}</strong>
                <small>Needs payment check</small>
              </div>
              <div className="kpi-card">
                <span>Confirmed Teams</span>
                <strong>{confirmed.length}</strong>
                <small>Passes issued</small>
              </div>
              <div className="kpi-card">
                <span>Active Tournaments</span>
                <strong>{tournaments.filter((t) => t.status === 'published').length}</strong>
                <small>Published fixtures</small>
              </div>
            </div>

            {/* Quick Pending Queue */}
            <div className="desk-section">
              <div className="section-head">
                <div>
                  <h3>Pending Payment Checks</h3>
                  <p>Verify bank reference or UPI receipt before confirming.</p>
                </div>
                <Link to="/admin/registrations" className="text-link">
                  See all ({registrations.length})
                </Link>
              </div>

              {pending.length > 0 ? (
                <div className="queue-cards-list">
                  {pending.slice(0, 5).map((row) => {
                    const event = tournaments.find((t) => t.id === row.tournamentId);
                    return (
                      <div className="queue-card" key={row.id}>
                        <div className="queue-card-top">
                          <div>
                            <strong>{row.teamName}</strong>
                            <span>
                              {event?.title || 'Tournament'} • Capt. {row.captainName}
                            </span>
                          </div>
                          <StatusChip status={row.status} />
                        </div>
                        <div className="queue-card-details">
                          <div>
                            <span>UTR / Ref:</span>
                            <code>{row.reference || 'None'}</code>
                          </div>
                          <div>
                            <span>Contact:</span>
                            <span>{row.phone}</span>
                          </div>
                        </div>
                        <div className="queue-card-actions">
                          <Link to="/admin/registrations" className="btn btn-sm btn-outline">
                            Review in Queue
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="clean-empty-box">
                  <Check size={20} className="text-green" />
                  <p>All payment references are reviewed. No pending approvals!</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function UserDashboard() {
  const { user, resendVerification, refreshVerification } = useAuth();
  const { tournaments, registrations, loading, error, refresh } = useData();

  return (
    <AppShell active="/user/dashboard">
      <div className="dashboard-container">
        <div className="page-title-row">
          <div>
            <span className="kicker-tag">Player Portal</span>
            <h2>My Matchday Entries</h2>
          </div>
          <Link to="/tournaments" className="btn btn-outline btn-sm">
            <Plus size={15} />
            <span>Enter Tournament</span>
          </Link>
        </div>

        {!user?.emailVerified && (
          <div className="alert alert-warning email-banner">
            <ShieldAlert size={20} />
            <div className="email-banner-text">
              <strong>Email Verification Needed</strong>
              <p>Verify your email to link registrations submitted as a guest.</p>
            </div>
            <div className="email-banner-actions">
              <button type="button" className="btn btn-sm btn-outline" onClick={resendVerification}>
                Resend Link
              </button>
              <button type="button" className="btn btn-sm btn-gold" onClick={refreshVerification}>
                Check Status
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : registrations.length > 0 ? (
          <div className="user-passes-list">
            {registrations.map((row) => (
              <UserRegistrationCard
                key={row.id}
                row={row}
                tournament={tournaments.find((t) => t.id === row.tournamentId)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Tournament Entries Found"
            copy="Once you submit a registration using your verified email, your team match pass will appear here."
            action={
              <Link to="/tournaments" className="btn btn-gold">
                Browse Open Tournaments
              </Link>
            }
          />
        )}
      </div>
    </AppShell>
  );
}

function UserRegistrationCard({ row, tournament }) {
  const [copied, setCopied] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showMap, setShowMap] = useState(false);

  return (
    <article className="match-pass-card">
      <div className="pass-header">
        <div>
          <span className="pass-tournament-name">{tournament?.title || 'Cricket Tournament'}</span>
          <h3 className="pass-team-name">{row.teamName}</h3>
          <p className="pass-captain">Captain: {row.captainName}</p>
        </div>
        <StatusChip status={row.status} />
      </div>

      <div className="pass-specs">
        <div>
          <span>First Match</span>
          <strong>{tournament ? dateLabel(tournament.startsAt) : 'TBA'}</strong>
        </div>
        <div>
          <span>Venue</span>
          <strong>{tournament?.venue || STADIUM_MAP.venue}</strong>
        </div>
        <div>
          <span>Payment</span>
          <strong>{row.paymentMethod === 'upi' ? 'UPI Direct' : 'Stadium Desk'}</strong>
        </div>
      </div>

      {/* Match Ground Google Maps & Directions */}
      <div className="pass-venue-section">
        <div className="pass-venue-header">
          <div className="pass-venue-meta">
            <span className="pass-venue-kicker">Match Ground</span>
            <div className="pass-venue-name">
              <MapPin size={15} className="text-gold" />
              <strong>{tournament?.venue || STADIUM_MAP.venue}</strong>
            </div>
            <p className="pass-venue-address">{STADIUM_MAP.address}</p>
          </div>
          <div className="pass-venue-actions">
            <a
              href={STADIUM_MAP.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-gold"
              title="Navigate to stadium via Google Maps"
            >
              <Navigation size={13} />
              <span>Directions</span>
            </a>
            <a
              href={STADIUM_MAP.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline"
              title="Open stadium location in Google Maps app"
            >
              <ExternalLink size={13} />
              <span>Maps</span>
            </a>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setShowMap(!showMap)}
              aria-label={showMap ? 'Hide ground map' : 'View ground map'}
            >
              <span>{showMap ? 'Hide Map' : 'View Map'}</span>
              <ChevronDown size={13} className={showMap ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>

        {showMap && (
          <div className="pass-embedded-map">
            <iframe
              src={STADIUM_MAP.embedUrl}
              title={`Google Map - ${tournament?.venue || STADIUM_MAP.venue}`}
              width="100%"
              height="200"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>

      <div className="pass-footer">
        <div className="pass-id-row">
          <span>Reg ID: <code>{row.id}</code></span>
          <button
            type="button"
            className="btn-copy-id"
            onClick={() => {
              navigator.clipboard?.writeText(row.id);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            aria-label="Copy Registration ID"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        <button
          type="button"
          className="btn-toggle-roster"
          onClick={() => setShowRoster(!showRoster)}
        >
          <span>{row.players?.length || 0} Players</span>
          <ChevronDown size={15} className={showRoster ? 'rotate-180' : ''} />
        </button>
      </div>

      {showRoster && (
        <div className="pass-roster-drawer">
          <h4>Team Squad Roster</h4>
          <div className="pass-roster-chips">
            {(row.players || []).map((p, idx) => (
              <span key={idx} className="roster-player-chip">
                <strong>{p.name}</strong>
                {p.jersey && <small>#{p.jersey}</small>}
                {p.role && <small>({p.role})</small>}
              </span>
            ))}
          </div>
        </div>
      )}

      {row.adminNote && (
        <div className="pass-admin-note">
          <strong>Organizer Note:</strong> {row.adminNote}
        </div>
      )}

      {row.status === 'CONFIRMED' && <ConfirmationPass row={row} tournament={tournament} />}
    </article>
  );
}

function ConfirmationPass({ row, tournament }) {
  return (
    <div className="printable-pass-action">
      <div className="pass-print-venue-note">
        <MapPin size={14} className="text-gold" />
        <div className="pass-print-venue-text">
          <span><strong>Ground:</strong> {tournament?.venue || STADIUM_MAP.venue} • {STADIUM_MAP.address}</span>
          <a href={STADIUM_MAP.shortUrl} target="_blank" rel="noopener noreferrer" className="print-maps-link">
            Google Maps: {STADIUM_MAP.shortUrl}
          </a>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-gold btn-block"
        onClick={(event) => {
          const pass = event.currentTarget.closest('.match-pass-card');
          pass.classList.add('print-target');
          window.print();
          pass.classList.remove('print-target');
        }}
      >
        <Download size={16} />
        <span>Save / Print Matchday Pass (PDF)</span>
      </button>
    </div>
  );
}

function AdminTournaments() {
  const { tournaments, loading, error, refresh } = useData();
  const [selectedId, setSelectedId] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => blankTournament());
  const [campaignSource, setCampaignSource] = useState('whatsapp');
  const [campaignName, setCampaignName] = useState('');
  const [qr, setQr] = useState('');
  const [copyState, setCopyState] = useState('Copy Link');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (selectedId) {
      const found = tournaments.find((item) => item.id === selectedId);
      if (found) {
        setForm({
          ...found,
          startsAtInput: dateTimeValue(found.startsAt),
          endsAtInput: dateTimeValue(found.endsAt),
          deadlineInput: dateTimeValue(found.deadline),
        });
      }
    }
  }, [selectedId, tournaments]);

  function blankTournament() {
    return {
      id: '',
      title: '',
      format: 'T20',
      ballType: 'Leather Ball',
      venue: 'KMT Cricket Stadium, Vajralapuram',
      startsAtInput: '',
      endsAtInput: '',
      deadlineInput: '',
      entryFee: '',
      status: 'draft',
      description: '',
      termsMarkdown:
        '## Tournament Terms\n\n- Report 45 minutes prior to match start.\n- Proper cricket attire and safety kit required.\n- Umpire and organizer decisions are final.',
      payment: { upiId: '', offlineInstructions: '', supportPhone: '', supportEmail: '' },
      formFields: [],
    };
  }

  const change = (key, value) => setForm((curr) => ({ ...curr, [key]: value }));
  const changePayment = (key, value) =>
    setForm((curr) => ({ ...curr, payment: { ...curr.payment, [key]: value } }));

  const addField = () => {
    const id = `field-${crypto.randomUUID().slice(0, 8)}`;
    change('formFields', [
      ...(form.formFields || []),
      { id, label: '', type: 'text', required: false, options: [] },
    ]);
  };

  const updateField = (id, key, value) => {
    change(
      'formFields',
      (form.formFields || []).map((field) => (field.id === id ? { ...field, [key]: value } : field))
    );
  };

  const removeField = (id) => {
    change('formFields', (form.formFields || []).filter((field) => field.id !== id));
  };

  const save = async (event) => {
    event.preventDefault();
    setFormError('');
    if (
      !form.title.trim() ||
      !form.venue.trim() ||
      !form.startsAtInput ||
      !form.deadlineInput ||
      !Number.isFinite(Number(form.entryFee)) ||
      Number(form.entryFee) < 0
    ) {
      setFormError('Please enter a title, venue, match date, registration deadline, and valid entry fee.');
      return;
    }
    if (
      form.formFields?.some(
        (field) =>
          !field.label.trim() ||
          (field.type === 'select' && !field.options?.some((option) => option.trim()))
      )
    ) {
      setFormError('Every custom field needs a label, and dropdowns need at least one option.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const { startsAtInput, endsAtInput, deadlineInput, ...details } = form;
      const value = {
        ...details,
        title: form.title.trim(),
        venue: form.venue.trim(),
        entryFee: Number(form.entryFee),
        startsAt: dateIso(startsAtInput),
        endsAt: dateIso(endsAtInput || startsAtInput),
        deadline: dateIso(deadlineInput),
      };
      if (!form.id) {
        const id = await addTournament(value);
        setSelectedId(id);
      } else {
        await saveTournament(value);
      }
      setNotice('Tournament fixture saved successfully.');
    } catch (cause) {
      console.error(cause);
      setFormError('Could not save tournament. Check admin permissions.');
    } finally {
      setBusy(false);
    }
  };

  const generateQr = async () => {
    if (!form.id) return;
    const url = campaignUrl(form.id, campaignSource, campaignName);
    try {
      setQr(await QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#0b3829', light: '#ffffff' } }));
    } catch {
      setFormError('Could not generate campaign QR code.');
    }
  };

  const shareUrl = form.id ? campaignUrl(form.id, campaignSource, campaignName) : '';

  return (
    <AppShell active="/admin/tournaments">
      <div className="dashboard-container">
        <div className="page-title-row">
          <div>
            <span className="kicker-tag">Desk Setup</span>
            <h2>Tournaments Configuration</h2>
          </div>
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={() => {
              setForm(blankTournament());
              setSelectedId('');
              setNotice('');
              setQr('');
            }}
          >
            <Plus size={16} />
            <span>Create New</span>
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : (
          <div className="admin-two-col">
            {/* Tournaments Select List */}
            <aside className="admin-side-list">
              <span className="side-list-title">All Fixtures ({tournaments.length})</span>
              <div className="side-list-items">
                {tournaments.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`side-item-btn ${selectedId === t.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedId(t.id);
                      setNotice('');
                      setQr('');
                      setFormError('');
                    }}
                  >
                    <strong>{t.title}</strong>
                    <span>
                      {t.format} • {money(t.entryFee)}
                    </span>
                    <span className={`status-badge-small ${t.status === 'published' ? 'is-pub' : 'is-draft'}`}>
                      {t.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Form Editor */}
            <div className="admin-main-form-panel">
              <form onSubmit={save} className="admin-fixture-form">
                <div className="form-group-card">
                  <h3>Fixture Essentials</h3>
                  <div className="inputs-grid">
                    <label className="input-field">
                      <span>Tournament Title *</span>
                      <input
                        required
                        value={form.title}
                        onChange={(e) => change('title', e.target.value)}
                        placeholder="e.g. KMT Champions Trophy 2026"
                      />
                    </label>

                    <label className="input-field">
                      <span>Format</span>
                      <select value={form.format} onChange={(e) => change('format', e.target.value)}>
                        {FORMATS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="input-field">
                      <span>Ball Type</span>
                      <select value={form.ballType} onChange={(e) => change('ballType', e.target.value)}>
                        {ballTypes.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="input-field">
                      <span>Venue</span>
                      <input required value={form.venue} onChange={(e) => change('venue', e.target.value)} />
                    </label>

                    <label className="input-field">
                      <span>First Match (Start) *</span>
                      <input
                        type="datetime-local"
                        required
                        value={form.startsAtInput}
                        onChange={(e) => change('startsAtInput', e.target.value)}
                      />
                    </label>

                    <label className="input-field">
                      <span>Last Match (End)</span>
                      <input
                        type="datetime-local"
                        value={form.endsAtInput}
                        onChange={(e) => change('endsAtInput', e.target.value)}
                      />
                    </label>

                    <label className="input-field">
                      <span>Registration Deadline *</span>
                      <input
                        type="datetime-local"
                        required
                        value={form.deadlineInput}
                        onChange={(e) => change('deadlineInput', e.target.value)}
                      />
                    </label>

                    <label className="input-field">
                      <span>Team Entry Fee (INR) *</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        required
                        value={form.entryFee}
                        onChange={(e) => change('entryFee', e.target.value)}
                      />
                    </label>

                    <label className="input-field">
                      <span>Visibility</span>
                      <select value={form.status} onChange={(e) => change('status', e.target.value)}>
                        <option value="draft">Draft (Hidden)</option>
                        <option value="published">Published (Live)</option>
                      </select>
                    </label>
                  </div>

                  <label className="input-field mt-3">
                    <span>Short Description</span>
                    <textarea
                      rows="2"
                      value={form.description}
                      onChange={(e) => change('description', e.target.value)}
                      placeholder="Brief overview of prizes, overs, and eligibility"
                    />
                  </label>
                </div>

                <div className="form-group-card">
                  <div className="section-head">
                    <div>
                      <h3>Custom Registration Questions</h3>
                      <p>Ask teams additional details during entry (e.g. Village name, Mandal, club affiliation).</p>
                    </div>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addField}>
                      <Plus size={15} />
                      <span>Add Question</span>
                    </button>
                  </div>

                  {(!form.formFields || form.formFields.length === 0) ? (
                    <p className="field-hint">
                      No extra questions added. Standard fields (Team name, Captain, email, phone, and player squad) are always collected automatically.
                    </p>
                  ) : (
                    <div className="builder-fields-list">
                      {form.formFields.map((field, index) => (
                        <div className="builder-field-card" key={field.id}>
                          <div className="builder-field-header">
                            <span className="builder-field-num">Question #{index + 1}</span>
                            <button
                              type="button"
                              className="btn-delete-player"
                              onClick={() => removeField(field.id)}
                              aria-label={`Remove Question ${index + 1}`}
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="inputs-grid">
                            <label className="input-field">
                              <span>Field Label / Question *</span>
                              <input
                                value={field.label}
                                onChange={(e) => updateField(field.id, 'label', e.target.value)}
                                placeholder="e.g. Village Name, Home Ground, T-Shirt Size"
                              />
                            </label>

                            <label className="input-field">
                              <span>Answer Type</span>
                              <select
                                value={field.type}
                                onChange={(e) => updateField(field.id, 'type', e.target.value)}
                              >
                                <option value="text">Short Text</option>
                                <option value="number">Number</option>
                                <option value="select">Dropdown Menu</option>
                                <option value="checkbox">Checkbox (Yes / No)</option>
                              </select>
                            </label>
                          </div>

                          <label className="checkbox-wrap mt-2">
                            <input
                              type="checkbox"
                              checked={Boolean(field.required)}
                              onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                            />
                            <span>Required field (teams must answer to register)</span>
                          </label>

                          {field.type === 'select' && (
                            <label className="input-field mt-2">
                              <span>Dropdown Options (one per line)</span>
                              <textarea
                                rows="3"
                                placeholder={"Option 1\nOption 2\nOption 3"}
                                value={(field.options || []).join('\n')}
                                onChange={(e) =>
                                  updateField(
                                    field.id,
                                    'options',
                                    e.target.value.split('\n').filter(Boolean)
                                  )
                                }
                              />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group-card">
                  <h3>Payment Configuration</h3>
                  <div className="inputs-grid">
                    <label className="input-field">
                      <span>Stadium UPI ID</span>
                      <input
                        value={form.payment?.upiId || ''}
                        onChange={(e) => changePayment('upiId', e.target.value)}
                        placeholder="stadium@upi"
                      />
                    </label>
                    <label className="input-field">
                      <span>Support Phone</span>
                      <input
                        type="tel"
                        value={form.payment?.supportPhone || ''}
                        onChange={(e) => changePayment('supportPhone', e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </label>
                    <label className="input-field">
                      <span>Support Email</span>
                      <input
                        type="email"
                        value={form.payment?.supportEmail || ''}
                        onChange={(e) => changePayment('supportEmail', e.target.value)}
                        placeholder="desk@kmtcricket.com"
                      />
                    </label>
                  </div>

                  <label className="input-field mt-3">
                    <span>Offline Payment Instructions (for desk payments)</span>
                    <textarea
                      rows="2"
                      value={form.payment?.offlineInstructions || ''}
                      onChange={(e) => changePayment('offlineInstructions', e.target.value)}
                      placeholder="e.g. Pay at stadium registration counter at least 1 hour before first match."
                    />
                  </label>

                  {/* Live UPI QR & Payment Redirect Preview for Organizer */}
                  {form.payment?.upiId ? (
                    <div className="admin-upi-preview-card mt-3">
                      <div className="preview-heading">
                        <span className="live-dot" />
                        <h4>Live UPI Payment & QR Preview</h4>
                      </div>
                      <p className="preview-sub">
                        This is the live QR code and direct UPI app launcher that teams will see when registering for <strong>{form.title || 'this tournament'}</strong> ({money(form.entryFee)}):
                      </p>
                      <UPIPaymentQR tournament={form} />
                    </div>
                  ) : (
                    <p className="field-hint mt-2">
                      Enter a valid UPI ID (e.g. stadium@upi, 9876543210@ybl) to automatically generate the QR code and instant payment redirect buttons for this tournament.
                    </p>
                  )}
                </div>

                <div className="form-group-card">
                  <h3>Rules & Playing Conditions (Markdown)</h3>
                  <textarea
                    rows="5"
                    value={form.termsMarkdown}
                    onChange={(e) => change('termsMarkdown', e.target.value)}
                  />
                </div>

                {formError && <div className="alert alert-danger">{formError}</div>}
                {notice && <div className="alert alert-success">{notice}</div>}

                <div className="form-action-bar">
                  <button type="submit" className="btn btn-gold" disabled={busy}>
                    {busy ? 'Saving…' : 'Save Tournament'}
                  </button>
                </div>
              </form>

              {/* Campaign Share & QR Tool */}
              {form.id && (
                <div className="campaign-share-card">
                  <h3>Shareable Campaign Link & QR</h3>
                  <div className="campaign-controls-grid">
                    <label className="input-field">
                      <span>Channel / Source</span>
                      <select
                        value={campaignSource}
                        onChange={(e) => {
                          setCampaignSource(e.target.value);
                          setQr('');
                        }}
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="instagram">Instagram</option>
                        <option value="poster">Poster / Flyer</option>
                        <option value="website">Website</option>
                      </select>
                    </label>
                    <label className="input-field">
                      <span>Campaign Name</span>
                      <input
                        value={campaignName}
                        onChange={(e) => {
                          setCampaignName(e.target.value);
                          setQr('');
                        }}
                        placeholder="e.g. summer-cup"
                      />
                    </label>
                    <button type="button" className="btn btn-outline" onClick={generateQr}>
                      Generate QR
                    </button>
                  </div>

                  {shareUrl && (
                    <div className="share-url-row">
                      <input readOnly value={shareUrl} />
                      <button
                        type="button"
                        className="btn btn-gold btn-sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(shareUrl);
                          setCopyState('Copied!');
                          setTimeout(() => setCopyState('Copy Link'), 2000);
                        }}
                      >
                        {copyState}
                      </button>
                    </div>
                  )}

                  {qr && (
                    <div className="qr-preview-box">
                      <img src={qr} alt="Campaign QR Code" />
                      <a href={qr} download={`${form.id}-qr.png`} className="btn btn-sm btn-outline">
                        <Download size={14} /> Download QR PNG
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AdminRegistrations() {
  const { tournaments, registrations, loading, error, refresh } = useData();
  const [filter, setFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewError, setReviewError] = useState('');

  const visible = registrations.filter(
    (row) =>
      (filter === 'ALL' || row.status === filter) &&
      `${row.teamName} ${row.captainName} ${row.reference}`.toLowerCase().includes(search.toLowerCase())
  );

  const downloadCsv = () => {
    const blob = new Blob([toCsv(visible)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kmt-registrations-${filter.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const decide = async (row, status) => {
    const note = notes[row.id] ?? row.adminNote ?? '';
    if (status === 'REJECTED' && !note.trim()) {
      setReviewError('Please provide a reason or organizer note when rejecting a registration.');
      return;
    }
    setBusyId(row.id);
    setNotice('');
    setReviewError('');
    try {
      await reviewRegistration(row.id, status, note.trim());
      setNotice(`${row.teamName} has been marked ${status.toLowerCase()}.`);
    } catch (cause) {
      console.error(cause);
      setReviewError('Review could not be saved. Check admin permissions.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <AppShell active="/admin/registrations">
      <div className="dashboard-container">
        <div className="page-title-row">
          <div>
            <span className="kicker-tag">Payment Verification</span>
            <h2>Registered Teams Queue</h2>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={downloadCsv} disabled={!visible.length}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Status Filters & Search Bar */}
        <div className="queue-filter-bar">
          <div className="filter-pills-row" role="tablist">
            {[
              ['PENDING', 'Pending'],
              ['CONFIRMED', 'Confirmed'],
              ['REJECTED', 'Rejected'],
              ['ALL', 'All Entries'],
            ].map(([val, label]) => {
              const count =
                val === 'ALL' ? registrations.length : registrations.filter((r) => r.status === val).length;
              return (
                <button
                  key={val}
                  type="button"
                  role="tab"
                  aria-selected={filter === val}
                  className={`queue-pill ${filter === val ? 'is-active' : ''}`}
                  onClick={() => setFilter(val)}
                >
                  <span>{label}</span>
                  <span className="pill-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="search-bar">
            <Search size={16} />
            <input
              placeholder="Search team, captain, or UTR reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="btn-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {notice && <div className="alert alert-success">{notice}</div>}
        {reviewError && <div className="alert alert-danger">{reviewError}</div>}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : visible.length > 0 ? (
          /* Mobile-First Responsive Cards List */
          <div className="admin-registrations-grid">
            {visible.map((row) => {
              const tournament = tournaments.find((t) => t.id === row.tournamentId);
              return (
                <article className="admin-entry-card" key={row.id}>
                  <div className="entry-card-header">
                    <div>
                      <span className="entry-tournament">{tournament?.title || 'Tournament'}</span>
                      <h3 className="entry-team">{row.teamName}</h3>
                      <p className="entry-captain">
                        Capt. {row.captainName} • {row.phone}
                      </p>
                    </div>
                    <StatusChip status={row.status} />
                  </div>

                  <div className="entry-card-specs">
                    <div>
                      <span>Payment Method:</span>
                      <strong>{row.paymentMethod === 'upi' ? 'UPI Transfer' : 'Desk Offline'}</strong>
                    </div>
                    <div>
                      <span>UTR / Reference:</span>
                      <code className="utr-code">{row.reference || '—'}</code>
                    </div>
                    <div>
                      <span>Squad:</span>
                      <strong>{row.players?.length || 0} players</strong>
                    </div>
                  </div>

                  {/* Expandable roster details */}
                  <details className="entry-roster-collapse">
                    <summary>View {row.players?.length || 0} Players Roster</summary>
                    <ul className="entry-roster-list">
                      {(row.players || []).map((p, i) => (
                        <li key={i}>
                          <strong>{p.name}</strong> {p.jersey && `(#${p.jersey})`} {p.role && `• ${p.role}`}
                        </li>
                      ))}
                    </ul>
                  </details>

                  {/* Action Review Buttons */}
                  {row.status === 'PENDING' ? (
                    <div className="entry-review-box">
                      <textarea
                        rows="2"
                        placeholder="Organizer note (optional for confirm, required for reject)"
                        value={notes[row.id] ?? row.adminNote ?? ''}
                        onChange={(e) => setNotes((curr) => ({ ...curr, [row.id]: e.target.value }))}
                      />
                      <div className="review-btn-row">
                        <button
                          type="button"
                          className="btn btn-confirm"
                          disabled={busyId === row.id}
                          onClick={() => decide(row, 'CONFIRMED')}
                        >
                          Confirm & Issue Pass
                        </button>
                        <button
                          type="button"
                          className="btn btn-reject"
                          disabled={busyId === row.id}
                          onClick={() => decide(row, 'REJECTED')}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="entry-resolved-note">
                      <span>Status:</span> <strong>{row.status}</strong>
                      {row.adminNote && <span> • Note: {row.adminNote}</span>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No registrations found"
            copy={
              filter === 'PENDING'
                ? 'All team submissions have been processed!'
                : 'No entries match your current filter and search criteria.'
            }
          />
        )}
      </div>
    </AppShell>
  );
}

function NotFound() {
  return (
    <div className="page-shell">
      <PublicHeader />
      <main className="main-content">
        <div className="state-card">
          <h1>404 — Ball Out Of Bounds</h1>
          <p>The page you are looking for does not exist or has been moved.</p>
          <Link to="/tournaments" className="btn btn-gold">
            Back to Tournaments
          </Link>
        </div>
      </main>
      <PublicFooter />
      <MobileBottomNav />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (location.pathname === '/user/dashboard' || location.pathname.startsWith('/admin')) {
    if (loading) {
      return (
        <div className="page-shell">
          <LoadingState label="Verifying authorization…" />
        </div>
      );
    }
    if (!user) {
      return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
    }
    if (location.pathname.startsWith('/admin') && !user.isAdmin) {
      return <Navigate to="/user/dashboard" replace />;
    }
    if (location.pathname === '/user/dashboard' && user.isAdmin) {
      return <Navigate to="/admin" replace />;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tournaments" element={<HomePage />} />
      <Route path="/t/:tournamentId" element={<TournamentPage />} />
      <Route path="/status" element={<StatusPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/user/dashboard" element={<UserDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/tournaments" element={<AdminTournaments />} />
      <Route path="/admin/registrations" element={<AdminRegistrations />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

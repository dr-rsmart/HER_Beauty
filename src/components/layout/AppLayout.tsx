/**
 * Main Application Layout
 * -----------------------
 * Exact like-for-like BookingTrack (Base44) top header & footer,
 * fused with TimeTrack's enterprise Master Impersonation / Simulator bar,
 * real-time SSE connection badge, dark/light theme toggle, and governance nav.
 */

import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  LogOut,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Sparkles,
  ShieldCheck,
  ScrollText,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSSEConnection, useSSEStatus } from '../../hooks/useSSE';
import { masterApi } from '../../services/api';
import { Button, BrandLogo } from '../ui';
import { BRAND, FOUNDER, CONTACT, PATHWAY_STAGES } from '../../lib/brand';
import { cn } from '../../lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'whitespace-nowrap text-sm transition-colors',
    isActive ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground',
  );

export default function AppLayout() {
  const { user, isAuthenticated, logout, refresh, isMaster, isAdmin } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useSSEConnection();
  const sseStatus = useSSEStatus();

  const isDemoSession = Boolean(user?.demoEmail);

  const handleStopImpersonation = async () => {
    try {
      await masterApi.stopImpersonation();
      toast.success('Restored Master Console session.');
      await refresh();
      navigate('/master');
    } catch (err: any) {
      toast.error(err.message || 'Failed to exit impersonation');
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── TimeTrack Master Impersonation / Demo Banner ── */}
      {user?.originalRole === 'master' && (
        <div className="relative z-50 flex items-center justify-between bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            {isDemoSession ? (
              <span>
                Simulator Persona: <span className="font-bold">{user.fullName}</span> ({user.role})
              </span>
            ) : (
              <span>
                Impersonating:{' '}
                <span className="font-bold">{user.provider?.name || user.fullName}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleStopImpersonation}
            className="rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 font-bold text-primary-foreground transition hover:bg-primary-foreground/20"
          >
            Return to Master Console
          </button>
        </div>
      )}

      {/* ── HER Beauty Campus Privilege Announcement Bar ── */}
      <div className="luxury-gradient border-b border-brand-copper/30 px-4 py-2 text-center text-xs font-medium text-brand-linen">
        <span>{BRAND.announcementBar}</span>
      </div>

      {/* ── Sticky Header (BookingTrack Foundation + HER Beauty Floor 1 Identity) ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-5">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10" chip />
            <div>
              <span className="block font-display text-lg font-semibold tracking-[0.18em] uppercase text-foreground">
                {BRAND.name}
              </span>
              <span className="hidden text-[10px] tracking-widest uppercase text-muted-foreground sm:block">
                {BRAND.tagline}
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              Studios & Services
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/my-bookings" className={navLinkClass}>
                My bookings
              </NavLink>
            )}
            <NavLink to="/dashboard" className={navLinkClass}>
              {user?.providerId ? 'Studio Dashboard' : 'Studio Hub'}
            </NavLink>
            {(isAdmin || user?.role === 'manager') && (
              <NavLink to="/audit" className={navLinkClass}>
                <span className="inline-flex items-center gap-1">
                  <ScrollText className="h-3.5 w-3.5" />
                  Audit
                </span>
              </NavLink>
            )}
            {isMaster && (
              <>
                <NavLink to="/master" className={navLinkClass}>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Master Console
                  </span>
                </NavLink>
                <NavLink to="/demo" className={navLinkClass}>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Simulator
                  </span>
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {/* Live SSE Status Indicator (when signed in) */}
            {isAuthenticated && (
              <span
                title={`Real-time stream: ${sseStatus}`}
                className={cn(
                  'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex',
                  sseStatus === 'live'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'border-border bg-secondary text-muted-foreground',
                )}
              >
                {sseStatus === 'live' ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {sseStatus === 'live' ? 'Live' : 'Sync'}
              </span>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={toggleTheme}
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="hidden max-w-[160px] items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:inline-flex"
                  title="Account profile & password"
                >
                  <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{user?.fullName || user?.email}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                  onClick={handleSignOut}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button
                  size="sm"
                  className="hidden rounded-full sm:inline-flex"
                  onClick={() => navigate('/register')}
                >
                  Join HER Circle
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Secondary Nav */}
        <nav className="no-scrollbar flex items-center gap-6 overflow-x-auto border-t border-border/60 px-5 py-2.5 md:hidden">
          <NavLink to="/" end className={navLinkClass}>
            Studios
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/my-bookings" className={navLinkClass}>
              My bookings
            </NavLink>
          )}
          <NavLink to="/dashboard" className={navLinkClass}>
            {user?.providerId ? 'Dashboard' : 'Studio Hub'}
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/profile" className={navLinkClass}>
              Profile
            </NavLink>
          )}
          {(isAdmin || user?.role === 'manager') && (
            <NavLink to="/audit" className={navLinkClass}>
              Audit
            </NavLink>
          )}
          {isMaster && (
            <>
              <NavLink to="/master" className={navLinkClass}>
                Master
              </NavLink>
              <NavLink to="/demo" className={navLinkClass}>
                Simulator
              </NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="luxury-gradient border-t border-brand-copper/30 text-brand-linen">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-12">
          {/* The HER Pathway Spine */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-copper/30 bg-brand-dark2/80 px-5 py-3.5">
            <span className="font-mono text-xs uppercase tracking-widest text-brand-copperPale">
              The HER Pathway
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {PATHWAY_STAGES.map((item, idx) => (
                <span key={item.stage} className="inline-flex items-center gap-2">
                  <span className="rounded-md border border-brand-copper/40 bg-brand-copper/20 px-2.5 py-0.5 font-mono text-[11px] text-brand-copperPale">
                    {item.stage}
                  </span>
                  {idx < PATHWAY_STAGES.length - 1 && (
                    <span className="text-brand-copperLight">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <BrandLogo className="h-11 w-11" chip />
                <div>
                  <p className="font-display text-lg font-semibold tracking-wider text-brand-linen">
                    {BRAND.name}
                  </p>
                  <p className="text-xs text-brand-copperPale">{BRAND.identityLine}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-brand-mutedLight">
                {BRAND.descriptor}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-mono uppercase tracking-widest text-brand-copperPale">
                Flagship Studio
              </p>
              <p className="text-brand-linen">{CONTACT.addressLines[0]}</p>
              <p className="text-brand-mutedLight">{CONTACT.addressLines[1]}</p>
              <p className="pt-1 text-brand-copperLight">{CONTACT.phone}</p>
              <p className="text-brand-copperLight">{CONTACT.email}</p>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-mono uppercase tracking-widest text-brand-copperPale">
                Studio Hours
              </p>
              {CONTACT.hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-4 text-brand-mutedLight">
                  <span>{h.days}</span>
                  <span className="text-brand-linen">{h.time}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-mono uppercase tracking-widest text-brand-copperPale">
                Founder & Governance
              </p>
              <p className="font-medium text-brand-linen">{FOUNDER.name}</p>
              <p className="text-brand-mutedLight">{FOUNDER.title}</p>
              <p className="text-brand-copperPale">{BRAND.slogan}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-brand-copper/20 pt-6 text-xs text-brand-mutedLight sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} {BRAND.enterpriseName}. Built on BookingTrack Enterprise Foundation.
            </span>
            <div className="flex flex-wrap items-center gap-5">
              <Link to="/privacy" className="hover:text-brand-linen">
                POPIA & Privacy Policy
              </Link>
              <Link to="/support" className="hover:text-brand-linen">
                Concierge Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

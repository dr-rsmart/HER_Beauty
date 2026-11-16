/**
 * Platform Master Control Center (`/master`)
 * ------------------------------------------
 * Cross-tenant KPIs, Business Tenant Onboarding, Tenant Suspension/Reactivation,
 * and 1-Click Business Impersonation (modeled on TimeTrack's Master Console).
 */

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Users,
  CalendarCheck,
  Banknote,
  Plus,
  ExternalLink,
  Copy,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  masterApi,
  herApi,
  type MasterStats,
  type MasterProviderItem,
  type PathwayMetricsResponse,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Badge,
  Button,
  DialogModal,
  Input,
  Label,
  Spinner,
  Switch,
} from '../components/ui';
import { CATEGORIES, formatZAR } from '../lib/utils';
import { BRAND, FOUNDER, PATHWAY_STAGES } from '../lib/brand';

export default function MasterConsole() {
  const { refresh: refreshAuth } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<MasterStats | null>(null);
  const [providers, setProviders] = useState<MasterProviderItem[]>([]);
  const [pathway, setPathway] = useState<PathwayMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [onboardOpen, setOnboardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: '',
    category: 'Salon',
    city: 'Jamestown',
    phone: '',
    street: '',
    billingTier: 'campus',
    vatNumber: '',
    registrationNumber: '',
    adminFirstName: '',
    adminSurname: '',
    adminEmail: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, pw] = await Promise.all([
        masterApi.stats(),
        masterApi.listProviders(),
        herApi.getPathwayMetrics(),
      ]);
      setStats(s);
      setProviders(p.items);
      setPathway(pw);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load Master Console');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleOnboard = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await masterApi.onboardProvider(form);
      toast.success(res.message);
      setOnboardOpen(false);
      setTempPasswordModal({
        email: form.adminEmail,
        password: res.temporaryPassword,
      });
      setForm({
        name: '',
        category: 'Salon',
        city: 'Johannesburg',
        phone: '',
        street: '',
        billingTier: 'standard',
        vatNumber: '',
        registrationNumber: '',
        adminFirstName: '',
        adminSurname: '',
        adminEmail: '',
      });
      void loadAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to onboard business');
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async (providerId: string) => {
    try {
      const res = await masterApi.impersonate(providerId);
      toast.success(res.message);
      await refreshAuth();
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Could not impersonate business');
    }
  };

  const filtered = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase()) ||
      p.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              {FOUNDER.name} · Executive & Platform Governance
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">
            {BRAND.name} Master Control Center
          </h1>
          <p className="mt-1 text-muted-foreground">
            Cross-studio oversight, campus hub onboarding, social-impact governance & live studio impersonation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => navigate('/demo')}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Open Simulator
          </Button>
          <Button className="rounded-full" onClick={() => setOnboardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Onboard Studio Hub
          </Button>
        </div>
      </div>

      {/* Floor 1: The HER Pathway Social Impact & Youth Development Spine */}
      {pathway && (
        <div className="luxury-gradient rounded-3xl border border-brand-copper/40 p-6 text-brand-linen space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-brand-copperPale">
                <GraduationCap className="h-4 w-4" /> Social Impact Governance · The HER Pathway
              </p>
              <h2 className="mt-1 font-display text-xl text-brand-linen">
                LEARN → PRACTISE → EARN → GROW → EMPOWER
              </h2>
            </div>
            <span className="rounded-full border border-brand-copper/40 bg-brand-dark2 px-3.5 py-1 font-mono text-xs text-brand-copperPale">
              SA Higher Education & Services SETA Accredited #HER-7600
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PATHWAY_STAGES.map((st) => (
              <div
                key={st.stage}
                className="rounded-2xl border border-brand-copper/30 bg-brand-dark2/85 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand-copperLight">
                    {st.stage}
                  </span>
                  <span className="rounded-full bg-brand-copper/25 px-2 py-0.5 font-mono text-[10px] text-brand-linen">
                    {pathway.stageCounts[st.stage] ?? 0}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-brand-mutedLight">{st.blurb}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-brand-copper/25 pt-4 text-xs sm:grid-cols-4">
            <div>
              <span className="block text-brand-mutedLight">Fellows in Training</span>
              <strong className="font-display text-lg text-brand-linen">
                {pathway.youngStylistsInTraining}
              </strong>
            </div>
            <div>
              <span className="block text-brand-mutedLight">Mentorship Delivered</span>
              <strong className="font-display text-lg text-brand-linen">
                {pathway.mentorshipHoursCompleted} hrs
              </strong>
            </div>
            <div>
              <span className="block text-brand-mutedLight">Student Discount Sessions</span>
              <strong className="font-display text-lg text-brand-linen">
                {pathway.studentDiscountSessions}
              </strong>
            </div>
            <div>
              <span className="block text-brand-mutedLight">Progressed to Income</span>
              <strong className="font-display text-lg text-brand-linen">
                {pathway.stylistsProgressedToIncome} Artisans
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Platform KPI Grid */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Businesses</span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-3xl text-foreground">
              {stats.activeProviders} / {stats.totalProviders}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.publishedProviders} published in directory
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform Users & Team</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-3xl text-foreground">{stats.totalUsers}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.totalProfessionals} professionals · {stats.totalServices} services
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Bookings</span>
              <CalendarCheck className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-3xl text-foreground">{stats.totalBookings}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.todayBookings} today · {stats.openSlots} open slots
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform Completed GMV</span>
              <Banknote className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-3xl text-foreground">
              {formatZAR(stats.completedRevenue) || 'R0'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">completed appointments</p>
          </div>
        </div>
      )}

      {/* Tenant Directory */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-foreground">Registered Business Tenants</h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business, city or owner email…"
            className="h-10 max-w-xs rounded-full bg-card"
          />
        </div>

        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="min-w-[240px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg text-foreground">{item.name}</p>
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge
                    variant="outline"
                    className={
                      item.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }
                  >
                    {item.isActive ? 'Active' : 'Suspended'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.city} · Owner: <span className="text-foreground">{item.ownerFullName}</span>{' '}
                  ({item.ownerEmail})
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.serviceCount} services · {item.professionalCount} professionals ·{' '}
                  {item.bookingCount} bookings · {item.slotCount} slots
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Active
                  <Switch
                    checked={item.isActive}
                    onCheckedChange={async (nextActive) => {
                      const res = await masterApi.toggleProviderStatus(item.id, nextActive);
                      toast.success(res.message);
                      void loadAll();
                    }}
                  />
                </label>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => navigate(`/providers/${item.id}`)}
                >
                  Public Page
                </Button>

                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleImpersonate(item.id)}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Impersonate
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Onboard Business Modal */}
      <DialogModal
        open={onboardOpen}
        onOpenChange={setOnboardOpen}
        title="Onboard New Business Tenant"
      >
        <form onSubmit={handleOnboard} className="space-y-4">
          <div>
            <Label htmlFor="ob-name">Business Name</Label>
            <Input
              id="ob-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ob-cat">Category</Label>
              <select
                id="ob-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ob-city">City</Label>
              <Input
                id="ob-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ob-fname">Admin First Name</Label>
              <Input
                id="ob-fname"
                required
                value={form.adminFirstName}
                onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ob-sname">Admin Surname</Label>
              <Input
                id="ob-sname"
                required
                value={form.adminSurname}
                onChange={(e) => setForm({ ...form, adminSurname: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ob-email">Admin Email</Label>
            <Input
              id="ob-email"
              type="email"
              required
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOnboardOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Onboarding…' : 'Onboard Business'}
            </Button>
          </div>
        </form>
      </DialogModal>

      {/* Temporary Password Reveal Modal */}
      <DialogModal
        open={Boolean(tempPasswordModal)}
        onOpenChange={() => setTempPasswordModal(null)}
        title="Business Tenant Onboarded"
        footer={
          <Button onClick={() => setTempPasswordModal(null)}>Done</Button>
        }
      >
        {tempPasswordModal && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Share these temporary credentials with the business administrator. They will be
              prompted to choose a new password on first login.
            </p>
            <div className="rounded-xl bg-secondary p-4 font-mono text-xs">
              <p>
                <strong>Email:</strong> {tempPasswordModal.email}
              </p>
              <p className="mt-1">
                <strong>Temporary Password:</strong> {tempPasswordModal.password}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(tempPasswordModal.password);
                toast.success('Temporary password copied.');
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy password
            </Button>
          </div>
        )}
      </DialogModal>
    </div>
  );
}

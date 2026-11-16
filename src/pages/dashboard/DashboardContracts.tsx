/**
 * Studio Dashboard Contracts, Young Stylist Programme & POPIA Governance (`/dashboard/contracts`)
 * -----------------------------------------------------------------------------------------------
 * Floor 1 (HER Beauty) governance layer built on the BookingTrack Dashboard Foundation:
 * - BookingPolicy (20% deposit, 24h cancellation, 50% no-show fee, 14d retail returns, POPIA clause)
 * - StylistContract (permanent / fixed_term / learnership / independent, commission %, mentorship hours)
 * - ProgrammeAgreement (Young Stylist Programme — Cohort 2025, 7 modules, R2 500 stipend)
 * - ConsentRecord (POPIA Special Personal Information & Marketing Consent Register)
 */

import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { FileCheck2, GraduationCap, ShieldCheck, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  herApi,
  type BookingPolicyRecord,
  type StylistContractRecord,
  type ProgrammeAgreementRecord,
  type ConsentRecordItem,
} from '../../services/api';
import { useMyProvider } from '../../hooks/useMyProvider';
import DashboardSubNav from '../../components/dashboard/DashboardSubNav';
import {
  Badge,
  Button,
  Input,
  Label,
  DialogModal,
  Spinner,
  PathwayBadge,
} from '../../components/ui';
import { formatZAR } from '../../lib/utils';
import { PATHWAY_STAGES } from '../../lib/brand';

export default function DashboardContracts() {
  const { provider, loading } = useMyProvider();
  const [policy, setPolicy] = useState<BookingPolicyRecord | null>(null);
  const [contracts, setContracts] = useState<StylistContractRecord[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeAgreementRecord[]>([]);
  const [consents, setConsents] = useState<ConsentRecordItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    stylistName: '',
    contractType: 'learnership',
    pathwayStage: 'EARN',
    commissionRate: 0.4,
    mentorshipHoursPerMonth: 40,
    startDate: '2026-02-01',
    endDate: '2027-01-31',
  });

  const loadAll = useCallback(async (providerId: string) => {
    setLoadingData(true);
    try {
      const res = await herApi.getContracts(providerId);
      setPolicy(res.bookingPolicy);
      setContracts(res.stylistContracts);
      setProgrammes(res.programmeAgreements);
      setConsents(res.consentRecords);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (provider) void loadAll(provider.id);
  }, [provider, loadAll]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!provider) return <Navigate to="/dashboard" replace />;

  const handleIssueContract = async () => {
    if (!form.stylistName.trim()) return;
    setSaving(true);
    try {
      await herApi.createContract({
        ...form,
        provider_id: provider.id,
      });
      toast.success(`Issued contract for ${form.stylistName}.`);
      setModalOpen(false);
      setForm({
        stylistName: '',
        contractType: 'learnership',
        pathwayStage: 'EARN',
        commissionRate: 0.4,
        mentorshipHoursPerMonth: 40,
        startDate: '2026-02-01',
        endDate: '2027-01-31',
      });
      void loadAll(provider.id);
    } catch (err: any) {
      toast.error(err.message || 'Could not issue contract');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <DashboardSubNav />
      <div className="mx-auto w-full max-w-5xl space-y-12 px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <FileCheck2 className="h-4 w-4" />
              <span className="font-mono text-xs uppercase tracking-widest">
                Governance · Contracts · POPIA
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl text-foreground">
              Contracts, Policies & Young Stylist Programme
            </h1>
            <p className="mt-1 text-muted-foreground">
              Artisan agreements, Cohort 2025 curriculum governance, Booking Policy terms & POPIA consent records.
            </p>
          </div>
          <Button className="rounded-full" onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Issue Artisan Contract
          </Button>
        </div>

        {loadingData ? (
          <Spinner className="h-6 w-6" />
        ) : (
          <>
            {/* ── 1. Stylist & Learnership Contracts ── */}
            <section className="space-y-4">
              <h2 className="font-display text-xl text-foreground">
                Active Artisan & Learnership Contracts ({contracts.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {contracts.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-border bg-card p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{c.stylistName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{c.documentRef}</p>
                      </div>
                      <PathwayBadge stage={c.pathwayStage} role={c.contractType.replace('_', ' ')} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/50 p-3 text-xs">
                      <div>
                        <span className="block text-muted-foreground">Commission</span>
                        <strong className="text-foreground">
                          {Math.round(c.commissionRate * 100)}%
                        </strong>
                      </div>
                      <div>
                        <span className="block text-muted-foreground">Mentorship</span>
                        <strong className="text-foreground">{c.mentorshipHoursPerMonth}h/mo</strong>
                      </div>
                      <div>
                        <span className="block text-muted-foreground">Status</span>
                        <strong className="uppercase text-emerald-700 dark:text-emerald-300">
                          {c.status}
                        </strong>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Term: {c.startDate} {c.endDate ? `→ ${c.endDate}` : '(Permanent)'}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 2. Young Stylist Programme Agreement (Cohort 2025) ── */}
            {programmes.map((prog) => (
              <section
                key={prog.id}
                className="luxury-gradient rounded-3xl border border-brand-copper/40 p-7 text-brand-linen space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-brand-copperPale">
                      <GraduationCap className="h-4 w-4" /> The HER Pathway Fellowship
                    </p>
                    <h2 className="mt-1 font-display text-2xl text-brand-linen">{prog.name}</h2>
                    <p className="text-xs text-brand-mutedLight">
                      Term: {prog.startDate} → {prog.endDate} · Capacity: {prog.enrolledNames.length}/{prog.capacity} Fellows
                    </p>
                  </div>
                  <div className="rounded-2xl border border-brand-copper/40 bg-brand-dark2 px-4 py-2.5 text-right">
                    <span className="block font-mono text-[10px] uppercase text-brand-copperPale">
                      Monthly Learner Stipend
                    </span>
                    <span className="font-display text-xl text-brand-linen">
                      {formatZAR(prog.stipendAmount)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wider text-brand-copperPale">
                      7 Core Curriculum Modules
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-brand-linen/90">
                      {prog.curriculumModules.map((mod, idx) => (
                        <li key={mod} className="flex items-start gap-2">
                          <span className="font-mono text-brand-copperLight">0{idx + 1}.</span>
                          <span>{mod}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-brand-copper/30 bg-brand-dark2/80 p-4">
                      <p className="font-mono text-xs uppercase text-brand-copperPale">
                        Enrolled Fellows
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {prog.enrolledNames.map((n) => (
                          <span
                            key={n}
                            className="rounded-full border border-brand-copper/40 bg-brand-copper/20 px-3 py-1 text-xs text-brand-linen"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-brand-copper/30 bg-brand-dark2/80 p-4">
                      <p className="font-mono text-xs uppercase text-brand-copperPale">
                        Assigned Senior Mentors (EMPOWER / GROW)
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {prog.mentorNames.map((n) => (
                          <span
                            key={n}
                            className="rounded-full border border-brand-copper/40 bg-brand-dark px-3 py-1 text-xs text-brand-copperPale"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ))}

            {/* ── 3. Booking Policy & POPIA Consent Register ── */}
            <section className="grid gap-6 lg:grid-cols-2">
              {policy && (
                <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg text-foreground">
                      Studio Booking Policy (v{policy.version})
                    </h3>
                    <Badge variant="outline">{policy.depositPercent}% Deposit</Badge>
                  </div>
                  <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                    {policy.clauseText.map((clause) => (
                      <li key={clause} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-lg text-foreground">
                      POPIA Consent Register ({consents.length})
                    </h3>
                  </div>
                  <Badge variant="outline">Act 4 of 2013</Badge>
                </div>
                <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                  {consents.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {rec.customerName || rec.customerEmail}
                        </p>
                        <p className="text-muted-foreground">
                          {rec.customerEmail} · v{rec.version}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {rec.type}
                        </Badge>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {new Date(rec.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        <DialogModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Issue Artisan / Learnership Contract"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={handleIssueContract}>
                {saving ? 'Issuing…' : 'Issue Contract'}
              </Button>
            </>
          }
        >
          <div>
            <Label htmlFor="con-name">Artisan Full Name</Label>
            <Input
              id="con-name"
              value={form.stylistName}
              onChange={(e) => setForm({ ...form, stylistName: e.target.value })}
              placeholder="e.g. Nandi Mokoena"
              className="mt-1.5"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="con-type">Contract Type</Label>
              <select
                id="con-type"
                value={form.contractType}
                onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="learnership">Learnership (Young Stylist Fellow)</option>
                <option value="fixed_term">Fixed Term</option>
                <option value="permanent">Permanent Senior Artisan</option>
                <option value="independent">Independent Chair Specialist</option>
              </select>
            </div>
            <div>
              <Label htmlFor="con-stage">HER Pathway Stage</Label>
              <select
                id="con-stage"
                value={form.pathwayStage}
                onChange={(e) => setForm({ ...form, pathwayStage: e.target.value })}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {PATHWAY_STAGES.map((st) => (
                  <option key={st.stage} value={st.stage}>
                    {st.stage}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="con-comm">Commission Rate (0.30 – 0.60)</Label>
              <Input
                id="con-comm"
                type="number"
                step="0.05"
                value={form.commissionRate}
                onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="con-mentor">Mentorship Hours / Month</Label>
              <Input
                id="con-mentor"
                type="number"
                value={form.mentorshipHoursPerMonth}
                onChange={(e) =>
                  setForm({ ...form, mentorshipHoursPerMonth: Number(e.target.value) })
                }
                className="mt-1.5"
              />
            </div>
          </div>
        </DialogModal>
      </div>
    </div>
  );
}

/**
 * Provider Dashboard Team (`QP` and `ZP` in Base44)
 * -------------------------------------------------
 * Add, edit, toggle availability, and remove professionals.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, UserCheck, KeyRound, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  professionalsApi,
  servicesApi,
  type ProfessionalRecord,
  type ServiceRecord,
} from '../../services/api';
import { useMyProvider } from '../../hooks/useMyProvider';
import { useSSE } from '../../hooks/useSSE';
import DashboardSubNav from '../../components/dashboard/DashboardSubNav';
import {
  Button,
  Input,
  Textarea,
  Label,
  Switch,
  DialogModal,
  ConfirmDialog,
  ImageUpload,
  Spinner,
  PathwayBadge,
} from '../../components/ui';
import { cn } from '../../lib/utils';
import { PATHWAY_STAGES } from '../../lib/brand';

function ProfessionalModal({
  providerId,
  services,
  member,
  onSaved,
  trigger,
}: {
  providerId: string;
  services: ServiceRecord[];
  member?: ProfessionalRecord;
  onSaved: () => void;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    title: member?.title || '',
    pathway_stage: member?.pathway_stage || 'GROW',
    pathway_role: member?.pathway_role || member?.title || 'Senior Stylist',
    commission_rate: member?.commission_rate ?? 0.45,
    experience_years: member?.experience_years ?? 3,
    specialties_text: (member?.specialties || []).join(', '),
    bio: member?.bio || '',
    photo_url: member?.photo_url || '',
    service_ids: member?.service_ids || ([] as string[]),
    active: member?.active !== false,
    role: member?.login_role || 'employee',
    password: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: member?.name || '',
        email: member?.email || '',
        title: member?.title || '',
        pathway_stage: member?.pathway_stage || 'GROW',
        pathway_role: member?.pathway_role || member?.title || 'Senior Stylist',
        commission_rate: member?.commission_rate ?? 0.45,
        experience_years: member?.experience_years ?? 3,
        specialties_text: (member?.specialties || []).join(', '),
        bio: member?.bio || '',
        photo_url: member?.photo_url || '',
        service_ids: member?.service_ids || [],
        active: member?.active !== false,
        role: member?.login_role || 'employee',
        password: '',
      });
    }
  }, [open, member]);

  const toggleService = (id: string) => {
    setForm((prev) => ({
      ...prev,
      service_ids: prev.service_ids.includes(id)
        ? prev.service_ids.filter((s) => s !== id)
        : [...prev.service_ids, id],
    }));
  };

  const handleResetPasswordInModal = async () => {
    if (!member?.id) return;
    setResetting(true);
    try {
      const res = await professionalsApi.resetPassword(member.id);
      toast.success(res.message);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Password reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex">
        {trigger}
      </span>
      <DialogModal
        open={open}
        onOpenChange={setOpen}
        title={member ? 'Edit professional' : 'Add a professional'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving || !form.name.trim()}
              onClick={async () => {
                setSaving(true);
                const specialties = form.specialties_text
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                const payload = {
                  ...form,
                  specialties,
                  provider_id: providerId,
                };
                try {
                  if (member?.id) {
                    await professionalsApi.update(member.id, payload);
                    toast.success('Professional updated.');
                  } else {
                    await professionalsApi.create(payload);
                    toast.success('Professional added and staff login account created.');
                  }
                  setOpen(false);
                  onSaved();
                } catch (err: any) {
                  toast.error(err.message || 'Could not save professional');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {member ? 'Save' : 'Add professional'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="member-name">Name</Label>
            <Input
              id="member-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-2"
              placeholder="e.g. Dr. Jane Smith"
            />
          </div>
          <div>
            <Label htmlFor="member-title">Role / Title</Label>
            <Input
              id="member-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Senior GP, Stylist, Technician…"
              className="mt-2"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Shield className="h-4 w-4 text-primary" /> Staff Login Account (TimeTrack standard)
          </div>
          <div>
            <Label htmlFor="member-email">Staff Email</Label>
            <Input
              id="member-email"
              type="email"
              placeholder="e.g. doctor@clinic.co.za"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              A staff login account is automatically created with default password{' '}
              <strong className="text-foreground">Password123</strong>. The practitioner can sign in immediately at /login and change or keep their password.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div>
              <Label htmlFor="member-role">Access Role</Label>
              <select
                id="member-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="employee">Employee (Practitioner / Staff)</option>
                <option value="manager">Manager (Practice Manager)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="member-password">Password {member?.email ? '(leave blank to keep current)' : ''}</Label>
              <Input
                id="member-password"
                type="text"
                placeholder={member?.email ? '•••••••• (keep current)' : 'Default: Password123'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          {member?.id && member.email && (
            <div className="pt-2 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2 rounded-xl text-xs"
                disabled={resetting}
                onClick={handleResetPasswordInModal}
              >
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                {resetting ? 'Resetting…' : 'Reset Password to Password123'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="member-pathway">HER Pathway Stage</Label>
            <select
              id="member-pathway"
              value={form.pathway_stage}
              onChange={(e) => setForm({ ...form, pathway_stage: e.target.value })}
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {PATHWAY_STAGES.map((st) => (
                <option key={st.stage} value={st.stage}>
                  {st.stage}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="member-commission">Commission Rate (0–1)</Label>
            <Input
              id="member-commission"
              type="number"
              step="0.05"
              min="0.1"
              max="0.9"
              value={form.commission_rate}
              onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="member-exp">Experience (Years)</Label>
            <Input
              id="member-exp"
              type="number"
              min="0"
              value={form.experience_years}
              onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="member-specialties">Specialties (comma-separated)</Label>
          <Input
            id="member-specialties"
            value={form.specialties_text}
            onChange={(e) => setForm({ ...form, specialties_text: e.target.value })}
            placeholder="Knotless Braids, Natural Hair Care, Silk Blowouts…"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="member-bio">Short bio</Label>
          <Textarea
            id="member-bio"
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="mt-2"
          />
        </div>

        <ImageUpload
          label="Photo"
          value={form.photo_url}
          onChange={(url) => setForm({ ...form, photo_url: url })}
        />

        {services.length > 0 && (
          <div>
            <Label>Services they perform</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm transition',
                    form.service_ids.includes(svc.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {svc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          <Switch
            checked={form.active}
            onCheckedChange={(active) => setForm({ ...form, active })}
          />
          Available for bookings
        </label>
      </DialogModal>
    </>
  );
}

export default function DashboardTeam() {
  const { provider, loading } = useMyProvider();
  const [team, setTeam] = useState<ProfessionalRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);

  const loadAll = useCallback(async (providerId: string) => {
    const [proRes, svcRes] = await Promise.all([
      professionalsApi.list({ provider_id: providerId, limit: 100 }),
      servicesApi.list({ provider_id: providerId, limit: 100 }),
    ]);
    setTeam(proRes.items);
    setServices(svcRes.items);
  }, []);

  useEffect(() => {
    if (provider) void loadAll(provider.id);
  }, [provider, loadAll]);

  useSSE(['professional:created', 'professional:updated', 'professional:deleted'], () => {
    if (provider) void loadAll(provider.id);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!provider) return <Navigate to="/dashboard" replace />;

  const refresh = () => void loadAll(provider.id);

  return (
    <div>
      <DashboardSubNav />
      <div className="mx-auto w-full max-w-4xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-foreground">Your team</h1>
            <p className="mt-2 text-muted-foreground">
              Customers choose who they want to see — add everyone who takes appointments.
            </p>
          </div>
          <ProfessionalModal
            providerId={provider.id}
            services={services}
            onSaved={refresh}
            trigger={
              <Button className="rounded-full">
                <Plus className="mr-2 h-4 w-4" /> Add professional
              </Button>
            }
          />
        </div>

        <div className="mt-8 space-y-4">
          {team.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
              No professionals yet — add them, then open slots for each of them.
            </p>
          )}
          {team.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-lg text-primary">
                    {member.name?.charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{member.name}</p>
                  <PathwayBadge
                    stage={member.pathway_stage}
                    role={member.pathway_role || member.title}
                  />
                  {member.commission_rate != null && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {Math.round(member.commission_rate * 100)}% commission
                    </span>
                  )}
                </div>
                {member.specialties && member.specialties.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {member.specialties.join(' · ')}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {member.service_ids?.length
                      ? `${member.service_ids.length} service${member.service_ids.length === 1 ? '' : 's'}`
                      : 'Any service'}
                  </span>
                  {member.email && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                        member.has_login
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      <UserCheck className="h-3 w-3" />
                      {member.has_login
                        ? `Staff Login: ${member.email} (${member.login_role || 'employee'})`
                        : member.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Available
                  <Switch
                    checked={member.active !== false}
                    onCheckedChange={async (active) => {
                      await professionalsApi.update(member.id, { active });
                      refresh();
                    }}
                  />
                </label>
                <ProfessionalModal
                  providerId={provider.id}
                  services={services}
                  member={member}
                  onSaved={refresh}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Edit professional">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                {member.email && (
                  <ConfirmDialog
                    title={`Reset password for ${member.name}?`}
                    description={`Their login password will be set to the default "Password123". On their next login they can keep it or choose a new password.`}
                    confirmLabel="Reset password"
                    onConfirm={async () => {
                      try {
                        const res = await professionalsApi.resetPassword(member.id);
                        toast.success(res.message);
                        refresh();
                      } catch (err: any) {
                        toast.error(err.message || 'Could not reset password');
                      }
                    }}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Reset password"
                        title="Reset password to Password123 (TimeTrack standard)"
                      >
                        <KeyRound className="h-4 w-4 text-primary" />
                      </Button>
                    }
                  />
                )}
                <ConfirmDialog
                  title={`Remove ${member.name}?`}
                  description="Their open slots stay, but customers can no longer pick them."
                  confirmLabel="Remove"
                  onConfirm={async () => {
                    await professionalsApi.delete(member.id);
                    refresh();
                  }}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Remove professional">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

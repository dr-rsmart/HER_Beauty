/**
 * Provider Dashboard Services & Rates (`XP` and `YP` in Base44)
 * -------------------------------------------------------------
 * Create, edit, toggle bookability, and delete services with ZAR rates.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  servicesApi,
  professionalsApi,
  type ServiceRecord,
  type ProfessionalRecord,
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
  Spinner,
  Badge,
} from '../../components/ui';
import { cn, formatDuration, formatZAR } from '../../lib/utils';
import { REVENUE_STREAMS } from '../../lib/brand';

const SERVICE_CATEGORIES = [
  'Natural Hair & Treatments',
  'Braiding & Protective Styles',
  'General Hair Care & Styling',
  'Nails & Hand Care',
  'Beauty & Skin',
  'Packages & Bundles',
  'Retail & Product Bar',
  'Training & Masterclasses',
  'Events & Activations',
];

function ServiceModal({
  providerId,
  team,
  service,
  onSaved,
  trigger,
}: {
  providerId: string;
  team: ProfessionalRecord[];
  service?: ServiceRecord;
  onSaved: () => void;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: service?.name || '',
    category_name: service?.category_name || 'Natural Hair & Treatments',
    stream: service?.stream || 'salon',
    description: service?.description || '',
    duration_minutes: service?.duration_minutes || 30,
    price: service?.price ?? ('' as string | number),
    price_note: service?.price_note || '',
    popular: Boolean(service?.popular),
    professional_ids: service?.professional_ids || ([] as string[]),
    active: service?.active !== false,
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: service?.name || '',
        category_name: service?.category_name || 'Natural Hair & Treatments',
        stream: service?.stream || 'salon',
        description: service?.description || '',
        duration_minutes: service?.duration_minutes || 30,
        price: service?.price ?? '',
        price_note: service?.price_note || '',
        popular: Boolean(service?.popular),
        professional_ids: service?.professional_ids || [],
        active: service?.active !== false,
      });
    }
  }, [open, service]);

  const toggleProfessional = (id: string) => {
    setForm((prev) => ({
      ...prev,
      professional_ids: prev.professional_ids.includes(id)
        ? prev.professional_ids.filter((p) => p !== id)
        : [...prev.professional_ids, id],
    }));
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex">
        {trigger}
      </span>
      <DialogModal
        open={open}
        onOpenChange={setOpen}
        title={service ? 'Edit service' : 'Add a service'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving || !form.name.trim()}
              onClick={async () => {
                setSaving(true);
                const payload = {
                  ...form,
                  provider_id: providerId,
                  duration_minutes: Number(form.duration_minutes) || 30,
                  price: form.price === '' ? null : Number(form.price),
                };
                try {
                  if (service?.id) {
                    await servicesApi.update(service.id, payload);
                    toast.success('Service updated.');
                  } else {
                    await servicesApi.create(payload);
                    toast.success('Service added.');
                  }
                  setOpen(false);
                  onSaved();
                } catch (err: any) {
                  toast.error(err.message || 'Could not save service');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {service ? 'Save service' : 'Add service'}
            </Button>
          </>
        }
      >
        <div>
          <Label htmlFor="service-name">Service name</Label>
          <Input
            id="service-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-2"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="service-category">HER Menu Category</Label>
            <select
              id="service-category"
              value={form.category_name}
              onChange={(e) => setForm({ ...form, category_name: e.target.value })}
              className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="service-stream">Revenue Stream</Label>
            <select
              id="service-stream"
              value={form.stream}
              onChange={(e) => setForm({ ...form, stream: e.target.value })}
              className="mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {REVENUE_STREAMS.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.title} — {st.description}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="service-description">Description</Label>
          <Textarea
            id="service-description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-2"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="service-duration">Minutes</Label>
            <Input
              id="service-duration"
              type="number"
              min="5"
              step="5"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="service-price">Rate (ZAR)</Label>
            <Input
              id="service-price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Optional"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="service-note">Rate note</Label>
            <Input
              id="service-note"
              value={form.price_note}
              onChange={(e) => setForm({ ...form, price_note: e.target.value })}
              placeholder="from / per hour"
              className="mt-2"
            />
          </div>
        </div>

        {team.length > 0 && (
          <div>
            <Label>Who can perform it</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {team.map((pro) => (
                <button
                  key={pro.id}
                  type="button"
                  onClick={() => toggleProfessional(pro.id)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm transition',
                    form.professional_ids.includes(pro.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {pro.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Leave empty to let any of your professionals take it.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <Switch
              checked={form.active}
              onCheckedChange={(active) => setForm({ ...form, active })}
            />
            Bookable by customers
          </label>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <Switch
              checked={form.popular}
              onCheckedChange={(popular) => setForm({ ...form, popular })}
            />
            Highlight as Popular
          </label>
        </div>
      </DialogModal>
    </>
  );
}

export default function DashboardServices() {
  const { provider, loading } = useMyProvider();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [team, setTeam] = useState<ProfessionalRecord[]>([]);

  const loadAll = useCallback(async (providerId: string) => {
    const [svcRes, proRes] = await Promise.all([
      servicesApi.list({ provider_id: providerId, limit: 100 }),
      professionalsApi.list({ provider_id: providerId, limit: 100 }),
    ]);
    setServices(svcRes.items);
    setTeam(proRes.items);
  }, []);

  useEffect(() => {
    if (provider) void loadAll(provider.id);
  }, [provider, loadAll]);

  useSSE(['service:created', 'service:updated', 'service:deleted'], () => {
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
            <h1 className="font-display text-3xl text-foreground">Services & rates</h1>
            <p className="mt-2 text-muted-foreground">
              What customers can book, how long it takes, and who can deliver it.
            </p>
          </div>
          <ServiceModal
            providerId={provider.id}
            team={team}
            onSaved={refresh}
            trigger={
              <Button className="rounded-full">
                <Plus className="mr-2 h-4 w-4" /> Add service
              </Button>
            }
          />
        </div>

        <div className="mt-8 space-y-4">
          {services.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
              No services yet — add your first one so customers know what they can book.
            </p>
          )}
          {services.map((svc) => {
            const assignedPros = team.filter((p) => svc.professional_ids?.includes(p.id));
            return (
              <div key={svc.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{svc.name}</p>
                      {svc.popular && (
                        <Badge variant="default" className="rounded-full text-[10px]">
                          Popular
                        </Badge>
                      )}
                      {svc.stream && (
                        <Badge variant="outline" className="rounded-full font-mono text-[10px] uppercase">
                          {svc.stream}
                        </Badge>
                      )}
                      {svc.category_name && (
                        <span className="text-xs text-muted-foreground">· {svc.category_name}</span>
                      )}
                    </div>
                    {svc.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{svc.description}</p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatDuration(svc.duration_minutes)} ·{' '}
                      {formatZAR(svc.price) || 'Rate on request'}
                      {svc.price_note ? ` ${svc.price_note}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {assignedPros.length
                        ? `With ${assignedPros.map((p) => p.name).join(', ')}`
                        : 'Any professional'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Bookable
                      <Switch
                        checked={svc.active !== false}
                        onCheckedChange={async (active) => {
                          await servicesApi.update(svc.id, { active });
                          refresh();
                        }}
                      />
                    </label>
                    <ServiceModal
                      providerId={provider.id}
                      team={team}
                      service={svc}
                      onSaved={refresh}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Edit service">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <ConfirmDialog
                      title={`Delete ${svc.name}?`}
                      description="Existing appointments stay, but customers can no longer book it."
                      confirmLabel="Delete"
                      onConfirm={async () => {
                        await servicesApi.delete(svc.id);
                        refresh();
                      }}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Delete service">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

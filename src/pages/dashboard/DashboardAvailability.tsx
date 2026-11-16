/**
 * Provider Dashboard Availability & Slot Generator (`tF` and `eF` in Base44)
 * --------------------------------------------------------------------------
 * Bulk-create bookable time slots by professional, service, date, time range,
 * slot duration (15/30/45/60/90/120 min), and weekly repeat (1/2/4/8 weeks).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { CalendarPlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  professionalsApi,
  servicesApi,
  slotsApi,
  type ProfessionalRecord,
  type ServiceRecord,
  type SlotRecord,
} from '../../services/api';
import { useMyProvider } from '../../hooks/useMyProvider';
import { useSSE } from '../../hooks/useSSE';
import DashboardSubNav from '../../components/dashboard/DashboardSubNav';
import { Button, Input, Label, ConfirmDialog, Spinner } from '../../components/ui';
import {
  cn,
  todayStr,
  addDaysToDateStr,
  timeToMinutes,
  minutesToTime,
  formatDateHuman,
  formatTime12,
} from '../../lib/utils';

const SLOT_LENGTHS = [15, 30, 45, 60, 90, 120];

function SlotGenerator({
  providerId,
  team,
  services,
  onCreated,
}: {
  providerId: string;
  team: ProfessionalRecord[];
  services: ServiceRecord[];
  onCreated: () => void;
}) {
  const [professionalId, setProfessionalId] = useState('');
  const [serviceId, setServiceId] = useState('any');
  const [date, setDate] = useState(() => todayStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [slotLength, setSlotLength] = useState('30');
  const [repeatWeeks, setRepeatWeeks] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Auto-select first professional if not set
  useEffect(() => {
    if (!professionalId && team.length > 0) {
      setProfessionalId(team[0].id);
    }
  }, [team, professionalId]);

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <h2 className="font-display text-lg text-foreground">Open up time slots</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a professional and a time range — we’ll split it into bookable slots.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="slot-pro">Professional</Label>
          <select
            id="slot-pro"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            className="mt-2 flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Choose a professional</option>
            {team.map((pro) => (
              <option key={pro.id} value={pro.id}>
                {pro.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="slot-service">Service</Label>
          <select
            id="slot-service"
            value={serviceId}
            onChange={(e) => {
              const val = e.target.value;
              setServiceId(val);
              const svc = services.find((s) => s.id === val);
              if (svc?.duration_minutes && SLOT_LENGTHS.includes(Number(svc.duration_minutes))) {
                setSlotLength(String(svc.duration_minutes));
              }
            }}
            className="mt-2 flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="any">Any service</option>
            {services.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="slot-date">Date</Label>
          <Input
            id="slot-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="slot-start">From</Label>
          <Input
            id="slot-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="slot-end">To</Label>
          <Input
            id="slot-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="slot-length">Slot length</Label>
          <select
            id="slot-length"
            value={slotLength}
            onChange={(e) => setSlotLength(e.target.value)}
            className="mt-2 flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SLOT_LENGTHS.map((len) => (
              <option key={len} value={String(len)}>
                {len} minutes
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="slot-repeat">Repeat weekly</Label>
          <select
            id="slot-repeat"
            value={repeatWeeks}
            onChange={(e) => setRepeatWeeks(e.target.value)}
            className="mt-2 flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {['1', '2', '4', '8'].map((w) => (
              <option key={w} value={w}>
                {w === '1' ? 'Just this day' : `${w} weeks`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          className="rounded-full"
          disabled={submitting || team.length === 0}
          onClick={async () => {
            if (!professionalId) {
              setMessage('Choose who these slots belong to.');
              return;
            }
            if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
              setMessage('The end time needs to be after the start time.');
              return;
            }
            setMessage('');
            setSubmitting(true);

            const stepMin = Number(slotLength);
            const items: Array<{
              provider_id: string;
              professional_id: string;
              service_id?: string;
              date: string;
              start_time: string;
              end_time: string;
              status: string;
            }> = [];

            for (let w = 0; w < Number(repeatWeeks); w += 1) {
              const targetDate = addDaysToDateStr(date, w * 7).dateStr;
              for (
                let cursor = timeToMinutes(startTime);
                cursor + stepMin <= timeToMinutes(endTime);
                cursor += stepMin
              ) {
                items.push({
                  provider_id: providerId,
                  professional_id: professionalId,
                  ...(serviceId === 'any' ? {} : { service_id: serviceId }),
                  date: targetDate,
                  start_time: minutesToTime(cursor),
                  end_time: minutesToTime(cursor + stepMin),
                  status: 'open',
                });
              }
            }

            try {
              await slotsApi.bulkCreate(items);
              const msg = `${items.length} slot${items.length === 1 ? '' : 's'} added.`;
              setMessage(msg);
              toast.success(msg);
              onCreated();
            } catch (err: any) {
              toast.error(err.message || 'Could not create slots');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CalendarPlus className="mr-2 h-4 w-4" />
          )}
          Add slots
        </Button>

        {team.length === 0 && (
          <span className="text-sm text-muted-foreground">Add a professional first.</span>
        )}
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
      </div>
    </div>
  );
}

export default function DashboardAvailability() {
  const { provider, loading } = useMyProvider();
  const [team, setTeam] = useState<ProfessionalRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [slots, setSlots] = useState<SlotRecord[]>([]);

  const loadAll = useCallback(async (providerId: string) => {
    const [proRes, svcRes, slotRes] = await Promise.all([
      professionalsApi.list({ provider_id: providerId, limit: 100 }),
      servicesApi.list({ provider_id: providerId, active: true, limit: 100 }),
      slotsApi.list({ provider_id: providerId, date_gte: todayStr(), limit: 300 }),
    ]);
    setTeam(proRes.items);
    setServices(svcRes.items);
    setSlots(
      [...slotRes.items].sort((a, b) =>
        `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`),
      ),
    );
  }, []);

  useEffect(() => {
    if (provider) void loadAll(provider.id);
  }, [provider, loadAll]);

  useSSE(
    [
      'slot:created',
      'slot:updated',
      'slot:deleted',
      'slots:bulk_created',
      'booking:created',
      'booking:updated',
    ],
    () => {
      if (provider) void loadAll(provider.id);
    },
  );

  const groupedByDate = useMemo(
    () =>
      slots.reduce<Record<string, SlotRecord[]>>((acc, slot) => {
        acc[slot.date] = acc[slot.date] || [];
        acc[slot.date].push(slot);
        return acc;
      }, {}),
    [slots],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!provider) return <Navigate to="/dashboard" replace />;

  const refresh = () => void loadAll(provider.id);
  const proName = (proId: string) => team.find((p) => p.id === proId)?.name || 'Unassigned';

  return (
    <div>
      <DashboardSubNav />
      <div className="mx-auto w-full max-w-4xl space-y-8 px-5 py-10">
        <div>
          <h1 className="font-display text-3xl text-foreground">Availability</h1>
          <p className="mt-2 text-muted-foreground">
            Assign your professionals to open slots — customers can only book what’s open here.
          </p>
        </div>

        <SlotGenerator
          providerId={provider.id}
          team={team}
          services={services}
          onCreated={refresh}
        />

        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-xl text-foreground">Upcoming slots</h2>
            <p className="text-sm text-muted-foreground">{slots.length} shown</p>
          </div>

          {slots.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
              No slots yet. Add some above and they’ll appear here straight away.
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {Object.entries(groupedByDate).map(([dateKey, daySlots]) => (
                <div key={dateKey}>
                  <p className="text-sm font-medium text-foreground">
                    {formatDateHuman(dateKey)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                          slot.status === 'open' && 'border-border bg-card',
                          slot.status === 'booked' &&
                            'border-primary/30 bg-primary/5 text-primary',
                          slot.status === 'blocked' &&
                            'border-border bg-muted text-muted-foreground',
                        )}
                      >
                        <span className="font-medium text-foreground">
                          {formatTime12(slot.start_time)}
                        </span>
                        <span className="text-muted-foreground">
                          {proName(slot.professional_id)} · {slot.status}
                        </span>
                        {slot.status !== 'booked' && (
                          <ConfirmDialog
                            title="Remove this slot?"
                            description="It disappears from your public page."
                            confirmLabel="Remove"
                            onConfirm={async () => {
                              await slotsApi.delete(slot.id);
                              refresh();
                            }}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                aria-label="Remove slot"
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

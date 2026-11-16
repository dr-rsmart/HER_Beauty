/**
 * 4-Step Appointment Booking Wizard (`nE`, `ZT`, `QT`, `$T` in Base44)
 * --------------------------------------------------------------------
 * Step 1: Service
 * Step 2: Professional ("Any available professional" or specific)
 * Step 3: Time (14-day date strip + open time slots grid)
 * Step 4: Confirm (Customer details + atomic booking creation -> Confirmation screen)
 */

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CalendarCheck, LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  providersApi,
  servicesApi,
  professionalsApi,
  slotsApi,
  bookingsApi,
  herApi,
  type ProviderRecord,
  type ServiceRecord,
  type ProfessionalRecord,
  type SlotRecord,
  type BookingRecord,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Textarea, Label, Skeleton, PathwayBadge, Badge } from '../components/ui';
import {
  cn,
  todayStr,
  addDaysToDateStr,
  formatDuration,
  formatZAR,
  formatDateHuman,
  formatTime12,
} from '../lib/utils';
import { useSSE } from '../hooks/useSSE';

const STEPS = ['Service', 'Professional', 'Time', 'Confirm'];

function SelectableCard({
  selected,
  onClick,
  title,
  subtitle,
  meta,
  trailing,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition',
        selected
          ? 'border-primary bg-primary/5 shadow-[0_14px_36px_-30px_rgba(12,58,52,0.9)]'
          : 'border-border bg-card hover:border-primary/40',
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{title}</p>
          {selected && <Check className="h-4 w-4 text-primary" />}
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        {meta && (
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{meta}</p>
        )}
      </div>
      {trailing}
    </button>
  );
}

function StepPills({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, idx) => (
        <li
          key={step}
          className={cn(
            'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs transition-colors',
            idx === current && 'bg-primary text-primary-foreground',
            idx < current && 'bg-secondary text-secondary-foreground',
            idx > current && 'text-muted-foreground',
          )}
        >
          <span className="font-semibold">{idx + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function DateAndSlotPicker({
  selectedDate,
  onSelectDate,
  slots,
  selectedSlot,
  onSelectSlot,
  loading,
  professionalNameFor,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  slots: SlotRecord[];
  selectedSlot: SlotRecord | null;
  onSelectSlot: (slot: SlotRecord) => void;
  loading: boolean;
  professionalNameFor: ((proId: string) => string) | null;
}) {
  const baseDate = useMemo(() => todayStr(), []);
  const days = useMemo(
    () => Array.from({ length: 14 }, (_, idx) => addDaysToDateStr(baseDate, idx)),
    [baseDate],
  );

  return (
    <div className="space-y-5">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <button
            key={d.dateStr}
            type="button"
            onClick={() => onSelectDate(d.dateStr)}
            className={cn(
              'flex min-w-[72px] flex-col items-center rounded-2xl border px-3 py-2.5 transition',
              d.dateStr === selectedDate
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:border-primary/40',
            )}
          >
            <span className="text-xs uppercase tracking-wide opacity-70">{d.dayShort}</span>
            <span className="font-display text-lg leading-tight">{d.dayNum}</span>
            <span className="text-[11px] opacity-70">{d.monthShort}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking open slots…
        </div>
      ) : slots.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No open slots on this day. Try another date.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelectSlot(slot)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm transition',
                selectedSlot?.id === slot.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:border-primary/40',
              )}
            >
              {formatTime12(slot.start_time)}
              {professionalNameFor && (
                <span className="mt-0.5 block text-[11px] opacity-70">
                  {professionalNameFor(slot.professional_id)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookAppointment() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin } = useAuth();

  const [provider, setProvider] = useState<ProviderRecord | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => todayStr());
  const [slots, setSlots] = useState<SlotRecord[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotRecord | null>(null);

  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    notes: '',
  });
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    title: string;
    discountPercentage: number;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [acceptedPopia, setAcceptedPopia] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [p, s, pro] = await Promise.all([
          providersApi.get(id),
          servicesApi.list({ provider_id: id, active: true, limit: 50 }),
          professionalsApi.list({ provider_id: id, active: true, limit: 50 }),
        ]);
        setProvider(p);
        setServices(s.items);
        setProfessionals(pro.items);
      } catch {
        setProvider(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Preselect service or professional from query params
  useEffect(() => {
    const svcParam = searchParams.get('service');
    const proParam = searchParams.get('professional');
    if (svcParam && services.some((s) => s.id === svcParam)) {
      setSelectedServiceId(svcParam);
      setStep((prev) => (prev === 0 ? 1 : prev));
    }
    if (proParam && professionals.some((p) => p.id === proParam)) {
      setSelectedProfessionalId(proParam);
    }
  }, [services, professionals, searchParams]);

  // Populate customer name/phone from signed-in user
  useEffect(() => {
    if (user) {
      setCustomerDetails((prev) => ({
        ...prev,
        name: prev.name || user.fullName || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  // Fetch open slots for selected date
  const loadSlots = useCallback(async () => {
    if (!provider || !selectedDate) return;
    setLoadingSlots(true);
    try {
      const res = await slotsApi.list({
        provider_id: provider.id,
        date: selectedDate,
        status: 'open',
        limit: 200,
      });
      setSlots(res.items);
      // If currently selected slot is no longer open, reset and inform user
      setSelectedSlot((prev) => {
        if (!prev) return null;
        const stillOpen = res.items.some((item) => item.id === prev.id);
        if (!stillOpen) {
          toast.info('The time slot you had selected was just booked. Please pick another slot.');
          return null;
        }
        return prev;
      });
    } finally {
      setLoadingSlots(false);
    }
  }, [provider, selectedDate]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

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
      void loadSlots();
    },
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || null,
    [services, selectedServiceId],
  );

  const eligibleProfessionals = useMemo(
    () =>
      selectedService?.professional_ids?.length
        ? professionals.filter((p) => selectedService.professional_ids.includes(p.id))
        : professionals,
    [professionals, selectedService],
  );

  const filteredSlots = useMemo(
    () =>
      slots.filter(
        (s) =>
          !(
            (selectedProfessionalId && s.professional_id !== selectedProfessionalId) ||
            (selectedServiceId && s.service_id && s.service_id !== selectedServiceId)
          ),
      ),
    [slots, selectedProfessionalId, selectedServiceId],
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5 px-5 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-foreground">This business isn’t available</h1>
        <Button className="mt-6 rounded-full" onClick={() => navigate('/')}>
          Back to browsing
        </Button>
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-16">
        <div className="rounded-3xl border border-primary/25 bg-card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-display text-3xl text-foreground">You’re booked in</h1>
          <p className="mt-2 text-muted-foreground">
            {confirmedBooking.service_name} at {confirmedBooking.provider_name}
          </p>
          {confirmedBooking.reference_code && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 font-mono text-xs font-semibold text-primary">
              Booking Reference: {confirmedBooking.reference_code}
            </div>
          )}

          <dl className="mt-8 space-y-3 rounded-2xl bg-secondary/60 p-5 text-left text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">When</dt>
              <dd className="text-foreground">
                {formatDateHuman(confirmedBooking.date)} ·{' '}
                {formatTime12(confirmedBooking.start_time)}–
                {formatTime12(confirmedBooking.end_time)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Artisan / Professional</dt>
              <dd className="text-foreground">
                {confirmedBooking.professional_name || 'To be assigned'}
              </dd>
            </div>
            {confirmedBooking.promo_code && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Applied Promo</dt>
                <dd className="font-mono text-xs font-semibold text-primary">
                  {confirmedBooking.promo_code} ({confirmedBooking.discount_percent}% OFF)
                </dd>
              </div>
            )}
            {formatZAR(confirmedBooking.price) && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Total Service Rate</dt>
                <dd className="font-medium text-foreground">{formatZAR(confirmedBooking.price)}</dd>
              </div>
            )}
            {formatZAR(confirmedBooking.deposit_amount) && (
              <div className="flex justify-between gap-4 border-t border-border/60 pt-2">
                <dt className="text-muted-foreground">20% Booking Policy Deposit</dt>
                <dd className="font-semibold text-primary">
                  {formatZAR(confirmedBooking.deposit_amount)}
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-5 text-sm text-muted-foreground">
            A 24-hour reminder will appear in your bookings prior to your appointment.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button className="rounded-full" onClick={() => navigate('/my-bookings')}>
              View my bookings
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => navigate(`/providers/${provider.id}`)}
            >
              Back to {provider.name}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <Link
        to={`/providers/${provider.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {provider.name}
      </Link>

      <h1 className="mt-4 font-display text-3xl text-foreground">Book an appointment</h1>

      <div className="mt-6">
        <StepPills steps={STEPS} current={step} />
      </div>

      <div className="mt-8 space-y-6">
        {/* Step 0: Select Service */}
        {step === 0 && (
          <section className="space-y-3">
            {services.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                This business hasn’t published services yet.
              </p>
            )}
            {services.map((svc) => (
              <SelectableCard
                key={svc.id}
                selected={selectedServiceId === svc.id}
                onClick={() => {
                  setSelectedServiceId(svc.id);
                  setSelectedProfessionalId('');
                  setSelectedSlot(null);
                }}
                title={svc.name}
                subtitle={svc.description}
                meta={`${formatDuration(svc.duration_minutes)}${formatZAR(svc.price) ? ` · ${formatZAR(svc.price)}` : ''}`}
              />
            ))}
            <div className="flex justify-end pt-2">
              <Button
                className="rounded-full"
                disabled={!selectedServiceId}
                onClick={() => setStep(1)}
              >
                Continue
              </Button>
            </div>
          </section>
        )}

        {/* Step 1: Select Professional */}
        {step === 1 && (
          <section className="space-y-3">
            <SelectableCard
              selected={selectedProfessionalId === ''}
              onClick={() => setSelectedProfessionalId('')}
              title="Any available artisan"
              subtitle="We’ll assign the first HER Beauty artisan free at your chosen time."
            />
            {eligibleProfessionals.map((pro) => (
              <SelectableCard
                key={pro.id}
                selected={selectedProfessionalId === pro.id}
                onClick={() => {
                  setSelectedProfessionalId(pro.id);
                  setSelectedSlot(null);
                }}
                title={pro.name}
                subtitle={pro.bio}
                meta={pro.specialties?.length ? pro.specialties.join(' · ') : pro.title}
                trailing={
                  <PathwayBadge
                    stage={pro.pathway_stage}
                    role={pro.pathway_role || pro.title}
                    className="shrink-0"
                  />
                }
              />
            ))}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" className="rounded-full" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button className="rounded-full" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </section>
        )}

        {/* Step 2: Select Date & Time Slot */}
        {step === 2 && (
          <section className="space-y-6">
            <DateAndSlotPicker
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setSelectedSlot(null);
              }}
              slots={filteredSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              loading={loadingSlots}
              professionalNameFor={
                selectedProfessionalId
                  ? null
                  : (proId) =>
                      (professionals.find((p) => p.id === proId)?.name || '').split(' ')[0]
              }
            />
            <div className="flex justify-between pt-2">
              <Button variant="ghost" className="rounded-full" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="rounded-full"
                disabled={!selectedSlot}
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </section>
        )}

        {/* Step 3: Confirm Booking (with Promo Code, 20% Deposit & POPIA Consent) */}
        {step === 3 && selectedSlot && (
          <section className="space-y-6">
            {(() => {
              const basePrice = Number(selectedService?.price ?? 0);
              const discountPct = appliedPromo?.discountPercentage ?? 0;
              const finalPrice =
                selectedService?.price != null
                  ? Math.round(basePrice * (1 - discountPct / 100) * 100) / 100
                  : null;
              const depositDue =
                finalPrice != null ? Math.round(finalPrice * 0.2 * 100) / 100 : null;
              const assignedPro =
                professionals.find((p) => p.id === selectedSlot.professional_id) || null;

              return (
                <>
                  <div className="rounded-2xl border border-border bg-secondary/50 p-5 text-sm space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{selectedService?.name}</p>
                      {assignedPro && (
                        <PathwayBadge
                          stage={assignedPro.pathway_stage}
                          role={assignedPro.pathway_role || assignedPro.title}
                        />
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {formatDateHuman(selectedSlot.date)} · {formatTime12(selectedSlot.start_time)}–
                      {formatTime12(selectedSlot.end_time)}
                    </p>
                    <p className="text-muted-foreground">
                      {assignedPro?.name || 'Any available artisan'}
                    </p>
                    {finalPrice != null && (
                      <div className="border-t border-border/60 pt-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-display text-lg text-foreground">
                            {finalPrice === 0 ? 'Complimentary' : formatZAR(finalPrice)}
                          </span>
                          {discountPct > 0 && (
                            <span className="ml-2 text-xs text-primary font-semibold">
                              ({discountPct}% off with {appliedPromo?.code})
                            </span>
                          )}
                        </div>
                        {depositDue != null && depositDue > 0 && (
                          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                            20% Deposit: {formatZAR(depositDue)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Promo Code Box */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <Label htmlFor="promo-code" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Campus Special / Promo Code (e.g. CAMPUS20, WELCOME15, GLOW25)
                    </Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        id="promo-code"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="Enter promo code"
                        className="font-mono uppercase"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={validatingPromo || !promoInput.trim()}
                        onClick={async () => {
                          setValidatingPromo(true);
                          try {
                            const res = await herApi.validatePromoCode(promoInput.trim());
                            setAppliedPromo({
                              code: res.offer.code,
                              title: res.offer.title,
                              discountPercentage: res.offer.discountPercentage,
                            });
                            toast.success(
                              `Applied ${res.offer.code}: ${res.offer.discountPercentage}% off (${res.offer.title})`,
                            );
                          } catch (err: any) {
                            setAppliedPromo(null);
                            toast.error(err.message || 'Invalid promo code');
                          } finally {
                            setValidatingPromo(false);
                          }
                        }}
                      >
                        {validatingPromo ? 'Checking…' : 'Apply'}
                      </Button>
                    </div>
                  </div>

                  {isAuthenticated ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Your name</Label>
                        <Input
                          id="name"
                          value={customerDetails.name}
                          onChange={(e) =>
                            setCustomerDetails({ ...customerDetails, name: e.target.value })
                          }
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone number</Label>
                        <Input
                          id="phone"
                          value={customerDetails.phone}
                          onChange={(e) =>
                            setCustomerDetails({ ...customerDetails, phone: e.target.value })
                          }
                          placeholder="So the studio can reach you"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="notes">Texture, styling or allergy notes</Label>
                        <Textarea
                          id="notes"
                          value={customerDetails.notes}
                          onChange={(e) =>
                            setCustomerDetails({ ...customerDetails, notes: e.target.value })
                          }
                          placeholder="Optional hair texture, skin or botanical preferences for your artisan"
                          className="mt-2"
                        />
                      </div>

                      {/* HER Beauty Booking Policy & POPIA Consent */}
                      <div className="space-y-2.5 rounded-2xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="mt-0.5 accent-brand-copper"
                          />
                          <span>
                            I accept the <strong className="text-foreground">HER Booking Policy</strong> (20% redeemable deposit, free cancellation up to 24 hours prior, 50% late/no-show fee, 10-minute grace window).
                          </span>
                        </label>
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptedPopia}
                            onChange={(e) => setAcceptedPopia(e.target.checked)}
                            className="mt-0.5 accent-brand-copper"
                          />
                          <span>
                            I consent under <strong className="text-foreground">POPIA (Act 4 of 2013)</strong> to HER Beauty processing my appointment & care preferences (hair texture, skin & allergy notes).
                          </span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center">
                      <p className="text-foreground">Sign in to confirm and get your reminder.</p>
                      <Button
                        className="mt-4 rounded-full"
                        onClick={() => navigateToLogin()}
                      >
                        <LogIn className="mr-2 h-4 w-4" /> Sign in to continue
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" className="rounded-full" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    {isAuthenticated && user && (
                      <Button
                        className="rounded-full"
                        disabled={submitting || !acceptedTerms || !acceptedPopia}
                        onClick={async () => {
                          setSubmitting(true);
                          try {
                            const created = await bookingsApi.create({
                              provider_id: provider.id,
                              provider_name: provider.name,
                              service_id: selectedService?.id ?? null,
                              service_name: selectedService?.name || 'Appointment',
                              professional_id: assignedPro?.id ?? null,
                              professional_name: assignedPro?.name ?? null,
                              slot_id: selectedSlot.id,
                              customer_id: user.id,
                              customer_name: customerDetails.name || user.fullName || user.email,
                              customer_email: user.email,
                              customer_phone: customerDetails.phone,
                              date: selectedSlot.date,
                              start_time: selectedSlot.start_time,
                              end_time: selectedSlot.end_time,
                              price: finalPrice,
                              deposit_amount: depositDue,
                              promo_code: appliedPromo?.code || '',
                              discount_percent: discountPct,
                              popia_consent: acceptedPopia,
                              notes: customerDetails.notes,
                              status: 'confirmed',
                            });
                            setConfirmedBooking(created);
                          } catch (err: any) {
                            toast.error(err.message || 'Could not complete booking');
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                      >
                        {submitting ? 'Confirming…' : 'Confirm booking'}
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
          </section>
        )}
      </div>
    </div>
  );
}

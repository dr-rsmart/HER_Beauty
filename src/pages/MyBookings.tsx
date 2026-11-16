/**
 * My Bookings Page (`Mk` and `jk` in Base44)
 * ------------------------------------------
 * Displays upcoming reminders banner, Upcoming appointments with cancellation,
 * and Past & cancelled appointments.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, User, Phone, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { bookingsApi, type BookingRecord } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, ConfirmDialog, Skeleton } from '../components/ui';
import {
  cn,
  todayStr,
  formatDateHuman,
  formatTime12,
  formatZAR,
  STATUS_BADGE_CLASSES,
  relativeTimeNotice,
} from '../lib/utils';
import { useSSE } from '../hooks/useSSE';

function CustomerBookingCard({
  booking,
  onCancel,
  highlighted,
}: {
  booking: BookingRecord;
  onCancel: (b: BookingRecord) => Promise<void>;
  highlighted?: boolean;
}) {
  const rel = relativeTimeNotice(booking.date, booking.start_time);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-5 transition',
        highlighted
          ? 'border-primary/50 shadow-[0_18px_50px_-40px_rgba(12,58,52,0.9)]'
          : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to={`/providers/${booking.provider_id}`}
            className="font-display text-lg text-foreground hover:text-primary"
          >
            {booking.provider_name}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{booking.service_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {booking.reference_code && (
            <Badge variant="outline" className="font-mono text-[11px]">
              {booking.reference_code}
            </Badge>
          )}
          {rel && booking.status !== 'cancelled' && (
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              {rel}
            </Badge>
          )}
          <Badge variant="outline" className={STATUS_BADGE_CLASSES[booking.status]}>
            {booking.status}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary/70" />
          {formatDateHuman(booking.date)} · {formatTime12(booking.start_time)}–
          {formatTime12(booking.end_time)}
        </span>
        {booking.professional_name && (
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary/70" />
            {booking.professional_name}
          </span>
        )}
        {booking.customer_phone && (
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-primary/70" />
            {booking.customer_phone}
          </span>
        )}
        {formatZAR(booking.price) && (
          <span className="font-medium text-foreground">{formatZAR(booking.price)}</span>
        )}
        {formatZAR(booking.deposit_amount) && (
          <span className="text-xs text-primary">
            (20% deposit: {formatZAR(booking.deposit_amount)})
          </span>
        )}
        {booking.promo_code && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
            {booking.promo_code}
          </span>
        )}
      </div>

      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
        <div className="mt-4 flex justify-end">
          <ConfirmDialog
            title="Cancel this appointment?"
            description="The slot will be released for someone else to book."
            confirmLabel="Cancel appointment"
            onConfirm={() => onCancel(booking)}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                Cancel booking
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await bookingsApi.list({ customer_id: user.id, limit: 100 });
      setBookings(res.items);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useSSE(['booking:created', 'booking:updated', 'booking:reminder'], () => {
    void loadBookings();
  });

  const today = todayStr();

  const upcoming = useMemo(
    () => bookings.filter((b) => b.date >= today && b.status !== 'cancelled'),
    [bookings, today],
  );

  const pastAndCancelled = useMemo(
    () => bookings.filter((b) => b.date < today || b.status === 'cancelled'),
    [bookings, today],
  );

  const nextBooking = upcoming[0];
  const nextRel = nextBooking
    ? relativeTimeNotice(nextBooking.date, nextBooking.start_time)
    : null;

  const handleCancel = async (b: BookingRecord) => {
    try {
      await bookingsApi.update(b.id, { status: 'cancelled' });
      toast.success('Appointment cancelled and slot released.');
      void loadBookings();
    } catch (err: any) {
      toast.error(err.message || 'Could not cancel booking');
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl text-foreground">My bookings</h1>
      <p className="mt-2 text-muted-foreground">
        Everything you’ve booked, and your upcoming reminders.
      </p>

      {loading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {nextBooking && (
            <div className="flex items-start gap-4 rounded-3xl border border-primary/25 bg-primary/5 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-lg text-foreground">
                  {nextRel ? `Reminder — ${nextRel.toLowerCase()}` : 'Coming up'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextBooking.service_name} at {nextBooking.provider_name} ·{' '}
                  {formatDateHuman(nextBooking.date)} at {formatTime12(nextBooking.start_time)}
                </p>
              </div>
            </div>
          )}

          <section>
            <h2 className="font-display text-xl text-foreground">Upcoming</h2>
            <div className="mt-4 space-y-4">
              {upcoming.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No upcoming appointments. Browse businesses to book your next visit.
                </p>
              )}
              {upcoming.map((b) => (
                <CustomerBookingCard
                  key={b.id}
                  booking={b}
                  highlighted={b.id === nextBooking?.id}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          </section>

          {pastAndCancelled.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-foreground">Past & cancelled</h2>
              <div className="mt-4 space-y-4">
                {pastAndCancelled.map((b) => (
                  <CustomerBookingCard key={b.id} booking={b} onCancel={handleCancel} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

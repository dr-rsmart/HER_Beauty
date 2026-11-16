/**
 * Studio Dashboard Specials & Broadcast Communications (`/dashboard/specials`)
 * ---------------------------------------------------------------------------
 * Floor 1 (HER Beauty) module built on the BookingTrack Dashboard Foundation:
 * - Campus Specials & Promo Codes (CAMPUS20, WELCOME15, GLOW25, CULTURE10, STUDY15)
 * - Studio Broadcast Communications (SMS, Email, In-App to Artisans or Clients)
 */

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Tag, Plus, Trash2, Send, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  herApi,
  type SpecialOfferRecord,
  type BroadcastMessageRecord,
} from '../../services/api';
import { useMyProvider } from '../../hooks/useMyProvider';
import { useSSE } from '../../hooks/useSSE';
import DashboardSubNav from '../../components/dashboard/DashboardSubNav';
import {
  Badge,
  Button,
  Input,
  Textarea,
  Label,
  DialogModal,
  ConfirmDialog,
  Spinner,
} from '../../components/ui';

export default function DashboardSpecials() {
  const { provider, loading } = useMyProvider();
  const [specials, setSpecials] = useState<SpecialOfferRecord[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessageRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [savingSpecial, setSavingSpecial] = useState(false);
  const [specialForm, setSpecialForm] = useState({
    title: '',
    code: '',
    discountPercentage: 15,
    description: '',
    validFrom: '2026-09-01',
    validUntil: '2026-12-31',
    targetAudience: 'all',
  });

  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    targetGroup: 'all_customers',
    channel: 'in_app',
    subject: '',
    body: '',
  });

  const loadAll = useCallback(async (providerId: string) => {
    setLoadingData(true);
    try {
      const [spRes, brRes] = await Promise.all([
        herApi.listSpecials(providerId),
        herApi.listBroadcasts(providerId),
      ]);
      setSpecials(spRes.items);
      setBroadcasts(brRes.items);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (provider) void loadAll(provider.id);
  }, [provider, loadAll]);

  useSSE(['special:created', 'special:deleted', 'broadcast:sent'], () => {
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

  const handleCreateSpecial = async () => {
    if (!specialForm.title.trim() || !specialForm.code.trim()) return;
    setSavingSpecial(true);
    try {
      await herApi.createSpecial({
        ...specialForm,
        provider_id: provider.id,
        code: specialForm.code.toUpperCase().trim(),
      });
      toast.success('Campus special offer published.');
      setAddOpen(false);
      setSpecialForm({
        title: '',
        code: '',
        discountPercentage: 15,
        description: '',
        validFrom: '2026-09-01',
        validUntil: '2026-12-31',
        targetAudience: 'all',
      });
      void loadAll(provider.id);
    } catch (err: any) {
      toast.error(err.message || 'Could not create special');
    } finally {
      setSavingSpecial(false);
    }
  };

  const handleSendBroadcast = async (e: FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.subject.trim() || !broadcastForm.body.trim()) return;
    setSendingBroadcast(true);
    try {
      await herApi.sendBroadcast({
        ...broadcastForm,
        provider_id: provider.id,
      });
      toast.success('Studio broadcast dispatched and recorded in audit trail.');
      setBroadcastForm({
        targetGroup: 'all_customers',
        channel: 'in_app',
        subject: '',
        body: '',
      });
      void loadAll(provider.id);
    } catch (err: any) {
      toast.error(err.message || 'Could not send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div>
      <DashboardSubNav />
      <div className="mx-auto w-full max-w-5xl space-y-12 px-5 py-10">
        {/* ── Campus Specials & Promo Codes ── */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Tag className="h-4 w-4" />
                <span className="font-mono text-xs uppercase tracking-widest">
                  Campus Privileges & Promo Codes
                </span>
              </div>
              <h1 className="mt-2 font-display text-3xl text-foreground">
                Specials & Communications
              </h1>
              <p className="mt-1 text-muted-foreground">
                Manage student promo codes (redeemable in Step 4 of booking) and studio broadcasts.
              </p>
            </div>
            <Button className="rounded-full" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Campus Special
            </Button>
          </div>

          {loadingData ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {specials.map((sp) => (
                <div
                  key={sp.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="rounded-full">
                          {sp.discountPercentage}% OFF
                        </Badge>
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
                          {sp.code}
                        </span>
                      </div>
                      <ConfirmDialog
                        title={`Remove ${sp.title}?`}
                        description={`Promo code ${sp.code} will no longer be redeemable.`}
                        confirmLabel="Delete"
                        onConfirm={async () => {
                          await herApi.deleteSpecial(sp.id);
                          toast.success('Special offer removed.');
                          void loadAll(provider.id);
                        }}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Delete special">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        }
                      />
                    </div>
                    <h3 className="mt-3 font-display text-lg text-foreground">{sp.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{sp.description}</p>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Valid {sp.validFrom} → {sp.validUntil} · Target: {sp.targetAudience}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Studio Broadcast Communications ── */}
        <section className="grid gap-8 border-t border-border/60 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <form
            onSubmit={handleSendBroadcast}
            className="space-y-4 rounded-3xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-2 text-primary">
              <Megaphone className="h-4 w-4" />
              <h2 className="font-display text-xl text-foreground">Send Studio Broadcast</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Notify artisans about mentorship rosters or announce campus specials to clients.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="br-target">Audience</Label>
                <select
                  id="br-target"
                  value={broadcastForm.targetGroup}
                  onChange={(e) =>
                    setBroadcastForm({ ...broadcastForm, targetGroup: e.target.value })
                  }
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="all_customers">All Campus Clients</option>
                  <option value="vip_clients">HER Circle VIP Clients</option>
                  <option value="all_stylists">All Artisans & Fellows</option>
                </select>
              </div>
              <div>
                <Label htmlFor="br-channel">Channel</Label>
                <select
                  id="br-channel"
                  value={broadcastForm.channel}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, channel: e.target.value })}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="in_app">In-App Notice</option>
                  <option value="email">Email Bulletin</option>
                  <option value="sms">SMS Alert</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="br-subj">Subject</Label>
              <Input
                id="br-subj"
                required
                value={broadcastForm.subject}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                placeholder="e.g. Saturday Braiding Masterclass Seats Open"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="br-body">Message</Label>
              <Textarea
                id="br-body"
                required
                rows={3}
                value={broadcastForm.body}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })}
                placeholder="Write your studio announcement…"
                className="mt-1.5"
              />
            </div>

            <Button type="submit" className="w-full rounded-full" disabled={sendingBroadcast}>
              <Send className="mr-2 h-4 w-4" />
              {sendingBroadcast ? 'Sending…' : 'Dispatch Broadcast'}
            </Button>
          </form>

          <div className="space-y-4">
            <h2 className="font-display text-xl text-foreground">Recent Broadcast History</h2>
            {broadcasts.map((msg) => (
              <div
                key={msg.id}
                className="rounded-2xl border border-border bg-card p-5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full font-mono text-[10px] uppercase">
                      {msg.channel}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-[11px]">
                      {msg.targetGroup.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.sentAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="font-medium text-foreground">{msg.subject}</p>
                <p className="text-sm text-muted-foreground">{msg.body}</p>
              </div>
            ))}
          </div>
        </section>

        <DialogModal
          open={addOpen}
          onOpenChange={setAddOpen}
          title="Add Campus Special Offer"
          footer={
            <>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button disabled={savingSpecial} onClick={handleCreateSpecial}>
                {savingSpecial ? 'Saving…' : 'Publish Special'}
              </Button>
            </>
          }
        >
          <div>
            <Label htmlFor="sp-title">Offer Title</Label>
            <Input
              id="sp-title"
              value={specialForm.title}
              onChange={(e) => setSpecialForm({ ...specialForm, title: e.target.value })}
              placeholder="e.g. Exam Study-Break Glow Package"
              className="mt-1.5"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sp-code">Promo Code</Label>
              <Input
                id="sp-code"
                value={specialForm.code}
                onChange={(e) =>
                  setSpecialForm({ ...specialForm, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g. GLOW20"
                className="mt-1.5 font-mono uppercase"
              />
            </div>
            <div>
              <Label htmlFor="sp-disc">Discount (%)</Label>
              <Input
                id="sp-disc"
                type="number"
                min="5"
                max="80"
                value={specialForm.discountPercentage}
                onChange={(e) =>
                  setSpecialForm({
                    ...specialForm,
                    discountPercentage: Number(e.target.value),
                  })
                }
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sp-desc">Description</Label>
            <Textarea
              id="sp-desc"
              rows={3}
              value={specialForm.description}
              onChange={(e) => setSpecialForm({ ...specialForm, description: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </DialogModal>
      </div>
    </div>
  );
}

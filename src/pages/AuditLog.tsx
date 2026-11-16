/**
 * Immutable Audit Log Page (TimeTrack standard)
 * ---------------------------------------------
 * Displays tenant/platform audit records with entity/action filters,
 * search, POPIA IP redaction, and before/after diff inspection.
 */

import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Search, Shield } from 'lucide-react';
import { auditApi, type AuditLogRecord } from '../services/api';
import { Badge, Input, Spinner } from '../components/ui';

const ENTITIES = ['', 'Provider', 'Service', 'Professional', 'Slot', 'Booking', 'User'];

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({
        entity: entity || undefined,
        search: search.trim() || undefined,
        limit: 100,
      });
      setLogs(res.items);
    } finally {
      setLoading(false);
    }
  }, [entity, search]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadLogs();
    }, 200);
    return () => clearTimeout(t);
  }, [loadLogs]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <ScrollText className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Compliance & Governance
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl text-foreground">Immutable Audit Trail</h1>
          <p className="mt-1 text-muted-foreground">
            Every booking, slot, service, and account change is recorded with before/after diffs.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by actor email, action or note…"
            className="h-10 rounded-full bg-card pl-10"
          />
        </div>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="h-10 rounded-full border border-border bg-card px-4 text-sm text-foreground"
        >
          <option value="">All entities</option>
          {ENTITIES.filter(Boolean).map((ent) => (
            <option key={ent} value={ent}>
              {ent}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-6 w-6" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          No audit entries match your current filter.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="rounded-full">
                    {log.entity}
                  </Badge>
                  <Badge variant="outline" className="rounded-full font-mono text-xs">
                    {log.action}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{log.actorEmail}</span>
                  <span className="text-xs uppercase text-muted-foreground">
                    ({log.actorRole})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {log.ipAddress && (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Shield className="h-3 w-3 text-primary/70" />
                      {log.ipAddress}
                    </span>
                  )}
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {log.justification && (
                <p className="mt-2 text-sm text-muted-foreground">{log.justification}</p>
              )}

              {log.changes && Object.keys(log.changes).length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-xl bg-secondary/50 p-3 font-mono text-xs text-muted-foreground">
                  {Object.entries(log.changes).map(([field, diff]) => (
                    <div key={field} className="flex flex-wrap gap-2">
                      <span className="font-semibold text-foreground">{field}:</span>
                      <span className="line-through opacity-70">
                        {JSON.stringify(diff.before)}
                      </span>
                      <span>→</span>
                      <span className="text-primary">{JSON.stringify(diff.after)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { AdminGuard } from '../../auth/AdminGuard';
import { AdminChrome } from './components/AdminChrome';
import {
  listCapabilityRules,
  listStaff,
  removeStaff,
  updateCapabilityRule,
  upsertStaff,
  type StaffMember,
} from '../../lib/api/admin';
import { FAMILIES } from '../../lib/constants';
import type { Family } from '../../lib/types';
import { Badge, Button, Field, Panel, Select, TextInput } from '../../components/ui';

interface RuleRow {
  family: string;
  ruleKey: string;
  ruleValue: unknown;
  notes?: string;
}

function ruleValueToText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

/** Parses the edited text back into a JSONB-compatible value. */
function parseRuleValue(text: string): unknown {
  const t = text.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    // Plain strings are stored as JSON strings.
    return t;
  }
}

function CapabilityLibrary() {
  const [rules, setRules] = useState<RuleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    listCapabilityRules()
      .then((r) => {
        if (!active) return;
        setRules(r.sort((a, b) => a.family.localeCompare(b.family) || a.ruleKey.localeCompare(b.ruleKey)));
        setDrafts({});
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load the capability library.');
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, RuleRow[]>();
    for (const r of rules ?? []) {
      const list = map.get(r.family) ?? [];
      list.push(r);
      map.set(r.family, list);
    }
    return map;
  }, [rules]);

  const keyOf = (r: RuleRow) => `${r.family}:${r.ruleKey}`;

  const save = async (r: RuleRow) => {
    const k = keyOf(r);
    setSavingKey(k);
    setError(null);
    try {
      await updateCapabilityRule(r.family as Family, r.ruleKey, parseRuleValue(drafts[k] ?? ruleValueToText(r.ruleValue)), r.notes);
      setSavedKey(k);
      window.setTimeout(() => setSavedKey((cur) => (cur === k ? null : cur)), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Panel
      title="Manufacturing capability library"
      action={
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Reload rules"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      }
    >
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        These rules describe what the factory can manufacture (widths, colors, elongation, constructions…).
        The studio progressively uses them to steer customers away from designs Interconverters cannot produce.
        Values are JSON: numbers (<span className="font-mono">50</span>), lists (<span className="font-mono">[10, 15, 20]</span>)
        or objects (<span className="font-mono">{'{"min":10,"max":200}'}</span>).
      </p>

      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {!rules ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {[...grouped.entries()].map(([family, familyRules]) => (
            <div key={family}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                {FAMILIES.find((f) => f.code === family)?.label ?? family}{' '}
                <span className="font-mono text-slate-400">({family})</span>
              </p>
              <div className="flex flex-col gap-1.5">
                {familyRules.map((r) => {
                  const k = keyOf(r);
                  const text = drafts[k] ?? ruleValueToText(r.ruleValue);
                  const dirty = drafts[k] !== undefined && drafts[k] !== ruleValueToText(r.ruleValue);
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span
                        className="w-44 shrink-0 truncate font-mono text-xs text-slate-600"
                        title={r.notes ?? r.ruleKey}
                      >
                        {r.ruleKey}
                      </span>
                      <TextInput
                        value={text}
                        onChange={(e) => setDrafts((d) => ({ ...d, [k]: e.target.value }))}
                        className="font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant={dirty ? 'primary' : 'secondary'}
                        disabled={!dirty || savingKey === k}
                        onClick={() => void save(r)}
                        className="shrink-0 w-16 justify-center"
                      >
                        {savingKey === k ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : savedKey === k ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'technical'>('technical');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setError(null);
    listStaff()
      .then((s) => {
        if (active) setStaff(s);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load staff.');
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const addStaff = async () => {
    setBusy(true);
    setError(null);
    try {
      await upsertStaff(newId.trim(), newRole, newName.trim() || undefined);
      setNewId('');
      setNewName('');
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the staff member.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (m: StaffMember, role: 'admin' | 'technical') => {
    setError(null);
    try {
      await upsertStaff(m.id, role, m.fullName);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the role.');
    }
  };

  const remove = async (m: StaffMember) => {
    if (!window.confirm(`Remove staff access for ${m.fullName ?? m.id}? Their login remains but the dashboard will refuse them.`)) return;
    setError(null);
    try {
      await removeStaff(m.id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the staff member.');
    }
  };

  const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newId.trim());

  return (
    <Panel title="Staff members">
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Staff sign in at <span className="font-mono">/admin/login</span>. To add someone: first create their
        login in Supabase (Authentication → Add user, auto-confirm), then register their User UID here.
        Only admins can manage staff; technical staff have full dashboard access but cannot change this list.
      </p>

      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {!staff ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mb-5">
          {staff.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{m.fullName ?? 'Unnamed'}</p>
                <p className="truncate font-mono text-[10px] text-slate-400">{m.id}</p>
              </div>
              <Badge tone={m.role === 'admin' ? 'brand' : 'slate'}>{m.role}</Badge>
              <Select
                value={m.role}
                onChange={(e) => void changeRole(m, e.target.value as 'admin' | 'technical')}
                className="w-28 !py-1 text-xs"
              >
                <option value="admin">admin</option>
                <option value="technical">technical</option>
              </Select>
              <button
                type="button"
                onClick={() => void remove(m)}
                className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                aria-label={`Remove ${m.fullName ?? m.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-slate-300 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Register staff</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_130px_auto]">
          <Field label="User UID (from Supabase Auth)">
            <TextInput
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </Field>
          <Field label="Full name">
            <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
          </Field>
          <Field label="Role">
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value as 'admin' | 'technical')}>
              <option value="technical">technical</option>
              <option value="admin">admin</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button size="md" disabled={!uuidOk || busy} onClick={() => void addStaff()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default function AdminSettings() {
  return (
    <AdminGuard>
      <AdminChrome>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manufacturing capability library and staff access.
            </p>
          </div>
          <CapabilityLibrary />
          <StaffManagement />
        </div>
      </AdminChrome>
    </AdminGuard>
  );
}

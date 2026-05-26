import type { Currency, Payment, TimeEntry, Project, ProjectStatus, TaskStatus } from './types';

const moneyFmt = (currency: Currency) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

export function formatMoney(amount: number, currency: Currency): string {
  return moneyFmt(currency).format(amount);
}

export function formatMoneyCompact(amount: number, currency: Currency): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}m ${currency}`;
  if (amount >= 10_000) return `${Math.round(amount / 1000)}k ${currency}`;
  return formatMoney(amount, currency);
}

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit' });

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateFmt.format(d);
}

export function formatMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return monthFmt.format(d);
}

export function formatHours(h: number): string {
  if (h <= 0) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  const rounded = Math.round(h * 10) / 10;
  return `${rounded}h`;
}

export function sumPaymentsByCurrency(payments: Payment[]): Record<Currency, number> {
  const acc: Record<Currency, number> = { TRY: 0, USD: 0, EUR: 0 };
  for (const p of payments) acc[p.currency] += p.amount;
  return acc;
}

export function sumHours(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + e.hours, 0);
}

export function lastActivity(project: Project): string | undefined {
  const dates: string[] = [];
  for (const p of project.payments) dates.push(p.date);
  for (const t of project.timeEntries) dates.push(t.date);
  for (const k of project.tasks) if (k.date) dates.push(k.date);
  if (project.endDate) dates.push(project.endDate);
  if (project.startDate) dates.push(project.startDate);
  if (dates.length === 0) return undefined;
  return dates.sort().at(-1);
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'active',
  paused: 'paused',
  completed: 'completed',
  archived: 'archived',
};
export function statusLabel(s: ProjectStatus): string {
  return STATUS_LABELS[s];
}

export function statusColor(s: ProjectStatus): string {
  switch (s) {
    case 'active':    return '#22C55E';
    case 'paused':    return '#F59E0B';
    case 'completed': return '#60A5FA';
    case 'archived':  return 'rgba(255,255,255,0.4)';
  }
}

export function taskStatusLabel(s: TaskStatus): string {
  switch (s) {
    case 'todo':        return 'todo';
    case 'in_progress': return 'in progress';
    case 'done':        return 'done';
  }
}

export function taskStatusColor(s: TaskStatus): string {
  switch (s) {
    case 'in_progress': return '#F59E0B';
    case 'todo':        return 'rgba(255,255,255,0.45)';
    case 'done':        return '#22C55E';
  }
}

export type MonthBucket = { key: string; label: string; total: number; perCurrency: Record<Currency, number>; hours: number };

export function bucketByMonth(project: Project, months = 12): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: monthFmt.format(d),
      total: 0,
      perCurrency: { TRY: 0, USD: 0, EUR: 0 },
      hours: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const p of project.payments) {
    const k = p.date.slice(0, 7);
    const b = byKey.get(k);
    if (b) {
      b.perCurrency[p.currency] += p.amount;
      b.total += p.amount;
    }
  }
  for (const e of project.timeEntries) {
    const k = e.date.slice(0, 7);
    const b = byKey.get(k);
    if (b) b.hours += e.hours;
  }
  return buckets;
}

export function projectScore(project: Project): number {
  const done = project.tasks.filter((t) => t.status === 'done').length;
  const total = project.tasks.length || 1;
  return done / total;
}

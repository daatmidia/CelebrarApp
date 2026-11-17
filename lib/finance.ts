import { isoDate, MONTHS, saoPauloToday } from "@/lib/planner-docs";
import type { LedgerEntry, LedgerKind } from "@/lib/types";

export const FINANCE_CATEGORIES = [
  "Cerimonial",
  "Sinal",
  "Parcela",
  "Equipe",
  "Fornecedor",
  "Deslocamento",
  "Material",
  "Imposto",
  "Outro",
] as const;

export function parseBrlToCents(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!text) return null;
  let normalized = text;
  if (text.includes(",")) normalized = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) normalized = text.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function currentFinanceMonth(now = new Date()) {
  const today = saoPauloToday(now);
  return { year: today.year, month: today.month };
}

export function parseFinanceMonth(value: string | undefined, now = new Date()) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return currentFinanceMonth(now);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || year < 2000 || year > 2100) return currentFinanceMonth(now);
  return { year, month };
}

export function shiftFinanceMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function financeMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function financeMonthLabel(year: number, month: number) {
  return `${MONTHS[month - 1]!.slice(0, 1).toUpperCase()}${MONTHS[month - 1]!.slice(1)} de ${year}`;
}

export function financeMonthRange(year: number, month: number) {
  const start = `${financeMonthKey(year, month)}-01`;
  const next = shiftFinanceMonth(year, month, 1);
  const end = `${financeMonthKey(next.year, next.month)}-01`;
  return { start, end };
}

export function financeDefaultDate(year: number, month: number, now = new Date()) {
  const today = saoPauloToday(now);
  if (today.year === year && today.month === month) return isoDate(today.year, today.month, today.day);
  return isoDate(year, month, 1);
}

export function formatLongDay(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} de ${month}`;
}

export function financeTotals(entries: Pick<LedgerEntry, "kind" | "amountCents" | "settled">[]) {
  let recebido = 0;
  let pago = 0;
  let aReceber = 0;
  for (const entry of entries) {
    if (entry.kind === "entrada") {
      if (entry.settled) recebido += entry.amountCents;
      else aReceber += entry.amountCents;
    } else if (entry.settled) {
      pago += entry.amountCents;
    }
  }
  return { recebido, pago, saldo: recebido - pago, aReceber };
}

export function isFinanceCategory(value: string): value is (typeof FINANCE_CATEGORIES)[number] {
  return (FINANCE_CATEGORIES as readonly string[]).includes(value);
}

export function isLedgerKind(value: string): value is LedgerKind {
  return value === "entrada" || value === "despesa";
}

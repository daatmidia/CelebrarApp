import { MONTHS, saoPauloToday } from "@/lib/planner-docs";

export type ReportFacts = {
  events: { date: string; typeLabel: string; feeCents: number; suppliers: string[] }[];
  receipts: { date: string; amountCents: number }[];
  leads: { createdAt: string; stage: string }[];
};

export type YearMonth = {
  label: string;
  short: string;
  events: number;
  contractedCents: number;
  receivedCents: number;
};

export type YearReport = {
  year: number;
  events: number;
  contractedCents: number;
  receivedCents: number;
  averageCents: number;
  eventsByMonth: number[];
  receivedByMonth: number[];
  eventsByType: { label: string; count: number }[];
  suppliers: { name: string; count: number }[];
  contacts: number;
  closed: number;
  closeRate: number;
  months: YearMonth[];
};

const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

export function parseReportYear(value: string | undefined, now = new Date()) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return saoPauloToday(now).year;
  return year;
}

export function monthOf(date: string): { year: number; month: number } | null {
  const iso = /^(\d{4})-(\d{2})/.exec(date);
  if (iso) {
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) return { year: Number(iso[1]), month };
  }
  const named = /(\d{1,2}) de ([a-zç]+) de (\d{4})/i.exec(date.trim());
  if (!named) return null;
  const month = MONTHS.findIndex((item) => item === named[2]!.toLowerCase()) + 1;
  if (!month) return null;
  return { year: Number(named[3]), month };
}

function tally(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function buildYearReport(facts: ReportFacts, year: number): YearReport {
  const eventsByMonth = Array.from({ length: 12 }, () => 0);
  const receivedByMonth = Array.from({ length: 12 }, () => 0);
  const contractedByMonth = Array.from({ length: 12 }, () => 0);
  const types = new Map<string, number>();
  const suppliers = new Map<string, number>();
  let contractedCents = 0;
  let eventCount = 0;

  for (const event of facts.events) {
    const when = monthOf(event.date);
    if (!when || when.year !== year) continue;
    eventCount += 1;
    contractedCents += event.feeCents;
    eventsByMonth[when.month - 1] += 1;
    contractedByMonth[when.month - 1] += event.feeCents;
    tally(types, event.typeLabel || "Outro");
    for (const name of event.suppliers) {
      if (name.trim()) tally(suppliers, name.trim());
    }
  }

  let receivedCents = 0;
  for (const receipt of facts.receipts) {
    const when = monthOf(receipt.date);
    if (!when || when.year !== year) continue;
    receivedCents += receipt.amountCents;
    receivedByMonth[when.month - 1] += receipt.amountCents;
  }

  const leads = facts.leads.filter((lead) => monthOf(lead.createdAt)?.year === year || lead.createdAt.startsWith(String(year)));
  const contacts = leads.length;
  const closed = leads.filter((lead) => lead.stage === "proposta").length;

  const rank = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).map(([label, count]) => ({ label, count }));

  return {
    year,
    events: eventCount,
    contractedCents,
    receivedCents,
    averageCents: eventCount ? Math.round(contractedCents / eventCount) : 0,
    eventsByMonth,
    receivedByMonth,
    eventsByType: rank(types),
    suppliers: rank(suppliers).map((item) => ({ name: item.label, count: item.count })),
    contacts,
    closed,
    closeRate: contacts ? Math.round((closed / contacts) * 100) : 0,
    months: MONTHS.map((month, index) => ({
      label: `${month.slice(0, 1).toUpperCase()}${month.slice(1)}`,
      short: SHORT_MONTHS[index]!,
      events: eventsByMonth[index]!,
      contractedCents: contractedByMonth[index]!,
      receivedCents: receivedByMonth[index]!,
    })),
  };
}

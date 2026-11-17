import type { PlannerCouple, PlannerPayment } from "@/lib/types";

export const DOCUMENT_TITLES = {
  contrato: "Contrato de prestação de serviço",
  recibos: "Recibos de pagamento",
  roteiro: "Roteiro do cerimonial",
  fornecedores: "Contato dos fornecedores contratados",
  checklist: "Checklist",
} as const;

export type DocumentId = keyof typeof DOCUMENT_TITLES;

export const DOCUMENT_ORDER: DocumentId[] = [
  "contrato",
  "recibos",
  "roteiro",
  "fornecedores",
  "checklist",
];

export function formatBrl(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  const grouped = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}R$ ${grouped},${centavos.toString().padStart(2, "0")}`;
}

export function shortCouple(partnerA: string, partnerB: string): string {
  const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;
  return `${first(partnerA)} e ${first(partnerB)}`;
}

export function contractParagraphs(couple: PlannerCouple): string[] {
  const paid = couple.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const balance = couple.contract.feeCents - paid;
  const balanceLine =
    balance > 0
      ? `Já receberam ${formatBrl(paid)}. O saldo em aberto é de ${formatBrl(balance)}.`
      : `O valor de ${formatBrl(couple.contract.feeCents)} está quitado, conforme os recibos deste processo.`;
  return [
    `Pelo presente contrato de prestação de serviço, ${couple.contract.studio} e o casal ${couple.partnerA} e ${couple.partnerB} ajustam o cerimonial do casamento marcado para ${couple.dateLabel}.`,
    `A cerimônia começa às ${couple.startTime}, em ${couple.venueName}, ${couple.venueAddress}, ${couple.venueCity}. ${couple.ceremony}`,
    `O valor total do serviço é de ${formatBrl(couple.contract.feeCents)}. ${balanceLine}`,
    ...couple.contract.clauses,
    `E, por estarem de acordo, assinam em ${couple.contract.signedOn}.`,
  ];
}

export function receiptParagraph(couple: PlannerCouple, payment: PlannerPayment): string {
  return `${payment.receiptNumber}. Em ${payment.paidOn}, ${couple.contract.studio} recebeu de ${couple.partnerA} e ${couple.partnerB} a quantia de ${formatBrl(payment.amountCents)}, por ${payment.method}, referente a ${payment.description.toLowerCase()}.`;
}

export const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"] as const;

export function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const leading = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let index = 0; index < leading; index += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function saoPauloToday(now = new Date()): { year: number; month: number; day: number } {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function firstSaturday(year: number, month: number): number {
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((6 - weekday + 7) % 7);
}

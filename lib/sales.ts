import type { SalesLead, SalesStage } from "@/lib/types";

export const SALES_STAGES: { key: SalesStage; label: string }[] = [
  { key: "novo", label: "Novo contato" },
  { key: "conversa", label: "Em conversa" },
  { key: "reuniao", label: "Reunião" },
  { key: "proposta", label: "Proposta enviada" },
];

export const SALES_SOURCES = ["Instagram", "Indicação", "WhatsApp", "Site", "Google", "Evento", "Outro"] as const;

export function isSalesStage(value: string): value is SalesStage {
  return SALES_STAGES.some((stage) => stage.key === value);
}

export function isSalesSource(value: string): value is (typeof SALES_SOURCES)[number] {
  return (SALES_SOURCES as readonly string[]).includes(value);
}

export function salesBoardTotals(leads: Pick<SalesLead, "stage" | "amountCents">[]) {
  const pack = (stages: SalesStage[]) => {
    const rows = leads.filter((lead) => stages.includes(lead.stage));
    return {
      count: rows.length,
      amountCents: rows.reduce((sum, lead) => sum + lead.amountCents, 0),
    };
  };
  return {
    negociacao: pack(["novo", "conversa"]),
    jogo: pack(["reuniao", "proposta"]),
    fechamento: pack(["proposta"]),
  };
}

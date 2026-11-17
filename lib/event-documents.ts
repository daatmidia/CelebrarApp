import { formatBrl } from "@/lib/planner-docs";

export type EventDocumentSection = {
  title: string;
  lines: string[];
};

export type EventDocumentSeed = {
  title: string;
  when: string;
  place?: string;
  feeCents?: number;
  signedOn?: string;
  receipts?: { number: string; when: string; amountCents: number; method: string; note: string }[];
  checklist?: { label: string; done: boolean }[];
};

function brDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function displayEventDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? brDate(value) : value;
}

export function eventDocumentSections(seed: EventDocumentSeed): EventDocumentSection[] {
  const place = seed.place?.trim() ? ` em ${seed.place.trim()}` : "";
  const fee = seed.feeCents ?? 1_450_000;
  const coordination = Math.round(fee * 0.2);
  const total = fee + coordination;
  const signed = seed.signedOn ? `em ${seed.signedOn}` : "na data combinada com o casal";
  const receipts = seed.receipts?.length
    ? seed.receipts
    : [
        {
          number: "REC-001",
          when: seed.when,
          amountCents: Math.round(fee / 2),
          method: "PIX",
          note: "Sinal do cerimonial",
        },
      ];
  const checklist = seed.checklist?.length
    ? seed.checklist.slice(0, 4)
    : [
        { label: "Contrato assinado", done: true },
        { label: "Sinal recebido", done: true },
        { label: "Lista de convidados recebida", done: false },
        { label: "Cronograma enviado aos fornecedores", done: false },
      ];

  return [
    {
      title: "Orçamento",
      lines: [
        `${seed.title}, ${seed.when}${place}.`,
        `Assessoria do dia ${formatBrl(fee)}. Coordenação de fornecedores ${formatBrl(coordination)}.`,
        `Total previsto ${formatBrl(total)}, válido por 30 dias.`,
      ],
    },
    {
      title: "Contrato assinado",
      lines: [
        `Contrato de ${seed.title}, assinado ${signed}.`,
        `O cerimonial conduz o roteiro, o ensaio e o dia do evento${place}.`,
      ],
    },
    {
      title: "Checklist",
      lines: checklist.map((item) => `${item.done ? "Feito" : "A fazer"} · ${item.label}`),
    },
    {
      title: "Distrato",
      lines: [
        `Não há distrato assinado para ${seed.title}.`,
        "Cancelamento com mais de 60 dias devolve o sinal, menos 20%. Com menos de 60 dias, o sinal fica retido.",
      ],
    },
    {
      title: "Recibos",
      lines: receipts.map(
        (receipt) => `${receipt.number} · ${formatBrl(receipt.amountCents)} · ${receipt.when} · ${receipt.method} · ${receipt.note}`,
      ),
    },
    {
      title: "Termos de imagem",
      lines: [
        `O casal de ${seed.title} autoriza fotos e vídeos do evento no portfólio do cerimonial.`,
        "Imagem de convidado menor só entra com autorização de quem é responsável.",
      ],
    },
  ];
}

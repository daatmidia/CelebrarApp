import type { Diet } from "@/lib/types";

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function firstName(name: string): string {
  return cleanText(name).split(" ")[0] ?? name;
}

export function splitPersonName(name: string): { given: string; surname: string } {
  const parts = cleanText(name).split(" ").filter(Boolean);
  if (parts.length <= 1) return { given: parts[0] ?? "", surname: "" };
  return { given: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] ?? "" };
}

export function displaySurnameGiven(name: string): string {
  const { given, surname } = splitPersonName(name);
  if (!surname) return given;
  if (!given) return surname;
  return `${surname}, ${given}`;
}

export function nameSortKey(name: string): string {
  const { given, surname } = splitPersonName(name);
  return `${normalizeName(surname)} ${normalizeName(given)}`.trim();
}

export type CeremonyGuest = {
  id: number;
  name: string;
  kind: "named" | "plus_one";
  relation: string;
};

export type CeremonyConvite = {
  id: number;
  label: string;
  tableNumber: number | null;
  guests: CeremonyGuest[];
};

export type CeremonyPerson = {
  id: number;
  name: string;
  display: string;
  companion: boolean;
  relation: string;
};

export type CeremonyGroup = {
  conviteId: number;
  conviteLabel: string;
  tableNumber: number | null;
  people: CeremonyPerson[];
};

export function ceremonialGroups(convites: CeremonyConvite[]): CeremonyGroup[] {
  const groups = convites.map((convite) => {
    const named = convite.guests
      .filter((guest) => guest.kind !== "plus_one")
      .sort((a, b) => nameSortKey(a.name).localeCompare(nameSortKey(b.name), "pt"));
    const companions = convite.guests
      .filter((guest) => guest.kind === "plus_one")
      .sort((a, b) => nameSortKey(a.name).localeCompare(nameSortKey(b.name), "pt"));
    const people = [...named, ...companions].map((guest) => ({
      id: guest.id,
      name: guest.name,
      display: displaySurnameGiven(guest.name),
      companion: guest.kind === "plus_one",
      relation: guest.relation,
    }));
    const lead = named[0] ?? companions[0];
    return {
      conviteId: convite.id,
      conviteLabel: convite.label,
      tableNumber: convite.tableNumber,
      people,
      sort: lead ? nameSortKey(lead.name) : normalizeName(convite.label),
    };
  });
  groups.sort(
    (a, b) => a.sort.localeCompare(b.sort, "pt") || a.conviteLabel.localeCompare(b.conviteLabel, "pt"),
  );
  return groups.map(({ sort: _sort, ...group }) => group);
}

export function emptyDiet(): Diet {
  return {
    gluten: false,
    lactose: false,
    vegetarian: false,
    vegan: false,
    other: "",
  };
}

export function classifySearch<T extends { name: string }>(
  raw: string,
  people: T[],
  limit = 5,
):
  | { status: "short" }
  | { status: "none" }
  | { status: "broad" }
  | { status: "ok"; matches: T[] } {
  const query = normalizeName(raw);
  if (query.length < 3) return { status: "short" };
  const tokens = query.split(" ").filter(Boolean);
  const matches = people.filter((person) => {
    const parts = normalizeName(person.name).split(" ").filter(Boolean);
    return tokens.every((token) => parts.some((part) => part.startsWith(token)));
  });
  if (matches.length === 0) return { status: "none" };
  if (matches.length > limit) return { status: "broad" };
  return { status: "ok", matches };
}

export function normalizePhone(input: string): string | null | "invalid" {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return "invalid";
}

export function formatPhone(digits: string | null): string | null {
  if (!digits) return null;
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("55") && d.length === 13) {
    return `+55 ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.startsWith("55") && d.length === 12) {
    return `+55 ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  return `+${d}`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function extractTicketCode(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get("codigo") ?? url.searchParams.get("code");
    if (fromQuery) return fromQuery.trim().toUpperCase();
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((part) => part === "ingresso");
    if (index >= 0 && parts[index + 1]) {
      return decodeURIComponent(parts[index + 1]).toUpperCase();
    }
  } catch {
    // Plain codes are the common case for the reception desk.
  }
  return text.replace(/^celebrarapp:/i, "").trim().toUpperCase();
}

export function composeDispatch(input: {
  name: string;
  tableNumber: number | null;
  schedule: { timeLabel: string; name: string }[];
  mapsUrl: string;
  wazeUrl: string;
  ticketUrl: string | null;
}): string {
  const lines = [
    `Olá, ${input.name}! Estamos ansiosos para celebrar com você hoje!`,
    "",
    input.tableNumber ? `Seu lugar: Mesa ${input.tableNumber}` : "Seu lugar: a confirmar",
    "Cronograma:",
    ...input.schedule.map((item) => `• ${item.timeLabel} – ${item.name}`),
    "",
  ];
  if (input.mapsUrl) lines.push(input.mapsUrl);
  if (input.wazeUrl) lines.push(input.wazeUrl);
  if (input.ticketUrl) lines.push(input.ticketUrl);
  return lines.join("\n").trim();
}

export function classifyDayCommand(raw: string): "mesa" | "cronograma" | "unknown" {
  const text = normalizeName(raw);
  if (text === "mesa") return "mesa";
  if (text === "cronograma") return "cronograma";
  return "unknown";
}

export function reminderMessage(input: {
  firstName: string;
  partnerA: string;
  partnerB: string;
  dateLabel: string;
  venueName: string;
  origin: string;
}): string {
  const bride = firstNameOf(input.partnerA);
  const groom = firstNameOf(input.partnerB);
  return `Olá, ${input.firstName}! Aqui é a ${bride} e o ${groom}. Estamos fechando os lugares do casamento (${input.dateLabel}, ${input.venueName}) e ainda não achamos sua confirmação. Quando puder, leva um minuto: ${input.origin}/rsvp — obrigado, vai ser muito bom ter você com a gente.`;
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

const TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomTicketCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let body = "";
  for (const byte of bytes) body += TICKET_ALPHABET[byte % TICKET_ALPHABET.length];
  return `CEL-${body}`;
}

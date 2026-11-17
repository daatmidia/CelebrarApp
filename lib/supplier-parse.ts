import type { SupplierDraft } from "@/lib/types";

export const supplierExamples = {
  whatsapp: "Ateliê Camélia\n+55 31 98812-4400\n\nBuffet Mesa Cheia\n+55 31 3334-2210",
  caderno: "Ateliê Camélia — Flores — (31) 98812-4400\nBuffet Mesa Cheia — Buffet — (31) 3334-2210\nDJ Lucas Almeida — Som — (31) 99700-1188",
  planilha: "nome,categoria,telefone\nAteliê Camélia,Flores,(31) 98812-4400\nDoces da Vó Lúcia,Doces,(31) 98400-2211",
  pdf: "Ateliê Camélia | Flores | (31) 98812-4400\nBuffet Mesa Cheia | Buffet | (31) 3334-2210",
} as const;

const PHONE = /(?:\+\s*55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[\s.-]?\d{4}/;

function extractPhone(line: string): string | null {
  const match = line.match(PHONE);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  if (digits.length < 8) return null;
  return match[0].trim();
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}

function looksLikeCsv(lines: string[]): boolean {
  const first = lines[0]?.toLowerCase() ?? "";
  if (first.includes("nome") && (first.includes("telefone") || first.includes("categoria") || first.includes("phone"))) return true;
  const wide = lines.filter((line) => splitCsv(line).length >= 3).length;
  return lines.length > 1 && wide >= lines.length - 1;
}

function parseCsv(lines: string[]): SupplierDraft[] {
  const header = splitCsv(lines[0]).map((cell) => cell.toLowerCase());
  const nameIdx = header.findIndex((cell) => /nome|name|fornecedor/.test(cell));
  const categoryIdx = header.findIndex((cell) => /categ|fun[cç]|papel|role/.test(cell));
  const phoneIdx = header.findIndex((cell) => /tel|fone|whats|phone|cel/.test(cell));
  const hasHeader = nameIdx >= 0;
  const columns = hasHeader
    ? { name: nameIdx, category: categoryIdx, phone: phoneIdx }
    : { name: 0, category: 1, phone: 2 };
  const people: SupplierDraft[] = [];
  for (const line of lines.slice(hasHeader ? 1 : 0)) {
    const cells = splitCsv(line);
    const name = cells[columns.name] ?? "";
    if (!name) continue;
    people.push({
      name,
      category: columns.category >= 0 ? (cells[columns.category] ?? "") : "",
      phone: columns.phone >= 0 ? (cells[columns.phone] ?? "") : "",
    });
  }
  return people;
}

function parseVcards(text: string): SupplierDraft[] {
  const people: SupplierDraft[] = [];
  for (const block of text.split(/BEGIN:VCARD/i).slice(1)) {
    const name = block.match(/^FN:(.+)$/im)?.[1]?.trim() ?? "";
    const phone = block.match(/^TEL[^:]*:(.+)$/im)?.[1]?.trim() ?? "";
    const category =
      block.match(/^TITLE:(.+)$/im)?.[1]?.trim() ||
      block.match(/^NOTE:(.+)$/im)?.[1]?.trim() ||
      block.match(/^ORG:(.+)$/im)?.[1]?.trim() ||
      "";
    if (!name && !phone) continue;
    people.push({ name: name || phone, category, phone });
  }
  return people;
}

function fromParts(parts: string[]): SupplierDraft | null {
  if (parts.length < 2) return null;
  if (parts.length >= 3) {
    const phone = extractPhone(parts[parts.length - 1]) ?? parts[parts.length - 1];
    return { name: parts[0], category: parts.slice(1, -1).join(" "), phone };
  }
  const phone = extractPhone(parts[1]);
  if (phone) return { name: parts[0], category: "", phone };
  return { name: parts[0], category: parts[1], phone: "" };
}

function parseLines(lines: string[]): SupplierDraft[] {
  const people: SupplierDraft[] = [];
  let pending = "";
  for (const line of lines) {
    if (/[—–|;]| - /.test(line)) {
      const draft = fromParts(line.split(/\s*(?:—|–|\||;)\s*|\s+-\s+/).map((part) => part.trim()).filter(Boolean));
      if (draft) {
        if (pending) people.push({ name: pending, category: "", phone: "" });
        people.push(draft);
        pending = "";
        continue;
      }
    }
    if (line.includes(",")) {
      const parts = line.split(",").map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2 && parts.length <= 4) {
        const draft = fromParts(parts);
        if (draft && (draft.phone || parts.length >= 3)) {
          if (pending) people.push({ name: pending, category: "", phone: "" });
          people.push(draft);
          pending = "";
          continue;
        }
      }
    }
    const phone = extractPhone(line);
    const rest = phone ? line.replace(phone, "").replace(/^[\s\-–—|,.:]+|[\s\-–—|,.:]+$/g, "").trim() : "";
    if (phone && pending && !rest) {
      people.push({ name: pending, category: "", phone });
      pending = "";
      continue;
    }
    if (phone) {
      if (pending) people.push({ name: pending, category: "", phone: "" });
      people.push({ name: rest || "Fornecedor", category: "", phone });
      pending = "";
      continue;
    }
    if (pending) people.push({ name: pending, category: "", phone: "" });
    pending = line;
  }
  if (pending) people.push({ name: pending, category: "", phone: "" });
  return people;
}

export function parseSupplierList(raw: string): { ok: true; people: SupplierDraft[] } | { ok: false; error: string } {
  const text = raw.replace(/\uFEFF/g, "").replace(/\r/g, "").trim();
  if (!text) return { ok: false, error: "Cole a lista ou anexe um arquivo com os contatos." };
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const people = (/BEGIN:VCARD/i.test(text) ? parseVcards(text) : looksLikeCsv(lines) ? parseCsv(lines) : parseLines(lines))
    .map((person) => ({
      name: person.name.trim(),
      category: person.category.trim(),
      phone: person.phone.trim(),
    }))
    .filter((person) => person.name)
    .slice(0, 40);
  if (!people.length) return { ok: false, error: "Não encontrei nome, categoria ou telefone nessa lista." };
  return { ok: true, people };
}

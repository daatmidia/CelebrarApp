import type { AgendaFeedItem, CerimonialSettings, MessageTemplate, PortfolioShot, Testimonial } from "@/lib/types";

export const AJUSTES_TABS = [
  { key: "plano", label: "Plano" },
  { key: "marca", label: "Marca" },
  { key: "resumo", label: "Resumo do dia" },
  { key: "pagina", label: "Página pública" },
  { key: "agenda", label: "Agenda e modelos" },
  { key: "equipe", label: "Equipe" },
  { key: "pix", label: "Pix" },
  { key: "contrato", label: "Contrato" },
] as const;

export type AjustesTab = (typeof AJUSTES_TABS)[number]["key"];

export const BRAND_COLORS = ["#3b1253", "#00a0a0", "#d3286b", "#e16520"] as const;

export const PIX_KEY_TYPES = ["CPF", "CNPJ", "E-mail", "Telefone", "Aleatória"] as const;

export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

const defaultPixReceipt = `Recibo

Recebi de {pagador} a quantia de {valor}, por Pix.

Chave ({tipo}): {chave}
{nome}
{cidade}
CPF/CNPJ: {documento}

Referente ao cerimonial.`;

export function isPixKeyType(value: string): value is PixKeyType {
  return (PIX_KEY_TYPES as readonly string[]).includes(value);
}

export function inferPixKeyType(key: string): PixKeyType {
  if (key.includes("@")) return "E-mail";
  const digits = key.replace(/\D/g, "");
  if (digits.length === 14) return "CNPJ";
  if (digits.length === 11) return "CPF";
  if (digits.length >= 10) return "Telefone";
  return "CPF";
}

export const CONTRACT_CHIPS = [
  { token: "{cliente}", label: "Cliente" },
  { token: "{evento}", label: "Evento" },
  { token: "{data}", label: "Data" },
  { token: "{local}", label: "Local" },
  { token: "{valor}", label: "Valor" },
  { token: "{cerimonial}", label: "Cerimonial" },
  { token: "{cidade}", label: "Cidade" },
  { token: "{whatsapp}", label: "WhatsApp" },
] as const;

const defaultContract = `Contrato de prestação de serviço

Pelo presente, {cerimonial}, em {cidade}, e {cliente} ajustam o serviço de {evento}.

A data marcada é {data}, no local {local}. O valor do serviço é {valor}.

O pagamento pode ser feito pela chave Pix combinada. WhatsApp da cerimonial: {whatsapp}.

E, por estarem de acordo, assinam este contrato.`;

const defaultTemplates: MessageTemplate[] = [
  {
    id: "reuniao",
    title: "Confirmação de reunião",
    body: "Olá! Aqui é da {cerimonial}. Confirmamos a conversa sobre o evento. Se precisar remarcar, responda neste WhatsApp.",
  },
  {
    id: "vespera",
    title: "Lembrete da véspera",
    body: "Olá! Amanhã é o dia do evento. A {cerimonial} chega no horário combinado. Qualquer ajuste de última hora, fale neste WhatsApp.",
  },
];

export function defaultCerimonialSettings(): CerimonialSettings {
  return {
    brandName: "Celebrar",
    whatsapp: "",
    color: "#3b1253",
    logo: "",
    summaryEnabled: false,
    summaryEmail: "",
    summaryTime: "07:00",
    presentation: "",
    city: "",
    instagram: "",
    eventTypes: [],
    portfolio: [],
    testimonials: [],
    published: false,
    templates: defaultTemplates,
    pixKeyType: "CPF",
    pixKey: "",
    pixName: "",
    pixCity: "",
    pixDocument: "",
    pixReceipt: defaultPixReceipt,
    contractTemplate: defaultContract,
  };
}

export function isAjustesTab(value: string): value is AjustesTab {
  return AJUSTES_TABS.some((tab) => tab.key === value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function shots(value: unknown): PortfolioShot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Partial<PortfolioShot>;
    if (!row.id || !row.src) return [];
    return [{ id: String(row.id), src: String(row.src), caption: text(row.caption) }];
  });
}

function quotes(value: unknown): Testimonial[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Partial<Testimonial>;
    if (!row.id) return [];
    return [{ id: String(row.id), name: text(row.name), text: text(row.text) }];
  });
}

function templates(value: unknown): MessageTemplate[] {
  if (!Array.isArray(value) || value.length === 0) return defaultTemplates;
  const rows = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Partial<MessageTemplate>;
    if (!row.id) return [];
    return [{ id: String(row.id), title: text(row.title), body: text(row.body) }];
  });
  return rows.length ? rows : defaultTemplates;
}

export function normalizeSettings(value: unknown): CerimonialSettings {
  const base = defaultCerimonialSettings();
  if (!value || typeof value !== "object") return base;
  const row = value as Partial<CerimonialSettings>;
  const color = text(row.color);
  return {
    brandName: text(row.brandName) || base.brandName,
    whatsapp: text(row.whatsapp),
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : base.color,
    logo: text(row.logo),
    summaryEnabled: Boolean(row.summaryEnabled),
    summaryEmail: text(row.summaryEmail),
    summaryTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(text(row.summaryTime)) ? text(row.summaryTime) : base.summaryTime,
    presentation: text(row.presentation),
    city: text(row.city),
    instagram: text(row.instagram).replace(/^@+/, ""),
    eventTypes: Array.isArray(row.eventTypes) ? row.eventTypes.filter((item) => typeof item === "string") : [],
    portfolio: shots(row.portfolio),
    testimonials: quotes(row.testimonials),
    published: Boolean(row.published),
    templates: templates(row.templates),
    pixKeyType: isPixKeyType(text(row.pixKeyType)) ? text(row.pixKeyType) : inferPixKeyType(text(row.pixKey)),
    pixKey: text(row.pixKey),
    pixName: text(row.pixName),
    pixCity: text(row.pixCity),
    pixDocument: text(row.pixDocument),
    pixReceipt: text(row.pixReceipt) || base.pixReceipt,
    contractTemplate: text(row.contractTemplate) || base.contractTemplate,
  };
}

export function publicChecklist(settings: CerimonialSettings) {
  return [
    { label: "Logo", done: Boolean(settings.logo) },
    { label: "Nome", done: settings.brandName.trim().length > 1 },
    { label: "WhatsApp", done: settings.whatsapp.replace(/\D/g, "").length >= 10 },
    { label: "Apresentação", done: settings.presentation.trim().length > 20 },
    { label: "Cidade", done: settings.city.trim().length > 1 },
    { label: "Instagram", done: settings.instagram.trim().length > 1 },
    { label: "Tipos de evento", done: settings.eventTypes.length > 0 },
    { label: "Portfólio", done: settings.portfolio.length > 0 },
    { label: "Depoimentos", done: settings.testimonials.some((item) => item.name.trim() && item.text.trim()) },
  ];
}

export function whatsAppHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return "";
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
}

export function instagramHref(handle: string) {
  const clean = handle.trim().replace(/^@+/, "");
  if (!clean) return "";
  return `https://instagram.com/${encodeURIComponent(clean)}`;
}

export function fillPixReceipt(template: string, fields: Record<string, string>) {
  return template.replace(/\{(chave|tipo|nome|cidade|documento|pagador|valor)\}/g, (token, key: string) => fields[key] || token);
}

export function fillContract(template: string, fields: Record<string, string>) {
  return template.replace(/\{(cliente|evento|data|local|valor|cerimonial|cidade|whatsapp)\}/g, (token, key: string) => fields[key] || token);
}

export function buildIcs(items: AgendaFeedItem[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const events = items
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .map((item) => {
      const day = item.date.replace(/-/g, "");
      const summary = item.title.replace(/[\\,;]/g, " ").replace(/\n/g, " ");
      const place = item.place.replace(/[\\,;]/g, " ").replace(/\n/g, " ");
      return [
        "BEGIN:VEVENT",
        `UID:${item.id}@celebrar.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${day}`,
        `SUMMARY:${summary}`,
        place ? `LOCATION:${place}` : "",
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");
    });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Celebrar//Agenda//PT", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
}

export function googleCalendarHref(icsUrl: string) {
  const webcal = icsUrl.replace(/^https:/, "webcal:").replace(/^http:/, "webcal:");
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
}

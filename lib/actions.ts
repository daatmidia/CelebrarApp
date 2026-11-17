"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { io, revalidatePath } from "next/cache";
import * as db from "@/lib/db";
import { getOrigin } from "@/lib/origin";
import type {
  AccessInvite,
  CeremonyEventInput,
  CerimonialSettings,
  EventSupplierOwner,
  GuestProfileInput,
  LedgerEntry,
  PlannerNoteKind,
  RsvpInput,
  SalesLead,
  SalesStage,
  SupplierDraft,
  Testimonial,
} from "@/lib/types";
import { EVENT_TYPES } from "@/lib/event-types";
import { isPixKeyType } from "@/lib/settings";

async function live() {
  await io();
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function searchGuests(query: string) {
  await live();
  return db.searchGuests(query);
}

export async function loadConvite(id: number) {
  await live();
  return db.getConvite(id);
}

export async function submitRsvp(input: RsvpInput) {
  await live();
  const result = db.submitRsvp(input);
  if (result.ok) refresh();
  return result;
}

export async function loadPanel() {
  await live();
  const origin = await getOrigin();
  return db.getPanel(origin);
}

export async function loadHostReport() {
  await live();
  return db.hostReport();
}

export async function saveGuestProfile(input: GuestProfileInput) {
  await live();
  const result = db.saveGuestProfile(input);
  if (result.ok) refresh();
  return result;
}

export async function moveRoomTable(number: number, x: number, y: number) {
  await live();
  return db.moveTable(number, x, y);
}

export async function createConvite(label: string, plusOneCap: number) {
  await live();
  const result = db.createConvite(label, plusOneCap);
  if (result.ok) refresh();
  return result;
}

export async function updateConvite(id: number, label: string, plusOneCap: number) {
  await live();
  const result = db.updateConvite(id, label, plusOneCap);
  if (result.ok) refresh();
  return result;
}

export async function deleteConvite(id: number) {
  await live();
  const result = db.deleteConvite(id);
  if (result.ok) refresh();
  return result;
}

export async function addGuest(conviteId: number, name: string, relation: string, phone: string) {
  await live();
  const result = db.addGuest(conviteId, name, relation, phone);
  if (result.ok) refresh();
  return result;
}

export async function updateGuest(id: number, name: string, relation: string, phone: string) {
  await live();
  const result = db.updateGuest(id, name, relation, phone);
  if (result.ok) refresh();
  return result;
}

export async function deleteGuest(id: number) {
  await live();
  const result = db.deleteGuest(id);
  if (result.ok) refresh();
  return result;
}

export async function addMoment(name: string, timeLabel: string, description: string) {
  await live();
  const result = db.addMoment(name, timeLabel, description);
  if (result.ok) refresh();
  return result;
}

export async function updateMoment(id: number, name: string, timeLabel: string, description: string) {
  await live();
  const result = db.updateMoment(id, name, timeLabel, description);
  if (result.ok) refresh();
  return result;
}

export async function deleteMoment(id: number) {
  await live();
  const result = db.deleteMoment(id);
  if (result.ok) refresh();
  return result;
}

export async function prepareReminder(guestId: number) {
  await live();
  const origin = await getOrigin();
  const result = db.prepareReminder(guestId, origin);
  if (result.ok) refresh();
  return result;
}

export async function updatePlaceLinks(mapsUrl: string, wazeUrl: string) {
  await live();
  const result = db.updatePlaceLinks(mapsUrl, wazeUrl);
  if (result.ok) refresh();
  return result;
}

export async function updateTable(conviteId: number, tableNumber: string) {
  await live();
  const result = db.updateTable(conviteId, tableNumber);
  if (result.ok) refresh();
  return result;
}

export async function addScheduleItem(timeLabel: string, name: string) {
  await live();
  const result = db.addScheduleItem(timeLabel, name);
  if (result.ok) refresh();
  return result;
}

export async function updateScheduleItem(id: number, timeLabel: string, name: string) {
  await live();
  const result = db.updateScheduleItem(id, timeLabel, name);
  if (result.ok) refresh();
  return result;
}

export async function deleteScheduleItem(id: number) {
  await live();
  const result = db.deleteScheduleItem(id);
  if (result.ok) refresh();
  return result;
}

export async function prepareDispatch(guestId: number) {
  await live();
  const origin = await getOrigin();
  const result = db.prepareDispatch(guestId, origin);
  if (result.ok) refresh();
  return result;
}

export async function dayReply(guestId: number, command: string) {
  await live();
  const origin = await getOrigin();
  return db.dayReply(guestId, command, origin);
}

export async function checkInByCode(code: string) {
  await live();
  const result = db.checkInByCode(code);
  if (result.status === "ok") refresh();
  return result;
}

export async function checkInGuest(guestId: number) {
  await live();
  const result = db.checkInGuest(guestId);
  if (result.status === "ok") refresh();
  return result;
}

export async function searchCheckin(query: string) {
  await live();
  return db.searchCheckin(query);
}

export async function createCeremonyEvent(typeKey: string, title?: string) {
  await live();
  const result = db.createCeremonyEvent(typeKey, title);
  if (result.ok) refresh();
  return result;
}

const notePhotoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function createPlannerNote(formData: FormData) {
  await live();
  const noteKind = String(formData.get("noteKind") ?? "");
  if (noteKind !== "anotacao" && noteKind !== "fotos" && noteKind !== "visita") {
    return { ok: false as const, error: "Escolha anotação, fotos ou visita técnica." };
  }
  const files = formData
    .getAll("photos")
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > 6) return { ok: false as const, error: "Envie no máximo 6 fotos." };
  const photos: string[] = [];
  if (files.length) {
    const dir = path.join(process.cwd(), "data", "notas");
    await mkdir(dir, { recursive: true });
    for (const file of files) {
      const ext = notePhotoTypes.get(file.type);
      if (!ext) return { ok: false as const, error: "Use fotos JPG, PNG ou WebP." };
      if (file.size > 1_500_000) return { ok: false as const, error: "Cada foto precisa ter até 1,5 MB." };
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
      photos.push(`/notas/${name}`);
    }
  }
  const time = String(formData.get("timeLabel") ?? "").trim();
  const result = db.createPlannerNote({
    date: String(formData.get("date") ?? ""),
    noteKind: noteKind as PlannerNoteKind,
    body: String(formData.get("body") ?? ""),
    timeLabel: time || null,
    photos,
  });
  if (result.ok) refresh();
  return result;
}

export async function createPlannerMeeting(formData: FormData) {
  await live();
  const time = String(formData.get("timeLabel") ?? "").trim();
  const result = db.createPlannerMeeting({
    date: String(formData.get("date") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    timeLabel: time || null,
  });
  if (result.ok) refresh();
  return result;
}

export async function createPlannerVisit(formData: FormData) {
  await live();
  const mode = String(formData.get("mode") ?? "");
  if (mode !== "ensaio" && mode !== "visita") {
    return { ok: false as const, error: "Escolha ensaio ou visita técnica." };
  }
  const time = String(formData.get("timeLabel") ?? "").trim();
  const result = db.createPlannerVisit({
    date: String(formData.get("date") ?? ""),
    mode,
    body: String(formData.get("body") ?? ""),
    timeLabel: time || null,
  });
  if (result.ok) refresh();
  return result;
}

export async function updatePlannerCalendarItem(formData: FormData) {
  await live();
  const id = Number(formData.get("id"));
  const current = db.getPlannerCalendarItem(id);
  if (!current) return { ok: false as const, error: "Item não encontrado." };
  let photos = current.photos;
  if (current.noteKind === "fotos") {
    const keep = formData
      .getAll("keep")
      .map((value) => String(value))
      .filter((path) => current.photos.includes(path));
    const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
    if (keep.length + files.length > 6) return { ok: false as const, error: "Envie no máximo 6 fotos." };
    const uploaded: string[] = [];
    if (files.length) {
      const dir = path.join(process.cwd(), "data", "notas");
      await mkdir(dir, { recursive: true });
      for (const file of files) {
        const ext = notePhotoTypes.get(file.type);
        if (!ext) return { ok: false as const, error: "Use fotos JPG, PNG ou WebP." };
        if (file.size > 1_500_000) return { ok: false as const, error: "Cada foto precisa ter até 1,5 MB." };
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
        uploaded.push(`/notas/${name}`);
      }
    }
    photos = [...keep, ...uploaded];
  }
  const mode = String(formData.get("mode") ?? "");
  const time = String(formData.get("timeLabel") ?? "").trim();
  const result = db.updatePlannerCalendarItem({
    id,
    date: String(formData.get("date") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    timeLabel: time || null,
    photos,
    mode: mode === "ensaio" || mode === "visita" ? mode : "",
  });
  if (result.ok) refresh();
  return result;
}

export async function deletePlannerCalendarItem(id: number) {
  await live();
  const result = db.deletePlannerCalendarItem(id);
  if (result.ok) refresh();
  return result;
}

export async function deleteCerimonialEvent(kind: EventSupplierOwner, eventKey: string) {
  await live();
  const result = kind === "ceremony" ? db.deleteCeremonyEvent(Number(eventKey)) : db.deletePlannerEvent(eventKey);
  if (result.ok) refresh();
  return result;
}

export async function saveCeremonyEvent(input: CeremonyEventInput) {
  await live();
  const result = db.saveCeremonyEvent(input);
  if (result.ok) refresh();
  return result;
}

export async function addEventSupplier(ownerKind: EventSupplierOwner, ownerKey: string, name: string, role: string) {
  await live();
  const result = db.addEventSupplier(ownerKind, ownerKey, name, role);
  if (result.ok) refresh();
  return result;
}

export async function savePlannerTeam(slug: string, team: string) {
  await live();
  const result = db.savePlannerTeam(slug, team);
  if (result.ok) refresh();
  return result;
}

export async function savePlannerDetails(input: {
  slug: string;
  date: string;
  startTime: string;
  ceremony: string;
  team: string;
  teamMemberIds: number[];
}) {
  await live();
  const result = db.savePlannerDetails(input);
  if (result.ok) refresh();
  return result;
}

export async function saveClient(input: { id: number; name: string; phone: string; cpf: string; address: string }) {
  await live();
  const result = db.updateClient(input);
  if (result.ok) refresh();
  return result;
}

export async function saveSuppliers(rows: SupplierDraft[]) {
  await live();
  const result = db.createSuppliers(rows);
  if (result.ok) refresh();
  return result;
}

export async function saveTeamPerson(formData: FormData) {
  await live();
  const file = formData.get("photo");
  let photo = "";
  if (file instanceof File && file.size > 0) {
    const ext = notePhotoTypes.get(file.type);
    if (!ext) return { ok: false as const, error: "Use uma foto JPG, PNG ou WebP." };
    if (file.size > 1_500_000) return { ok: false as const, error: "A foto precisa ter até 1,5 MB." };
    const dir = path.join(process.cwd(), "data", "equipe");
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    photo = `/equipe-fotos/${name}`;
  }
  const id = Number(formData.get("id"));
  const editing = Number.isInteger(id) && id > 0;
  if (editing && !photo) photo = db.getTeamPerson(id)?.photo ?? "";
  const result = editing
    ? db.updateTeamPerson(id, {
        name: String(formData.get("name") ?? ""),
        nickname: String(formData.get("nickname") ?? ""),
        role: String(formData.get("role") ?? ""),
        bond: String(formData.get("bond") ?? ""),
        photo,
        whatsapp: String(formData.get("whatsapp") ?? ""),
        birthDate: String(formData.get("birthDate") ?? ""),
        address: String(formData.get("address") ?? ""),
        driving: String(formData.get("driving") ?? ""),
        shirt: String(formData.get("shirt") ?? ""),
        pants: String(formData.get("pants") ?? ""),
        shoes: String(formData.get("shoes") ?? ""),
        pix: String(formData.get("pix") ?? ""),
        bloodType: String(formData.get("bloodType") ?? ""),
        allergies: String(formData.get("allergies") ?? ""),
        emergencyContact: String(formData.get("emergencyContact") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      })
    : db.createTeamPerson({
    name: String(formData.get("name") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    role: String(formData.get("role") ?? ""),
    bond: String(formData.get("bond") ?? ""),
    photo,
    whatsapp: String(formData.get("whatsapp") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
    address: String(formData.get("address") ?? ""),
    driving: String(formData.get("driving") ?? ""),
    shirt: String(formData.get("shirt") ?? ""),
    pants: String(formData.get("pants") ?? ""),
    shoes: String(formData.get("shoes") ?? ""),
    pix: String(formData.get("pix") ?? ""),
    bloodType: String(formData.get("bloodType") ?? ""),
    allergies: String(formData.get("allergies") ?? ""),
    emergencyContact: String(formData.get("emergencyContact") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (result.ok) refresh();
  return result;
}

export async function deleteTeamPerson(id: number) {
  await live();
  const result = db.deleteTeamPerson(id);
  if (result.ok) refresh();
  return result;
}

export async function saveSuggestion(input: { body: string; blocker: string }) {
  await live();
  const result = db.createSuggestion(input);
  if (result.ok) refresh();
  return result;
}

export async function saveHelpMessage(input: { topic: string; body: string }) {
  await live();
  const result = db.createHelpMessage(input);
  if (result.ok) refresh();
  return result;
}

export async function saveLedgerEntry(input: Omit<LedgerEntry, "id">) {
  await live();
  const result = db.createLedgerEntry(input);
  if (result.ok) refresh();
  return result;
}

export async function saveSalesLead(input: Omit<SalesLead, "id" | "stage">) {
  await live();
  const result = db.createSalesLead(input);
  if (result.ok) refresh();
  return result;
}

export async function moveSalesLead(id: number, stage: SalesStage) {
  await live();
  const result = db.moveSalesLead(id, stage);
  if (result.ok) refresh();
  return result;
}

async function storeAjustesPhoto(file: File) {
  const ext = notePhotoTypes.get(file.type);
  if (!ext) return { ok: false as const, error: "Use uma foto JPG, PNG ou WebP." };
  if (file.size > 1_500_000) return { ok: false as const, error: "A foto precisa ter até 1,5 MB." };
  const dir = path.join(process.cwd(), "data", "ajustes");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { ok: true as const, src: `/ajustes-fotos/${name}` };
}

export async function saveBrand(formData: FormData) {
  await live();
  const current = db.getCerimonialSettings();
  const brandName = String(formData.get("brandName") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  if (brandName.length < 2) return { ok: false as const, error: "Diga o nome da cerimonial." };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false as const, error: "Escolha uma cor." };
  let logo = formData.get("removeLogo") === "1" ? "" : current.logo;
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    const stored = await storeAjustesPhoto(file);
    if (!stored.ok) return stored;
    logo = stored.src;
  }
  const next: CerimonialSettings = { ...current, brandName, whatsapp, color, logo };
  const result = db.writeCerimonialSettings(next);
  if (result.ok) refresh();
  return result.ok ? { ...result, logo } : result;
}

export async function saveDailySummary(input: { enabled: boolean; email: string; time: string }) {
  await live();
  const email = input.email.trim().toLowerCase();
  if (input.enabled && (!email.includes("@") || !email.includes("."))) return { ok: false as const, error: "Diga o e-mail do resumo." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return { ok: false as const, error: "Escolha o horário." };
  const current = db.getCerimonialSettings();
  const result = db.writeCerimonialSettings({ ...current, summaryEnabled: input.enabled, summaryEmail: email, summaryTime: input.time });
  if (result.ok) refresh();
  return result;
}

export async function savePublicProfile(input: {
  presentation: string;
  city: string;
  instagram: string;
  eventTypes: string[];
  testimonials: Testimonial[];
  portfolio: { id: string; caption: string }[];
  published: boolean;
}) {
  await live();
  const allowed = new Set(EVENT_TYPES.map((type) => type.key));
  const eventTypes = input.eventTypes.filter((key) => allowed.has(key));
  const current = db.getCerimonialSettings();
  const portfolio = input.portfolio.flatMap((item) => {
    const found = current.portfolio.find((shot) => shot.id === item.id);
    return found ? [{ ...found, caption: item.caption.trim() }] : [];
  });
  const testimonials = input.testimonials
    .map((item) => ({ id: item.id, name: item.name.trim(), text: item.text.trim() }))
    .filter((item) => item.name || item.text)
    .slice(0, 12);
  const next: CerimonialSettings = {
    ...current,
    presentation: input.presentation.trim(),
    city: input.city.trim(),
    instagram: input.instagram.trim().replace(/^@+/, ""),
    eventTypes,
    testimonials,
    portfolio,
    published: input.published,
  };
  const result = db.writeCerimonialSettings(next);
  if (result.ok) refresh();
  return result;
}

export async function addPortfolioPhoto(formData: FormData) {
  await live();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Escolha uma foto." };
  const current = db.getCerimonialSettings();
  if (current.portfolio.length >= 12) return { ok: false as const, error: "O portfólio aceita até 12 fotos." };
  const stored = await storeAjustesPhoto(file);
  if (!stored.ok) return stored;
  const next = {
    ...current,
    portfolio: [...current.portfolio, { id: stored.src, src: stored.src, caption: String(formData.get("caption") ?? "").trim() }],
  };
  const result = db.writeCerimonialSettings(next);
  if (result.ok) refresh();
  return result;
}

export async function saveMessageTemplates(templates: CerimonialSettings["templates"]) {
  await live();
  const rows = templates
    .map((item) => ({ id: item.id, title: item.title.trim(), body: item.body.trim() }))
    .filter((item) => item.title || item.body)
    .slice(0, 8);
  if (!rows.length) return { ok: false as const, error: "Deixe ao menos um modelo." };
  const current = db.getCerimonialSettings();
  const result = db.writeCerimonialSettings({ ...current, templates: rows });
  if (result.ok) refresh();
  return result;
}

export async function savePixSettings(input: {
  pixKeyType: string;
  pixKey: string;
  pixName: string;
  pixCity: string;
  pixDocument: string;
}) {
  await live();
  const pixKeyType = input.pixKeyType.trim();
  const pixKey = input.pixKey.trim();
  const pixName = input.pixName.trim();
  const pixCity = input.pixCity.trim();
  const pixDocument = input.pixDocument.trim();
  const documentDigits = pixDocument.replace(/\D/g, "");
  if (!isPixKeyType(pixKeyType)) return { ok: false as const, error: "Escolha o tipo da chave." };
  if (pixKey.length < 3) return { ok: false as const, error: "Diga a chave Pix." };
  if (pixName.length < 2) return { ok: false as const, error: "Diga o nome de quem recebe." };
  if (pixCity.length < 2) return { ok: false as const, error: "Diga a cidade." };
  if (documentDigits.length !== 11 && documentDigits.length !== 14) return { ok: false as const, error: "Diga o CPF ou CNPJ." };
  const current = db.getCerimonialSettings();
  const result = db.writeCerimonialSettings({ ...current, pixKeyType, pixKey, pixName, pixCity, pixDocument });
  if (result.ok) refresh();
  return result;
}

export async function savePixReceipt(pixReceipt: string) {
  await live();
  const receipt = pixReceipt.trim();
  if (receipt.length < 8) return { ok: false as const, error: "Escreva o recibo." };
  const current = db.getCerimonialSettings();
  const result = db.writeCerimonialSettings({ ...current, pixReceipt: receipt });
  if (result.ok) refresh();
  return result;
}

export async function saveContractTemplate(template: string) {
  await live();
  const contractTemplate = template.trim();
  if (contractTemplate.length < 20) return { ok: false as const, error: "Escreva o texto do contrato." };
  const current = db.getCerimonialSettings();
  const result = db.writeCerimonialSettings({ ...current, contractTemplate });
  if (result.ok) refresh();
  return result;
}

export async function saveAccessInvite(input: Omit<AccessInvite, "id">) {
  await live();
  const result = db.createAccessInvite(input);
  if (result.ok) refresh();
  return result;
}

export async function removeAccessInvite(id: number) {
  await live();
  const result = db.deleteAccessInvite(id);
  if (result.ok) refresh();
  return result;
}

export async function importCeremonyLines(text: string) {
  await live();
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (!lines.length) return { ok: false as const, error: "Cole ao menos um evento." };
  const ids: number[] = [];
  for (const line of lines) {
    const created = db.createCeremonyEvent("outro", line);
    if (!created.ok) return created;
    ids.push(created.id);
  }
  refresh();
  return { ok: true as const, ids };
}

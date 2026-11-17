import assert from "node:assert/strict";
import {
  checkInByCode,
  dayReply,
  getConvite,
  getPanel,
  createCeremonyEvent,
  getCeremonyEvent,
  getPlannerCouple,
  hostReport,
  listPlannerCalendar,
  listPlannerWeddings,
  listRoom,
  moveTable,
  prepareDispatch,
  saveGuestProfile,
  searchGuests,
  submitRsvp,
  updateTable,
} from "../lib/db";
import { EVENT_TYPES } from "../lib/event-types";
import { DOCUMENT_TITLES, contractParagraphs, formatBrl, isoDate, saoPauloToday, receiptParagraph } from "../lib/planner-docs";
import { ceremonialGroups, classifySearch, nameSortKey } from "../lib/text";

const ana = searchGuests("ana");
assert.equal(ana.status, "ok");
if (ana.status === "ok") {
  assert.equal(ana.hits.length, 2);
  assert.ok(ana.hits.every((hit) => hit.conviteLabel));
}

assert.equal(searchGuests("a").status, "short");
assert.equal(searchGuests("zzzzz").status, "none");
const joao = searchGuests("joao");
assert.equal(joao.status, "ok");
if (joao.status === "ok") assert.equal(joao.hits[0]?.name, "João Pedro Lima");

const broad = classifySearch(
  "ana",
  Array.from({ length: 6 }, (_, index) => ({ name: `Ana Teste ${index}` })),
);
assert.equal(broad.status, "broad");

const panel = getPanel();
const mariana = panel.convites.find((convite) => convite.label === "Mariana Costa");
assert.ok(mariana);
assert.equal(mariana.plusOneCap, 1);
const moments = panel.moments;
const allYes = moments.map((moment) => ({ momentId: moment.id, attending: true }));
const allNo = moments.map((moment) => ({ momentId: moment.id, attending: false }));
const refused = submitRsvp({
  conviteId: mariana.id,
  song: "",
  people: [
    {
      guestId: mariana.guests[0].id,
      name: mariana.guests[0].name,
      kind: "named",
      moments: allYes,
      diet: mariana.guests[0].diet,
    },
    { guestId: null, name: "Prima Um", kind: "plus_one", moments: allYes, diet: mariana.guests[0].diet },
    { guestId: null, name: "Prima Dois", kind: "plus_one", moments: allYes, diet: mariana.guests[0].diet },
  ],
});
assert.equal(refused.ok, false);

const vasco = panel.convites.find((convite) => convite.label === "Família Vasconcelos");
assert.ok(vasco);
const blocked = submitRsvp({
  conviteId: vasco.id,
  song: "",
  people: [
    ...vasco.guests.map((guest) => ({
      guestId: guest.id,
      name: guest.name,
      kind: "named" as const,
      moments: allNo,
      diet: guest.diet,
    })),
    { guestId: null, name: "Extra", kind: "plus_one" as const, moments: allNo, diet: vasco.guests[0].diet },
  ],
});
assert.equal(blocked.ok, false);

const saved = submitRsvp({
  conviteId: mariana.id,
  song: "Aquarela — Toquinho",
  people: [
    {
      guestId: mariana.guests[0].id,
      name: mariana.guests[0].name,
      kind: "named",
      moments: allYes,
      diet: { gluten: false, lactose: true, vegetarian: false, vegan: false, other: "" },
    },
    { guestId: null, name: "Caio Lima", kind: "plus_one", moments: allYes, diet: mariana.guests[0].diet },
  ],
});
assert.equal(saved.ok, true);
if (saved.ok) assert.equal(saved.tickets.length, 2);

const again = getConvite(mariana.id);
assert.equal(again?.guests.length, 2);
assert.equal(again?.tableNumber, 8);
const caio = again?.guests.find((guest) => guest.name === "Caio Lima");
assert.equal(caio?.kind, "plus_one");
assert.ok(caio?.moments.some((moment) => moment.attending));
assert.equal(updateTable(mariana.id, "").ok, true);
const reseated = submitRsvp({
  conviteId: mariana.id,
  song: "Aquarela — Toquinho",
  people:
    again?.guests.map((guest) => ({
      guestId: guest.id,
      name: guest.name,
      kind: guest.kind,
      moments: allYes,
      diet: guest.diet,
    })) ?? [],
});
assert.equal(reseated.ok, true);
const together = getConvite(mariana.id);
assert.ok(together?.tableNumber);
assert.equal(together?.guests.length, 2);
const shared = getPanel().dispatches.filter((row) => row.conviteLabel === "Mariana Costa");
assert.equal(shared.length, 2);
assert.equal(shared[0]?.tableNumber, shared[1]?.tableNumber);
assert.equal(shared[0]?.tableNumber, together?.tableNumber);
const second = submitRsvp({
  conviteId: mariana.id,
  song: "Aquarela — Toquinho",
  people: [
    ...(again?.guests.map((guest) => ({
      guestId: guest.id,
      name: guest.name,
      kind: guest.kind,
      moments: allYes,
      diet: guest.diet,
    })) ?? []),
    { guestId: null, name: "Mais um", kind: "plus_one" as const, moments: allYes, diet: mariana.guests[0].diet },
  ],
});
assert.equal(second.ok, false);

assert.equal(checkInByCode("CEL-NOPE").status, "unknown");
assert.equal(checkInByCode("CEL-A1C4M8").status, "already");

const fresh = getPanel();
assert.ok(fresh.dietary.counts.find((item) => item.key === "lactose" && item.count >= 1));
assert.ok(fresh.songs.some((song) => song.song.includes("Aquarela")));
assert.ok(fresh.moments.every((moment) => moment.headcount >= 1));

const seated = fresh.convites.find((convite) => convite.label === "Ana Clara e João Pedro");
assert.equal(seated?.tableNumber, 12);
assert.ok(fresh.schedule.some((item) => item.timeLabel === "16h30" && item.name === "Cerimônia"));
assert.ok(fresh.schedule.some((item) => item.timeLabel === "18h00" && item.name === "Recepção e cocktail"));
assert.ok(fresh.schedule.some((item) => item.timeLabel === "19h30" && item.name === "Jantar"));
assert.ok(fresh.moments.find((moment) => moment.name === "Cerimônia")?.timeLabel.includes("16h30"));
const anaGuest = seated?.guests.find((guest) => guest.name === "Ana Clara Mendes");
assert.ok(anaGuest);
const sent = prepareDispatch(anaGuest.id, "https://celebrar.example");
assert.equal(sent.ok, true);
if (sent.ok) {
  assert.match(sent.message, /Olá, Ana Clara Mendes!/);
  assert.match(sent.message, /Mesa 12/);
  assert.match(sent.message, /16h30 – Cerimônia/);
  assert.match(sent.message, /18h00 – Recepção e cocktail/);
  assert.match(sent.message, /19h30 – Jantar/);
  assert.match(sent.message, /google\.com\/maps/);
  assert.match(sent.message, /waze\.com/);
  assert.match(sent.message, /\/ingresso\/CEL-A1C4M8/);
  assert.ok(sent.url?.startsWith("https://wa.me/"));
}
const mesa = dayReply(anaGuest.id, "Mesa", "https://celebrar.example");
assert.equal(mesa.status, "mesa");
if (mesa.status === "mesa") {
  assert.equal(mesa.tableLabel, "Mesa 12");
  assert.match(mesa.ticketUrl ?? "", /CEL-A1C4M8/);
}
const cronograma = dayReply(anaGuest.id, "Cronograma", "https://celebrar.example");
assert.equal(cronograma.status, "cronograma");
if (cronograma.status === "cronograma") {
  assert.ok(cronograma.lines.some((line) => line.timeLabel === "16h30"));
}
assert.equal(dayReply(anaGuest.id, "oi", "https://celebrar.example").status, "hint");
assert.equal(dayReply(999999, "Mesa", "https://celebrar.example").status, "missing");

const before = hostReport();
const mesa12 = before.tables.find((table) => table.number === 12);
assert.ok(mesa12);
assert.equal(mesa12.confirmed, 2);
assert.equal(mesa12.free, mesa12.seats - mesa12.confirmed);
assert.equal(
  before.freeSeats,
  before.tables.reduce((sum, table) => sum + (table.seats - table.confirmed), 0),
);

const created = saveGuestProfile({
  guestId: null,
  name: "Helena Souza",
  relation: "prima",
  phone: "11988887777",
  conviteId: null,
  conviteLabel: "Família Souza",
  tableNumber: "15",
  seats: "6",
});
assert.equal(created.ok, true);
if (created.ok) {
  const mesa15 = created.report.tables.find((table) => table.number === 15);
  assert.equal(mesa15?.seats, 6);
  assert.equal(mesa15?.confirmed, 0);
  assert.equal(mesa15?.free, 6);
}
const souza = getPanel().convites.find((convite) => convite.label === "Família Souza");
assert.equal(souza?.tableNumber, 15);
assert.equal(souza?.guests.length, 1);
const souzaYes = submitRsvp({
  conviteId: souza!.id,
  song: "",
  people: [
    {
      guestId: souza!.guests[0].id,
      name: souza!.guests[0].name,
      kind: "named",
      moments: allYes,
      diet: souza!.guests[0].diet,
    },
    { guestId: null, name: "Caio Souza", kind: "plus_one", moments: allYes, diet: souza!.guests[0].diet },
  ],
});
assert.equal(souzaYes.ok, true);
const souzaAfter = getConvite(souza!.id);
assert.equal(souzaAfter?.tableNumber, 15);
assert.equal(souzaAfter?.guests.length, 2);
assert.ok(souzaAfter?.guests.every((guest) => guest.moments.some((moment) => moment.attending)));
const mesa15 = hostReport().tables.find((table) => table.number === 15);
assert.equal(mesa15?.confirmed, 2);
assert.equal(mesa15?.free, 4);

const groups = ceremonialGroups(getPanel().convites);
const anaParty = groups.find((group) => group.conviteLabel === "Ana Clara e João Pedro");
assert.deepEqual(
  anaParty?.people.map((person) => person.name),
  ["João Pedro Lima", "Ana Clara Mendes"],
);
const marianaParty = groups.find((group) => group.conviteLabel === "Mariana Costa");
assert.equal(marianaParty?.people[0]?.name, "Mariana Costa");
assert.equal(marianaParty?.people.some((person) => person.name === "Caio Lima" && person.companion), true);
assert.equal(marianaParty?.people.at(-1)?.companion, true);
const leadKeys = groups.map((group) => {
  const lead = group.people.find((person) => !person.companion) ?? group.people[0];
  return nameSortKey(lead?.name ?? "");
});
assert.deepEqual(
  leadKeys,
  [...leadKeys].sort((a, b) => a.localeCompare(b, "pt")),
);

assert.equal(moveTable(12, 33.5, 44.25).ok, true);
const placed = listRoom().find((table) => table.number === 12);
assert.equal(placed?.x, 33.5);
assert.equal(placed?.y, 44.25);
const stillTogether = getConvite(seated!.id);
assert.equal(stillTogether?.tableNumber, 12);
assert.equal(stillTogether?.guests.length, 2);

const weddings = listPlannerWeddings();
const april = weddings.filter((wedding) => wedding.weddingDate.startsWith("2027-04"));
assert.ok(april.length >= 2);
assert.equal(new Set(april.map((wedding) => wedding.weddingDate)).size >= 2, true);
const today = saoPauloToday();
const monthPrefix = isoDate(today.year, today.month, 1).slice(0, 8);
const monthItems = listPlannerCalendar().filter((item) => item.date.startsWith(monthPrefix));
assert.ok(monthItems.some((item) => item.kind === "evento"));
assert.ok(monthItems.some((item) => item.kind === "nota" && item.body.length > 0));
const helena = getPlannerCouple("helena-e-miguel");
assert.ok(helena);
assert.equal(helena.partnerA, "Helena Vasconcelos");
assert.equal(helena.weddingDate, "2027-04-17");
assert.equal(helena.guests.find((guest) => guest.name === "Ana Clara Mendes")?.status, "confirmado");
assert.equal(helena.guests.find((guest) => guest.name === "Beatriz Vasconcelos")?.status, "pendente");
assert.equal(helena.guests.find((guest) => guest.name === "Felipe Andrade")?.status, "parcial");
const helenaContract = contractParagraphs(helena).join(" ");
assert.match(helenaContract, /Contrato de prestação|contrato de prestação de serviço/i);
assert.match(helenaContract, /Helena Vasconcelos/);
assert.match(helenaContract, /Miguel Albuquerque/);
assert.match(helenaContract, new RegExp(formatBrl(helena.contract.feeCents).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.equal(helena.payments[0]?.receiptNumber, "REC-HVM-001");
assert.match(receiptParagraph(helena, helena.payments[0]), /REC-HVM-001/);
assert.ok(helena.script.some((line) => line.timeLabel === "16h30"));
assert.ok(helena.vendors.some((vendor) => vendor.name === "Cozinha do Vale"));
assert.ok(helena.checklist.some((item) => item.done) && helena.checklist.some((item) => !item.done));
const leticia = getPlannerCouple("leticia-e-bruno");
assert.ok(leticia);
assert.equal(leticia.weddingDate, "2027-04-24");
assert.equal(leticia.guests.find((guest) => guest.name === "Marina Lopes")?.status, "pendente");
assert.equal(leticia.guests.find((guest) => guest.name === "Caio Ferreira")?.status, "ausente");
assert.equal(searchGuests("leticia").status, "none");
assert.equal(searchGuests("pacheco").status, "none");
assert.deepEqual(
  EVENT_TYPES.map((type) => `${type.label} (${type.tasks} tarefas · ${type.moments} momentos)`),
  [
    "Casamento (25 tarefas · 20 momentos)",
    "15 anos (22 tarefas · 17 momentos)",
    "Formatura (16 tarefas · 15 momentos)",
    "Corporativo (12 tarefas · 12 momentos)",
    "Aniversário (12 tarefas · 9 momentos)",
    "Bodas (12 tarefas · 9 momentos)",
    "Outro evento (5 tarefas · 3 momentos)",
  ],
);
const createdEvent = createCeremonyEvent("casamento");
assert.equal(createdEvent.ok, true);
if (createdEvent.ok) {
  const opened = getCeremonyEvent(createdEvent.id);
  assert.equal(opened?.tasks.length, 25);
  assert.equal(opened?.moments.length, 20);
  assert.equal(opened?.date.slice(0, 7), isoDate(today.year, today.month, 1).slice(0, 7));
}
assert.deepEqual(Object.values(DOCUMENT_TITLES), [
  "Contrato de prestação de serviço",
  "Recibos de pagamento",
  "Roteiro do cerimonial",
  "Contato dos fornecedores contratados",
  "Checklist",
]);

console.log("self-check ok");

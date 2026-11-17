import fs from "fs";
import path from "path";
import { DatabaseSync, type SQLOutputValue } from "node:sqlite";
import type {
  CheckinGuest,
  CheckinResult,
  CheckinSearchResult,
  Convite,
  ConviteStatus,
  Diet,
  DayReply,
  DietNote,
  DispatchRow,
  Guest,
  GuestProfileInput,
  GuestSaveResult,
  HostReport,
  Moment,
  MutationResult,
  PanelData,
  CeremonyEvent,
  CeremonyEventInput,
  CeremonyEventSummary,
  EventSupplier,
  EventSupplierOwner,
  EventTeamMember,
  PlannerCalendarItem,
  PlannerCheckItem,
  PlannerNoteKind,
  PlannerCouple,
  PlannerGuest,
  PlannerGuestStatus,
  PlannerPayment,
  PlannerScriptLine,
  PlannerVendor,
  PlannerWeddingSummary,
  ClientDetails,
  ClientSummary,
  SupplierDraft,
  SupplierRecord,
  TeamPerson,
  LedgerEntry,
  FinanceEventOption,
  SalesLead,
  SalesStage,
  CerimonialSettings,
  AccessInvite,
  AgendaFeedItem,
  HelpMessage,
  Suggestion,
  RoomTable,
  ReminderRow,
  ScheduleItem,
  RsvpInput,
  SearchResult,
  SubmitResult,
  TicketCard,
  TicketView,
  Wedding,
} from "@/lib/types";
import { EVENT_TYPES, eventTypeByKey } from "@/lib/event-types";
import { financeMonthRange, isFinanceCategory, isLedgerKind } from "@/lib/finance";
import { isHelpTopic } from "@/lib/help";
import { isSuggestionBlocker } from "@/lib/suggestions";
import { isSalesSource, isSalesStage } from "@/lib/sales";
import { defaultCerimonialSettings, normalizeSettings } from "@/lib/settings";
import { firstSaturday, isoDate, saoPauloToday } from "@/lib/planner-docs";
import {
  classifyDayCommand,
  classifySearch,
  cleanText,
  composeDispatch,
  emptyDiet,
  extractTicketCode,
  firstName,
  formatPhone,
  normalizePhone,
  randomTicketCode,
  reminderMessage,
} from "@/lib/text";

type Row = Record<string, SQLOutputValue>;

const globalForDb = globalThis as unknown as { celebrarDb?: DatabaseSync };

function databaseFile(): string {
  return process.env.CELEBRAR_DB ?? path.join(process.cwd(), "data", "celebrar.sqlite");
}

function num(row: Row, key: string): number {
  const value = row[key];
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}

function str(row: Row, key: string): string {
  const value = row[key];
  return value == null ? "" : String(value);
}

function strOrNull(row: Row, key: string): string | null {
  const value = row[key];
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function flag(row: Row, key: string): boolean {
  return num(row, key) === 1;
}

function insertId(db: DatabaseSync, sql: string, ...params: SQLInput[]): number {
  const result = db.prepare(sql).run(...params);
  return Number(result.lastInsertRowid);
}

type SQLInput = string | number | null | bigint;

function getDb(): DatabaseSync {
  if (!globalForDb.celebrarDb || !globalForDb.celebrarDb.isOpen) {
    const file = databaseFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("PRAGMA foreign_keys = ON");
    try {
      db.exec("PRAGMA journal_mode = WAL");
    } catch {
      // journal_mode can return a row; the file still opens without WAL.
    }
    migrate(db);
    seed(db);
    ensureDayOf(db);
    ensurePlanner(db);
    ensureClients(db);
    globalForDb.celebrarDb = db;
  }
  return globalForDb.celebrarDb;
}

const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=-21.145588%2C-44.17415";
const WAZE_URL = "https://www.waze.com/ul?ll=-21.145588%2C-44.17415&navigate=yes";

const TABLE_BY_LABEL: Record<string, number> = {
  "Família Vasconcelos": 1,
  "Família Albuquerque": 2,
  "Família Ribeiro": 3,
  "Rafael e Patrícia": 4,
  "Juliana e Lucas": 5,
  "Felipe Andrade": 7,
  "Mariana Costa": 8,
  "Ana Beatriz Rocha": 9,
  "Ana Clara e João Pedro": 12,
};

function columnNames(db: DatabaseSync, table: string): Set<string> {
  return new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as Row[]).map((row) => str(row, "name")),
  );
}

function ensureColumn(db: DatabaseSync, table: string, name: string, definition: string) {
  if (!columnNames(db, table).has(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wedding (
      id INTEGER PRIMARY KEY,
      partner_a TEXT NOT NULL,
      partner_b TEXT NOT NULL,
      date_label TEXT NOT NULL,
      venue_name TEXT NOT NULL,
      venue_city TEXT NOT NULL,
      venue_address TEXT NOT NULL,
      invitation_line TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS moments (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      time_label TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS convites (
      id INTEGER PRIMARY KEY,
      label TEXT NOT NULL,
      plus_one_cap INTEGER NOT NULL DEFAULT 0,
      song_request TEXT,
      responded_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY,
      convite_id INTEGER NOT NULL REFERENCES convites(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relation TEXT,
      phone TEXT,
      kind TEXT NOT NULL CHECK (kind IN ('named', 'plus_one')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      ticket_code TEXT UNIQUE,
      checked_in_at TEXT,
      reminder_prepared_at TEXT,
      diet_gluten INTEGER NOT NULL DEFAULT 0,
      diet_lactose INTEGER NOT NULL DEFAULT 0,
      diet_vegetarian INTEGER NOT NULL DEFAULT 0,
      diet_vegan INTEGER NOT NULL DEFAULT 0,
      diet_other TEXT
    );
    CREATE TABLE IF NOT EXISTS moment_rsvps (
      guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
      moment_id INTEGER NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
      attending INTEGER NOT NULL,
      PRIMARY KEY (guest_id, moment_id)
    );
    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY,
      time_label TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS room_tables (
      number INTEGER PRIMARY KEY,
      seats INTEGER NOT NULL,
      pos_x REAL NOT NULL,
      pos_y REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planner_weddings (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      partner_a TEXT NOT NULL,
      partner_b TEXT NOT NULL,
      wedding_date TEXT NOT NULL,
      date_label TEXT NOT NULL,
      venue_name TEXT NOT NULL,
      venue_city TEXT NOT NULL,
      venue_address TEXT NOT NULL,
      start_time TEXT NOT NULL,
      ceremony TEXT NOT NULL,
      studio TEXT NOT NULL,
      fee_cents INTEGER NOT NULL,
      signed_on TEXT NOT NULL,
      uses_live_guests INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS planner_people (
      id INTEGER PRIMARY KEY,
      wedding_id INTEGER NOT NULL REFERENCES planner_weddings(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relation TEXT NOT NULL,
      convite_label TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planner_vendors (
      id INTEGER PRIMARY KEY,
      wedding_id INTEGER NOT NULL REFERENCES planner_weddings(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planner_payments (
      id INTEGER PRIMARY KEY,
      wedding_id INTEGER NOT NULL REFERENCES planner_weddings(id) ON DELETE CASCADE,
      receipt_number TEXT NOT NULL,
      paid_on TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      method TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planner_script (
      id INTEGER PRIMARY KEY,
      wedding_id INTEGER NOT NULL REFERENCES planner_weddings(id) ON DELETE CASCADE,
      time_label TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planner_checklist (
      id INTEGER PRIMARY KEY,
      wedding_id INTEGER NOT NULL REFERENCES planner_weddings(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      done INTEGER NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planner_clauses (
      id INTEGER PRIMARY KEY,
      wedding_id INTEGER NOT NULL REFERENCES planner_weddings(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ceremony_events (
      id INTEGER PRIMARY KEY,
      type_key TEXT NOT NULL,
      title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      place TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ceremony_tasks (
      id INTEGER PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES ceremony_events(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ceremony_moments (
      id INTEGER PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES ceremony_events(id) ON DELETE CASCADE,
      time_label TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS planner_calendar (
      id INTEGER PRIMARY KEY,
      item_key TEXT NOT NULL UNIQUE,
      item_date TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      time_label TEXT,
      wedding_slug TEXT
    );
    CREATE TABLE IF NOT EXISTS event_suppliers (
      id INTEGER PRIMARY KEY,
      owner_kind TEXT NOT NULL,
      owner_key TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      cpf TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS team_people (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      photo TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      birth_date TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      driving TEXT NOT NULL DEFAULT '',
      pix TEXT NOT NULL DEFAULT '',
      sizes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      category TEXT NOT NULL,
      event_key TEXT NOT NULL DEFAULT '',
      settled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sales_leads (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      whatsapp TEXT NOT NULL DEFAULT '',
      event_type TEXT NOT NULL DEFAULT '',
      event_date TEXT NOT NULL DEFAULT '',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT '',
      return_date TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'novo',
      created_at TEXT NOT NULL
    );
  `);
  ensureColumn(db, "wedding", "maps_url", "TEXT");
  ensureColumn(db, "wedding", "waze_url", "TEXT");
  ensureColumn(db, "convites", "table_number", "INTEGER");
  ensureColumn(db, "guests", "dispatch_prepared_at", "TEXT");
  ensureColumn(db, "guests", "dispatch_message", "TEXT");
  ensureColumn(db, "ceremony_events", "team", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "planner_weddings", "team", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "planner_calendar", "note_kind", "TEXT");
  ensureColumn(db, "planner_calendar", "photos", "TEXT");
  ensureColumn(db, "ceremony_events", "client_id", "INTEGER");
  ensureColumn(db, "planner_weddings", "client_id", "INTEGER");
  ensureColumn(db, "team_people", "nickname", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "team_people", "bond", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "team_people", "shirt", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "team_people", "pants", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "team_people", "shoes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "team_people", "notes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "suppliers", "contact_name", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "suppliers", "email", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "suppliers", "instagram", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "team_people", "blood_type", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "team_people", "allergies", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "team_people", "emergency_contact", "TEXT NOT NULL DEFAULT ''");
}

type SeedMomentAnswer = { welcome?: boolean; ceremony?: boolean; lunch?: boolean };

type SeedGuest = {
  name: string;
  relation: string;
  phone: string | null;
  diet?: Partial<Diet>;
  moments?: SeedMomentAnswer;
  ticket?: string;
  checkedInAt?: string;
  reminderAt?: string;
};

type SeedConvite = {
  label: string;
  plusOneCap: number;
  tableNumber: number;
  song?: string;
  respondedAt?: string;
  guests: SeedGuest[];
};

function seed(db: DatabaseSync) {
  const existing = db.prepare("SELECT value FROM meta WHERE key = 'seeded'").get() as Row | undefined;
  if (existing) return;

  const now = "2026-10-01T12:00:00.000Z";
  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO wedding (id, partner_a, partner_b, date_label, venue_name, venue_city, venue_address, invitation_line, maps_url, waze_url)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "Helena Vasconcelos",
      "Miguel Albuquerque",
      "sábado, 17 de abril de 2027",
      "Haras Vale Verde",
      "Tiradentes, Minas Gerais",
      "Estrada Real, km 4 — Tiradentes, MG",
      "O prazer da vossa companhia é o que torna este dia inteiro.",
      MAPS_URL,
      WAZE_URL,
    );

    const momentIds = [
      insertId(
        db,
        `INSERT INTO moments (name, time_label, description, sort_order) VALUES (?, ?, ?, ?)`,
        "Welcome Drink",
        "sexta, 16 de abril · 19h",
        "Drinks no jardim, ao pôr do sol.",
        1,
      ),
      insertId(
        db,
        `INSERT INTO moments (name, time_label, description, sort_order) VALUES (?, ?, ?, ?)`,
        "Cerimônia",
        "sábado, 17 de abril · 16h30",
        "Na capela do haras.",
        2,
      ),
      insertId(
        db,
        `INSERT INTO moments (name, time_label, description, sort_order) VALUES (?, ?, ?, ?)`,
        "Almoço de Despedida",
        "domingo, 18 de abril · 12h30",
        "Mesa longa na casa sede.",
        3,
      ),
    ];

    const convites: SeedConvite[] = [
      {
        label: "Família Vasconcelos",
        plusOneCap: 0,
        tableNumber: 1,
        guests: [
          {
            name: "Beatriz Vasconcelos",
            relation: "mãe da noiva",
            phone: "5511991001001",
            reminderAt: "2026-10-21T19:00:00.000Z",
          },
          { name: "Eduardo Vasconcelos", relation: "pai da noiva", phone: "5511991001002" },
          { name: "Laura Vasconcelos", relation: "irmã da noiva", phone: "5511991001003" },
          { name: "Pedro Vasconcelos", relation: "irmão da noiva", phone: "5511991001004" },
        ],
      },
      {
        label: "Família Albuquerque",
        plusOneCap: 1,
        tableNumber: 2,
        guests: [
          { name: "Lúcia Albuquerque", relation: "mãe do noivo", phone: "5521988002001" },
          { name: "Roberto Albuquerque", relation: "pai do noivo", phone: "5521988002002" },
          { name: "Camila Albuquerque", relation: "irmã do noivo", phone: "5521988002003" },
        ],
      },
      {
        label: "Ana Clara e João Pedro",
        plusOneCap: 0,
        tableNumber: 12,
        song: "Chega de Saudade — João Gilberto",
        respondedAt: "2026-10-10T15:00:00.000Z",
        guests: [
          {
            name: "Ana Clara Mendes",
            relation: "amiga da noiva",
            phone: "5511997003001",
            diet: { vegetarian: true },
            moments: { welcome: true, ceremony: true, lunch: true },
            ticket: "CEL-A1C4M8",
            checkedInAt: "2026-10-22T13:10:00.000Z",
          },
          {
            name: "João Pedro Lima",
            relation: "par de Ana Clara",
            phone: "5511997003002",
            moments: { welcome: true, ceremony: true, lunch: true },
            ticket: "CEL-J2P9L5",
          },
        ],
      },
      {
        label: "Rafael e Patrícia",
        plusOneCap: 0,
        tableNumber: 4,
        song: "Wave — Tom Jobim",
        respondedAt: "2026-10-12T18:30:00.000Z",
        guests: [
          {
            name: "Rafael Nogueira",
            relation: "amigo do noivo",
            phone: "5531992004001",
            diet: { gluten: true },
            moments: { welcome: true, ceremony: true, lunch: true },
            ticket: "CEL-R8N3K1",
          },
          {
            name: "Patrícia Nogueira",
            relation: "amiga do noivo",
            phone: "5531992004002",
            diet: { lactose: true, other: "Alergia a castanha de caju" },
            moments: { welcome: true, ceremony: true, lunch: true },
            ticket: "CEL-P4N6T2",
          },
        ],
      },
      {
        label: "Felipe Andrade",
        plusOneCap: 0,
        tableNumber: 7,
        song: "Como Nossos Pais — Belchior",
        respondedAt: "2026-10-18T21:05:00.000Z",
        guests: [
          {
            name: "Felipe Andrade",
            relation: "primo da noiva",
            phone: "5511996005001",
            diet: { vegan: true },
            moments: { welcome: false, ceremony: true, lunch: false },
            ticket: "CEL-F5A7D0",
          },
        ],
      },
      {
        label: "Mariana Costa",
        plusOneCap: 1,
        tableNumber: 8,
        guests: [{ name: "Mariana Costa", relation: "amiga da faculdade", phone: "5511995006001" }],
      },
      {
        label: "Família Ribeiro",
        plusOneCap: 0,
        tableNumber: 3,
        guests: [
          { name: "Clara Ribeiro", relation: "tia da noiva", phone: "5511993008001" },
          { name: "Henrique Ribeiro", relation: "tio da noiva", phone: "5511993008002" },
          { name: "Sofia Ribeiro", relation: "prima", phone: null },
        ],
      },
      {
        label: "Ana Beatriz Rocha",
        plusOneCap: 0,
        tableNumber: 9,
        guests: [{ name: "Ana Beatriz Rocha", relation: "colega de trabalho", phone: "5511992009001" }],
      },
      {
        label: "Juliana e Lucas",
        plusOneCap: 0,
        tableNumber: 5,
        guests: [
          { name: "Juliana Pires", relation: "amiga do casal", phone: "5547991110101" },
          { name: "Lucas Barbosa", relation: "par de Juliana", phone: "5547991110102" },
        ],
      },
    ];

    convites.forEach((convite) => {
      const conviteId = insertId(
        db,
        `INSERT INTO convites (label, plus_one_cap, table_number, song_request, responded_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        convite.label,
        convite.plusOneCap,
        convite.tableNumber,
        convite.song ?? null,
        convite.respondedAt ?? null,
        now,
      );
      convite.guests.forEach((guest, index) => {
        const diet = { ...emptyDiet(), ...guest.diet };
        const guestId = insertId(
          db,
          `INSERT INTO guests (
            convite_id, name, relation, phone, kind, sort_order, ticket_code, checked_in_at, reminder_prepared_at,
            diet_gluten, diet_lactose, diet_vegetarian, diet_vegan, diet_other
          ) VALUES (?, ?, ?, ?, 'named', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          conviteId,
          guest.name,
          guest.relation,
          guest.phone,
          index,
          guest.ticket ?? null,
          guest.checkedInAt ?? null,
          guest.reminderAt ?? null,
          diet.gluten ? 1 : 0,
          diet.lactose ? 1 : 0,
          diet.vegetarian ? 1 : 0,
          diet.vegan ? 1 : 0,
          diet.other || null,
        );
        if (guest.moments) {
          const answers = [guest.moments.welcome, guest.moments.ceremony, guest.moments.lunch];
          answers.forEach((attending, momentIndex) => {
            if (attending === undefined) return;
            db.prepare(
              `INSERT INTO moment_rsvps (guest_id, moment_id, attending) VALUES (?, ?, ?)`,
            ).run(guestId, momentIds[momentIndex], attending ? 1 : 0);
          });
        }
      });
    });

    const dayPlan = [
      ["16h30", "Cerimônia", 1],
      ["18h00", "Recepção e cocktail", 2],
      ["19h30", "Jantar", 3],
    ] as const;
    for (const [timeLabel, name, sort] of dayPlan) {
      db.prepare(`INSERT INTO schedule (time_label, name, sort_order) VALUES (?, ?, ?)`).run(timeLabel, name, sort);
    }

    db.prepare("INSERT INTO meta (key, value) VALUES ('seeded', '1')").run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function ensureDayOf(db: DatabaseSync) {
  const scheduleCount = num((db.prepare(`SELECT COUNT(*) AS n FROM schedule`).get() as Row) ?? {}, "n");
  if (scheduleCount === 0) {
    const dayPlan = [
      ["16h30", "Cerimônia", 1],
      ["18h00", "Recepção e cocktail", 2],
      ["19h30", "Jantar", 3],
    ] as const;
    for (const [timeLabel, name, sort] of dayPlan) {
      db.prepare(`INSERT INTO schedule (time_label, name, sort_order) VALUES (?, ?, ?)`).run(timeLabel, name, sort);
    }
  }
  db.prepare(
    `UPDATE moments SET time_label = ? WHERE name = 'Cerimônia' AND time_label = ?`,
  ).run("sábado, 17 de abril · 16h30", "sábado, 17 de abril · 16h");
  const wedding = db.prepare(`SELECT maps_url, waze_url FROM wedding WHERE id = 1`).get() as Row | undefined;
  if (wedding && !str(wedding, "maps_url")) {
    db.prepare(`UPDATE wedding SET maps_url = ?, waze_url = ? WHERE id = 1`).run(MAPS_URL, WAZE_URL);
  }
  const assigned = num(
    (db.prepare(`SELECT COUNT(*) AS n FROM convites WHERE table_number IS NOT NULL`).get() as Row) ?? {},
    "n",
  );
  if (assigned === 0) {
    const rows = db.prepare(`SELECT id, label FROM convites`).all() as Row[];
    const update = db.prepare(`UPDATE convites SET table_number = ? WHERE id = ?`);
    for (const row of rows) {
      const table = TABLE_BY_LABEL[str(row, "label")];
      if (table) update.run(table, num(row, "id"));
    }
  }
  ensureRoom(db);
}

const TABLE_SPOTS: Record<number, [number, number]> = {
  1: [24, 40],
  2: [42, 34],
  3: [60, 34],
  4: [78, 40],
  5: [24, 56],
  7: [42, 52],
  8: [60, 52],
  9: [78, 56],
  12: [51, 62],
};

function spotFor(number: number): [number, number] {
  const known = TABLE_SPOTS[number];
  if (known) return known;
  const column = (number - 1) % 4;
  const row = Math.floor((number - 1) / 4) % 3;
  return [22 + column * 18, 36 + row * 16];
}

function ensureTable(db: DatabaseSync, number: number) {
  const found = db.prepare(`SELECT number FROM room_tables WHERE number = ?`).get(number) as Row | undefined;
  if (found) return;
  const [x, y] = spotFor(number);
  db.prepare(`INSERT INTO room_tables (number, seats, pos_x, pos_y) VALUES (?, 8, ?, ?)`).run(number, x, y);
}

function ensureRoom(db: DatabaseSync) {
  const used = db.prepare(`SELECT DISTINCT table_number AS n FROM convites WHERE table_number IS NOT NULL`).all() as Row[];
  for (const row of used) ensureTable(db, num(row, "n"));
}

function dietFrom(row: Row): Diet {
  return {
    gluten: flag(row, "diet_gluten"),
    lactose: flag(row, "diet_lactose"),
    vegetarian: flag(row, "diet_vegetarian"),
    vegan: flag(row, "diet_vegan"),
    other: str(row, "diet_other"),
  };
}

function mapGuest(row: Row, moments: Guest["moments"]): Guest {
  const phone = strOrNull(row, "phone");
  return {
    id: num(row, "id"),
    conviteId: num(row, "convite_id"),
    name: str(row, "name"),
    relation: str(row, "relation"),
    phone,
    phoneDisplay: formatPhone(phone),
    kind: str(row, "kind") === "plus_one" ? "plus_one" : "named",
    ticketCode: strOrNull(row, "ticket_code"),
    checkedInAt: strOrNull(row, "checked_in_at"),
    reminderPreparedAt: strOrNull(row, "reminder_prepared_at"),
    diet: dietFrom(row),
    moments,
  };
}

function guestMoments(db: DatabaseSync, guestId: number): Guest["moments"] {
  return db
    .prepare(`SELECT moment_id, attending FROM moment_rsvps WHERE guest_id = ? ORDER BY moment_id`)
    .all(guestId)
    .map((row) => ({
      momentId: num(row as Row, "moment_id"),
      attending: flag(row as Row, "attending"),
    }));
}

function statusOf(guests: Guest[], respondedAt: string | null): ConviteStatus {
  if (!respondedAt) return "pendente";
  let anyYes = false;
  let anyPartial = false;
  for (const guest of guests) {
    const yes = guest.moments.filter((moment) => moment.attending).length;
    const no = guest.moments.filter((moment) => !moment.attending).length;
    if (yes > 0) anyYes = true;
    if (yes > 0 && no > 0) anyPartial = true;
  }
  if (!anyYes) return "ausente";
  if (anyPartial) return "parcial";
  return "confirmado";
}

function readConvite(id: number): Convite | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM convites WHERE id = ?`).get(id) as Row | undefined;
  if (!row) return null;
  const guests = db
    .prepare(
      `SELECT * FROM guests WHERE convite_id = ? ORDER BY CASE kind WHEN 'named' THEN 0 ELSE 1 END, sort_order, id`,
    )
    .all(id)
    .map((guest) => mapGuest(guest as Row, guestMoments(db, num(guest as Row, "id"))));
  const respondedAt = strOrNull(row, "responded_at");
  return {
    id: num(row, "id"),
    label: str(row, "label"),
    plusOneCap: num(row, "plus_one_cap"),
    tableNumber: row.table_number == null ? null : num(row, "table_number"),
    songRequest: str(row, "song_request"),
    respondedAt,
    status: statusOf(guests, respondedAt),
    guests,
  };
}

export function getWedding(): Wedding {
  const row = getDb().prepare(`SELECT * FROM wedding WHERE id = 1`).get() as Row | undefined;
  if (!row) throw new Error("Casamento não encontrado.");
  return {
    partnerA: str(row, "partner_a"),
    partnerB: str(row, "partner_b"),
    dateLabel: str(row, "date_label"),
    venueName: str(row, "venue_name"),
    venueCity: str(row, "venue_city"),
    venueAddress: str(row, "venue_address"),
    invitationLine: str(row, "invitation_line"),
    mapsUrl: str(row, "maps_url"),
    wazeUrl: str(row, "waze_url"),
  };
}

export function listSchedule(): ScheduleItem[] {
  return getDb()
    .prepare(`SELECT * FROM schedule ORDER BY sort_order, id`)
    .all()
    .map((row) => ({
      id: num(row as Row, "id"),
      timeLabel: str(row as Row, "time_label"),
      name: str(row as Row, "name"),
      sortOrder: num(row as Row, "sort_order"),
    }));
}

function ticketUrlFor(origin: string, code: string | null): string | null {
  if (!code) return null;
  const base = origin.replace(/\/$/, "");
  return `${base}/ingresso/${encodeURIComponent(code)}`;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function listMoments(): Moment[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT m.*, (
         SELECT COUNT(*) FROM moment_rsvps r WHERE r.moment_id = m.id AND r.attending = 1
       ) AS headcount
       FROM moments m
       ORDER BY sort_order, id`,
    )
    .all()
    .map((row) => ({
      id: num(row as Row, "id"),
      name: str(row as Row, "name"),
      timeLabel: str(row as Row, "time_label"),
      description: str(row as Row, "description"),
      sortOrder: num(row as Row, "sort_order"),
      headcount: num(row as Row, "headcount"),
    }));
}

export function searchGuests(raw: string): SearchResult {
  const rows = getDb()
    .prepare(
      `SELECT g.id, g.name, g.relation, g.convite_id, c.label, c.responded_at
       FROM guests g JOIN convites c ON c.id = g.convite_id`,
    )
    .all() as Row[];
  const people = rows.map((row) => ({
    id: num(row, "id"),
    name: str(row, "name"),
    relation: str(row, "relation"),
    conviteId: num(row, "convite_id"),
    label: str(row, "label"),
    responded: strOrNull(row, "responded_at") !== null,
  }));
  const result = classifySearch(raw, people, 5);
  if (result.status !== "ok") return { status: result.status };
  return {
    status: "ok",
    hits: result.matches
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map((person) => ({
        guestId: person.id,
        name: person.name,
        relation: person.relation,
        conviteId: person.conviteId,
        conviteLabel: person.label,
        responded: person.responded,
      })),
  };
}

export function getConvite(id: number): Convite | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  return readConvite(id);
}

function cleanDiet(diet: Diet | undefined): Diet {
  return {
    gluten: Boolean(diet?.gluten),
    lactose: Boolean(diet?.lactose),
    vegetarian: Boolean(diet?.vegetarian),
    vegan: Boolean(diet?.vegan),
    other: cleanText(diet?.other ?? "").slice(0, 200),
  };
}

function newTicketCode(db: DatabaseSync): string {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomTicketCode();
    const taken = db.prepare(`SELECT 1 AS ok FROM guests WHERE ticket_code = ?`).get(code);
    if (!taken) return code;
  }
  throw new Error("Não foi possível gerar o ingresso.");
}

export function submitRsvp(input: RsvpInput): SubmitResult {
  const db = getDb();
  const convite = readConvite(input.conviteId);
  if (!convite) return { ok: false, error: "Este convite não está mais na lista." };

  const moments = listMoments();
  const momentIds = moments.map((moment) => moment.id);
  const named = convite.guests.filter((guest) => guest.kind === "named");
  const existingPlus = convite.guests.filter((guest) => guest.kind === "plus_one");
  const people = Array.isArray(input.people) ? input.people : [];
  const namedInputs = people.filter((person) => person.kind === "named");
  const plusInputs = people.filter((person) => person.kind === "plus_one");

  if (namedInputs.length !== named.length) {
    return { ok: false, error: "A lista deste convite mudou. Atualize a página e tente de novo." };
  }
  const namedIds = new Set(named.map((guest) => guest.id));
  const seen = new Set<number>();
  for (const person of namedInputs) {
    if (person.guestId == null || !namedIds.has(person.guestId) || seen.has(person.guestId)) {
      return { ok: false, error: "A lista deste convite mudou. Atualize a página e tente de novo." };
    }
    seen.add(person.guestId);
  }
  if (plusInputs.length > convite.plusOneCap) {
    const noun = convite.plusOneCap === 1 ? "acompanhante" : "acompanhantes";
    const limit =
      convite.plusOneCap === 0
        ? "Este convite não autoriza acompanhantes além dos nomes já indicados."
        : `Este convite autoriza no máximo ${convite.plusOneCap} ${noun}. Não dá para incluir mais ninguém.`;
    return { ok: false, error: limit };
  }

  for (const person of plusInputs) {
    const name = cleanText(person.name ?? "");
    if (name.length < 2) {
      return { ok: false, error: "Escreva o nome de cada acompanhante." };
    }
    if (person.guestId != null) {
      const current = existingPlus.find((guest) => guest.id === person.guestId);
      if (!current) {
        return { ok: false, error: "A lista deste convite mudou. Atualize a página e tente de novo." };
      }
    }
  }

  for (const person of people) {
    if (!person.moments || person.moments.length !== momentIds.length) {
      return { ok: false, error: "Marque sim ou não em cada momento, para cada pessoa." };
    }
    for (const momentId of momentIds) {
      const answer = person.moments.find((moment) => moment.momentId === momentId);
      if (!answer || typeof answer.attending !== "boolean") {
        return { ok: false, error: "Marque sim ou não em cada momento, para cada pessoa." };
      }
    }
  }

  const removed = existingPlus.filter(
    (guest) => !plusInputs.some((person) => person.guestId === guest.id),
  );
  if (removed.some((guest) => guest.checkedInAt)) {
    return {
      ok: false,
      error: "Não dá para tirar do convite quem já entrou na recepção.",
    };
  }

  const song = cleanText(input.song ?? "").slice(0, 160);
  const respondedAt = convite.respondedAt ?? new Date().toISOString();

  db.exec("BEGIN");
  try {
    db.prepare(`UPDATE convites SET song_request = ?, responded_at = ? WHERE id = ?`).run(
      song || null,
      respondedAt,
      convite.id,
    );

    for (const guest of removed) {
      db.prepare(`DELETE FROM guests WHERE id = ?`).run(guest.id);
    }

    const tickets: TicketCard[] = [];

    const writePerson = (guestId: number, name: string, person: RsvpInput["people"][number]) => {
      const coming = person.moments.some((moment) => moment.attending);
      const diet = coming ? cleanDiet(person.diet) : emptyDiet();
      const current = db.prepare(`SELECT ticket_code, checked_in_at FROM guests WHERE id = ?`).get(guestId) as
        | Row
        | undefined;
      let code = strOrNull(current ?? {}, "ticket_code");
      const checkedIn = strOrNull(current ?? {}, "checked_in_at");
      if (coming && !code) code = newTicketCode(db);
      if (!coming && !checkedIn) code = null;
      if (!coming && checkedIn) {
        throw new Error("CHECKED_IN_DECLINE");
      }
      db.prepare(
        `UPDATE guests SET
          diet_gluten = ?, diet_lactose = ?, diet_vegetarian = ?, diet_vegan = ?, diet_other = ?, ticket_code = ?
         WHERE id = ?`,
      ).run(
        diet.gluten ? 1 : 0,
        diet.lactose ? 1 : 0,
        diet.vegetarian ? 1 : 0,
        diet.vegan ? 1 : 0,
        diet.other || null,
        code,
        guestId,
      );
      db.prepare(`DELETE FROM moment_rsvps WHERE guest_id = ?`).run(guestId);
      for (const moment of person.moments) {
        db.prepare(`INSERT INTO moment_rsvps (guest_id, moment_id, attending) VALUES (?, ?, ?)`).run(
          guestId,
          moment.momentId,
          moment.attending ? 1 : 0,
        );
      }
      if (coming && code) {
        tickets.push({
          name,
          code,
          moments: person.moments
            .filter((moment) => moment.attending)
            .map((moment) => {
              const info = moments.find((item) => item.id === moment.momentId);
              return { name: info?.name ?? "Momento", timeLabel: info?.timeLabel ?? "" };
            }),
        });
      }
    };

    for (const person of namedInputs) {
      const guest = named.find((item) => item.id === person.guestId);
      if (!guest || person.guestId == null) throw new Error("MISSING_NAMED");
      writePerson(person.guestId, guest.name, person);
    }

    for (const person of plusInputs) {
      const name = cleanText(person.name).slice(0, 80);
      let guestId = person.guestId;
      if (guestId == null) {
        const sort = num(
          (db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS n FROM guests WHERE convite_id = ?`).get(convite.id) as Row) ??
            {},
          "n",
        );
        guestId = insertId(
          db,
          `INSERT INTO guests (convite_id, name, relation, phone, kind, sort_order) VALUES (?, ?, 'acompanhante', NULL, 'plus_one', ?)`,
          convite.id,
          name,
          sort + 1,
        );
      } else {
        db.prepare(`UPDATE guests SET name = ? WHERE id = ? AND convite_id = ? AND kind = 'plus_one'`).run(
          name,
          guestId,
          convite.id,
        );
      }
      writePerson(guestId, name, person);
    }

    seatConfirmedParty(db, convite.id);
    db.exec("COMMIT");
    return { ok: true, tickets, anyoneComing: tickets.length > 0 };
  } catch (error) {
    db.exec("ROLLBACK");
    if (error instanceof Error && error.message === "CHECKED_IN_DECLINE") {
      return {
        ok: false,
        error: "Quem já entrou na recepção precisa continuar com pelo menos um momento confirmado.",
      };
    }
    console.error(error);
    return { ok: false, error: "Não foi possível salvar a confirmação. Tente de novo." };
  }
}

function seatConfirmedParty(db: DatabaseSync, conviteId: number) {
  const coming = num(
    (db
      .prepare(
        `SELECT COUNT(DISTINCT g.id) AS n
         FROM guests g
         JOIN moment_rsvps r ON r.guest_id = g.id AND r.attending = 1
         WHERE g.convite_id = ?`,
      )
      .get(conviteId) as Row) ?? {},
    "n",
  );
  if (coming === 0) return;
  const current = db.prepare(`SELECT table_number FROM convites WHERE id = ?`).get(conviteId) as Row | undefined;
  if (!current || current.table_number != null) return;
  const used = new Set(
    (db.prepare(`SELECT table_number FROM convites WHERE table_number IS NOT NULL`).all() as Row[]).map((row) =>
      num(row, "table_number"),
    ),
  );
  let next = 1;
  while (used.has(next)) next += 1;
  db.prepare(`UPDATE convites SET table_number = ? WHERE id = ?`).run(next, conviteId);
  ensureTable(db, next);
}

function capNumber(value: number): number | null {
  if (!Number.isInteger(value) || value < 0 || value > 8) return null;
  return value;
}

export function createConvite(label: string, plusOneCap: number): MutationResult & { id?: number } {
  const name = cleanText(label).slice(0, 80);
  const cap = capNumber(plusOneCap);
  if (name.length < 2) return { ok: false, error: "Dê um nome ao convite." };
  if (cap == null) return { ok: false, error: "O limite de acompanhantes fica entre 0 e 8." };
  const db = getDb();
  const id = insertId(
    db,
    `INSERT INTO convites (label, plus_one_cap, created_at) VALUES (?, ?, ?)`,
    name,
    cap,
    new Date().toISOString(),
  );
  return { ok: true, id };
}

export function updateConvite(id: number, label: string, plusOneCap: number): MutationResult {
  const convite = readConvite(id);
  if (!convite) return { ok: false, error: "Convite não encontrado." };
  const name = cleanText(label).slice(0, 80);
  const cap = capNumber(plusOneCap);
  if (name.length < 2) return { ok: false, error: "Dê um nome ao convite." };
  if (cap == null) return { ok: false, error: "O limite de acompanhantes fica entre 0 e 8." };
  const plusCount = convite.guests.filter((guest) => guest.kind === "plus_one").length;
  if (cap < plusCount) {
    return {
      ok: false,
      error: `Já existem ${plusCount} acompanhantes neste convite. Aumente o limite ou remova alguém antes.`,
    };
  }
  getDb().prepare(`UPDATE convites SET label = ?, plus_one_cap = ? WHERE id = ?`).run(name, cap, id);
  return { ok: true };
}

export function deleteConvite(id: number): MutationResult {
  const result = getDb().prepare(`DELETE FROM convites WHERE id = ?`).run(id);
  if (Number(result.changes) === 0) return { ok: false, error: "Convite não encontrado." };
  return { ok: true };
}

export function addGuest(conviteId: number, name: string, relation: string, phone: string): MutationResult {
  const convite = readConvite(conviteId);
  if (!convite) return { ok: false, error: "Convite não encontrado." };
  const cleanName = cleanText(name).slice(0, 80);
  if (cleanName.length < 2) return { ok: false, error: "Escreva o nome do convidado." };
  const normalized = normalizePhone(phone);
  if (normalized === "invalid") {
    return { ok: false, error: "Use o telefone com DDD. Ex.: 11 90000-0000." };
  }
  const db = getDb();
  const sort = convite.guests.reduce((max, guest) => Math.max(max, guest.id), 0);
  insertId(
    db,
    `INSERT INTO guests (convite_id, name, relation, phone, kind, sort_order) VALUES (?, ?, ?, ?, 'named', ?)`,
    conviteId,
    cleanName,
    cleanText(relation).slice(0, 80),
    normalized,
    sort + 1,
  );
  return { ok: true };
}

export function updateGuest(id: number, name: string, relation: string, phone: string): MutationResult {
  const row = getDb().prepare(`SELECT id, kind FROM guests WHERE id = ?`).get(id) as Row | undefined;
  if (!row) return { ok: false, error: "Convidado não encontrado." };
  const cleanName = cleanText(name).slice(0, 80);
  if (cleanName.length < 2) return { ok: false, error: "Escreva o nome do convidado." };
  const normalized = normalizePhone(phone);
  if (normalized === "invalid") {
    return { ok: false, error: "Use o telefone com DDD. Ex.: 11 90000-0000." };
  }
  getDb()
    .prepare(`UPDATE guests SET name = ?, relation = ?, phone = ? WHERE id = ?`)
    .run(cleanName, cleanText(relation).slice(0, 80), normalized, id);
  return { ok: true };
}

export function deleteGuest(id: number): MutationResult {
  const result = getDb().prepare(`DELETE FROM guests WHERE id = ?`).run(id);
  if (Number(result.changes) === 0) return { ok: false, error: "Convidado não encontrado." };
  return { ok: true };
}

export function addMoment(name: string, timeLabel: string, description: string): MutationResult {
  const cleanName = cleanText(name).slice(0, 60);
  const time = cleanText(timeLabel).slice(0, 80);
  const about = cleanText(description).slice(0, 180);
  if (cleanName.length < 2 || time.length < 2) {
    return { ok: false, error: "O momento precisa de nome e horário." };
  }
  const db = getDb();
  const sort = num(
    (db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS n FROM moments`).get() as Row) ?? {},
    "n",
  );
  insertId(
    db,
    `INSERT INTO moments (name, time_label, description, sort_order) VALUES (?, ?, ?, ?)`,
    cleanName,
    time,
    about,
    sort + 1,
  );
  return { ok: true };
}

export function updateMoment(id: number, name: string, timeLabel: string, description: string): MutationResult {
  const cleanName = cleanText(name).slice(0, 60);
  const time = cleanText(timeLabel).slice(0, 80);
  const about = cleanText(description).slice(0, 180);
  if (cleanName.length < 2 || time.length < 2) {
    return { ok: false, error: "O momento precisa de nome e horário." };
  }
  const result = getDb()
    .prepare(`UPDATE moments SET name = ?, time_label = ?, description = ? WHERE id = ?`)
    .run(cleanName, time, about, id);
  if (Number(result.changes) === 0) return { ok: false, error: "Momento não encontrado." };
  return { ok: true };
}

export function deleteMoment(id: number): MutationResult {
  const db = getDb();
  const count = num((db.prepare(`SELECT COUNT(*) AS n FROM moments`).get() as Row) ?? {}, "n");
  if (count <= 1) return { ok: false, error: "O fim de semana precisa de pelo menos um momento." };
  const result = db.prepare(`DELETE FROM moments WHERE id = ?`).run(id);
  if (Number(result.changes) === 0) return { ok: false, error: "Momento não encontrado." };
  return { ok: true };
}

export function prepareReminder(
  guestId: number,
  origin: string,
): { ok: true; url: string; preparedAt: string } | { ok: false; error: string } {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT g.id, g.name, g.phone, c.responded_at
       FROM guests g JOIN convites c ON c.id = g.convite_id
       WHERE g.id = ?`,
    )
    .get(guestId) as Row | undefined;
  if (!row) return { ok: false, error: "Convidado não encontrado." };
  if (strOrNull(row, "responded_at")) return { ok: false, error: "Este convite já respondeu." };
  const phone = strOrNull(row, "phone");
  if (!phone) return { ok: false, error: "Este convidado está sem telefone." };
  const preparedAt = new Date().toISOString();
  db.prepare(`UPDATE guests SET reminder_prepared_at = ? WHERE id = ?`).run(preparedAt, guestId);
  const wedding = getWedding();
  const text = reminderMessage({
    firstName: firstName(str(row, "name")),
    partnerA: wedding.partnerA,
    partnerB: wedding.partnerB,
    dateLabel: wedding.dateLabel,
    venueName: wedding.venueName,
    origin,
  });
  return { ok: true, url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`, preparedAt };
}

export function updatePlaceLinks(mapsUrl: string, wazeUrl: string): MutationResult {
  const maps = cleanText(mapsUrl);
  const waze = cleanText(wazeUrl);
  if ((maps && !isHttpsUrl(maps)) || (waze && !isHttpsUrl(waze))) {
    return { ok: false, error: "Use um link https do mapa e do Waze." };
  }
  const result = getDb().prepare(`UPDATE wedding SET maps_url = ?, waze_url = ? WHERE id = 1`).run(maps, waze);
  if (Number(result.changes) === 0) return { ok: false, error: "Casamento não encontrado." };
  return { ok: true };
}

export function updateTable(conviteId: number, raw: string): MutationResult {
  const text = cleanText(raw);
  let table: number | null = null;
  if (text) {
    if (!/^\d{1,3}$/.test(text) || Number(text) < 1) {
      return { ok: false, error: "A mesa é um número de 1 a 999." };
    }
    table = Number(text);
  }
  const db = getDb();
  const result = db.prepare(`UPDATE convites SET table_number = ? WHERE id = ?`).run(table, conviteId);
  if (Number(result.changes) === 0) return { ok: false, error: "Convite não encontrado." };
  if (table != null) ensureTable(db, table);
  return { ok: true };
}

export function addScheduleItem(timeLabel: string, name: string): MutationResult {
  const time = cleanText(timeLabel).slice(0, 20);
  const title = cleanText(name).slice(0, 60);
  if (time.length < 2 || title.length < 2) return { ok: false, error: "O horário precisa de hora e nome." };
  const db = getDb();
  const sort = num((db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS n FROM schedule`).get() as Row) ?? {}, "n");
  insertId(db, `INSERT INTO schedule (time_label, name, sort_order) VALUES (?, ?, ?)`, time, title, sort + 1);
  return { ok: true };
}

export function updateScheduleItem(id: number, timeLabel: string, name: string): MutationResult {
  const time = cleanText(timeLabel).slice(0, 20);
  const title = cleanText(name).slice(0, 60);
  if (time.length < 2 || title.length < 2) return { ok: false, error: "O horário precisa de hora e nome." };
  const result = getDb()
    .prepare(`UPDATE schedule SET time_label = ?, name = ? WHERE id = ?`)
    .run(time, title, id);
  if (Number(result.changes) === 0) return { ok: false, error: "Horário não encontrado." };
  return { ok: true };
}

export function deleteScheduleItem(id: number): MutationResult {
  const db = getDb();
  const count = num((db.prepare(`SELECT COUNT(*) AS n FROM schedule`).get() as Row) ?? {}, "n");
  if (count <= 1) return { ok: false, error: "O sábado precisa de pelo menos um horário." };
  const result = db.prepare(`DELETE FROM schedule WHERE id = ?`).run(id);
  if (Number(result.changes) === 0) return { ok: false, error: "Horário não encontrado." };
  return { ok: true };
}

export function prepareDispatch(
  guestId: number,
  origin: string,
): { ok: true; url: string | null; message: string; preparedAt: string } | { ok: false; error: string } {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT g.id, g.name, g.phone, g.ticket_code, c.table_number,
              EXISTS(
                SELECT 1 FROM moment_rsvps r WHERE r.guest_id = g.id AND r.attending = 1
              ) AS coming
       FROM guests g JOIN convites c ON c.id = g.convite_id
       WHERE g.id = ?`,
    )
    .get(guestId) as Row | undefined;
  if (!row) return { ok: false, error: "Convidado não encontrado." };
  if (num(row, "coming") !== 1) return { ok: false, error: "Só quem confirmou entra no disparo do dia." };
  const wedding = getWedding();
  const schedule = listSchedule();
  const tableNumber = row.table_number == null ? null : num(row, "table_number");
  const message = composeDispatch({
    name: str(row, "name"),
    tableNumber,
    schedule,
    mapsUrl: wedding.mapsUrl,
    wazeUrl: wedding.wazeUrl,
    ticketUrl: ticketUrlFor(origin, strOrNull(row, "ticket_code")),
  });
  const preparedAt = new Date().toISOString();
  db.prepare(`UPDATE guests SET dispatch_prepared_at = ?, dispatch_message = ? WHERE id = ?`).run(
    preparedAt,
    message,
    guestId,
  );
  const phone = strOrNull(row, "phone");
  return {
    ok: true,
    message,
    preparedAt,
    url: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null,
  };
}

export function dayReply(guestId: number, command: string, origin: string): DayReply {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT g.id, g.name, g.ticket_code, c.table_number,
              EXISTS(
                SELECT 1 FROM moment_rsvps r WHERE r.guest_id = g.id AND r.attending = 1
              ) AS coming
       FROM guests g JOIN convites c ON c.id = g.convite_id
       WHERE g.id = ?`,
    )
    .get(guestId) as Row | undefined;
  if (!row) return { status: "missing" };
  const kind = classifyDayCommand(command);
  if (kind === "unknown") return { status: "hint" };
  const wedding = getWedding();
  const schedule = listSchedule();
  const coming = num(row, "coming") === 1;
  const ticketUrl = coming ? ticketUrlFor(origin, strOrNull(row, "ticket_code")) : null;
  const tableNumber = row.table_number == null ? null : num(row, "table_number");
  return {
    status: kind,
    name: str(row, "name"),
    tableLabel: tableNumber ? `Mesa ${tableNumber}` : null,
    lines: kind === "cronograma" ? schedule.map((item) => ({ timeLabel: item.timeLabel, name: item.name })) : [],
    mapsUrl: wedding.mapsUrl,
    wazeUrl: wedding.wazeUrl,
    ticketUrl,
  };
}

function checkinGuestById(guestId: number): CheckinGuest | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT g.*, c.label AS convite_label
       FROM guests g JOIN convites c ON c.id = g.convite_id
       WHERE g.id = ?`,
    )
    .get(guestId) as Row | undefined;
  if (!row) return null;
  const moments = listMoments();
  const answers = new Map(guestMoments(db, guestId).map((moment) => [moment.momentId, moment.attending]));
  return {
    guestId,
    name: str(row, "name"),
    conviteLabel: str(row, "convite_label"),
    code: strOrNull(row, "ticket_code"),
    checkedInAt: strOrNull(row, "checked_in_at"),
    moments: moments.map((moment) => ({
      name: moment.name,
      timeLabel: moment.timeLabel,
      attending: answers.get(moment.id) === true,
    })),
  };
}

export function checkInGuest(guestId: number): CheckinResult {
  const guest = checkinGuestById(guestId);
  if (!guest) return { status: "unknown" };
  if (!guest.moments.some((moment) => moment.attending)) {
    return { status: "not-coming", name: guest.name, conviteLabel: guest.conviteLabel };
  }
  if (guest.checkedInAt) return { status: "already", guest };
  const db = getDb();
  if (!guest.code) {
    guest.code = newTicketCode(db);
    db.prepare(`UPDATE guests SET ticket_code = ? WHERE id = ?`).run(guest.code, guestId);
  }
  const checkedInAt = new Date().toISOString();
  db.prepare(`UPDATE guests SET checked_in_at = ? WHERE id = ?`).run(checkedInAt, guestId);
  return { status: "ok", guest: { ...guest, checkedInAt } };
}

export function checkInByCode(raw: string): CheckinResult {
  const code = extractTicketCode(raw);
  if (!code) return { status: "unknown" };
  const row = getDb().prepare(`SELECT id FROM guests WHERE upper(ticket_code) = ?`).get(code) as Row | undefined;
  if (!row) return { status: "unknown" };
  return checkInGuest(num(row, "id"));
}

export function searchCheckin(raw: string): CheckinSearchResult {
  const db = getDb();
  const moments = listMoments();
  const rows = db
    .prepare(
      `SELECT g.id, g.name, g.relation, g.ticket_code, g.checked_in_at, c.label
       FROM guests g JOIN convites c ON c.id = g.convite_id`,
    )
    .all() as Row[];
  const people = rows.map((row) => ({
    guestId: num(row, "id"),
    name: str(row, "name"),
    relation: str(row, "relation"),
    conviteLabel: str(row, "label"),
    code: strOrNull(row, "ticket_code"),
    checkedInAt: strOrNull(row, "checked_in_at"),
  }));
  const result = classifySearch(raw, people, 5);
  if (result.status !== "ok") return { status: result.status };
  return {
    status: "ok",
    hits: result.matches
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map((person) => {
        const answers = guestMoments(db, person.guestId);
        const coming = moments.filter((moment) => answers.some((answer) => answer.momentId === moment.id && answer.attending));
        return {
          ...person,
          canCheckIn: coming.length > 0,
          momentSummary:
            coming.length > 0 ? coming.map((moment) => moment.name).join(" · ") : "Ainda não confirmou presença",
        };
      }),
  };
}

export function getTicket(rawCode: string): TicketView | null {
  const code = extractTicketCode(rawCode);
  if (!code) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT g.*, c.label AS convite_label
       FROM guests g JOIN convites c ON c.id = g.convite_id
       WHERE upper(g.ticket_code) = ?`,
    )
    .get(code) as Row | undefined;
  if (!row) return null;
  const moments = listMoments();
  const answers = new Map(guestMoments(db, num(row, "id")).map((moment) => [moment.momentId, moment.attending]));
  const viewMoments = moments.map((moment) => ({
    name: moment.name,
    timeLabel: moment.timeLabel,
    attending: answers.get(moment.id) === true,
  }));
  if (!viewMoments.some((moment) => moment.attending)) return null;
  return {
    name: str(row, "name"),
    relation: str(row, "relation"),
    conviteLabel: str(row, "convite_label"),
    code,
    checkedInAt: strOrNull(row, "checked_in_at"),
    moments: viewMoments,
    wedding: getWedding(),
  };
}

function attendingGuests(): { guest: Guest; convite: Convite }[] {
  const db = getDb();
  const ids = db.prepare(`SELECT id FROM convites ORDER BY label`).all() as Row[];
  const pairs: { guest: Guest; convite: Convite }[] = [];
  for (const row of ids) {
    const convite = readConvite(num(row, "id"));
    if (!convite) continue;
    for (const guest of convite.guests) {
      if (guest.moments.some((moment) => moment.attending)) pairs.push({ guest, convite });
    }
  }
  return pairs;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(96, Math.max(4, value));
}

export function listRoom(): RoomTable[] {
  const db = getDb();
  ensureRoom(db);
  return (db.prepare(`SELECT number, seats, pos_x, pos_y FROM room_tables ORDER BY number`).all() as Row[]).map(
    (row) => ({
      number: num(row, "number"),
      seats: num(row, "seats"),
      x: Number(row.pos_x),
      y: Number(row.pos_y),
    }),
  );
}

export function hostReport(): HostReport {
  const db = getDb();
  ensureRoom(db);
  const guests = num((db.prepare(`SELECT COUNT(*) AS n FROM guests`).get() as Row) ?? {}, "n");
  const confirmed = num(
    (db
      .prepare(
        `SELECT COUNT(DISTINCT g.id) AS n
         FROM guests g
         JOIN moment_rsvps r ON r.guest_id = g.id AND r.attending = 1`,
      )
      .get() as Row) ?? {},
    "n",
  );
  const pending = num(
    (db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM guests g
         WHERE NOT EXISTS (SELECT 1 FROM moment_rsvps r WHERE r.guest_id = g.id)`,
      )
      .get() as Row) ?? {},
    "n",
  );
  const tables = (db.prepare(`SELECT number, seats FROM room_tables ORDER BY number`).all() as Row[]).map((row) => {
    const number = num(row, "number");
    const seats = num(row, "seats");
    const coming = num(
      (db
        .prepare(
          `SELECT COUNT(DISTINCT g.id) AS n
           FROM guests g
           JOIN convites c ON c.id = g.convite_id AND c.table_number = ?
           JOIN moment_rsvps r ON r.guest_id = g.id AND r.attending = 1`,
        )
        .get(number) as Row) ?? {},
      "n",
    );
    return { number, seats, confirmed: coming, free: seats - coming };
  });
  return {
    guests,
    confirmed,
    pending,
    tables,
    freeSeats: tables.reduce((sum, table) => sum + table.free, 0),
  };
}

export function moveTable(number: number, x: number, y: number): MutationResult {
  if (!Number.isInteger(number) || number < 1 || number > 999) {
    return { ok: false, error: "Mesa não encontrada." };
  }
  const db = getDb();
  ensureTable(db, number);
  db.prepare(`UPDATE room_tables SET pos_x = ?, pos_y = ? WHERE number = ?`).run(
    clampPercent(x),
    clampPercent(y),
    number,
  );
  return { ok: true };
}

export function saveGuestProfile(input: GuestProfileInput): GuestSaveResult {
  const name = cleanText(input.name).slice(0, 80);
  if (name.length < 2) return { ok: false, error: "Escreva o nome do convidado." };
  const relation = cleanText(input.relation).slice(0, 80);
  const phone = normalizePhone(input.phone);
  if (phone === "invalid") return { ok: false, error: "Use o telefone com DDD. Ex.: 11 90000-0000." };

  const tableText = cleanText(input.tableNumber);
  let table: number | null = null;
  if (tableText) {
    if (!/^\d{1,3}$/.test(tableText) || Number(tableText) < 1) {
      return { ok: false, error: "A mesa é um número de 1 a 999." };
    }
    table = Number(tableText);
  }
  let seats: number | null = null;
  if (table != null) {
    const seatsText = cleanText(input.seats);
    if (!/^\d{1,2}$/.test(seatsText) || Number(seatsText) > 40) {
      return { ok: false, error: "Os lugares desta mesa ficam entre 0 e 40." };
    }
    seats = Number(seatsText);
  }

  const db = getDb();
  let conviteId = input.conviteId;
  if (conviteId == null) {
    const label = cleanText(input.conviteLabel).slice(0, 80);
    if (label.length < 2) return { ok: false, error: "Escolha o convite ou dê um nome a um novo." };
    conviteId = insertId(
      db,
      `INSERT INTO convites (label, plus_one_cap, created_at) VALUES (?, 1, ?)`,
      label,
      new Date().toISOString(),
    );
  } else {
    const exists = db.prepare(`SELECT id FROM convites WHERE id = ?`).get(conviteId) as Row | undefined;
    if (!exists) return { ok: false, error: "Convite não encontrado." };
  }

  if (input.guestId == null) {
    const sort = num(
      (db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS n FROM guests WHERE convite_id = ?`).get(conviteId) as Row) ??
        {},
      "n",
    );
    insertId(
      db,
      `INSERT INTO guests (convite_id, name, relation, phone, kind, sort_order) VALUES (?, ?, ?, ?, 'named', ?)`,
      conviteId,
      name,
      relation,
      phone,
      sort + 1,
    );
  } else {
    const guest = db.prepare(`SELECT id FROM guests WHERE id = ?`).get(input.guestId) as Row | undefined;
    if (!guest) return { ok: false, error: "Convidado não encontrado." };
    db.prepare(`UPDATE guests SET convite_id = ?, name = ?, relation = ?, phone = ? WHERE id = ?`).run(
      conviteId,
      name,
      relation,
      phone,
      input.guestId,
    );
  }

  db.prepare(`UPDATE convites SET table_number = ? WHERE id = ?`).run(table, conviteId);
  if (table != null && seats != null) {
    ensureTable(db, table);
    db.prepare(`UPDATE room_tables SET seats = ? WHERE number = ?`).run(seats, table);
  }
  return { ok: true, report: hostReport() };
}

export function getPanel(origin = "http://127.0.0.1:43123"): PanelData {
  const db = getDb();
  const wedding = getWedding();
  const moments = listMoments();
  const conviteRows = db.prepare(`SELECT id FROM convites ORDER BY label COLLATE NOCASE`).all() as Row[];
  const convites = conviteRows
    .map((row) => readConvite(num(row, "id")))
    .filter((convite): convite is Convite => convite !== null);
  const momentName = new Map(moments.map((moment) => [moment.id, moment.name]));
  const coming = attendingGuests();

  const countDiet = (key: keyof Diet) =>
    coming.filter((item) => (key === "other" ? item.guest.diet.other.trim().length > 0 : item.guest.diet[key] === true))
      .length;

  const notes: DietNote[] = coming
    .filter((item) => {
      const diet = item.guest.diet;
      return diet.gluten || diet.lactose || diet.vegetarian || diet.vegan || diet.other.trim().length > 0;
    })
    .map((item) => {
      const parts = [
        item.guest.diet.gluten ? "sem glúten" : null,
        item.guest.diet.lactose ? "sem lactose" : null,
        item.guest.diet.vegetarian ? "vegetariano" : null,
        item.guest.diet.vegan ? "vegano" : null,
        item.guest.diet.other.trim() || null,
      ].filter((part): part is string => Boolean(part));
      const yes = item.guest.moments.filter((moment) => moment.attending).map((moment) => momentName.get(moment.momentId) ?? "");
      return {
        name: item.guest.name,
        conviteLabel: item.convite.label,
        detail: parts.join(" · "),
        moments: yes.join(" · "),
      };
    });

  const schedule = listSchedule();
  const dispatchMeta = new Map(
    (db.prepare(`SELECT id, dispatch_prepared_at, dispatch_message FROM guests`).all() as Row[]).map((row) => [
      num(row, "id"),
      {
        preparedAt: strOrNull(row, "dispatch_prepared_at"),
        storedMessage: strOrNull(row, "dispatch_message"),
      },
    ]),
  );
  const dispatches: DispatchRow[] = [];
  for (const convite of convites) {
    for (const guest of convite.guests) {
      if (!guest.moments.some((moment) => moment.attending)) continue;
      const meta = dispatchMeta.get(guest.id);
      const ticketUrl = ticketUrlFor(origin, guest.ticketCode);
      dispatches.push({
        guestId: guest.id,
        name: guest.name,
        phone: guest.phone,
        phoneDisplay: guest.phoneDisplay,
        conviteLabel: convite.label,
        tableNumber: convite.tableNumber,
        ticketCode: guest.ticketCode,
        message: composeDispatch({
          name: guest.name,
          tableNumber: convite.tableNumber,
          schedule,
          mapsUrl: wedding.mapsUrl,
          wazeUrl: wedding.wazeUrl,
          ticketUrl,
        }),
        preparedAt: meta?.preparedAt ?? null,
        storedMessage: meta?.storedMessage ?? null,
      });
    }
  }

  const reminders: ReminderRow[] = [];
  for (const convite of convites) {
    if (convite.respondedAt) continue;
    for (const guest of convite.guests) {
      if (guest.kind !== "named") continue;
      reminders.push({
        guestId: guest.id,
        name: guest.name,
        phone: guest.phone,
        phoneDisplay: guest.phoneDisplay,
        conviteId: convite.id,
        conviteLabel: convite.label,
        reminderPreparedAt: guest.reminderPreparedAt,
      });
    }
  }

  const recent = db
    .prepare(
      `SELECT g.name, g.checked_in_at, c.label
       FROM guests g JOIN convites c ON c.id = g.convite_id
       WHERE g.checked_in_at IS NOT NULL
       ORDER BY g.checked_in_at DESC
       LIMIT 8`,
    )
    .all() as Row[];

  return {
    wedding,
    moments,
    convites,
    songs: convites
      .filter((convite) => convite.songRequest.trim().length > 0)
      .map((convite) => ({
        conviteId: convite.id,
        conviteLabel: convite.label,
        song: convite.songRequest,
      })),
    dietary: {
      counts: [
        { key: "gluten", label: "Sem glúten", count: countDiet("gluten") },
        { key: "lactose", label: "Sem lactose", count: countDiet("lactose") },
        { key: "vegetarian", label: "Vegetariano", count: countDiet("vegetarian") },
        { key: "vegan", label: "Vegano", count: countDiet("vegan") },
        { key: "other", label: "Outras notas", count: countDiet("other") },
      ],
      notes,
    },
    reminders,
    schedule,
    dispatches,
    stats: {
      guests: convites.reduce((sum, convite) => sum + convite.guests.length, 0),
      convites: convites.length,
      responded: convites.filter((convite) => convite.respondedAt).length,
      pending: convites.filter((convite) => !convite.respondedAt).length,
      checkedIn: convites.reduce(
        (sum, convite) => sum + convite.guests.filter((guest) => guest.checkedInAt).length,
        0,
      ),
    },
    recentCheckins: recent.map((row) => ({
      name: str(row, "name"),
      conviteLabel: str(row, "label"),
      checkedInAt: str(row, "checked_in_at"),
    })),
    hostReport: hostReport(),
    room: listRoom(),
  };
}

export function listConvites(): Convite[] {
  return getPanel().convites;
}

type PlannerPersonSeed = {
  name: string;
  relation: string;
  conviteLabel: string;
  status: PlannerGuestStatus;
  note: string;
};

type PlannerVendorSeed = {
  role: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
};

type PlannerPaymentSeed = {
  receiptNumber: string;
  paidOn: string;
  amountCents: number;
  method: string;
  description: string;
};

type PlannerScriptSeed = {
  timeLabel: string;
  title: string;
  body: string;
};

type PlannerCheckSeed = {
  label: string;
  done: boolean;
};

type PlannerSeed = {
  slug: string;
  partnerA: string;
  partnerB: string;
  weddingDate: string;
  dateLabel: string;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  startTime: string;
  ceremony: string;
  studio: string;
  feeCents: number;
  signedOn: string;
  usesLiveGuests: boolean;
  clauses: string[];
  people: PlannerPersonSeed[];
  vendors: PlannerVendorSeed[];
  payments: PlannerPaymentSeed[];
  script: PlannerScriptSeed[];
  checklist: PlannerCheckSeed[];
};

function plannerSeeds(db: DatabaseSync): PlannerSeed[] {
  const live = db.prepare(`SELECT * FROM wedding WHERE id = 1`).get() as Row | undefined;
  const helena: PlannerSeed = {
    slug: "helena-e-miguel",
    partnerA: live ? str(live, "partner_a") : "Helena Vasconcelos",
    partnerB: live ? str(live, "partner_b") : "Miguel Albuquerque",
    weddingDate: "2027-04-17",
    dateLabel: live ? str(live, "date_label") : "sábado, 17 de abril de 2027",
    venueName: live ? str(live, "venue_name") : "Haras Vale Verde",
    venueCity: live ? str(live, "venue_city") : "Tiradentes, Minas Gerais",
    venueAddress: live ? str(live, "venue_address") : "Estrada Real, km 4 — Tiradentes, MG",
    startTime: "16h30",
    ceremony: "Capela do haras, seguida de recepção no jardim e jantar na casa sede.",
    studio: "Estúdio Lume Cerimonial",
    feeCents: 1_800_000,
    signedOn: "12 de janeiro de 2027",
    usesLiveGuests: true,
    clauses: [
      "O serviço cobre o planejamento, o roteiro da cerimônia, a coordenação dos fornecedores contratados, o ensaio e a condução do dia.",
      "O casal informa a lista de convidados e as confirmações no Celebrarapp. O cerimonial usa essa lista no dia.",
      "Mudança de horário ou de local com menos de 30 dias pede um novo alinhamento por escrito.",
      "Buffet, fotografia, flores, música e som seguem os contratos de cada fornecedor. O estúdio coordena, e não substitui esses contratos.",
    ],
    people: [],
    vendors: [
      {
        role: "Buffet",
        name: "Cozinha do Vale",
        contactName: "Helena Duarte",
        phone: "(32) 99910-2201",
        email: "cozinha@valeverde.example",
        notes: "Jantar dos confirmados. Sem castanha na mesa da Patrícia.",
      },
      {
        role: "Fotografia",
        name: "Luz de Minas",
        contactName: "Otávio Lemos",
        phone: "(32) 99910-2202",
        email: "foto@luzdeminas.example",
        notes: "Ensaio no jardim antes da entrada da noiva.",
      },
      {
        role: "Flores",
        name: "Ateliê Camélia",
        contactName: "Nara Campos",
        phone: "(32) 99910-2203",
        email: "flores@camelia.example",
        notes: "Arranjos da capela e da mesa dos noivos.",
      },
      {
        role: "Música",
        name: "Quarteto Serra",
        contactName: "Ivo Martins",
        phone: "(32) 99910-2204",
        email: "quarteto@serra.example",
        notes: "Entrada, votos e saída. Repertório combinado no ensaio.",
      },
      {
        role: "Som",
        name: "Palco Real",
        contactName: "Rita Gomes",
        phone: "(32) 99910-2205",
        email: "som@palcoreal.example",
        notes: "Microfone sem fio para os votos e anúncio do jantar.",
      },
    ],
    payments: [
      {
        receiptNumber: "REC-HVM-001",
        paidOn: "20 de janeiro de 2027",
        amountCents: 900_000,
        method: "PIX",
        description: "Sinal de 50% do cerimonial",
      },
      {
        receiptNumber: "REC-HVM-002",
        paidOn: "10 de março de 2027",
        amountCents: 450_000,
        method: "transferência bancária",
        description: "Segunda parcela do cerimonial",
      },
    ],
    script: [
      {
        timeLabel: "15h40",
        title: "Chegada das famílias",
        body: "A cerimonial recebe as famílias na entrada da capela e conduz aos bancos combinados.",
      },
      {
        timeLabel: "16h00",
        title: "Entrada da noiva",
        body: "O quarteto começa a marcha. Helena entra com o pai. Miguel espera no altar.",
      },
      {
        timeLabel: "16h30",
        title: "Cerimônia",
        body: "Boas-vindas, leitura, votos e alianças. O microfone passa só para quem fala.",
      },
      {
        timeLabel: "17h10",
        title: "Assinatura",
        body: "O casal assina com as testemunhas. As famílias permanecem sentadas.",
      },
      {
        timeLabel: "17h30",
        title: "Saída",
        body: "Os noivos saem pela nave. A foto rápida acontece na porta da capela.",
      },
      {
        timeLabel: "18h00",
        title: "Recepção e cocktail",
        body: "O jardim abre. O buffet serve o cocktail enquanto as mesas são chamadas.",
      },
      {
        timeLabel: "19h30",
        title: "Jantar",
        body: "A casa sede recebe o jantar. A cerimonial anuncia a mesa dos noivos e, em seguida, as demais.",
      },
    ],
    checklist: [
      { label: "Contrato assinado com o Estúdio Lume", done: true },
      { label: "Sinal e segunda parcela recebidos", done: true },
      { label: "Quitar o saldo do cerimonial", done: false },
      { label: "Ensaio da cerimônia na capela", done: false },
      { label: "Confirmar o quarteto e o repertório", done: true },
      { label: "Fechar a lista de convidados confirmados", done: false },
      { label: "Enviar o cronograma aos fornecedores", done: false },
      { label: "Teste de som na capela", done: false },
    ],
  };

  const leticia: PlannerSeed = {
    slug: "leticia-e-bruno",
    partnerA: "Letícia Amaral",
    partnerB: "Bruno Pacheco",
    weddingDate: "2027-04-24",
    dateLabel: "sábado, 24 de abril de 2027",
    venueName: "Capela da Fazenda Santa Luz",
    venueCity: "São João del-Rei, Minas Gerais",
    venueAddress: "Estrada da Serra, km 12 — São João del-Rei, MG",
    startTime: "15h00",
    ceremony: "Capela da fazenda, com recepção no terreiro e jantar no galpão.",
    studio: "Estúdio Lume Cerimonial",
    feeCents: 1_250_000,
    signedOn: "3 de fevereiro de 2027",
    usesLiveGuests: false,
    clauses: [
      "O serviço cobre o roteiro da cerimônia, a recepção no terreiro e a coordenação dos fornecedores até o jantar.",
      "A lista deste casal fica só no cerimonial e não entra no RSVP de outro casamento.",
      "O valor está quitado. Qualquer extra, como hora adicional de som, vira um recibo novo.",
      "Em caso de chuva, a cerimônia permanece na capela e o cocktail muda para o galpão.",
    ],
    people: [
      {
        name: "Inês Amaral",
        relation: "mãe da noiva",
        conviteLabel: "Família Amaral",
        status: "confirmado",
        note: "Confirmou presença",
      },
      {
        name: "Paulo Amaral",
        relation: "pai da noiva",
        conviteLabel: "Família Amaral",
        status: "confirmado",
        note: "Confirmou presença",
      },
      {
        name: "Teresa Pacheco",
        relation: "mãe do noivo",
        conviteLabel: "Família Pacheco",
        status: "confirmado",
        note: "Confirmou presença",
      },
      {
        name: "Diego Pacheco",
        relation: "irmão do noivo",
        conviteLabel: "Família Pacheco",
        status: "parcial",
        note: "Confirmou só a cerimônia",
      },
      {
        name: "Marina Lopes",
        relation: "amiga da noiva",
        conviteLabel: "Marina Lopes",
        status: "pendente",
        note: "Ainda sem resposta",
      },
      {
        name: "Caio Ferreira",
        relation: "amigo do noivo",
        conviteLabel: "Caio Ferreira",
        status: "ausente",
        note: "Não vai",
      },
    ],
    vendors: [
      {
        role: "Buffet",
        name: "Casa da Serra",
        contactName: "Lívia Prado",
        phone: "(32) 99920-4101",
        email: "buffet@casadaserra.example",
        notes: "Jantar no galpão, com mesa sem lactose para a Teresa.",
      },
      {
        role: "Fotografia",
        name: "Estúdio Lago",
        contactName: "Caetano Dias",
        phone: "(32) 99920-4102",
        email: "ola@estudiolago.example",
        notes: "Chega às 14h para os retratos na porteira.",
      },
      {
        role: "Flores",
        name: "Banco de Flores",
        contactName: "Elisa Muniz",
        phone: "(32) 99920-4103",
        email: "flores@bancodeflores.example",
        notes: "Altar baixo e caminho de pétalas na capela.",
      },
      {
        role: "Música",
        name: "Duo Santa Luz",
        contactName: "Bento Alves",
        phone: "(32) 99920-4104",
        email: "duo@santaluz.example",
        notes: "Violino e violão na entrada e na saída.",
      },
      {
        role: "Som",
        name: "Oficina do Som",
        contactName: "Vera Luz",
        phone: "(32) 99920-4105",
        email: "som@oficinadosom.example",
        notes: "Caixa pequena na capela e retorno no galpão.",
      },
    ],
    payments: [
      {
        receiptNumber: "REC-LAP-001",
        paidOn: "2 de fevereiro de 2027",
        amountCents: 625_000,
        method: "PIX",
        description: "Sinal de 50% do cerimonial",
      },
      {
        receiptNumber: "REC-LAP-002",
        paidOn: "3 de abril de 2027",
        amountCents: 625_000,
        method: "transferência bancária",
        description: "Quitação do cerimonial",
      },
    ],
    script: [
      {
        timeLabel: "14h20",
        title: "Recepção na porteira",
        body: "A cerimonial confere os nomes e indica o banco de cada família.",
      },
      {
        timeLabel: "14h40",
        title: "Entrada da noiva",
        body: "O duo começa. Letícia entra com os pais. Bruno espera no altar.",
      },
      {
        timeLabel: "15h00",
        title: "Cerimônia",
        body: "Acolhida, votos escritos à mão e troca de alianças.",
      },
      {
        timeLabel: "15h40",
        title: "Assinatura e saída",
        body: "O casal assina e sai para a foto na porteira.",
      },
      {
        timeLabel: "17h00",
        title: "Recepção",
        body: "O terreiro abre para o brinde. Se chover, o galpão recebe o cocktail.",
      },
      {
        timeLabel: "19h00",
        title: "Jantar",
        body: "O galpão serve o jantar. A mesa dos noivos é anunciada primeiro.",
      },
    ],
    checklist: [
      { label: "Contrato assinado com o Estúdio Lume", done: true },
      { label: "Cerimonial quitado", done: true },
      { label: "Plano de chuva combinado com o galpão", done: true },
      { label: "Ensaio na capela", done: false },
      { label: "Confirmar o duo e a ordem das músicas", done: true },
      { label: "Cobrar a resposta da Marina Lopes", done: false },
      { label: "Enviar o roteiro aos fornecedores", done: false },
      { label: "Provar o som da capela", done: false },
    ],
  };

  return [helena, leticia];
}

function insertPlannerWedding(db: DatabaseSync, seed: PlannerSeed) {
  const found = db.prepare(`SELECT id FROM planner_weddings WHERE slug = ?`).get(seed.slug) as Row | undefined;
  if (found) return;
  const weddingId = insertId(
    db,
    `INSERT INTO planner_weddings (
      slug, partner_a, partner_b, wedding_date, date_label, venue_name, venue_city, venue_address,
      start_time, ceremony, studio, fee_cents, signed_on, uses_live_guests
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    seed.slug,
    seed.partnerA,
    seed.partnerB,
    seed.weddingDate,
    seed.dateLabel,
    seed.venueName,
    seed.venueCity,
    seed.venueAddress,
    seed.startTime,
    seed.ceremony,
    seed.studio,
    seed.feeCents,
    seed.signedOn,
    seed.usesLiveGuests ? 1 : 0,
  );
  seed.clauses.forEach((body, index) => {
    db.prepare(`INSERT INTO planner_clauses (wedding_id, body, sort_order) VALUES (?, ?, ?)`).run(
      weddingId,
      body,
      index + 1,
    );
  });
  seed.people.forEach((person, index) => {
    db.prepare(
      `INSERT INTO planner_people (wedding_id, name, relation, convite_label, status, note, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(weddingId, person.name, person.relation, person.conviteLabel, person.status, person.note, index + 1);
  });
  seed.vendors.forEach((vendor, index) => {
    db.prepare(
      `INSERT INTO planner_vendors (wedding_id, role, name, contact_name, phone, email, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      weddingId,
      vendor.role,
      vendor.name,
      vendor.contactName,
      vendor.phone,
      vendor.email,
      vendor.notes,
      index + 1,
    );
  });
  seed.payments.forEach((payment, index) => {
    db.prepare(
      `INSERT INTO planner_payments (wedding_id, receipt_number, paid_on, amount_cents, method, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      weddingId,
      payment.receiptNumber,
      payment.paidOn,
      payment.amountCents,
      payment.method,
      payment.description,
      index + 1,
    );
  });
  seed.script.forEach((line, index) => {
    db.prepare(
      `INSERT INTO planner_script (wedding_id, time_label, title, body, sort_order) VALUES (?, ?, ?, ?, ?)`,
    ).run(weddingId, line.timeLabel, line.title, line.body, index + 1);
  });
  seed.checklist.forEach((item, index) => {
    db.prepare(`INSERT INTO planner_checklist (wedding_id, label, done, sort_order) VALUES (?, ?, ?, ?)`).run(
      weddingId,
      item.label,
      item.done ? 1 : 0,
      index + 1,
    );
  });
}

function ensurePlanner(db: DatabaseSync) {
  for (const seed of plannerSeeds(db)) {
    const found = db.prepare(`SELECT id FROM planner_weddings WHERE slug = ?`).get(seed.slug);
    if (found) continue;
    db.exec("BEGIN");
    try {
      insertPlannerWedding(db, seed);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  ensureCurrentMonthCalendar(db);
}

function insertCalendarItem(
  db: DatabaseSync,
  item: {
    key: string;
    date: string;
    kind: "evento" | "nota";
    title: string;
    body: string;
    timeLabel: string | null;
    weddingSlug: string | null;
  },
) {
  const found = db.prepare(`SELECT id FROM planner_calendar WHERE item_key = ?`).get(item.key);
  if (found) return;
  db.prepare(
    `INSERT INTO planner_calendar (item_key, item_date, kind, title, body, time_label, wedding_slug)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(item.key, item.date, item.kind, item.title, item.body, item.timeLabel, item.weddingSlug);
}

function ensureCurrentMonthCalendar(db: DatabaseSync) {
  const today = saoPauloToday();
  const prefix = isoDate(today.year, today.month, 1).slice(0, 7);
  const existing = num(
    (db.prepare(`SELECT COUNT(*) AS n FROM planner_calendar WHERE item_date LIKE ?`).get(`${prefix}-%`) as Row) ?? {},
    "n",
  );
  if (existing > 0) return;
  const saturday = firstSaturday(today.year, today.month);
  const visit = isoDate(today.year, today.month, saturday);
  const noteDay = Math.min(18, new Date(Date.UTC(today.year, today.month, 0)).getUTCDate());
  const note = isoDate(today.year, today.month, noteDay === saturday ? Math.min(noteDay + 3, 28) : noteDay);
  insertCalendarItem(db, {
    key: `visita-haras-${prefix}`,
    date: visit,
    kind: "evento",
    title: "Visita ao Haras Vale Verde",
    body: "Percorrer a capela, o jardim e a casa sede com Helena e Miguel. Confirmar o acesso e o ponto de som.",
    timeLabel: "10h00",
    weddingSlug: "helena-e-miguel",
  });
  insertCalendarItem(db, {
    key: `nota-respostas-${prefix}`,
    date: note,
    kind: "nota",
    title: "Respostas pendentes",
    body: "Cobrar quem ainda não confirmou na lista de Helena e Miguel antes de fechar o mapa de mesas.",
    timeLabel: null,
    weddingSlug: "helena-e-miguel",
  });
}

function plannerStatus(yesCount: number, noCount: number): PlannerGuestStatus {
  if (yesCount > 0 && noCount > 0) return "parcial";
  if (yesCount > 0) return "confirmado";
  if (noCount > 0) return "ausente";
  return "pendente";
}

function plannerNote(status: PlannerGuestStatus): string {
  if (status === "confirmado") return "Confirmou presença";
  if (status === "parcial") return "Confirmou parte dos momentos";
  if (status === "ausente") return "Não vai";
  return "Ainda sem resposta";
}

function livePlannerGuests(db: DatabaseSync): PlannerGuest[] {
  const rows = db
    .prepare(
      `SELECT g.id, g.name, g.relation, c.label AS convite_label,
        (SELECT COUNT(*) FROM moment_rsvps r WHERE r.guest_id = g.id AND r.attending = 1) AS yes_count,
        (SELECT COUNT(*) FROM moment_rsvps r WHERE r.guest_id = g.id AND r.attending = 0) AS no_count
       FROM guests g
       JOIN convites c ON c.id = g.convite_id
       ORDER BY c.id, g.sort_order, g.id`,
    )
    .all() as Row[];
  return rows.map((row) => {
    const status = plannerStatus(num(row, "yes_count"), num(row, "no_count"));
    return {
      id: num(row, "id"),
      name: str(row, "name"),
      relation: str(row, "relation"),
      conviteLabel: str(row, "convite_label"),
      status,
      note: plannerNote(status),
    };
  });
}

function mapSummary(row: Row): PlannerWeddingSummary {
  return {
    slug: str(row, "slug"),
    partnerA: str(row, "partner_a"),
    partnerB: str(row, "partner_b"),
    weddingDate: str(row, "wedding_date"),
    dateLabel: str(row, "date_label"),
    venueName: str(row, "venue_name"),
    startTime: str(row, "start_time"),
  };
}

export function listPlannerWeddings(): PlannerWeddingSummary[] {
  const db = getDb();
  return (db.prepare(`SELECT * FROM planner_weddings ORDER BY wedding_date, partner_a`).all() as Row[]).map(mapSummary);
}

function noteKindOf(value: string): PlannerNoteKind | null {
  if (value === "anotacao" || value === "fotos" || value === "visita") return value;
  return null;
}

function photoList(value: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapCalendarItem(row: Row): PlannerCalendarItem {
  return {
    id: num(row, "id"),
    date: str(row, "item_date"),
    kind: str(row, "kind") === "nota" ? "nota" : str(row, "kind") === "reuniao" ? "reuniao" : "evento",
    noteKind: noteKindOf(str(row, "note_kind")),
    title: str(row, "title"),
    body: str(row, "body"),
    timeLabel: strOrNull(row, "time_label"),
    weddingSlug: strOrNull(row, "wedding_slug"),
    photos: photoList(str(row, "photos")),
  };
}

export function listPlannerCalendar(): PlannerCalendarItem[] {
  const db = getDb();
  return (db.prepare(`SELECT * FROM planner_calendar ORDER BY item_date, kind, id`).all() as Row[]).map(mapCalendarItem);
}

export function getPlannerCalendarItem(id: number): PlannerCalendarItem | null {
  const row = getDb().prepare(`SELECT * FROM planner_calendar WHERE id = ?`).get(id) as Row | undefined;
  return row ? mapCalendarItem(row) : null;
}

export function createPlannerNote(input: {
  date: string;
  noteKind: PlannerNoteKind;
  body: string;
  timeLabel: string | null;
  photos: string[];
}): MutationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Escolha a data da nota." };
  const body = input.body.trim();
  if (input.noteKind === "fotos" && input.photos.length === 0) return { ok: false, error: "Envie ao menos uma foto." };
  if (input.noteKind !== "fotos" && !body) return { ok: false, error: "Escreva a nota." };
  const title =
    input.noteKind === "visita" ? "Visita técnica" : input.noteKind === "fotos" ? "Fotos" : body.slice(0, 80);
  const db = getDb();
  const key = `nota-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO planner_calendar (item_key, item_date, kind, title, body, time_label, wedding_slug, note_kind, photos)
     VALUES (?, ?, 'nota', ?, ?, ?, NULL, ?, ?)`,
  ).run(key, input.date, title, body, input.timeLabel, input.noteKind, JSON.stringify(input.photos));
  return { ok: true };
}

export function createPlannerMeeting(input: { date: string; title: string; body: string; timeLabel: string | null }): MutationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Escolha a data da reunião." };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Dê um assunto à reunião." };
  const db = getDb();
  const key = `reuniao-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO planner_calendar (item_key, item_date, kind, title, body, time_label, wedding_slug, note_kind, photos)
     VALUES (?, ?, 'reuniao', ?, ?, ?, NULL, NULL, '[]')`,
  ).run(key, input.date, title.slice(0, 80), input.body.trim(), input.timeLabel);
  return { ok: true };
}

export function createPlannerVisit(input: {
  date: string;
  mode: "ensaio" | "visita";
  body: string;
  timeLabel: string | null;
}): MutationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Escolha a data." };
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Escreva o que será feito." };
  const title = input.mode === "ensaio" ? "Ensaio" : "Visita técnica";
  const db = getDb();
  const key = `visita-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO planner_calendar (item_key, item_date, kind, title, body, time_label, wedding_slug, note_kind, photos)
     VALUES (?, ?, 'nota', ?, ?, ?, NULL, 'visita', '[]')`,
  ).run(key, input.date, title, body, input.timeLabel);
  return { ok: true };
}

export function updatePlannerCalendarItem(input: {
  id: number;
  date: string;
  title: string;
  body: string;
  timeLabel: string | null;
  photos: string[];
  mode: "ensaio" | "visita" | "";
}): MutationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Escolha a data." };
  const db = getDb();
  const current = getPlannerCalendarItem(input.id);
  if (!current) return { ok: false, error: "Item não encontrado." };
  const body = input.body.trim();
  let title = input.title.trim();
  if (current.kind === "reuniao") {
    if (!title) return { ok: false, error: "Dê um assunto à reunião." };
  } else if (current.noteKind === "fotos") {
    if (input.photos.length === 0) return { ok: false, error: "Envie ao menos uma foto." };
    title = "Fotos";
  } else if (current.noteKind === "visita") {
    if (!body) return { ok: false, error: "Escreva o que será feito." };
    title = input.mode === "ensaio" ? "Ensaio" : "Visita técnica";
  } else if (current.kind === "evento") {
    if (!title) return { ok: false, error: "Dê um nome ao item." };
  } else {
    if (!body) return { ok: false, error: "Escreva a nota." };
    title = body.slice(0, 80);
  }
  const photos = current.noteKind === "fotos" ? input.photos : current.photos;
  db.prepare(
    `UPDATE planner_calendar SET item_date = ?, title = ?, body = ?, time_label = ?, photos = ? WHERE id = ?`,
  ).run(input.date, title.slice(0, 80), body, input.timeLabel, JSON.stringify(photos), input.id);
  return { ok: true };
}

export function deletePlannerCalendarItem(id: number): MutationResult {
  const result = getDb().prepare(`DELETE FROM planner_calendar WHERE id = ?`).run(id);
  if (Number(result.changes) === 0) return { ok: false, error: "Item não encontrado." };
  return { ok: true };
}

function ceremonySummary(row: Row, startTime = ""): CeremonyEventSummary {
  const typeKey = str(row, "type_key");
  return {
    id: num(row, "id"),
    typeKey,
    typeLabel: eventTypeByKey(typeKey)?.label ?? typeKey,
    title: str(row, "title"),
    date: str(row, "event_date"),
    startTime,
  };
}

export function listCeremonyEvents(): CeremonyEventSummary[] {
  const db = getDb();
  return (
    db
      .prepare(
        `SELECT e.*, (
           SELECT time_label FROM ceremony_moments
           WHERE event_id = e.id
           ORDER BY sort_order, id
           LIMIT 1
         ) AS start_time
         FROM ceremony_events e
         ORDER BY e.event_date, e.id`,
      )
      .all() as Row[]
  ).map((row) => ceremonySummary(row, str(row, "start_time")));
}

function ensureEventTeam(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS event_team (
    owner_kind TEXT NOT NULL,
    owner_key TEXT NOT NULL,
    person_id INTEGER NOT NULL,
    PRIMARY KEY (owner_kind, owner_key, person_id)
  )`);
}

export function listEventTeam(ownerKind: EventSupplierOwner, ownerKey: string): EventTeamMember[] {
  const db = getDb();
  ensureEventTeam(db);
  return (
    db
      .prepare(
        `SELECT p.id, p.name, p.role, p.whatsapp
         FROM event_team t
         JOIN team_people p ON p.id = t.person_id
         WHERE t.owner_kind = ? AND t.owner_key = ?
         ORDER BY p.name COLLATE NOCASE, p.id`,
      )
      .all(ownerKind, ownerKey) as Row[]
  ).map((row) => ({
    id: num(row, "id"),
    name: str(row, "name"),
    role: str(row, "role"),
    whatsapp: str(row, "whatsapp"),
  }));
}

function teamSummary(members: EventTeamMember[]) {
  return members
    .map((member) => [member.name, member.role, member.whatsapp].map((part) => part.trim()).filter(Boolean).join(" · "))
    .join("\n");
}

function replaceEventTeam(db: DatabaseSync, ownerKind: EventSupplierOwner, ownerKey: string, personIds: number[]): MutationResult {
  ensureEventTeam(db);
  const unique = [...new Set(personIds.filter((id) => Number.isInteger(id) && id > 0))];
  for (const id of unique) {
    if (!db.prepare(`SELECT id FROM team_people WHERE id = ?`).get(id)) {
      return { ok: false, error: "Essa pessoa não está na equipe." };
    }
  }
  db.prepare(`DELETE FROM event_team WHERE owner_kind = ? AND owner_key = ?`).run(ownerKind, ownerKey);
  const insert = db.prepare(`INSERT INTO event_team (owner_kind, owner_key, person_id) VALUES (?, ?, ?)`);
  for (const id of unique) insert.run(ownerKind, ownerKey, id);
  return { ok: true };
}

export function getCeremonyEvent(id: number): CeremonyEvent | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM ceremony_events WHERE id = ?`).get(id) as Row | undefined;
  if (!row) return null;
  const tasks = (db.prepare(`SELECT * FROM ceremony_tasks WHERE event_id = ? ORDER BY sort_order, id`).all(id) as Row[]).map(
    (task) => ({
      label: str(task, "label"),
      done: flag(task, "done"),
    }),
  );
  const moments = (db.prepare(`SELECT * FROM ceremony_moments WHERE event_id = ? ORDER BY sort_order, id`).all(id) as Row[]).map(
    (moment) => ({
      timeLabel: str(moment, "time_label"),
      title: str(moment, "title"),
      body: str(moment, "body"),
    }),
  );
  return {
    ...ceremonySummary(row, moments[0]?.timeLabel ?? ""),
    place: str(row, "place"),
    team: str(row, "team"),
    teamMembers: listEventTeam("ceremony", String(id)),
    tasks,
    moments,
  };
}

export function createCeremonyEvent(typeKey: string, title?: string): { ok: true; id: number } | { ok: false; error: string } {
  const template = eventTypeByKey(typeKey);
  if (!template) return { ok: false, error: "Escolha um tipo de evento." };
  const db = getDb();
  const today = saoPauloToday();
  const date = isoDate(today.year, today.month, today.day);
  const sameType = num(
    (db.prepare(`SELECT COUNT(*) AS n FROM ceremony_events WHERE type_key = ?`).get(typeKey) as Row) ?? {},
    "n",
  );
  const cleanTitle = title?.trim() || (sameType === 0 ? template.label : `${template.label} ${sameType + 1}`);
  if (!cleanTitle) return { ok: false, error: "Dê um nome ao evento." };
  db.exec("BEGIN");
  try {
    const id = insertId(
      db,
      `INSERT INTO ceremony_events (type_key, title, event_date, place, created_at) VALUES (?, ?, ?, '', ?)`,
      typeKey,
      cleanTitle,
      date,
      new Date().toISOString(),
    );
    const clientId = findOrCreateClient(db, cleanTitle, "");
    db.prepare(`UPDATE ceremony_events SET client_id = ? WHERE id = ?`).run(clientId, id);
    template.taskList.forEach((label, index) => {
      db.prepare(`INSERT INTO ceremony_tasks (event_id, label, done, sort_order) VALUES (?, ?, 0, ?)`).run(id, label, index + 1);
    });
    template.momentList.forEach((moment, index) => {
      db.prepare(
        `INSERT INTO ceremony_moments (event_id, time_label, title, body, sort_order) VALUES (?, ?, ?, ?, ?)`,
      ).run(id, moment.timeLabel, moment.title, moment.body, index + 1);
    });
    db.exec("COMMIT");
    return { ok: true, id };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function saveCeremonyEvent(input: CeremonyEventInput): MutationResult {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Dê um nome ao evento." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Informe a data do evento." };
  const tasks = input.tasks
    .map((task) => ({ label: task.label.trim(), done: task.done }))
    .filter((task) => task.label);
  const moments = input.moments
    .map((moment) => ({
      timeLabel: moment.timeLabel.trim(),
      title: moment.title.trim(),
      body: moment.body.trim(),
    }))
    .filter((moment) => moment.title || moment.body || moment.timeLabel);
  const db = getDb();
  const found = db.prepare(`SELECT id FROM ceremony_events WHERE id = ?`).get(input.id);
  if (!found) return { ok: false, error: "Evento não encontrado." };
  let teamText = input.team.trim();
  if (input.teamMemberIds) {
    const linked = replaceEventTeam(db, "ceremony", String(input.id), input.teamMemberIds);
    if (!linked.ok) return linked;
    teamText = teamSummary(listEventTeam("ceremony", String(input.id)));
  }
  db.exec("BEGIN");
  try {
    db.prepare(`UPDATE ceremony_events SET title = ?, event_date = ?, place = ?, team = ? WHERE id = ?`).run(
      title,
      input.date,
      input.place.trim(),
      teamText,
      input.id,
    );
    db.prepare(`DELETE FROM ceremony_tasks WHERE event_id = ?`).run(input.id);
    db.prepare(`DELETE FROM ceremony_moments WHERE event_id = ?`).run(input.id);
    tasks.forEach((task, index) => {
      db.prepare(`INSERT INTO ceremony_tasks (event_id, label, done, sort_order) VALUES (?, ?, ?, ?)`).run(
        input.id,
        task.label,
        task.done ? 1 : 0,
        index + 1,
      );
    });
    moments.forEach((moment, index) => {
      db.prepare(
        `INSERT INTO ceremony_moments (event_id, time_label, title, body, sort_order) VALUES (?, ?, ?, ?, ?)`,
      ).run(input.id, moment.timeLabel || "Horário a definir", moment.title || "Momento", moment.body, index + 1);
    });
    db.exec("COMMIT");
    return { ok: true };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function deleteCeremonyEvent(id: number): MutationResult {
  const db = getDb();
  const found = db.prepare(`SELECT id FROM ceremony_events WHERE id = ?`).get(id);
  if (!found) return { ok: false, error: "Evento não encontrado." };
  db.exec("BEGIN");
  try {
    ensureEventTeam(db);
    db.prepare(`DELETE FROM event_team WHERE owner_kind = 'ceremony' AND owner_key = ?`).run(String(id));
    db.prepare(`DELETE FROM event_suppliers WHERE owner_kind = 'ceremony' AND owner_key = ?`).run(String(id));
    db.prepare(`DELETE FROM ceremony_events WHERE id = ?`).run(id);
    db.exec("COMMIT");
    return { ok: true };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function deletePlannerEvent(slug: string): MutationResult {
  const db = getDb();
  const found = db.prepare(`SELECT id FROM planner_weddings WHERE slug = ?`).get(slug);
  if (!found) return { ok: false, error: "Evento não encontrado." };
  db.exec("BEGIN");
  try {
    ensureEventTeam(db);
    db.prepare(`DELETE FROM event_team WHERE owner_kind = 'wedding' AND owner_key = ?`).run(slug);
    db.prepare(`DELETE FROM event_suppliers WHERE owner_kind = 'wedding' AND owner_key = ?`).run(slug);
    db.prepare(`DELETE FROM planner_calendar WHERE wedding_slug = ?`).run(slug);
    db.prepare(`DELETE FROM planner_weddings WHERE slug = ?`).run(slug);
    db.exec("COMMIT");
    return { ok: true };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function seedEventSupplier(db: DatabaseSync, ownerKind: EventSupplierOwner, ownerKey: string) {
  const count = num(
    (db.prepare(`SELECT COUNT(*) AS n FROM event_suppliers WHERE owner_kind = ? AND owner_key = ?`).get(ownerKind, ownerKey) as Row) ?? {},
    "n",
  );
  if (count > 0) return;
  db.prepare(`INSERT INTO event_suppliers (owner_kind, owner_key, name, role, sort_order) VALUES (?, ?, ?, ?, 1)`).run(
    ownerKind,
    ownerKey,
    "Ateliê Camélia",
    "Flores",
  );
}

export function listEventSuppliers(ownerKind: EventSupplierOwner, ownerKey: string): EventSupplier[] {
  const db = getDb();
  seedEventSupplier(db, ownerKind, ownerKey);
  return (db.prepare(`SELECT id, name, role FROM event_suppliers WHERE owner_kind = ? AND owner_key = ? ORDER BY sort_order, id`).all(ownerKind, ownerKey) as Row[]).map(
    (row) => ({
      id: num(row, "id"),
      name: str(row, "name"),
      role: str(row, "role"),
    }),
  );
}

export function addEventSupplier(
  ownerKind: EventSupplierOwner,
  ownerKey: string,
  name: string,
  role: string,
): MutationResult & { suppliers?: EventSupplier[] } {
  const cleanName = name.trim();
  const cleanRole = role.trim();
  if (!cleanName) return { ok: false, error: "Diga o nome do fornecedor." };
  if (!cleanRole) return { ok: false, error: "Diga a função do fornecedor." };
  const db = getDb();
  if (ownerKind === "ceremony") {
    const id = Number(ownerKey);
    if (!Number.isInteger(id) || !db.prepare(`SELECT id FROM ceremony_events WHERE id = ?`).get(id)) {
      return { ok: false, error: "Evento não encontrado." };
    }
  } else if (!db.prepare(`SELECT id FROM planner_weddings WHERE slug = ?`).get(ownerKey)) {
    return { ok: false, error: "Evento não encontrado." };
  }
  const next =
    num(
      (db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS n FROM event_suppliers WHERE owner_kind = ? AND owner_key = ?`).get(ownerKind, ownerKey) as Row) ?? {},
      "n",
    ) + 1;
  db.prepare(`INSERT INTO event_suppliers (owner_kind, owner_key, name, role, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
    ownerKind,
    ownerKey,
    cleanName,
    cleanRole,
    next,
  );
  return { ok: true, suppliers: listEventSuppliers(ownerKind, ownerKey) };
}

const WEEKDAY_NAMES = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function portugueseDateLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const monthName = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][month - 1];
  return `${WEEKDAY_NAMES[date.getUTCDay()]}, ${day} de ${monthName} de ${year}`;
}

export function savePlannerTeam(slug: string, team: string): MutationResult {
  const db = getDb();
  const found = db.prepare(`SELECT id FROM planner_weddings WHERE slug = ?`).get(slug);
  if (!found) return { ok: false, error: "Evento não encontrado." };
  db.prepare(`UPDATE planner_weddings SET team = ? WHERE slug = ?`).run(team.trim(), slug);
  return { ok: true };
}

export function savePlannerDetails(input: {
  slug: string;
  date: string;
  startTime: string;
  ceremony: string;
  team: string;
  teamMemberIds: number[];
}): MutationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Informe a data do evento." };
  const startTime = input.startTime.trim();
  if (!startTime) return { ok: false, error: "Informe o horário." };
  const ceremony = input.ceremony.trim();
  if (!ceremony) return { ok: false, error: "Escreva o texto do evento." };
  const db = getDb();
  const found = db.prepare(`SELECT id FROM planner_weddings WHERE slug = ?`).get(input.slug);
  if (!found) return { ok: false, error: "Evento não encontrado." };
  const linked = replaceEventTeam(db, "wedding", input.slug, input.teamMemberIds);
  if (!linked.ok) return linked;
  db.prepare(
    `UPDATE planner_weddings SET wedding_date = ?, date_label = ?, start_time = ?, ceremony = ?, team = ? WHERE slug = ?`,
  ).run(input.date, portugueseDateLabel(input.date), startTime, ceremony, teamSummary(listEventTeam("wedding", input.slug)), input.slug);
  return { ok: true };
}

export function getPlannerCouple(slug: string): PlannerCouple | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM planner_weddings WHERE slug = ?`).get(slug) as Row | undefined;
  if (!row) return null;
  const weddingId = num(row, "id");
  const guests = flag(row, "uses_live_guests")
    ? livePlannerGuests(db)
    : (db.prepare(`SELECT * FROM planner_people WHERE wedding_id = ? ORDER BY sort_order, id`).all(weddingId) as Row[]).map(
        (person) => ({
          id: num(person, "id"),
          name: str(person, "name"),
          relation: str(person, "relation"),
          conviteLabel: str(person, "convite_label"),
          status: str(person, "status") as PlannerGuestStatus,
          note: str(person, "note"),
        }),
      );
  const vendors = (db.prepare(`SELECT * FROM planner_vendors WHERE wedding_id = ? ORDER BY sort_order, id`).all(weddingId) as Row[]).map(
    (vendor): PlannerVendor => ({
      id: num(vendor, "id"),
      role: str(vendor, "role"),
      name: str(vendor, "name"),
      contactName: str(vendor, "contact_name"),
      phone: str(vendor, "phone"),
      email: str(vendor, "email"),
      notes: str(vendor, "notes"),
    }),
  );
  const payments = (db.prepare(`SELECT * FROM planner_payments WHERE wedding_id = ? ORDER BY sort_order, id`).all(weddingId) as Row[]).map(
    (payment): PlannerPayment => ({
      id: num(payment, "id"),
      receiptNumber: str(payment, "receipt_number"),
      paidOn: str(payment, "paid_on"),
      amountCents: num(payment, "amount_cents"),
      method: str(payment, "method"),
      description: str(payment, "description"),
    }),
  );
  const script = (db.prepare(`SELECT * FROM planner_script WHERE wedding_id = ? ORDER BY sort_order, id`).all(weddingId) as Row[]).map(
    (line): PlannerScriptLine => ({
      id: num(line, "id"),
      timeLabel: str(line, "time_label"),
      title: str(line, "title"),
      body: str(line, "body"),
    }),
  );
  const checklist = (db.prepare(`SELECT * FROM planner_checklist WHERE wedding_id = ? ORDER BY sort_order, id`).all(weddingId) as Row[]).map(
    (item): PlannerCheckItem => ({
      id: num(item, "id"),
      label: str(item, "label"),
      done: flag(item, "done"),
    }),
  );
  const clauses = (db.prepare(`SELECT body FROM planner_clauses WHERE wedding_id = ? ORDER BY sort_order, id`).all(weddingId) as Row[]).map(
    (clause) => str(clause, "body"),
  );
  const confirmedCount = guests.filter((guest) => guest.status === "confirmado" || guest.status === "parcial").length;
  const pendingCount = guests.filter((guest) => guest.status === "pendente").length;
  return {
    ...mapSummary(row),
    venueCity: str(row, "venue_city"),
    venueAddress: str(row, "venue_address"),
    ceremony: str(row, "ceremony"),
    team: str(row, "team"),
    teamMembers: listEventTeam("wedding", slug),
    guestCount: guests.length,
    confirmedCount,
    pendingCount,
    contract: {
      studio: str(row, "studio"),
      feeCents: num(row, "fee_cents"),
      signedOn: str(row, "signed_on"),
      clauses,
    },
    guests,
    vendors,
    payments,
    script,
    checklist,
  };
}

function clientNameKey(name: string) {
  return name.trim().toLocaleLowerCase("pt-BR");
}

function findOrCreateClient(db: DatabaseSync, name: string, address: string): number {
  const clean = name.trim();
  const key = clientNameKey(clean);
  const existing = (db.prepare(`SELECT id, name FROM clients`).all() as Row[]).find(
    (row) => clientNameKey(str(row, "name")) === key,
  );
  if (existing) return num(existing, "id");
  return insertId(
    db,
    `INSERT INTO clients (name, phone, cpf, address, created_at) VALUES (?, '', '', ?, ?)`,
    clean,
    address.trim(),
    new Date().toISOString(),
  );
}

function ensureClients(db: DatabaseSync) {
  const weddings = db.prepare(`SELECT id, partner_a, partner_b, venue_address, client_id FROM planner_weddings`).all() as Row[];
  for (const row of weddings) {
    if (num(row, "client_id")) continue;
    const id = findOrCreateClient(db, `${str(row, "partner_a")} e ${str(row, "partner_b")}`, str(row, "venue_address"));
    db.prepare(`UPDATE planner_weddings SET client_id = ? WHERE id = ?`).run(id, num(row, "id"));
  }
  const events = db.prepare(`SELECT id, title, client_id FROM ceremony_events`).all() as Row[];
  for (const row of events) {
    if (num(row, "client_id")) continue;
    const id = findOrCreateClient(db, str(row, "title"), "");
    db.prepare(`UPDATE ceremony_events SET client_id = ? WHERE id = ?`).run(id, num(row, "id"));
  }
}

function clientEvents(db: DatabaseSync, clientId: number): ClientDetails["events"] {
  const weddings = (
    db.prepare(`SELECT slug, partner_a, partner_b, wedding_date FROM planner_weddings WHERE client_id = ?`).all(clientId) as Row[]
  ).map((row) => ({
    kind: "wedding" as const,
    href: `/cerimonial/${str(row, "slug")}`,
    title: `${str(row, "partner_a")} e ${str(row, "partner_b")}`,
    date: str(row, "wedding_date"),
    typeLabel: "Casamento",
  }));
  const ceremonies = (db.prepare(`SELECT id, type_key, title, event_date FROM ceremony_events WHERE client_id = ?`).all(clientId) as Row[]).map(
    (row) => ({
      kind: "ceremony" as const,
      href: `/cerimonial/evento/${num(row, "id")}`,
      title: str(row, "title"),
      date: str(row, "event_date"),
      typeLabel: eventTypeByKey(str(row, "type_key"))?.label ?? str(row, "type_key"),
    }),
  );
  return [...weddings, ...ceremonies].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "pt-BR"));
}

export function listClients(): ClientSummary[] {
  const db = getDb();
  return (
    db
      .prepare(
        `SELECT c.id, c.name, c.phone,
           (SELECT COUNT(*) FROM ceremony_events e WHERE e.client_id = c.id) +
           (SELECT COUNT(*) FROM planner_weddings w WHERE w.client_id = c.id) AS event_count
         FROM clients c
         ORDER BY c.name COLLATE NOCASE, c.id`,
      )
      .all() as Row[]
  ).map((row) => ({
    id: num(row, "id"),
    name: str(row, "name"),
    phone: str(row, "phone"),
    eventCount: num(row, "event_count"),
  }));
}

export function getClient(id: number): ClientDetails | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM clients WHERE id = ?`).get(id) as Row | undefined;
  if (!row) return null;
  return {
    id: num(row, "id"),
    name: str(row, "name"),
    phone: str(row, "phone"),
    cpf: str(row, "cpf"),
    address: str(row, "address"),
    events: clientEvents(db, id),
  };
}

export function updateClient(input: {
  id: number;
  name: string;
  phone: string;
  cpf: string;
  address: string;
}): MutationResult {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Diga o nome do cliente." };
  const cpf = input.cpf.replace(/\D/g, "");
  if (input.cpf.trim() && cpf.length !== 11) return { ok: false, error: "O CPF precisa ter 11 dígitos." };
  const db = getDb();
  const found = db.prepare(`SELECT id FROM clients WHERE id = ?`).get(input.id);
  if (!found) return { ok: false, error: "Cliente não encontrado." };
  db.prepare(`UPDATE clients SET name = ?, phone = ?, cpf = ?, address = ? WHERE id = ?`).run(
    name,
    input.phone.trim(),
    cpf,
    input.address.trim(),
    input.id,
  );
  return { ok: true };
}

function mapSupplier(row: Row): SupplierRecord {
  return {
    id: num(row, "id"),
    name: str(row, "name"),
    category: str(row, "category"),
    contactName: str(row, "contact_name"),
    phone: str(row, "phone"),
    email: str(row, "email"),
    instagram: str(row, "instagram"),
    notes: str(row, "notes"),
  };
}

export function listSuppliers(): SupplierRecord[] {
  const db = getDb();
  return (db.prepare(`SELECT * FROM suppliers ORDER BY name COLLATE NOCASE, id`).all() as Row[]).map(mapSupplier);
}

export function createSuppliers(rows: SupplierDraft[]): MutationResult & { suppliers?: SupplierRecord[] } {
  const clean = rows
    .map((row) => ({
      name: row.name.trim(),
      category: row.category.trim(),
      contactName: (row.contactName ?? "").trim(),
      phone: row.phone.trim(),
      email: (row.email ?? "").trim(),
      instagram: (row.instagram ?? "").trim().replace(/^@+/, ""),
      notes: (row.notes ?? "").trim(),
    }))
    .filter((row) => row.name)
    .slice(0, 40);
  if (!clean.length) return { ok: false, error: "Inclua ao menos um fornecedor com nome." };
  const db = getDb();
  const now = new Date().toISOString();
  db.exec("BEGIN");
  try {
    for (const row of clean) {
      db.prepare(
        `INSERT INTO suppliers (name, category, contact_name, phone, email, instagram, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(row.name, row.category, row.contactName, row.phone, row.email, row.instagram, row.notes, now);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { ok: true, suppliers: listSuppliers() };
}

function mapTeamPerson(row: Row): TeamPerson {
  return {
    id: num(row, "id"),
    name: str(row, "name"),
    nickname: str(row, "nickname"),
    role: str(row, "role"),
    bond: str(row, "bond"),
    photo: str(row, "photo"),
    whatsapp: str(row, "whatsapp"),
    birthDate: str(row, "birth_date"),
    address: str(row, "address"),
    driving: str(row, "driving"),
    shirt: str(row, "shirt"),
    pants: str(row, "pants"),
    shoes: str(row, "shoes"),
    pix: str(row, "pix"),
    bloodType: str(row, "blood_type"),
    allergies: str(row, "allergies"),
    emergencyContact: str(row, "emergency_contact"),
    notes: str(row, "notes"),
  };
}

export function listTeamPeople(): TeamPerson[] {
  const db = getDb();
  return (db.prepare(`SELECT * FROM team_people ORDER BY name COLLATE NOCASE, id`).all() as Row[]).map(mapTeamPerson);
}

export function getTeamPerson(id: number): TeamPerson | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM team_people WHERE id = ?`).get(id) as Row | undefined;
  return row ? mapTeamPerson(row) : null;
}

const TEAM_BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function checkedTeamPerson(input: Omit<TeamPerson, "id">) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "Diga o nome da pessoa." };
  const bond = input.bond.trim();
  if (bond !== "Fixa" && bond !== "Freelancer") return { ok: false as const, error: "Escolha o vínculo: Fixa ou Freelancer." };
  const bloodType = input.bloodType.trim();
  if (!TEAM_BLOOD_TYPES.includes(bloodType)) return { ok: false as const, error: "Escolha um tipo sanguíneo da lista." };
  return { ok: true as const, name, bond, bloodType };
}

export function createTeamPerson(input: Omit<TeamPerson, "id">): MutationResult & { id?: number } {
  const checked = checkedTeamPerson(input);
  if (!checked.ok) return checked;
  const db = getDb();
  const { name, bond, bloodType } = checked;
  const id = insertId(
    db,
    `INSERT INTO team_people (
       name, nickname, role, bond, photo, whatsapp, birth_date, address, driving, shirt, pants, shoes, pix, blood_type, allergies, emergency_contact, notes, sizes, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    name,
    input.nickname.trim(),
    input.role.trim(),
    bond,
    input.photo.trim(),
    input.whatsapp.trim(),
    input.birthDate.trim(),
    input.address.trim(),
    input.driving.trim(),
    input.shirt.trim(),
    input.pants.trim(),
    input.shoes.trim(),
    input.pix.trim(),
    bloodType,
    input.allergies.trim(),
    input.emergencyContact.trim(),
    input.notes.trim(),
    [input.shirt, input.pants, input.shoes].map((part) => part.trim()).filter(Boolean).join(" · "),
    new Date().toISOString(),
  );
  return { ok: true, id };
}

export function updateTeamPerson(id: number, input: Omit<TeamPerson, "id">): MutationResult {
  const checked = checkedTeamPerson(input);
  if (!checked.ok) return checked;
  const db = getDb();
  const found = db.prepare(`SELECT id FROM team_people WHERE id = ?`).get(id);
  if (!found) return { ok: false, error: "Pessoa não encontrada." };
  const { name, bond, bloodType } = checked;
  db.prepare(
    `UPDATE team_people SET
       name = ?, nickname = ?, role = ?, bond = ?, photo = ?, whatsapp = ?, birth_date = ?, address = ?, driving = ?,
       shirt = ?, pants = ?, shoes = ?, pix = ?, blood_type = ?, allergies = ?, emergency_contact = ?, notes = ?, sizes = ?
     WHERE id = ?`,
  ).run(
    name,
    input.nickname.trim(),
    input.role.trim(),
    bond,
    input.photo.trim(),
    input.whatsapp.trim(),
    input.birthDate.trim(),
    input.address.trim(),
    input.driving.trim(),
    input.shirt.trim(),
    input.pants.trim(),
    input.shoes.trim(),
    input.pix.trim(),
    bloodType,
    input.allergies.trim(),
    input.emergencyContact.trim(),
    input.notes.trim(),
    [input.shirt, input.pants, input.shoes].map((part) => part.trim()).filter(Boolean).join(" · "),
    id,
  );
  return { ok: true };
}

export function deleteTeamPerson(id: number): MutationResult {
  const db = getDb();
  const found = db.prepare(`SELECT id FROM team_people WHERE id = ?`).get(id);
  if (!found) return { ok: false, error: "Pessoa não encontrada." };
  db.prepare(`DELETE FROM team_people WHERE id = ?`).run(id);
  return { ok: true };
}

function mapLedger(row: Row): LedgerEntry {
  const kind = str(row, "kind");
  return {
    id: num(row, "id"),
    kind: kind === "entrada" ? "entrada" : "despesa",
    description: str(row, "description"),
    amountCents: num(row, "amount_cents"),
    date: str(row, "entry_date"),
    category: str(row, "category"),
    eventKey: str(row, "event_key"),
    settled: flag(row, "settled"),
  };
}

function financeEventExists(key: string): boolean {
  const db = getDb();
  if (key.startsWith("wedding:")) {
    return Boolean(db.prepare(`SELECT id FROM planner_weddings WHERE slug = ?`).get(key.slice("wedding:".length)));
  }
  if (key.startsWith("ceremony:")) {
    const id = Number(key.slice("ceremony:".length));
    return Number.isInteger(id) && Boolean(db.prepare(`SELECT id FROM ceremony_events WHERE id = ?`).get(id));
  }
  return false;
}

export function listFinanceEvents(): FinanceEventOption[] {
  const weddings = listPlannerWeddings().map((wedding) => ({
    key: `wedding:${wedding.slug}`,
    label: `${wedding.partnerA} e ${wedding.partnerB}`,
  }));
  const ceremonies = listCeremonyEvents().map((event) => ({
    key: `ceremony:${event.id}`,
    label: event.title,
  }));
  return [...weddings, ...ceremonies];
}

export function listLedgerEntries(year: number, month: number): LedgerEntry[] {
  const { start, end } = financeMonthRange(year, month);
  const db = getDb();
  return (
    db.prepare(`SELECT * FROM ledger_entries WHERE entry_date >= ? AND entry_date < ? ORDER BY entry_date DESC, id DESC`).all(start, end) as Row[]
  ).map(mapLedger);
}

export function createLedgerEntry(input: Omit<LedgerEntry, "id">): MutationResult {
  if (!isLedgerKind(input.kind)) return { ok: false, error: "Escolha despesa ou entrada." };
  const description = input.description.trim();
  if (description.length < 2) return { ok: false, error: "Descreva o lançamento." };
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) return { ok: false, error: "Informe o valor." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "Escolha a data." };
  if (!isFinanceCategory(input.category)) return { ok: false, error: "Escolha a categoria." };
  const eventKey = input.eventKey.trim();
  if (eventKey && !financeEventExists(eventKey)) return { ok: false, error: "Escolha um evento da lista." };
  const db = getDb();
  insertId(
    db,
    `INSERT INTO ledger_entries (kind, description, amount_cents, entry_date, category, event_key, settled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.kind,
    description,
    input.amountCents,
    input.date,
    input.category,
    eventKey,
    input.settled ? 1 : 0,
    new Date().toISOString(),
  );
  return { ok: true };
}

function mapSalesLead(row: Row): SalesLead {
  const stage = str(row, "stage");
  return {
    id: num(row, "id"),
    name: str(row, "name"),
    whatsapp: str(row, "whatsapp"),
    eventType: str(row, "event_type"),
    eventDate: str(row, "event_date"),
    amountCents: num(row, "amount_cents"),
    source: str(row, "source"),
    returnDate: str(row, "return_date"),
    stage: isSalesStage(stage) ? stage : "novo",
  };
}

export function listSalesLeads(): SalesLead[] {
  const db = getDb();
  return (db.prepare(`SELECT * FROM sales_leads ORDER BY id DESC`).all() as Row[]).map(mapSalesLead);
}

export function createSalesLead(input: Omit<SalesLead, "id" | "stage">): MutationResult {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Diga o nome do contato." };
  const whatsapp = input.whatsapp.trim();
  if (whatsapp.length < 8) return { ok: false, error: "Diga o WhatsApp." };
  const eventTypes = EVENT_TYPES.map((type) => type.label);
  if (!eventTypes.includes(input.eventType)) return { ok: false, error: "Escolha o tipo de evento." };
  if (input.eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)) return { ok: false, error: "Escolha a data do evento." };
  if (input.returnDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.returnDate)) return { ok: false, error: "Escolha a data de retorno." };
  if (!isSalesSource(input.source)) return { ok: false, error: "Diga como chegou." };
  if (!Number.isInteger(input.amountCents) || input.amountCents < 0) return { ok: false, error: "Informe o valor estimado." };
  const db = getDb();
  insertId(
    db,
    `INSERT INTO sales_leads (name, whatsapp, event_type, event_date, amount_cents, source, return_date, stage, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'novo', ?)`,
    name,
    whatsapp,
    input.eventType,
    input.eventDate,
    input.amountCents,
    input.source,
    input.returnDate,
    new Date().toISOString(),
  );
  return { ok: true };
}

export function moveSalesLead(id: number, stage: SalesStage): MutationResult {
  if (!isSalesStage(stage)) return { ok: false, error: "Escolha uma etapa do funil." };
  const db = getDb();
  const found = db.prepare(`SELECT id FROM sales_leads WHERE id = ?`).get(id);
  if (!found) return { ok: false, error: "Contato não encontrado." };
  db.prepare(`UPDATE sales_leads SET stage = ? WHERE id = ?`).run(stage, id);
  return { ok: true };
}

const SETTINGS_KEY = "cerimonial_settings";

export function getCerimonialSettings(): CerimonialSettings {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM meta WHERE key = ?`).get(SETTINGS_KEY) as Row | undefined;
  if (!row) return defaultCerimonialSettings();
  try {
    return normalizeSettings(JSON.parse(str(row, "value")));
  } catch {
    return defaultCerimonialSettings();
  }
}

export function writeCerimonialSettings(settings: CerimonialSettings): MutationResult {
  const db = getDb();
  const value = JSON.stringify(normalizeSettings(settings));
  db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(SETTINGS_KEY, value);
  return { ok: true };
}

function ensureAccessInvites(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS access_invites (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
  ensureColumn(db, "access_invites", "sees_finance", "INTEGER NOT NULL DEFAULT 0");
}

export function listAccessInvites(): AccessInvite[] {
  const db = getDb();
  ensureAccessInvites(db);
  return (db.prepare(`SELECT * FROM access_invites ORDER BY name COLLATE NOCASE, id`).all() as Row[]).map((row) => ({
    id: num(row, "id"),
    name: str(row, "name"),
    email: str(row, "email"),
    seesFinance: flag(row, "sees_finance") || str(row, "role") === "Financeiro",
  }));
}

export function createAccessInvite(input: Omit<AccessInvite, "id">): MutationResult {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const seesFinance = input.seesFinance === true;
  if (name.length < 2) return { ok: false, error: "Diga o nome de quem entra." };
  if (!email.includes("@") || !email.includes(".")) return { ok: false, error: "Use um e-mail válido." };
  if (email === "aline@celebrar.app") return { ok: false, error: "Esta conta já tem acesso." };
  const db = getDb();
  ensureAccessInvites(db);
  const found = db.prepare(`SELECT id FROM access_invites WHERE email = ?`).get(email);
  if (found) return { ok: false, error: "Já existe um convite com esse e-mail." };
  insertId(
    db,
    `INSERT INTO access_invites (name, email, role, sees_finance, created_at) VALUES (?, ?, ?, ?, ?)`,
    name,
    email,
    seesFinance ? "Financeiro" : "Equipe",
    seesFinance ? 1 : 0,
    new Date().toISOString(),
  );
  return { ok: true };
}

export function deleteAccessInvite(id: number): MutationResult {
  const db = getDb();
  ensureAccessInvites(db);
  const result = db.prepare(`DELETE FROM access_invites WHERE id = ?`).run(id);
  if (Number(result.changes) === 0) return { ok: false, error: "Convite não encontrado." };
  return { ok: true };
}

function ensureHelpMessages(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS help_messages (
    id INTEGER PRIMARY KEY,
    topic TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
}

export function listHelpMessages(): HelpMessage[] {
  const db = getDb();
  ensureHelpMessages(db);
  return (db.prepare(`SELECT * FROM help_messages ORDER BY id DESC`).all() as Row[]).map((row) => ({
    id: num(row, "id"),
    topic: str(row, "topic"),
    body: str(row, "body"),
    createdAt: str(row, "created_at"),
  }));
}

export function createHelpMessage(input: { topic: string; body: string }): MutationResult {
  const topic = input.topic.trim();
  const body = input.body.trim();
  if (!isHelpTopic(topic)) return { ok: false, error: "Escolha o assunto." };
  if (body.length < 8) return { ok: false, error: "Escreva a mensagem." };
  const db = getDb();
  ensureHelpMessages(db);
  insertId(db, `INSERT INTO help_messages (topic, body, created_at) VALUES (?, ?, ?)`, topic, body, new Date().toISOString());
  return { ok: true };
}

function ensureSuggestions(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY,
    body TEXT NOT NULL,
    blocker TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
}

export function listSuggestions(): Suggestion[] {
  const db = getDb();
  ensureSuggestions(db);
  return (db.prepare(`SELECT * FROM suggestions ORDER BY id DESC`).all() as Row[]).map((row) => ({
    id: num(row, "id"),
    body: str(row, "body"),
    blocker: str(row, "blocker"),
    createdAt: str(row, "created_at"),
  }));
}

export function createSuggestion(input: { body: string; blocker: string }): MutationResult {
  const body = input.body.trim();
  const blocker = input.blocker.trim();
  if (body.length < 8) return { ok: false, error: "Escreva a sugestão." };
  if (!isSuggestionBlocker(blocker)) return { ok: false, error: "Diga se isso impede o uso." };
  const db = getDb();
  ensureSuggestions(db);
  insertId(db, `INSERT INTO suggestions (body, blocker, created_at) VALUES (?, ?, ?)`, body, blocker, new Date().toISOString());
  return { ok: true };
}

export function listReportFacts(): {
  events: { date: string; typeLabel: string; feeCents: number; suppliers: string[] }[];
  receipts: { date: string; amountCents: number }[];
  leads: { createdAt: string; stage: string }[];
} {
  const db = getDb();
  const vendorsByWedding = new Map<number, string[]>();
  for (const row of db.prepare(`SELECT wedding_id, name FROM planner_vendors`).all() as Row[]) {
    const id = num(row, "wedding_id");
    vendorsByWedding.set(id, [...(vendorsByWedding.get(id) ?? []), str(row, "name")]);
  }
  const suppliersByCeremony = new Map<string, string[]>();
  for (const row of db.prepare(`SELECT owner_kind, owner_key, name FROM event_suppliers`).all() as Row[]) {
    if (str(row, "owner_kind") !== "ceremony") continue;
    const key = str(row, "owner_key");
    suppliersByCeremony.set(key, [...(suppliersByCeremony.get(key) ?? []), str(row, "name")]);
  }
  const weddings = (db.prepare(`SELECT id, wedding_date, fee_cents FROM planner_weddings`).all() as Row[]).map((row) => ({
    date: str(row, "wedding_date"),
    typeLabel: "Casamento",
    feeCents: num(row, "fee_cents"),
    suppliers: vendorsByWedding.get(num(row, "id")) ?? [],
  }));
  const ceremonies = (db.prepare(`SELECT id, type_key, event_date FROM ceremony_events`).all() as Row[]).map((row) => {
    const typeKey = str(row, "type_key");
    return {
      date: str(row, "event_date"),
      typeLabel: eventTypeByKey(typeKey)?.label ?? (typeKey || "Outro"),
      feeCents: 0,
      suppliers: suppliersByCeremony.get(String(num(row, "id"))) ?? [],
    };
  });
  const paymentReceipts = (db.prepare(`SELECT paid_on, amount_cents FROM planner_payments`).all() as Row[]).map((row) => ({
    date: str(row, "paid_on"),
    amountCents: num(row, "amount_cents"),
  }));
  const ledgerReceipts = (db.prepare(`SELECT entry_date, amount_cents, kind, settled FROM ledger_entries`).all() as Row[])
    .filter((row) => str(row, "kind") === "entrada" && flag(row, "settled"))
    .map((row) => ({ date: str(row, "entry_date"), amountCents: num(row, "amount_cents") }));
  const leads = (db.prepare(`SELECT stage, created_at FROM sales_leads`).all() as Row[]).map((row) => ({
    createdAt: str(row, "created_at"),
    stage: str(row, "stage"),
  }));
  return { events: [...weddings, ...ceremonies], receipts: [...paymentReceipts, ...ledgerReceipts], leads };
}

export function listAgendaFeed(): AgendaFeedItem[] {
  const weddings = listPlannerWeddings()
    .filter((wedding) => /^\d{4}-\d{2}-\d{2}$/.test(wedding.weddingDate))
    .map((wedding) => ({
      id: `wedding-${wedding.slug}`,
      date: wedding.weddingDate,
      title: `${wedding.partnerA} e ${wedding.partnerB}`,
      place: wedding.venueName,
    }));
  const ceremonies = listCeremonyEvents()
    .filter((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date))
    .map((event) => ({
      id: `ceremony-${event.id}`,
      date: event.date,
      title: event.title,
      place: "",
    }));
  return [...weddings, ...ceremonies].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export type Diet = {
  gluten: boolean;
  lactose: boolean;
  vegetarian: boolean;
  vegan: boolean;
  other: string;
};

export type Wedding = {
  partnerA: string;
  partnerB: string;
  dateLabel: string;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  invitationLine: string;
  mapsUrl: string;
  wazeUrl: string;
};

export type Moment = {
  id: number;
  name: string;
  timeLabel: string;
  description: string;
  sortOrder: number;
  headcount: number;
};

export type GuestKind = "named" | "plus_one";

export type Guest = {
  id: number;
  conviteId: number;
  name: string;
  relation: string;
  phone: string | null;
  phoneDisplay: string | null;
  kind: GuestKind;
  ticketCode: string | null;
  checkedInAt: string | null;
  reminderPreparedAt: string | null;
  diet: Diet;
  moments: { momentId: number; attending: boolean }[];
};

export type ConviteStatus = "pendente" | "confirmado" | "parcial" | "ausente";

export type Convite = {
  id: number;
  label: string;
  plusOneCap: number;
  tableNumber: number | null;
  songRequest: string;
  respondedAt: string | null;
  status: ConviteStatus;
  guests: Guest[];
};

export type ScheduleItem = {
  id: number;
  timeLabel: string;
  name: string;
  sortOrder: number;
};

export type DispatchRow = {
  guestId: number;
  name: string;
  phone: string | null;
  phoneDisplay: string | null;
  conviteLabel: string;
  tableNumber: number | null;
  ticketCode: string | null;
  message: string;
  preparedAt: string | null;
  storedMessage: string | null;
};

export type DayReply =
  | { status: "missing" }
  | { status: "hint" }
  | {
      status: "mesa" | "cronograma";
      name: string;
      tableLabel: string | null;
      lines: { timeLabel: string; name: string }[];
      mapsUrl: string;
      wazeUrl: string;
      ticketUrl: string | null;
    };

export type SearchHit = {
  guestId: number;
  name: string;
  relation: string;
  conviteId: number;
  conviteLabel: string;
  responded: boolean;
};

export type SearchResult =
  | { status: "short" }
  | { status: "none" }
  | { status: "broad" }
  | { status: "ok"; hits: SearchHit[] };

export type RsvpPersonInput = {
  guestId: number | null;
  name: string;
  kind: GuestKind;
  moments: { momentId: number; attending: boolean }[];
  diet: Diet;
};

export type RsvpInput = {
  conviteId: number;
  song: string;
  people: RsvpPersonInput[];
};

export type TicketCard = {
  name: string;
  code: string;
  moments: { name: string; timeLabel: string }[];
};

export type SubmitResult =
  | { ok: true; tickets: TicketCard[]; anyoneComing: boolean }
  | { ok: false; error: string };

export type CheckinMoment = {
  name: string;
  timeLabel: string;
  attending: boolean;
};

export type CheckinGuest = {
  guestId: number;
  name: string;
  conviteLabel: string;
  code: string | null;
  checkedInAt: string | null;
  moments: CheckinMoment[];
};

export type CheckinResult =
  | { status: "ok"; guest: CheckinGuest }
  | { status: "already"; guest: CheckinGuest }
  | { status: "unknown" }
  | { status: "not-coming"; name: string; conviteLabel: string };

export type CheckinSearchHit = {
  guestId: number;
  name: string;
  relation: string;
  conviteLabel: string;
  canCheckIn: boolean;
  code: string | null;
  checkedInAt: string | null;
  momentSummary: string;
};

export type CheckinSearchResult =
  | { status: "short" }
  | { status: "none" }
  | { status: "broad" }
  | { status: "ok"; hits: CheckinSearchHit[] };

export type TicketView = {
  name: string;
  relation: string;
  conviteLabel: string;
  code: string;
  checkedInAt: string | null;
  moments: CheckinMoment[];
  wedding: Wedding;
};

export type SongRow = {
  conviteId: number;
  conviteLabel: string;
  song: string;
};

export type DietNote = {
  name: string;
  conviteLabel: string;
  detail: string;
  moments: string;
};

export type ReminderRow = {
  guestId: number;
  name: string;
  phone: string | null;
  phoneDisplay: string | null;
  conviteId: number;
  conviteLabel: string;
  reminderPreparedAt: string | null;
};

export type RoomTable = {
  number: number;
  seats: number;
  x: number;
  y: number;
};

export type TableSeatReport = {
  number: number;
  seats: number;
  confirmed: number;
  free: number;
};

export type HostReport = {
  guests: number;
  confirmed: number;
  pending: number;
  tables: TableSeatReport[];
  freeSeats: number;
};

export type GuestProfileInput = {
  guestId: number | null;
  name: string;
  relation: string;
  phone: string;
  conviteId: number | null;
  conviteLabel: string;
  tableNumber: string;
  seats: string;
};

export type PanelData = {
  wedding: Wedding;
  moments: Moment[];
  convites: Convite[];
  songs: SongRow[];
  dietary: {
    counts: { key: string; label: string; count: number }[];
    notes: DietNote[];
  };
  reminders: ReminderRow[];
  schedule: ScheduleItem[];
  dispatches: DispatchRow[];
  stats: {
    guests: number;
    convites: number;
    responded: number;
    pending: number;
    checkedIn: number;
  };
  recentCheckins: { name: string; conviteLabel: string; checkedInAt: string }[];
  hostReport: HostReport;
  room: RoomTable[];
};

export type MutationResult = { ok: true } | { ok: false; error: string };

export type GuestSaveResult = { ok: true; report: HostReport } | { ok: false; error: string };

export type PlannerGuestStatus = "confirmado" | "parcial" | "pendente" | "ausente";

export type PlannerGuest = {
  id: number;
  name: string;
  relation: string;
  conviteLabel: string;
  status: PlannerGuestStatus;
  note: string;
};

export type PlannerVendor = {
  id: number;
  role: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
};

export type PlannerPayment = {
  id: number;
  receiptNumber: string;
  paidOn: string;
  amountCents: number;
  method: string;
  description: string;
};

export type PlannerScriptLine = {
  id: number;
  timeLabel: string;
  title: string;
  body: string;
};

export type PlannerCheckItem = {
  id: number;
  label: string;
  done: boolean;
};

export type PlannerWeddingSummary = {
  slug: string;
  partnerA: string;
  partnerB: string;
  weddingDate: string;
  dateLabel: string;
  venueName: string;
  startTime: string;
};

export type EventSupplierOwner = "ceremony" | "wedding";

export type EventSupplier = {
  id: number;
  name: string;
  role: string;
};

export type CeremonyTask = {
  label: string;
  done: boolean;
};

export type CeremonyMoment = {
  timeLabel: string;
  title: string;
  body: string;
};

export type CeremonyEventSummary = {
  id: number;
  typeKey: string;
  typeLabel: string;
  title: string;
  date: string;
  startTime: string;
};

export type EventTeamMember = {
  id: number;
  name: string;
  role: string;
  whatsapp: string;
};

export type CeremonyEvent = CeremonyEventSummary & {
  place: string;
  team: string;
  teamMembers: EventTeamMember[];
  tasks: CeremonyTask[];
  moments: CeremonyMoment[];
};

export type CeremonyEventInput = {
  id: number;
  title: string;
  date: string;
  place: string;
  team: string;
  teamMemberIds?: number[];
  tasks: CeremonyTask[];
  moments: CeremonyMoment[];
};

export type PlannerCalendarKind = "evento" | "nota" | "reuniao";

export type PlannerNoteKind = "anotacao" | "fotos" | "visita";

export type PlannerCalendarItem = {
  id: number;
  date: string;
  kind: PlannerCalendarKind;
  noteKind: PlannerNoteKind | null;
  title: string;
  body: string;
  timeLabel: string | null;
  weddingSlug: string | null;
  photos: string[];
};

export type ClientEventLink = {
  kind: EventSupplierOwner;
  href: string;
  title: string;
  date: string;
  typeLabel: string;
};

export type ClientSummary = {
  id: number;
  name: string;
  phone: string;
  eventCount: number;
};

export type ClientDetails = {
  id: number;
  name: string;
  phone: string;
  cpf: string;
  address: string;
  events: ClientEventLink[];
};

export type SupplierRecord = {
  id: number;
  name: string;
  category: string;
  contactName: string;
  phone: string;
  email: string;
  instagram: string;
  notes: string;
};

export type SupplierDraft = {
  name: string;
  category: string;
  contactName?: string;
  phone: string;
  email?: string;
  instagram?: string;
  notes?: string;
};

export type TeamPerson = {
  id: number;
  name: string;
  nickname: string;
  role: string;
  bond: string;
  photo: string;
  whatsapp: string;
  birthDate: string;
  address: string;
  driving: string;
  shirt: string;
  pants: string;
  shoes: string;
  pix: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
  notes: string;
};

export type PlannerCouple = PlannerWeddingSummary & {
  venueCity: string;
  venueAddress: string;
  ceremony: string;
  team: string;
  teamMembers: EventTeamMember[];
  guestCount: number;
  confirmedCount: number;
  pendingCount: number;
  contract: {
    studio: string;
    feeCents: number;
    signedOn: string;
    clauses: string[];
  };
  guests: PlannerGuest[];
  vendors: PlannerVendor[];
  payments: PlannerPayment[];
  script: PlannerScriptLine[];
  checklist: PlannerCheckItem[];
};

export type LedgerKind = "entrada" | "despesa";

export type LedgerEntry = {
  id: number;
  kind: LedgerKind;
  description: string;
  amountCents: number;
  date: string;
  category: string;
  eventKey: string;
  settled: boolean;
};

export type FinanceEventOption = {
  key: string;
  label: string;
};

export type SalesStage = "novo" | "conversa" | "reuniao" | "proposta";

export type SalesLead = {
  id: number;
  name: string;
  whatsapp: string;
  eventType: string;
  eventDate: string;
  amountCents: number;
  source: string;
  returnDate: string;
  stage: SalesStage;
};

export type PortfolioShot = {
  id: string;
  src: string;
  caption: string;
};

export type Testimonial = {
  id: string;
  name: string;
  text: string;
};

export type MessageTemplate = {
  id: string;
  title: string;
  body: string;
};

export type CerimonialSettings = {
  brandName: string;
  whatsapp: string;
  color: string;
  logo: string;
  summaryEnabled: boolean;
  summaryEmail: string;
  summaryTime: string;
  presentation: string;
  city: string;
  instagram: string;
  eventTypes: string[];
  portfolio: PortfolioShot[];
  testimonials: Testimonial[];
  published: boolean;
  templates: MessageTemplate[];
  pixKeyType: string;
  pixKey: string;
  pixName: string;
  pixCity: string;
  pixDocument: string;
  pixReceipt: string;
  contractTemplate: string;
};

export type AccessInvite = {
  id: number;
  name: string;
  email: string;
  seesFinance: boolean;
};

export type AgendaFeedItem = {
  id: string;
  date: string;
  title: string;
  place: string;
};

export type HelpMessage = {
  id: number;
  topic: string;
  body: string;
  createdAt: string;
};

export type Suggestion = {
  id: number;
  body: string;
  blocker: string;
  createdAt: string;
};

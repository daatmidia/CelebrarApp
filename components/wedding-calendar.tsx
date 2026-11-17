"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarItemDialog } from "@/components/calendar-item-dialog";
import type { CeremonyEventSummary, PlannerCalendarItem, PlannerWeddingSummary } from "@/lib/types";
import { MONTHS, WEEKDAYS, monthGrid, shortCouple } from "@/lib/planner-docs";
import { cn } from "cn";

export function WeddingCalendar({
  weddings,
  items,
  created,
  year,
  month,
  today,
}: {
  weddings: PlannerWeddingSummary[];
  items: PlannerCalendarItem[];
  created: CeremonyEventSummary[];
  year: number;
  month: number;
  today: { year: number; month: number; day: number };
}) {
  const [cursor, setCursor] = useState({ year, month });
  const [editing, setEditing] = useState<PlannerCalendarItem | null>(null);
  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor.year, cursor.month]);
  const label = `${MONTHS[cursor.month - 1]} de ${cursor.year}`;
  const prefix = `${cursor.year}-${String(cursor.month).padStart(2, "0")}`;
  const monthItems = items.filter((item) => item.date.startsWith(`${prefix}-`));
  const monthWeddings = weddings.filter((wedding) => wedding.weddingDate.startsWith(`${prefix}-`));
  const events = monthItems.filter((item) => item.kind === "evento");
  const meetings = monthItems.filter((item) => item.kind === "reuniao");
  const notes = monthItems.filter((item) => item.kind === "nota");
  const monthCreated = created.filter((event) => event.date.startsWith(`${prefix}-`));

  function shift(delta: number) {
    setCursor((current) => {
      const date = new Date(Date.UTC(current.year, current.month - 1 + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
    });
  }

  return (
    <section aria-label="Calendário de casamentos">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mês anterior"
          className="shrink-0 rounded-full px-3 py-2 text-sm font-bold text-purple ring-1 ring-purple/15"
          onClick={() => shift(-1)}
        >
          <span className="sm:hidden">Anterior</span>
          <span className="hidden sm:inline">Mês anterior</span>
        </button>
        <h2 className="font-heading text-2xl whitespace-nowrap text-purple italic sm:text-3xl">{label}</h2>
        <button
          type="button"
          aria-label="Próximo mês"
          className="shrink-0 rounded-full px-3 py-2 text-sm font-bold text-purple ring-1 ring-purple/15"
          onClick={() => shift(1)}
        >
          <span className="sm:hidden">Próximo</span>
          <span className="hidden sm:inline">Próximo mês</span>
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Eventos e notas deste mês. Toque num casamento para abrir o casal.
      </p>
      <div className="mt-4 overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-purple/10">
        <div className="grid grid-cols-7 bg-secondary text-center text-[11px] font-extrabold tracking-wide text-purple uppercase">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-1 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            const date =
              day == null
                ? ""
                : `${cursor.year}-${String(cursor.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const booked = day == null ? [] : weddings.filter((wedding) => wedding.weddingDate === date);
            const dayItems = day == null ? [] : monthItems.filter((item) => item.date === date);
            const dayCreated = day == null ? [] : monthCreated.filter((event) => event.date === date);
            const isToday = day != null && cursor.year === today.year && cursor.month === today.month && day === today.day;
            return (
              <div
                key={`${cursor.year}-${cursor.month}-${index}`}
                className={cn(
                  "min-h-20 border-t border-purple/10 p-1 sm:min-h-28 sm:p-2",
                  index % 7 !== 0 && "border-l border-purple/10",
                  day == null && "bg-muted/40",
                )}
              >
                {day != null ? (
                  <div className="flex h-full flex-col gap-1">
                    <span className="flex items-center gap-1">
                      <span
                        className={cn(
                          "text-xs font-bold",
                          isToday && "flex h-5 w-5 items-center justify-center rounded-full bg-teal text-white",
                          !isToday && booked.length && "text-magenta",
                          !isToday && !booked.length && "text-muted-foreground",
                        )}
                      >
                        {day}
                      </span>
                      {isToday ? <span className="text-[10px] font-extrabold tracking-wide text-teal uppercase">Hoje</span> : null}
                    </span>
                    {booked.map((wedding) => {
                      const names = shortCouple(wedding.partnerA, wedding.partnerB);
                      return (
                        <Link
                          key={wedding.slug}
                          href={`/cerimonial/${wedding.slug}`}
                          aria-label={`${day} de ${MONTHS[cursor.month - 1]} de ${cursor.year}, ${names}`}
                          data-tone="casamento"
                          className="rounded-xl bg-purple/10 px-1.5 py-1 text-[11px] leading-tight font-bold text-purple hover:bg-purple hover:text-white sm:text-xs"
                        >
                          {names}
                          {wedding.startTime ? <span className="font-semibold opacity-80"> · {wedding.startTime}</span> : null}
                        </Link>
                      );
                    })}
                    {dayCreated.map((event) => (
                      <Link
                        key={event.id}
                        href={`/cerimonial/evento/${event.id}`}
                        data-tone={event.typeKey}
                        className={cn(
                          "rounded-xl px-1.5 py-1 text-[11px] leading-tight font-bold sm:text-xs",
                          ceremonyChip(event.typeKey),
                        )}
                      >
                        {event.title}
                        {event.startTime ? <span className="font-semibold opacity-80"> · {event.startTime}</span> : null}
                      </Link>
                    ))}
                    {dayItems.map((item) => {
                      const role = itemRole(item);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          data-tone={role}
                          onClick={() => setEditing(item)}
                          className={cn(
                            "rounded-xl px-1.5 py-1 text-left text-[11px] leading-tight font-bold sm:text-xs",
                            itemChip(role),
                          )}
                        >
                          <span className="block text-[10px] font-extrabold tracking-wide uppercase">{itemLabel(item)}</span>
                          {item.title}
                          {item.timeLabel ? <span className="font-semibold opacity-80"> · {item.timeLabel}</span> : null}
                          {item.photos[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.photos[0]} alt="" className="mt-1 h-8 w-full rounded-md object-cover" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <MonthBrief
        label={label}
        weddings={monthWeddings}
        events={events}
        meetings={meetings}
        notes={notes}
        created={monthCreated}
        onOpen={setEditing}
      />
      {editing ? <CalendarItemDialog key={editing.id} item={editing} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}

function ceremonyChip(typeKey: string) {
  switch (typeKey) {
    case "quinze":
      return "bg-blush/15 text-blush hover:bg-blush hover:text-white";
    case "formatura":
      return "bg-grad/15 text-grad hover:bg-grad hover:text-white";
    case "corporativo":
      return "bg-moss/15 text-moss hover:bg-moss hover:text-white";
    case "reuniao":
      return "bg-orange/15 text-orange hover:bg-orange hover:text-white";
    default:
      return "bg-purple/10 text-purple hover:bg-purple hover:text-white";
  }
}

function itemRole(item: { kind: string; noteKind: string | null }) {
  if (item.kind === "reuniao") return "reuniao";
  if (item.noteKind === "visita" || item.kind === "evento") return "visita";
  return "nota";
}

function itemChip(role: string) {
  if (role === "reuniao") return "bg-orange/15 text-orange";
  if (role === "visita") return "bg-teal/15 text-teal";
  return "bg-note/15 text-note";
}

function itemLabel(item: { kind: string; noteKind: string | null; title: string }) {
  const role = itemRole(item);
  if (role === "reuniao") return "Reunião";
  if (role === "visita") return item.title === "Ensaio" ? "Ensaio" : "Visita técnica";
  if (item.noteKind === "fotos") return "Fotos";
  return "Nota";
}

function MonthBrief({
  label,
  weddings,
  events,
  meetings,
  notes,
  created,
  onOpen,
}: {
  label: string;
  weddings: PlannerWeddingSummary[];
  events: PlannerCalendarItem[];
  meetings: PlannerCalendarItem[];
  notes: PlannerCalendarItem[];
  created: CeremonyEventSummary[];
  onOpen: (item: PlannerCalendarItem) => void;
}) {
  const empty =
    weddings.length === 0 && events.length === 0 && meetings.length === 0 && notes.length === 0 && created.length === 0;
  return (
    <section className="mt-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-label={`Eventos e notas de ${label}`}>
      <h3 className="font-heading text-2xl text-purple italic">Neste mês</h3>
      {empty ? <p className="mt-2 text-sm text-muted-foreground">Nenhum evento ou nota neste mês.</p> : null}
      {weddings.length ? (
        <ul className="mt-3 space-y-2">
          {weddings.map((wedding) => (
            <li key={wedding.slug}>
              <Link href={`/cerimonial/${wedding.slug}`} data-tone="casamento" className="block rounded-2xl bg-purple/10 px-4 py-3">
                <p className="text-xs font-extrabold tracking-[0.14em] text-purple uppercase">Casamento · {wedding.dateLabel}</p>
                <p className="font-bold text-purple">
                  {shortCouple(wedding.partnerA, wedding.partnerB)} · {wedding.startTime}
                </p>
                <p className="text-sm text-muted-foreground">{wedding.venueName}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {created.length ? (
        <ul className="mt-3 space-y-2">
          {created.map((event) => (
            <li key={event.id}>
              <Link
                href={`/cerimonial/evento/${event.id}`}
                data-tone={event.typeKey}
                className={cn("block rounded-2xl px-4 py-3", ceremonyChip(event.typeKey))}
              >
                <p className="text-xs font-extrabold tracking-[0.14em] uppercase">
                  {event.typeLabel} · dia {Number(event.date.slice(8))}
                </p>
                <p className="font-bold">
                  {event.title}
                  {event.startTime ? ` · ${event.startTime}` : ""}
                </p>
                <p className="text-sm opacity-80">Tarefas e roteiro prontos. Toque para ajustar.</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {meetings.length ? (
        <ul className="mt-3 space-y-2">
          {meetings.map((item) => (
            <li key={item.id}>
              <button type="button" data-tone="reuniao" onClick={() => onOpen(item)} className="w-full rounded-2xl bg-orange/15 px-4 py-3 text-left text-orange">
              <p className="text-xs font-extrabold tracking-[0.14em] uppercase">
                Reunião · dia {Number(item.date.slice(8))}
                {item.timeLabel ? ` · ${item.timeLabel}` : ""}
              </p>
              <p className="font-bold">
                {item.title}
                {item.timeLabel ? ` · ${item.timeLabel}` : ""}
              </p>
              {item.body ? <p className="text-sm">{item.body}</p> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {events.length ? (
        <ul className="mt-3 space-y-2">
          {events.map((item) => (
            <li key={item.id}>
              <button type="button" data-tone="visita" onClick={() => onOpen(item)} className="w-full rounded-2xl bg-teal/15 px-4 py-3 text-left text-teal">
              <p className="text-xs font-extrabold tracking-[0.14em] uppercase">
                {itemLabel(item)} · dia {Number(item.date.slice(8))}
                {item.timeLabel ? ` · ${item.timeLabel}` : ""}
              </p>
              <p className="font-bold">
                {item.title}
                {item.timeLabel ? ` · ${item.timeLabel}` : ""}
              </p>
              <p className="text-sm">{item.body}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {notes.length ? (
        <ul className="mt-3 space-y-2">
          {notes.map((item) => {
            const role = itemRole(item);
            return (
            <li key={item.id}>
              <button type="button" data-tone={role} onClick={() => onOpen(item)} className={cn("w-full rounded-2xl px-4 py-3 text-left", itemChip(role))}>
              <p className="text-xs font-extrabold tracking-[0.14em] uppercase">
                {itemLabel(item)} · dia {Number(item.date.slice(8))}
                {item.timeLabel ? ` · ${item.timeLabel}` : ""}
              </p>
              <p className="font-bold">
                {item.title}
                {item.timeLabel ? ` · ${item.timeLabel}` : ""}
              </p>
              {item.body ? <p className="text-sm">{item.body}</p> : null}
              {item.photos.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.photos.map((photo) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={photo} src={photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ))}
                </div>
              ) : null}
              </button>
            </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { CreateMeeting, CreateVisit } from "@/components/create-calendar-item";
import { CreateNote } from "@/components/create-note";
import { WeddingCalendar } from "@/components/wedding-calendar";
import { listCeremonyEvents, listPlannerCalendar, listPlannerWeddings } from "@/lib/db";
import { isoDate, saoPauloToday } from "@/lib/planner-docs";

export const metadata = {
  title: "Cerimonial",
};

export default function CerimonialPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-5xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <CalendarBody />
    </Suspense>
  );
}

async function CalendarBody() {
  await connection();
  await io();
  const weddings = listPlannerWeddings();
  const items = listPlannerCalendar();
  const created = listCeremonyEvents();
  const today = saoPauloToday();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Calendário</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        O mês em curso, com os eventos e as notas para o cerimonial se orientar. Um casamento na data abre o casal.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
        <Link href="/painel" className="rounded-full bg-white px-4 py-2 text-purple ring-1 ring-purple/10">
          Organização
        </Link>
        <Link href="/cerimonial/novo" className="rounded-full bg-purple px-4 py-2 text-white">
          Criar novo evento
        </Link>
        <CreateNote defaultDate={isoDate(today.year, today.month, today.day)} />
        <CreateMeeting defaultDate={isoDate(today.year, today.month, today.day)} />
        <CreateVisit defaultDate={isoDate(today.year, today.month, today.day)} />
      </div>
      <div className="mt-6">
        <WeddingCalendar
          weddings={weddings}
          items={items}
          created={created}
          year={today.year}
          month={today.month}
          today={today}
        />
      </div>
    </main>
  );
}

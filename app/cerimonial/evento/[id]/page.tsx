import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { DeleteEventButton } from "@/components/delete-event-button";
import { EventPageLinks } from "@/components/event-documents";
import { EventEditor } from "@/components/event-editor";
import { getCeremonyEvent, listTeamPeople } from "@/lib/db";

export const metadata = {
  title: "Evento",
};

export default function CeremonyEventPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <EventBody params={params} />
    </Suspense>
  );
}

async function EventBody({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await io();
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();
  const event = getCeremonyEvent(eventId);
  if (!event) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href="/cerimonial" className="text-sm font-bold text-teal">
        Calendário
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">{event.title}</h1>
      <EventPageLinks
        documentosHref={`/cerimonial/evento/${event.id}/documentos`}
        cronogramaHref={`/cerimonial/evento/${event.id}/cronograma`}
        fornecedoresHref={`/cerimonial/evento/${event.id}/fornecedores`}
      />
      <div className="mt-5">
        <EventEditor
          key={`${event.id}-${event.tasks.length}-${event.moments.length}-${event.title}-${event.teamMembers.map((person) => person.id).join(",")}`}
          event={event}
          people={listTeamPeople().map((person) => ({
            id: person.id,
            name: person.name,
            nickname: person.nickname,
            role: person.role,
            whatsapp: person.whatsapp,
          }))}
        />
      </div>
      <DeleteEventButton kind="ceremony" eventKey={String(event.id)} />
    </main>
  );
}

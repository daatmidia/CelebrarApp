import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { EventDocuments, EventPageLinks } from "@/components/event-documents";
import { getCeremonyEvent } from "@/lib/db";
import { displayEventDate, eventDocumentSections } from "@/lib/event-documents";

export const metadata = {
  title: "Documentos",
};

export default function EventDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <DocumentsBody params={params} />
    </Suspense>
  );
}

async function DocumentsBody({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await io();
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();
  const event = getCeremonyEvent(eventId);
  if (!event) notFound();
  const sections = eventDocumentSections({
    title: event.title,
    when: displayEventDate(event.date),
    place: event.place,
    checklist: event.tasks.slice(0, 4).map((task) => ({ label: task.label, done: task.done })),
  });
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href={`/cerimonial/evento/${event.id}`} className="text-sm font-bold text-teal">
        Voltar ao evento
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Documentos</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">{event.title}</h1>
      <EventPageLinks
        documentosHref={`/cerimonial/evento/${event.id}/documentos`}
        cronogramaHref={`/cerimonial/evento/${event.id}/cronograma`}
        fornecedoresHref={`/cerimonial/evento/${event.id}/fornecedores`}
        current="documentos"
      />
      <EventDocuments sections={sections} />
    </main>
  );
}

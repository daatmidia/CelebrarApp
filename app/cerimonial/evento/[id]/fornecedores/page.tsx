import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { EventPageLinks } from "@/components/event-documents";
import { EventSuppliers } from "@/components/event-suppliers";
import { getCeremonyEvent, listEventSuppliers, listSuppliers } from "@/lib/db";

export const metadata = {
  title: "Fornecedores",
};

export default function EventSuppliersPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <SuppliersBody params={params} />
    </Suspense>
  );
}

async function SuppliersBody({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await io();
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();
  const event = getCeremonyEvent(eventId);
  if (!event) notFound();
  const suppliers = listEventSuppliers("ceremony", String(event.id));
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href={`/cerimonial/evento/${event.id}`} className="text-sm font-bold text-teal">
        Voltar ao evento
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Fornecedores</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">{event.title}</h1>
      <EventPageLinks
        documentosHref={`/cerimonial/evento/${event.id}/documentos`}
        cronogramaHref={`/cerimonial/evento/${event.id}/cronograma`}
        fornecedoresHref={`/cerimonial/evento/${event.id}/fornecedores`}
        current="fornecedores"
      />
      <EventSuppliers ownerKind="ceremony" ownerKey={String(event.id)} suppliers={suppliers} directory={listSuppliers()} />
    </main>
  );
}

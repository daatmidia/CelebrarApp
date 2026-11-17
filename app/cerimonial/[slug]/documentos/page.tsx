import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { EventDocuments, EventPageLinks } from "@/components/event-documents";
import { getPlannerCouple } from "@/lib/db";
import { eventDocumentSections } from "@/lib/event-documents";
import { shortCouple } from "@/lib/planner-docs";

export const metadata = {
  title: "Documentos",
};

export default function CoupleDocumentsPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <DocumentsBody params={params} />
    </Suspense>
  );
}

async function DocumentsBody({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  await io();
  const { slug } = await params;
  const couple = getPlannerCouple(slug);
  if (!couple) notFound();
  const names = shortCouple(couple.partnerA, couple.partnerB);
  const sections = eventDocumentSections({
    title: names,
    when: couple.dateLabel,
    place: couple.venueName,
    feeCents: couple.contract.feeCents,
    signedOn: couple.contract.signedOn,
    receipts: couple.payments.map((payment) => ({
      number: payment.receiptNumber,
      when: payment.paidOn,
      amountCents: payment.amountCents,
      method: payment.method,
      note: payment.description,
    })),
    checklist: couple.checklist.map((item) => ({ label: item.label, done: item.done })),
  });
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href={`/cerimonial/${couple.slug}`} className="text-sm font-bold text-teal">
        Voltar ao evento
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Documentos</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">{names}</h1>
      <EventPageLinks
        documentosHref={`/cerimonial/${couple.slug}/documentos`}
        cronogramaHref={`/cerimonial/${couple.slug}/cronograma`}
        fornecedoresHref={`/cerimonial/${couple.slug}/fornecedores`}
        current="documentos"
      />
      <EventDocuments sections={sections} />
    </main>
  );
}

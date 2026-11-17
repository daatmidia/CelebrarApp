import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { EventPageLinks } from "@/components/event-documents";
import { getPlannerCouple } from "@/lib/db";
import { shortCouple } from "@/lib/planner-docs";

export const metadata = {
  title: "Cronograma",
};

export default function CoupleSchedulePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <ScheduleBody params={params} />
    </Suspense>
  );
}

async function ScheduleBody({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  await io();
  const { slug } = await params;
  const couple = getPlannerCouple(slug);
  if (!couple) notFound();
  const names = shortCouple(couple.partnerA, couple.partnerB);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href={`/cerimonial/${couple.slug}`} className="text-sm font-bold text-teal">
        Voltar ao evento
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cronograma</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">{names}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{couple.dateLabel}</p>
      <EventPageLinks
        documentosHref={`/cerimonial/${couple.slug}/documentos`}
        cronogramaHref={`/cerimonial/${couple.slug}/cronograma`}
        fornecedoresHref={`/cerimonial/${couple.slug}/fornecedores`}
        current="cronograma"
      />
      <section className="mt-5 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-label="Roteiro do dia">
        <h2 className="font-heading text-2xl text-purple italic">Roteiro do dia</h2>
        {couple.script.length ? (
          <ol className="mt-4 space-y-4">
            {couple.script.map((line) => (
              <li key={line.id}>
                <p className="text-xs font-extrabold tracking-[0.14em] text-magenta">{line.timeLabel}</p>
                <h3 className="font-bold text-purple">{line.title}</h3>
                <p className="text-sm leading-relaxed">{line.body}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Este evento ainda não tem roteiro do dia.</p>
        )}
      </section>
    </main>
  );
}

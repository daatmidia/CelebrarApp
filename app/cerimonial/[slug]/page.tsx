import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { CoupleFile } from "@/components/couple-file";
import { DeleteEventButton } from "@/components/delete-event-button";
import { EventPageLinks } from "@/components/event-documents";
import { getPlannerCouple, listTeamPeople } from "@/lib/db";
import { shortCouple } from "@/lib/planner-docs";

export const metadata = {
  title: "Cerimonial",
};

export default function CouplePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <CoupleBody params={params} />
    </Suspense>
  );
}

async function CoupleBody({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  await io();
  const { slug } = await params;
  const couple = getPlannerCouple(slug);
  if (!couple) notFound();
  const names = shortCouple(couple.partnerA, couple.partnerB);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href="/cerimonial" className="text-sm font-bold text-teal">
        Calendário
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Casal</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">{names}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {couple.partnerA} e {couple.partnerB} · {couple.dateLabel}
      </p>
      <EventPageLinks
        documentosHref={`/cerimonial/${couple.slug}/documentos`}
        cronogramaHref={`/cerimonial/${couple.slug}/cronograma`}
        fornecedoresHref={`/cerimonial/${couple.slug}/fornecedores`}
      />
      <div className="mt-5">
        <CoupleFile
          key={`${couple.slug}-${couple.teamMembers.map((person) => person.id).join(",")}`}
          couple={couple}
          people={listTeamPeople().map((person) => ({
            id: person.id,
            name: person.name,
            nickname: person.nickname,
            role: person.role,
            whatsapp: person.whatsapp,
          }))}
        />
      </div>
      <DeleteEventButton kind="wedding" eventKey={couple.slug} />
    </main>
  );
}

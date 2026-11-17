import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { EventPageLinks } from "@/components/event-documents";
import { EventSuppliers } from "@/components/event-suppliers";
import { getPlannerCouple, listEventSuppliers, listSuppliers } from "@/lib/db";
import { shortCouple } from "@/lib/planner-docs";

export const metadata = {
  title: "Fornecedores",
};

export default function CoupleSuppliersPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <SuppliersBody params={params} />
    </Suspense>
  );
}

async function SuppliersBody({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  await io();
  const { slug } = await params;
  const couple = getPlannerCouple(slug);
  if (!couple) notFound();
  const names = shortCouple(couple.partnerA, couple.partnerB);
  const suppliers = listEventSuppliers("wedding", couple.slug);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href={`/cerimonial/${couple.slug}`} className="text-sm font-bold text-teal">
        Voltar ao evento
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Fornecedores</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">{names}</h1>
      <EventPageLinks
        documentosHref={`/cerimonial/${couple.slug}/documentos`}
        cronogramaHref={`/cerimonial/${couple.slug}/cronograma`}
        fornecedoresHref={`/cerimonial/${couple.slug}/fornecedores`}
        current="fornecedores"
      />
      <EventSuppliers ownerKind="wedding" ownerKey={couple.slug} suppliers={suppliers} directory={listSuppliers()} />
    </main>
  );
}

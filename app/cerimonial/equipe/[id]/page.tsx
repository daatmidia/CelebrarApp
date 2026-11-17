import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { EquipeForm } from "@/components/equipe-form";
import { getTeamPerson } from "@/lib/db";

export const metadata = { title: "Editar pessoa" };

export default function EditarPessoaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <EditarBody params={params} />
    </Suspense>
  );
}

async function EditarBody({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await io();
  const { id } = await params;
  const personId = Number(id);
  if (!Number.isInteger(personId) || personId <= 0) notFound();
  const person = getTeamPerson(personId);
  if (!person) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href="/cerimonial/equipe" className="text-sm font-bold text-teal">
        Equipe
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">{person.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">A ficha salva, com tipo sanguíneo, alergias e o contato de emergência.</p>
      <EquipeForm person={person} />
    </main>
  );
}

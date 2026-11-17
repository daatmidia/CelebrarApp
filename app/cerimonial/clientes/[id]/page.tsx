import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { ClienteForm } from "@/components/cliente-form";
import { getClient } from "@/lib/db";

export const metadata = { title: "Cliente" };

export default function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <ClienteBody params={params} />
    </Suspense>
  );
}

async function ClienteBody({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await io();
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId <= 0) notFound();
  const client = getClient(clientId);
  if (!client) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href="/cerimonial/clientes" className="text-sm font-bold text-teal">
        Clientes
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cliente</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">{client.name}</h1>
      <ClienteForm client={client} />
    </main>
  );
}

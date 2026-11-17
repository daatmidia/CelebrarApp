import Link from "next/link";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { ClientesList } from "@/components/clientes-list";
import { listClients } from "@/lib/db";

export const metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <ClientesBody />
    </Suspense>
  );
}

async function ClientesBody() {
  await connection();
  await io();
  const clients = listClients();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Clientes</h1>
      <p className="mt-4 rounded-[1.25rem] bg-[#f6eefb] px-4 py-3 text-sm leading-relaxed text-purple">
        Toque no cliente pra editar os dados (CPF, endereço...) e ver os eventos dele. Contrato, parcelas e convidados ficam
        dentro de cada evento: o{" "}
        <Link href="/cerimonial/novo" className="font-extrabold text-teal" aria-label="Criar evento">
          +
        </Link>{" "}
        cria um evento novo.
      </p>
      <ClientesList clients={clients} />
    </main>
  );
}

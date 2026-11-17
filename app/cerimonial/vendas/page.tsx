import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { VendasDesk } from "@/components/vendas-desk";
import { listSalesLeads } from "@/lib/db";

export const metadata = { title: "Vendas" };

export default function VendasPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-6xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <VendasBody />
    </Suspense>
  );
}

async function VendasBody() {
  await connection();
  await io();
  const leads = listSalesLeads();
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <VendasDesk leads={leads} />
    </main>
  );
}

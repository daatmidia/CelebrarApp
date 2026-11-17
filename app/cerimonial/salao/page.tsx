import Link from "next/link";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { SalaoView } from "@/components/salao-view";
import { getPanel } from "@/lib/db";

export const metadata = {
  title: "Desenho do salão",
};

export default function SalaoPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-5xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <SalaoBody />
    </Suspense>
  );
}

async function SalaoBody() {
  await connection();
  await io();
  const data = getPanel();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <Link href="/cerimonial" className="text-sm font-bold text-teal">
        Calendário
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Desenho do salão</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.wedding.partnerA} e {data.wedding.partnerB}. Arraste a mesa para mudar o lugar. Toque para filtrar a lista.
      </p>
      <div className="mt-5">
        <SalaoView convites={data.convites} room={data.room} />
      </div>
    </main>
  );
}

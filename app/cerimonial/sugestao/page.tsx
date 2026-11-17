import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { SugestaoDesk } from "@/components/sugestao-desk";
import { listSuggestions } from "@/lib/db";

export const metadata = { title: "Sugerir melhorias" };

export default function SugestaoPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <SugestaoBody />
    </Suspense>
  );
}

async function SugestaoBody() {
  await connection();
  await io();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <SugestaoDesk suggestions={listSuggestions()} />
    </main>
  );
}

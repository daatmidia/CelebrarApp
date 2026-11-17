import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { FinanceiroDesk } from "@/components/financeiro-desk";
import { listFinanceEvents, listLedgerEntries } from "@/lib/db";
import { financeMonthKey, parseFinanceMonth } from "@/lib/finance";

export const metadata = { title: "Financeiro" };

export default function FinanceiroPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-5xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <FinanceiroBody searchParams={searchParams} />
    </Suspense>
  );
}

async function FinanceiroBody({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await connection();
  await io();
  const params = await searchParams;
  const { year, month } = parseFinanceMonth(params.mes);
  const entries = listLedgerEntries(year, month);
  const events = listFinanceEvents();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <FinanceiroDesk key={financeMonthKey(year, month)} year={year} month={month} entries={entries} events={events} />
    </main>
  );
}

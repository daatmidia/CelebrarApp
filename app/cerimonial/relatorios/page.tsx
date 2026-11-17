import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { RelatoriosDesk } from "@/components/relatorios-desk";
import { listReportFacts } from "@/lib/db";
import { buildYearReport, parseReportYear } from "@/lib/reports";

export const metadata = { title: "Relatórios" };

export default function RelatoriosPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-5xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <RelatoriosBody searchParams={searchParams} />
    </Suspense>
  );
}

async function RelatoriosBody({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  await connection();
  await io();
  const params = await searchParams;
  const year = parseReportYear(params.ano);
  const report = buildYearReport(listReportFacts(), year);
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <RelatoriosDesk key={year} report={report} />
    </main>
  );
}

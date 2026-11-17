import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { CheckinDesk } from "@/components/checkin-desk";
import { SiteHeader } from "@/components/site-header";
import { getPanel } from "@/lib/db";

export const metadata = {
  title: "Recepção",
};

export default function RecepcaoPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  return (
    <div className="min-h-dvh">
      <SiteHeader current="/recepcao" />
      <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-lg animate-pulse rounded-[1.75rem] bg-white" />}>
        <RecepcaoBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RecepcaoBody({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  await connection();
  await io();
  const params = await searchParams;
  const panel = getPanel();
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <CheckinDesk initialCode={params.codigo ?? ""} recent={panel.recentCheckins} />
    </main>
  );
}

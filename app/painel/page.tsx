import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { PainelApp } from "@/components/painel-app";
import { SiteHeader } from "@/components/site-header";
import { getPanel } from "@/lib/db";
import { getOrigin } from "@/lib/origin";

export const metadata = {
  title: "Organização",
};

export default function PainelPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader current="/painel" />
      <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-5xl animate-pulse rounded-[1.75rem] bg-white" />}>
        <PainelBody />
      </Suspense>
    </div>
  );
}

async function PainelBody() {
  await connection();
  await io();
  const origin = await getOrigin();
  const data = getPanel(origin);
  const stamp = [
    data.stats.checkedIn,
    data.stats.responded,
    data.stats.guests,
    data.wedding.mapsUrl,
    data.schedule.map((item) => `${item.id}${item.timeLabel}${item.name}`).join(""),
    data.dispatches.map((row) => `${row.guestId}${row.preparedAt ?? ""}${row.tableNumber ?? ""}`).join(""),
    data.moments.map((moment) => `${moment.id}${moment.name}${moment.headcount}`).join(""),
    data.hostReport.guests,
    data.hostReport.confirmed,
    data.hostReport.pending,
    data.hostReport.freeSeats,
    data.room.map((table) => `${table.number}:${table.seats}`).join(","),
    data.convites
      .map(
        (convite) =>
          `${convite.id}${convite.label}${convite.plusOneCap}${convite.tableNumber ?? ""}${convite.status}${convite.guests
            .map((guest) => `${guest.id}${guest.name}${guest.phone}${guest.reminderPreparedAt}`)
            .join(",")}`,
      )
      .join("|"),
  ].join(":");
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Celebrarapp</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Organização</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.wedding.partnerA} e {data.wedding.partnerB} · {data.wedding.dateLabel}
      </p>
      <div className="mt-5">
        <PainelApp key={stamp} data={data} />
      </div>
    </main>
  );
}

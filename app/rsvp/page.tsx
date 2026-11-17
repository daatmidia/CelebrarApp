import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { RsvpFlow } from "@/components/rsvp-flow";
import { SiteHeader } from "@/components/site-header";
import { getWedding, listMoments } from "@/lib/db";

export const metadata = {
  title: "Confirmar presença",
};

export default function RsvpPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader current="/rsvp" />
      <Suspense fallback={<RsvpSkeleton />}>
        <RsvpBody />
      </Suspense>
    </div>
  );
}

function RsvpSkeleton() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="h-8 w-40 animate-pulse rounded-full bg-white" />
      <div className="mt-4 h-12 w-4/5 animate-pulse rounded-2xl bg-white" />
      <div className="mt-6 h-56 animate-pulse rounded-[1.75rem] bg-white" />
    </main>
  );
}

async function RsvpBody() {
  await connection();
  await io();
  const wedding = getWedding();
  const moments = listMoments();
  return <RsvpFlow wedding={wedding} moments={moments} />;
}

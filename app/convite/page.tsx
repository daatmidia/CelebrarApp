import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { BrandLogo } from "@/components/brand-logo";
import { PrintButton } from "@/components/print-button";
import { SiteHeader } from "@/components/site-header";
import { getWedding } from "@/lib/db";
import { getOrigin } from "@/lib/origin";
import { qrDataUrl } from "@/lib/qr";
import { firstName } from "@/lib/text";

export const metadata = {
  title: "Convite",
};

export default function ConvitePage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader current="/convite" />
      <Suspense fallback={<div className="mx-auto mt-10 h-96 max-w-md animate-pulse rounded-[2rem] bg-white" />}>
        <ConviteCard />
      </Suspense>
    </div>
  );
}

async function ConviteCard() {
  await connection();
  await io();
  const wedding = getWedding();
  const origin = await getOrigin();
  const url = `${origin}/rsvp`;
  const qr = await qrDataUrl(url);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <article className="print-sheet rounded-[2rem] bg-[linear-gradient(135deg,#00a0a0,#3b1253_46%,#e16520_74%,#d3286b)] p-[3px]">
        <div className="rounded-[1.85rem] bg-white px-6 py-8 text-center">
          <BrandLogo className="mx-auto h-28 w-28" />
          <p className="text-xs font-extrabold tracking-[0.22em] text-teal uppercase">Celebrarapp</p>
          <h1 className="mt-3 font-heading text-5xl text-purple italic">
            {firstName(wedding.partnerA)}
            <span className="mx-2 font-sans text-2xl font-extrabold text-magenta not-italic">&</span>
            {firstName(wedding.partnerB)}
          </h1>
          <p className="mt-4 font-heading text-xl text-purple italic">{wedding.dateLabel}</p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {wedding.venueName}
            <br />
            {wedding.venueAddress}
          </p>
          <Image
            src={qr}
            alt="QR code para confirmar presença"
            width={280}
            height={280}
            unoptimized
            className="mx-auto mt-6 h-52 w-52 rounded-2xl"
          />
          <p className="mt-3 text-sm text-muted-foreground">Aponte a câmera para confirmar presença.</p>
          <p className="mt-2 text-sm font-bold break-all text-teal">{url}</p>
        </div>
      </article>
      <div className="no-print mt-4 flex justify-center gap-4">
        <PrintButton />
        <Link href="/rsvp" className="inline-flex h-12 items-center font-extrabold text-purple">
          Abrir o RSVP
        </Link>
      </div>
    </main>
  );
}

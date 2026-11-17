import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { BrandLogo } from "@/components/brand-logo";
import { PrintButton } from "@/components/print-button";
import { SiteHeader } from "@/components/site-header";
import { getTicket } from "@/lib/db";
import { getOrigin } from "@/lib/origin";
import { qrDataUrl } from "@/lib/qr";
import { formatWhen } from "@/lib/text";

export const metadata = {
  title: "Ingresso",
};

export default function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto mt-8 h-96 max-w-md animate-pulse rounded-[2rem] bg-white" />}>
        <TicketBody params={params} />
      </Suspense>
    </div>
  );
}

async function TicketBody({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  await io();
  const { code } = await params;
  const ticket = getTicket(code);
  if (!ticket) notFound();
  const origin = await getOrigin();
  const qr = await qrDataUrl(`${origin}/recepcao?codigo=${encodeURIComponent(ticket.code)}`);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <article className="print-sheet rounded-[2rem] bg-[linear-gradient(135deg,#00a0a0,#3b1253_46%,#e16520_74%,#d3286b)] p-[3px]">
        <div className="rounded-[1.85rem] bg-white px-6 py-8 text-center">
          <BrandLogo className="mx-auto h-20 w-20" />
          <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Ingresso individual</p>
          <h1 className="mt-2 font-heading text-4xl text-purple italic">{ticket.name}</h1>
          <p className="text-sm font-semibold text-magenta">{ticket.conviteLabel}</p>
          <ul className="mt-4 space-y-1 text-left text-sm">
            {ticket.moments.map((moment) => (
              <li key={moment.name} className={moment.attending ? "font-bold text-purple" : "text-muted-foreground"}>
                {moment.attending ? "Confirmado" : "Não vai"} · {moment.name}
                <span className="block font-normal">{moment.timeLabel}</span>
              </li>
            ))}
          </ul>
          <Image
            src={qr}
            alt={`QR code do ingresso de ${ticket.name}`}
            width={280}
            height={280}
            unoptimized
            className="mx-auto mt-5 h-52 w-52"
          />
          <p className="mt-2 font-mono text-sm font-bold text-purple">{ticket.code}</p>
          <p className="mt-2 text-sm text-muted-foreground">Apresente este QR na recepção.</p>
          {ticket.checkedInAt ? (
            <p className="mt-3 text-sm font-bold text-teal">Entrada já registrada às {formatWhen(ticket.checkedInAt)}</p>
          ) : null}
        </div>
      </article>
      <div className="no-print mt-4 flex justify-center">
        <PrintButton label="Imprimir ingresso" />
      </div>
    </main>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { BrandLogo } from "@/components/brand-logo";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getWedding, listMoments, listSchedule } from "@/lib/db";
import { firstName } from "@/lib/text";
import { cn } from "cn";

export const metadata = {
  title: { absolute: "Helena e Miguel · Celebrarapp" },
};

const momentColors = ["bg-teal", "bg-purple", "bg-orange", "bg-magenta"];

export default function Page() {
  return (
    <div className="min-h-dvh">
      <SiteHeader current="/" />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeBody />
      </Suspense>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <div className="h-[32rem] animate-pulse rounded-[2rem] bg-white/80" />
    </main>
  );
}

async function HomeBody() {
  await connection();
  await io();
  const wedding = getWedding();
  const moments = listMoments();
  const schedule = listSchedule();
  const bride = firstName(wedding.partnerA);
  const groom = firstName(wedding.partnerB);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-6 pb-20">
      <article className="rounded-[2rem] bg-[linear-gradient(135deg,#00a0a0,#3b1253_46%,#e16520_74%,#d3286b)] p-[3px] shadow-[0_28px_70px_-36px_rgba(59,18,83,0.65)]">
        <div className="rounded-[1.85rem] bg-white px-6 py-8 text-center sm:px-10 sm:py-12">
          <BrandLogo priority className="mx-auto h-40 w-40 sm:h-52 sm:w-52" />
          <p className="mt-1 text-xs font-extrabold tracking-[0.28em] text-teal uppercase">Casamento</p>
          <h1 className="mt-4 font-heading text-6xl leading-none font-medium text-purple italic sm:text-7xl">
            {bride}
            <span className="my-2 block font-sans text-3xl font-extrabold tracking-tight text-magenta not-italic">
              &
            </span>
            {groom}
          </h1>
          <p className="mt-6 font-heading text-2xl text-purple italic">{wedding.dateLabel}</p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            {wedding.venueName} · {wedding.venueCity}
          </p>
          <p className="mx-auto mt-8 max-w-sm font-heading text-xl text-purple/90 italic">
            {wedding.invitationLine}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/rsvp"
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full bg-teal px-6 text-base text-white hover:bg-teal/90")}
            >
              Confirmar presença
            </Link>
            <Link
              href="/convite"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 rounded-full border-magenta/40 px-6 text-base text-purple",
              )}
            >
              Convite para imprimir
            </Link>
          </div>
        </div>
      </article>

      <section className="mt-8 rounded-[1.75rem] bg-white p-5 shadow-[0_18px_50px_-32px_rgba(59,18,83,0.5)] ring-1 ring-purple/10 sm:p-7">
        <h2 className="font-heading text-3xl text-purple italic">O fim de semana</h2>
        <ol className="mt-4 space-y-4">
          {moments.map((moment, index) => (
            <li key={moment.id} className="flex gap-3">
              <span className={cn("mt-1.5 h-3 w-3 shrink-0 rounded-full", momentColors[index % momentColors.length])} />
              <div>
                <p className="font-extrabold text-purple">{moment.name}</p>
                <p className="text-sm font-semibold text-magenta">{moment.timeLabel}</p>
                <p className="text-sm text-muted-foreground">{moment.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">
          A lista é fechada. Procure seu nome para confirmar — sem criar conta.
        </p>
      </section>

      <section className="mt-4 rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10 sm:p-7">
        <h2 className="font-heading text-3xl text-purple italic">No sábado</h2>
        <p className="mt-1 text-sm text-muted-foreground">O relógio do dia, no mesmo horário da cerimônia.</p>
        <ol className="mt-4 space-y-3">
          {schedule.map((item) => (
            <li key={item.id} className="flex items-baseline gap-3">
              <span className="w-16 shrink-0 font-extrabold text-teal">{item.timeLabel}</span>
              <span className="font-bold text-purple">{item.name}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { BrandLogo } from "@/components/brand-logo";
import { getCerimonialSettings } from "@/lib/db";
import { EVENT_TYPES } from "@/lib/event-types";
import { instagramHref, whatsAppHref } from "@/lib/settings";

export const metadata = { title: "Página pública · Celebrar" };

export default function PaginaPage({ searchParams }: { searchParams: Promise<{ rascunho?: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f3efe8]" />}>
      <PaginaBody searchParams={searchParams} />
    </Suspense>
  );
}

async function PaginaBody({ searchParams }: { searchParams: Promise<{ rascunho?: string }> }) {
  await connection();
  await io();
  const params = await searchParams;
  const settings = getCerimonialSettings();
  const draft = params.rascunho === "1";
  if (!settings.published && !draft) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-6 text-center">
        <BrandLogo className="h-20 w-20" />
        <h1 className="mt-4 font-heading text-4xl text-purple italic">Página ainda não publicada</h1>
        <p className="mt-2 text-sm text-muted-foreground">Quando a cerimonial publicar, a apresentação aparece aqui.</p>
        <Link href="/cerimonial/ajustes/pagina" className="mt-5 rounded-full bg-purple px-5 py-2 text-sm font-bold text-white">
          Abrir ajustes
        </Link>
      </main>
    );
  }
  const types = EVENT_TYPES.filter((type) => settings.eventTypes.includes(type.key));
  const whatsapp = whatsAppHref(settings.whatsapp);
  const instagram = instagramHref(settings.instagram);
  return (
    <main className="min-h-dvh bg-[#f3efe8]">
      <header className="px-4 py-6 text-white" style={{ backgroundColor: settings.color }}>
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <BrandLogo className="h-12 w-12" />
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-white/80 uppercase">Celebrar</p>
            <p className="font-heading text-2xl italic">{settings.brandName}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {draft && !settings.published ? (
          <p className="mb-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/10">Rascunho. Ainda não está publicada.</p>
        ) : null}
        {settings.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo} alt="" className="h-24 w-24 rounded-[1.5rem] object-cover" />
        ) : null}
        <h1 className="mt-4 font-heading text-5xl text-purple italic">{settings.brandName}</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{settings.city}</p>
        {settings.presentation ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-purple">{settings.presentation}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {whatsapp ? (
            <a href={whatsapp} className="rounded-full bg-teal px-4 py-2 text-sm font-bold text-white">
              WhatsApp
            </a>
          ) : null}
          {instagram ? (
            <a href={instagram} className="rounded-full bg-purple px-4 py-2 text-sm font-bold text-white">
              @{settings.instagram}
            </a>
          ) : null}
        </div>
        {types.length ? (
          <section className="mt-8">
            <h2 className="font-heading text-2xl text-purple italic">Eventos</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {types.map((type) => (
                <li key={type.key} className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-purple ring-1 ring-purple/10">
                  {type.label}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {settings.portfolio.length ? (
          <section className="mt-8">
            <h2 className="font-heading text-2xl text-purple italic">Portfólio</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {settings.portfolio.map((shot) => (
                <li key={shot.id} className="overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-purple/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.src} alt={shot.caption} className="h-48 w-full object-cover" />
                  {shot.caption ? <p className="px-3 py-2 text-sm text-purple">{shot.caption}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {settings.testimonials.some((item) => item.text.trim()) ? (
          <section className="mt-8">
            <h2 className="font-heading text-2xl text-purple italic">Depoimentos</h2>
            <ul className="mt-3 grid gap-3">
              {settings.testimonials
                .filter((item) => item.text.trim())
                .map((item) => (
                  <li key={item.id} className="rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
                    <p className="text-sm leading-relaxed text-purple">{item.text}</p>
                    {item.name ? <p className="mt-2 text-sm font-bold text-teal">{item.name}</p> : null}
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addPortfolioPhoto,
  removeAccessInvite,
  saveAccessInvite,
  saveBrand,
  saveContractTemplate,
  saveDailySummary,
  saveMessageTemplates,
  savePixReceipt,
  savePixSettings,
  savePublicProfile,
} from "@/lib/actions";
import { EVENT_TYPES } from "@/lib/event-types";
import {
  AJUSTES_TABS,
  BRAND_COLORS,
  CONTRACT_CHIPS,
  PIX_KEY_TYPES,
  fillContract,
  fillPixReceipt,
  googleCalendarHref,
  publicChecklist,
  whatsAppHref,
  type AjustesTab,
} from "@/lib/settings";
import type { AccessInvite, CerimonialSettings, Testimonial } from "@/lib/types";

const fieldClass = "mt-1 w-full rounded-2xl border border-purple/15 bg-white px-3 py-2 text-sm text-purple outline-none focus:border-teal";

export function AjustesDesk({
  aba,
  settings,
  invites,
  origin,
  sample,
}: {
  aba: AjustesTab;
  settings: CerimonialSettings;
  invites: AccessInvite[];
  origin: string;
  sample: Record<string, string>;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Ajustes</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Plano, marca, página pública, agenda, equipe, Pix e contrato.</p>
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Seções de ajustes">
        {AJUSTES_TABS.map((tab) => {
          const active = tab.key === aba;
          return (
            <Link
              key={tab.key}
              href={`/cerimonial/ajustes/${tab.key}`}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-purple text-white" : "bg-white text-purple ring-1 ring-purple/15"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-5">
        {aba === "plano" ? <PlanoPanel /> : null}
        {aba === "marca" ? <MarcaPanel settings={settings} /> : null}
        {aba === "resumo" ? <ResumoPanel settings={settings} /> : null}
        {aba === "pagina" ? <PaginaPanel settings={settings} origin={origin} /> : null}
        {aba === "agenda" ? <AgendaPanel settings={settings} origin={origin} /> : null}
        {aba === "equipe" ? <EquipePanel invites={invites} origin={origin} /> : null}
        {aba === "pix" ? <PixPanel settings={settings} /> : null}
        {aba === "contrato" ? <ContratoPanel settings={settings} sample={sample} /> : null}
      </div>
    </div>
  );
}

function PlanoPanel() {
  return (
    <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
      <p className="text-xs font-extrabold tracking-[0.16em] text-teal uppercase">Seu plano</p>
      <h2 className="mt-1 font-heading text-3xl text-purple italic">Celebrar</h2>
      <p className="mt-2 text-sm font-bold text-teal">Ativo nesta conta</p>
      <ul className="mt-4 grid gap-2 text-sm text-purple">
        {[
          "Agenda, clientes, equipe e fornecedores",
          "Financeiro e vendas",
          "Página pública no endereço da Celebrar",
          "Pix, contrato e convites de acesso",
        ].map((item) => (
          <li key={item} className="rounded-2xl bg-[#f6eefb] px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">A página pública abre no endereço da Celebrar.</p>
      <Link href="/pagina" className="mt-4 inline-flex rounded-full bg-purple px-5 py-2 text-sm font-bold text-white">
        Abrir página pública
      </Link>
    </section>
  );
}

function MarcaPanel({ settings }: { settings: CerimonialSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(settings.brandName);
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp);
  const [color, setColor] = useState(settings.color);
  const [logo, setLogo] = useState(settings.logo);
  const fileRef = useRef<HTMLInputElement>(null);

  function save(event: React.FormEvent) {
    event.preventDefault();
    const data = new FormData();
    data.set("brandName", name);
    data.set("whatsapp", whatsapp);
    data.set("color", color);
    if (!logo) data.set("removeLogo", "1");
    const file = fileRef.current?.files?.[0];
    if (file) data.set("logo", file);
    startTransition(async () => {
      const result = await saveBrand(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLogo(result.logo);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Marca salva.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
      <h2 className="font-heading text-2xl text-purple italic">Marca</h2>
      <div className="flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-16 w-16 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-extrabold text-white" style={{ backgroundColor: color }}>
            {name.trim().slice(0, 1).toUpperCase() || "C"}
          </span>
        )}
        <label className="cursor-pointer rounded-full border border-purple/20 px-4 py-2 text-sm font-bold text-purple">
          Escolher logo
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" />
        </label>
        {logo ? (
          <button type="button" onClick={() => setLogo("")} className="text-sm font-bold text-magenta">
            Tirar logo
          </button>
        ) : null}
      </div>
      <Field label="Nome" id="marca-nome">
        <input id="marca-nome" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
      </Field>
      <Field label="WhatsApp" id="marca-whatsapp">
        <input id="marca-whatsapp" inputMode="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className={fieldClass} />
      </Field>
      <div>
        <p className="text-sm font-bold text-purple">Cor</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {BRAND_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={swatch}
              aria-pressed={color.toLowerCase() === swatch}
              onClick={() => setColor(swatch)}
              className="h-9 w-9 rounded-full ring-2 ring-offset-2"
              style={{ backgroundColor: swatch, boxShadow: color.toLowerCase() === swatch ? "0 0 0 2px #3b1253" : undefined }}
            />
          ))}
          <input id="marca-cor" type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Cor da marca" className="h-9 w-12 cursor-pointer bg-transparent" />
        </div>
      </div>
      <SaveButton pending={pending} />
    </form>
  );
}

function ResumoPanel({ settings }: { settings: CerimonialSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(settings.summaryEnabled);
  const [email, setEmail] = useState(settings.summaryEmail);
  const [time, setTime] = useState(settings.summaryTime);

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveDailySummary({ enabled, email, time });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Resumo do dia salvo.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
      <h2 className="font-heading text-2xl text-purple italic">Resumo do dia</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Com o resumo ligado, este e-mail é o destino da agenda do dia, no horário escolhido.
      </p>
      <button
        type="button"
        aria-pressed={enabled}
        onClick={() => setEnabled((current) => !current)}
        className={`rounded-full px-4 py-2 text-sm font-bold ${enabled ? "bg-teal text-white" : "text-purple ring-1 ring-purple/15"}`}
      >
        {enabled ? "Resumo ligado" : "Resumo desligado"}
      </button>
      <Field label="E-mail" id="resumo-email">
        <input id="resumo-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="aline@celebrar.app" className={fieldClass} />
      </Field>
      <Field label="Horário" id="resumo-hora">
        <input id="resumo-hora" type="time" value={time} onChange={(event) => setTime(event.target.value)} className={fieldClass} />
      </Field>
      <SaveButton pending={pending} />
    </form>
  );
}

function PaginaPanel({ settings, origin }: { settings: CerimonialSettings; origin: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [presentation, setPresentation] = useState(settings.presentation);
  const [city, setCity] = useState(settings.city);
  const [instagram, setInstagram] = useState(settings.instagram);
  const [eventTypes, setEventTypes] = useState(settings.eventTypes);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(settings.testimonials);
  const [captions, setCaptions] = useState(settings.portfolio.map((shot) => ({ id: shot.id, caption: shot.caption })));
  const [published, setPublished] = useState(settings.published);
  const fileRef = useRef<HTMLInputElement>(null);
  const portfolioKey = settings.portfolio.map((shot) => shot.id).join("|");
  useEffect(() => {
    setCaptions(settings.portfolio.map((shot) => ({ id: shot.id, caption: shot.caption })));
  }, [portfolioKey, settings.portfolio]);
  const visiblePortfolio = settings.portfolio.filter((shot) => captions.some((item) => item.id === shot.id));
  const draft = {
    ...settings,
    presentation,
    city,
    instagram,
    eventTypes,
    testimonials,
    portfolio: visiblePortfolio,
    published,
  };
  const checks = publicChecklist(draft);
  const pageUrl = `${origin}/pagina`;

  function toggleType(key: string) {
    setEventTypes((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function save(nextPublished = published) {
    startTransition(async () => {
      const result = await savePublicProfile({
        presentation,
        city,
        instagram,
        eventTypes,
        testimonials,
        portfolio: captions,
        published: nextPublished,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPublished(nextPublished);
      toast.success(nextPublished ? "Página publicada." : "Página salva.");
      router.refresh();
    });
  }

  function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const data = new FormData();
    data.set("photo", file);
    startTransition(async () => {
      const result = await addPortfolioPhoto(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Foto no portfólio.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Página pública</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {checks.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm text-purple">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${item.done ? "bg-teal" : "bg-purple/20"}`}>
                {item.done ? "✓" : ""}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Endereço:{" "}
          <a href={published ? pageUrl : `${pageUrl}?rascunho=1`} className="font-bold text-teal">
            {pageUrl}
          </a>
        </p>
      </section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save(published);
        }}
        className="space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10"
      >
        <Field label="Apresentação" id="pagina-apresentacao">
          <textarea id="pagina-apresentacao" value={presentation} onChange={(event) => setPresentation(event.target.value)} rows={4} className={fieldClass} />
        </Field>
        <Field label="Cidade" id="pagina-cidade">
          <input id="pagina-cidade" value={city} onChange={(event) => setCity(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="Instagram" id="pagina-instagram">
          <input id="pagina-instagram" value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="@estudio" className={fieldClass} />
        </Field>
        <div>
          <p className="text-sm font-bold text-purple">Tipos de evento</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => {
              const on = eventTypes.includes(type.key);
              return (
                <button
                  key={type.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleType(type.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${on ? "bg-teal text-white" : "text-purple ring-1 ring-purple/15"}`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-purple">Portfólio</p>
          {visiblePortfolio.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhuma foto ainda.</p> : null}
          <ul className="mt-2 grid gap-3">
            {visiblePortfolio.map((shot) => (
              <li key={shot.id} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.src} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                <input
                  aria-label="Legenda da foto"
                  value={captions.find((item) => item.id === shot.id)?.caption ?? ""}
                  onChange={(event) =>
                    setCaptions((current) => current.map((item) => (item.id === shot.id ? { ...item, caption: event.target.value } : item)))
                  }
                  placeholder="Legenda"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={() => setCaptions((current) => current.filter((item) => item.id !== shot.id))}
                  className="text-sm font-bold text-magenta"
                >
                  Tirar
                </button>
              </li>
            ))}
          </ul>
          <label className="mt-3 inline-flex cursor-pointer rounded-full border border-purple/20 px-4 py-2 text-sm font-bold text-purple">
            Adicionar foto
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={upload} />
          </label>
        </div>
        <div>
          <p className="text-sm font-bold text-purple">Depoimentos</p>
          <ul className="mt-2 grid gap-3">
            {testimonials.map((item) => (
              <li key={item.id} className="grid gap-2 rounded-2xl bg-[#f6eefb] p-3">
                <input
                  aria-label="Nome de quem falou"
                  value={item.name}
                  onChange={(event) => setTestimonials((current) => current.map((row) => (row.id === item.id ? { ...row, name: event.target.value } : row)))}
                  placeholder="Nome"
                  className={fieldClass}
                />
                <textarea
                  aria-label="Texto do depoimento"
                  value={item.text}
                  onChange={(event) => setTestimonials((current) => current.map((row) => (row.id === item.id ? { ...row, text: event.target.value } : row)))}
                  rows={2}
                  placeholder="O que a pessoa disse"
                  className={fieldClass}
                />
                <button type="button" onClick={() => setTestimonials((current) => current.filter((row) => row.id !== item.id))} className="text-left text-sm font-bold text-magenta">
                  Remover
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setTestimonials((current) => [...current, { id: `novo-${Date.now()}`, name: "", text: "" }])}
            className="mt-2 text-sm font-bold text-teal"
          >
            + Depoimento
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
            Salvar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => save(true)}
            className="rounded-full bg-teal px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Publicar
          </button>
        </div>
      </form>
    </div>
  );
}

function AgendaPanel({ settings, origin }: { settings: CerimonialSettings; origin: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [templates, setTemplates] = useState(settings.templates);
  const icsUrl = `${origin}/agenda`;
  const google = googleCalendarHref(icsUrl);

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveMessageTemplates(templates);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Modelos salvos.");
      router.refresh();
    });
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não consegui copiar. Selecione o endereço.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Agenda</h2>
        <p className="mt-2 text-sm text-muted-foreground">Os casamentos e eventos da Celebrar entram neste calendário.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/agenda" className="rounded-full bg-purple px-4 py-2 text-sm font-bold text-white">
            Baixar agenda (.ics)
          </a>
          <a href={google} target="_blank" rel="noreferrer" className="rounded-full bg-teal px-4 py-2 text-sm font-bold text-white">
            Abrir no Google Agenda
          </a>
          <Link href="/cerimonial" className="rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15">
            Abrir a agenda
          </Link>
          <button type="button" onClick={() => copy(icsUrl)} className="rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15">
            Copiar link
          </button>
        </div>
        <p className="mt-3 break-all text-sm text-teal">{icsUrl}</p>
      </section>
      <form onSubmit={save} className="space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Modelos</h2>
        {templates.map((item) => (
          <div key={item.id} className="grid gap-2">
            <input
              aria-label="Título do modelo"
              value={item.title}
              onChange={(event) => setTemplates((current) => current.map((row) => (row.id === item.id ? { ...row, title: event.target.value } : row)))}
              className={fieldClass}
            />
            <textarea
              aria-label="Texto do modelo"
              value={item.body}
              onChange={(event) => setTemplates((current) => current.map((row) => (row.id === item.id ? { ...row, body: event.target.value } : row)))}
              rows={3}
              className={fieldClass}
            />
          </div>
        ))}
        <SaveButton pending={pending} />
      </form>
    </div>
  );
}

const ACCESS_STEPS = [
  { title: "Convide", text: "Diga o nome e o e-mail de quem vai entrar com você." },
  { title: "A pessoa recebe o convite", text: "Ela abre o link de entrada e cria a própria senha." },
  { title: "O que a assistente vê", text: "A agenda e os eventos. O financeiro só se você marcar." },
  { title: "Só os eventos dela", text: "Ela não vê o cerimonial inteiro, só os eventos em que está." },
] as const;

function EquipePanel({ invites, origin }: { invites: AccessInvite[]; origin: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [seesFinance, setSeesFinance] = useState(false);
  const entryUrl = `${origin}/cerimonial/entrar`;

  function invite(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveAccessInvite({ name, email, seesFinance });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setName("");
      setEmail("");
      setSeesFinance(false);
      toast.success("Convite criado.");
      router.refresh();
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      const result = await removeAccessInvite(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Acesso removido.");
      router.refresh();
    });
  }

  async function copyEntry() {
    try {
      await navigator.clipboard.writeText(entryUrl);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não consegui copiar. Selecione o endereço.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Equipe com acesso</h2>
        <p className="mt-2 text-sm text-muted-foreground">Quem entra no app. A ficha de trabalho continua em Equipe.</p>
      </section>

      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-labelledby="acesso-como-funciona">
        <h2 id="acesso-como-funciona" className="font-heading text-2xl text-purple italic">
          Como funciona
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {ACCESS_STEPS.map((step, index) => (
            <li key={step.title} className="rounded-2xl bg-[#f6eefb] p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-extrabold text-white">{index + 1}</span>
              <p className="mt-3 font-bold text-purple">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <ul className="grid gap-2">
          <li className="flex items-center gap-3 rounded-2xl bg-[#f6eefb] px-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple text-sm font-extrabold text-white">AC</span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-purple">Aline Cristiane</span>
              <span className="block truncate text-sm text-muted-foreground">aline@celebrar.app</span>
            </span>
            <span className="rounded-full bg-teal/15 px-3 py-1 text-xs font-extrabold text-teal">Dono</span>
          </li>
          {invites.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-purple/10">
              <span>
                <span className="block font-bold text-purple">{invite.name}</span>
                <span className="text-sm text-muted-foreground">
                  {invite.email} · {invite.seesFinance ? "Vê o financeiro" : "Sem o financeiro"}
                </span>
              </span>
              <button type="button" onClick={() => remove(invite.id)} disabled={pending} className="text-sm font-bold text-magenta">
                Remover
              </button>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={invite} className="space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">+ Convidar pra equipe</h2>
        <Field label="Nome" id="acesso-nome">
          <input id="acesso-nome" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="E-mail" id="acesso-email">
          <input id="acesso-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-bold text-purple" htmlFor="acesso-financeiro">
          <input
            id="acesso-financeiro"
            type="checkbox"
            checked={seesFinance}
            onChange={(event) => setSeesFinance(event.target.checked)}
            className="h-4 w-4 accent-teal"
          />
          Pode ver o financeiro
        </label>
        <button type="submit" disabled={pending} className="rounded-full bg-teal px-5 py-2 text-sm font-extrabold text-white disabled:opacity-60">
          Criar convite
        </button>
      </form>

      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Link de entrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">Quem você convidou entra por este endereço da Celebrar.</p>
        <a id="acesso-link" href="/cerimonial/entrar" className="mt-3 block break-all text-sm font-bold text-teal">
          {entryUrl}
        </a>
        <button type="button" onClick={copyEntry} className="mt-3 rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15">
          Copiar
        </button>
      </section>
    </div>
  );
}

function PixPanel({ settings }: { settings: CerimonialSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pixKeyType, setPixKeyType] = useState(settings.pixKeyType);
  const [pixKey, setPixKey] = useState(settings.pixKey);
  const [pixName, setPixName] = useState(settings.pixName);
  const [pixCity, setPixCity] = useState(settings.pixCity);
  const [pixDocument, setPixDocument] = useState(settings.pixDocument);
  const [receipt, setReceipt] = useState(settings.pixReceipt);
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("1.500,00");
  const [payerPhone, setPayerPhone] = useState("");

  const filled = fillPixReceipt(receipt, {
    tipo: pixKeyType,
    chave: pixKey,
    nome: pixName,
    cidade: pixCity,
    documento: pixDocument,
    pagador: payer || "{pagador}",
    valor: amount ? `R$ ${amount.replace(/^R\$\s*/i, "")}` : "{valor}",
  });
  const sendBase = whatsAppHref(payerPhone);
  const sendHref = sendBase ? `${sendBase}?text=${encodeURIComponent(filled)}` : "";

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await savePixSettings({ pixKeyType, pixKey, pixName, pixCity, pixDocument });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pix salvo.");
      router.refresh();
    });
  }

  function saveReceipt(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await savePixReceipt(receipt);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Recibo salvo.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Recebimento por Pix</h2>
        <Field label="Tipo da chave" id="pix-tipo">
          <select id="pix-tipo" value={pixKeyType} onChange={(event) => setPixKeyType(event.target.value)} className={fieldClass}>
            {PIX_KEY_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chave" id="pix-chave">
          <input id="pix-chave" value={pixKey} onChange={(event) => setPixKey(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="Nome de quem recebe" id="pix-nome">
          <input id="pix-nome" value={pixName} onChange={(event) => setPixName(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="Cidade" id="pix-cidade">
          <input id="pix-cidade" value={pixCity} onChange={(event) => setPixCity(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="CPF/CNPJ" id="pix-documento">
          <input id="pix-documento" value={pixDocument} onChange={(event) => setPixDocument(event.target.value)} placeholder="000.000.000-00" className={fieldClass} />
        </Field>
        <button type="submit" disabled={pending} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          Salvar
        </button>
      </form>

      <form onSubmit={saveReceipt} className="space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Recibo</h2>
        <p className="text-sm text-muted-foreground">Edite o texto e envie ao pagador pelo WhatsApp. Os campos entre chaves entram na hora do envio.</p>
        <label className="block text-sm font-bold text-purple" htmlFor="pix-recibo">
          Texto do recibo
          <textarea id="pix-recibo" value={receipt} onChange={(event) => setReceipt(event.target.value)} rows={8} className={fieldClass} />
        </label>
        <Field label="Pagador" id="pix-pagador">
          <input id="pix-pagador" value={payer} onChange={(event) => setPayer(event.target.value)} placeholder="Nome de quem paga" className={fieldClass} />
        </Field>
        <Field label="Valor" id="pix-valor">
          <input id="pix-valor" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1.500,00" className={fieldClass} />
        </Field>
        <Field label="WhatsApp do pagador" id="pix-whatsapp">
          <input id="pix-whatsapp" inputMode="tel" value={payerPhone} onChange={(event) => setPayerPhone(event.target.value)} placeholder="49999990000" className={fieldClass} />
        </Field>
        <article className="rounded-2xl bg-[#f6eefb] p-4">
          <p className="text-xs font-extrabold tracking-[0.16em] text-teal uppercase">Como fica</p>
          <p className="mt-2 text-sm whitespace-pre-wrap text-purple">{filled}</p>
        </article>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
            Salvar recibo
          </button>
          {sendHref ? (
            <a id="pix-enviar" href={sendHref} target="_blank" rel="noreferrer" className="rounded-full bg-teal px-5 py-2 text-sm font-extrabold text-white">
              Enviar ao pagador
            </a>
          ) : (
            <button
              id="pix-enviar"
              type="button"
              onClick={() => toast.error("Diga o WhatsApp do pagador.")}
              className="rounded-full bg-teal px-5 py-2 text-sm font-extrabold text-white"
            >
              Enviar ao pagador
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const CONTRACT_STEPS = [
  { title: "Cole o texto", text: "Envie o contrato que você já usa no espaço abaixo." },
  { title: "Marque os campos", text: "Toque em cliente, data, local e valor para entrarem no texto." },
  { title: "Veja preenchido", text: "Ver como fica troca os campos pelos dados de um evento." },
] as const;

function ContratoPanel({ settings, sample }: { settings: CerimonialSettings; sample: Record<string, string> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [template, setTemplate] = useState(settings.contractTemplate);
  const [editing, setEditing] = useState(true);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function readFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt") && file.type && file.type !== "text/plain") {
      toast.error("Envie um arquivo de texto (.txt).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "").trim();
      if (text.length < 20) {
        toast.error("O arquivo precisa ter o texto do contrato.");
        return;
      }
      setTemplate(text);
      setEditing(true);
      toast.success("Texto do arquivo na área de colar.");
    };
    reader.readAsText(file);
  }

  function insert(token: string) {
    const area = areaRef.current;
    if (!area) {
      setTemplate((current) => `${current}${token}`);
      return;
    }
    const start = area.selectionStart ?? template.length;
    const end = area.selectionEnd ?? template.length;
    const next = `${template.slice(0, start)}${token}${template.slice(end)}`;
    setTemplate(next);
    requestAnimationFrame(() => {
      area.focus();
      const cursor = start + token.length;
      area.setSelectionRange(cursor, cursor);
    });
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveContractTemplate(template);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Contrato salvo.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-labelledby="contrato-como-funciona">
        <h2 id="contrato-como-funciona" className="font-heading text-2xl text-purple italic">
          Como funciona
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {CONTRACT_STEPS.map((step, index) => (
            <li key={step.title} className="rounded-2xl bg-[#f6eefb] p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-extrabold text-white">{index + 1}</span>
              <p className="mt-3 font-bold text-purple">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <form onSubmit={save} className="space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Enviar meu contrato</h2>
        <p className="text-sm text-muted-foreground">Envie um arquivo .txt ou cole o texto. Toque num campo para colocá-lo onde o cursor estiver.</p>
        <label className="block text-sm font-bold text-purple" htmlFor="contrato-arquivo">
          Enviar arquivo
          <input id="contrato-arquivo" type="file" accept=".txt,text/plain" onChange={readFile} className={`${fieldClass} file:mr-3 file:rounded-full file:border-0 file:bg-teal file:px-3 file:py-1 file:text-sm file:font-bold file:text-white`} />
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTRACT_CHIPS.map((chip) => (
            <button key={chip.token} type="button" onClick={() => insert(chip.token)} className="rounded-full bg-[#f6eefb] px-3 py-1.5 text-sm font-bold text-purple">
              {chip.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={editing}
            onClick={() => setEditing(true)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${editing ? "bg-purple text-white" : "text-purple ring-1 ring-purple/15"}`}
          >
            Editar texto
          </button>
          <button
            type="button"
            aria-pressed={!editing}
            onClick={() => setEditing(false)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${editing ? "text-purple ring-1 ring-purple/15" : "bg-teal text-white"}`}
          >
            Ver como fica
          </button>
        </div>
        {editing ? (
          <textarea
            ref={areaRef}
            id="contrato-texto"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            rows={10}
            placeholder="Cole aqui o texto do seu contrato"
            className={fieldClass}
          />
        ) : (
          <article id="contrato-previa" className="rounded-2xl bg-[#f6eefb] p-4">
            <p className="text-sm whitespace-pre-wrap text-purple">{fillContract(template, sample)}</p>
          </article>
        )}
        <button type="submit" disabled={pending} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          Enviar meu contrato
        </button>
      </form>
    </div>
  );
}

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" disabled={pending} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
      Salvar
    </button>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-purple" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

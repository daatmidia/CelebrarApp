"use client";

import Link from "next/link";
import { useState } from "react";
import { loadConvite, searchGuests, submitRsvp } from "@/lib/actions";
import type { Convite, Diet, Moment, SearchHit, TicketCard, Wedding } from "@/lib/types";
import { emptyDiet, firstName } from "@/lib/text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";

type Step = "search" | "party" | "details" | "done";

type Draft = {
  key: string;
  guestId: number | null;
  name: string;
  relation: string;
  kind: "named" | "plus_one";
  moments: Record<number, boolean | null>;
  diet: Diet;
};

const steps: { id: Step; label: string }[] = [
  { id: "search", label: "Nome" },
  { id: "party", label: "Convite" },
  { id: "details", label: "Detalhes" },
  { id: "done", label: "Ingresso" },
];

export function RsvpFlow({ wedding, moments }: { wedding: Wedding; moments: Moment[] }) {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [convite, setConvite] = useState<Convite | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [song, setSong] = useState("");
  const [capError, setCapError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [tickets, setTickets] = useState<TicketCard[]>([]);
  const [anyoneComing, setAnyoneComing] = useState(true);

  const momentIds = moments.map((moment) => moment.id);

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearching(true);
    setSearchError(null);
    setNotice(null);
    setHits(null);
    try {
      const result = await searchGuests(query);
      if (result.status === "short") setNotice("Digite pelo menos 3 letras.");
      else if (result.status === "none") {
        setNotice("Não encontramos esse nome na lista dos noivos. Confira a grafia ou fale com a Helena e o Miguel.");
      } else if (result.status === "broad") {
        setNotice("Encontramos vários nomes parecidos. Inclua o sobrenome para continuar.");
      } else setHits(result.hits);
    } catch {
      setSearchError("Não conseguimos buscar agora. Tente de novo.");
    } finally {
      setSearching(false);
    }
  }

  async function openConvite(conviteId: number) {
    setOpeningId(conviteId);
    setFormError(null);
    setCapError(null);
    try {
      const loaded = await loadConvite(conviteId);
      if (!loaded) {
        setSearchError("Esse convite não está mais na lista.");
        return;
      }
      setConvite(loaded);
      setSong(loaded.songRequest);
      setDrafts(loaded.guests.map((guest) => guestToDraft(guest, momentIds)));
      setStep("party");
    } catch {
      setSearchError("Não conseguimos abrir o convite. Tente de novo.");
    } finally {
      setOpeningId(null);
    }
  }

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));
  }

  function setMoment(key: string, momentId: number, attending: boolean) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, moments: { ...draft.moments, [momentId]: attending } } : draft,
      ),
    );
  }

  function addCompanion() {
    if (!convite) return;
    const plus = drafts.filter((draft) => draft.kind === "plus_one");
    if (plus.length >= convite.plusOneCap) {
      const noun = convite.plusOneCap === 1 ? "acompanhante" : "acompanhantes";
      setCapError(
        convite.plusOneCap === 0
          ? "Este convite não autoriza acompanhantes além dos nomes já indicados."
          : `Este convite autoriza no máximo ${convite.plusOneCap} ${noun}. Não dá para incluir mais ninguém.`,
      );
      return;
    }
    setCapError(null);
    const momentsMap: Record<number, boolean | null> = {};
    for (const id of momentIds) momentsMap[id] = null;
    setDrafts((current) => [
      ...current,
      {
        key: `new-${crypto.randomUUID()}`,
        guestId: null,
        name: "",
        relation: "acompanhante",
        kind: "plus_one",
        moments: momentsMap,
        diet: emptyDiet(),
      },
    ]);
  }

  function continueToDetails() {
    if (!convite) return;
    for (const draft of drafts) {
      if (draft.kind === "plus_one" && draft.name.trim().length < 2) {
        setFormError("Escreva o nome de cada acompanhante.");
        return;
      }
      for (const id of momentIds) {
        if (draft.moments[id] == null) {
          setFormError("Marque sim ou não em cada momento, para cada pessoa.");
          return;
        }
      }
    }
    setFormError(null);
    setStep("details");
  }

  async function save() {
    if (!convite) return;
    setSaving(true);
    setFormError(null);
    try {
      const result = await submitRsvp({
        conviteId: convite.id,
        song,
        people: drafts.map((draft) => ({
          guestId: draft.guestId,
          name: draft.name,
          kind: draft.kind,
          moments: momentIds.map((momentId) => ({
            momentId,
            attending: draft.moments[momentId] === true,
          })),
          diet: draft.diet,
        })),
      });
      if (!result.ok) {
        setFormError(result.error);
        if (result.error.toLowerCase().includes("acompanh")) setStep("party");
        return;
      }
      setTickets(result.tickets);
      setAnyoneComing(result.anyoneComing);
      setStep("done");
    } catch {
      setFormError("Não foi possível salvar a confirmação. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  const coming = drafts.filter((draft) => momentIds.some((id) => draft.moments[id] === true));

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-24">
      <p className="text-xs font-extrabold tracking-[0.22em] text-teal uppercase">
        {firstName(wedding.partnerA)} & {firstName(wedding.partnerB)}
      </p>
      <h1 className="mt-2 font-heading text-4xl text-purple italic sm:text-5xl">Confirmar presença</h1>
      <p className="mt-2 text-sm font-semibold text-muted-foreground">
        {wedding.dateLabel} · {wedding.venueName}
      </p>
      <ol className="mt-5 flex gap-2 text-xs font-bold">
        {steps.map((item, index) => {
          const active = item.id === step;
          const done = steps.findIndex((entry) => entry.id === step) > index;
          return (
            <li
              key={item.id}
              className={cn(
                "rounded-full px-2.5 py-1",
                active && "bg-teal text-white",
                done && "bg-purple text-white",
                !active && !done && "bg-white text-muted-foreground ring-1 ring-purple/10",
              )}
            >
              {item.label}
            </li>
          );
        })}
      </ol>

      {step === "search" ? (
        <section className="mt-6 rounded-[1.75rem] bg-white p-5 shadow-[0_18px_50px_-32px_rgba(59,18,83,0.55)] ring-1 ring-purple/10">
          <form onSubmit={onSearch} className="space-y-3">
            <Label htmlFor="nome" className="text-base text-purple">
              Seu nome
            </Label>
            <Input
              id="nome"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: Mariana Costa"
              autoComplete="name"
              className="h-12 rounded-2xl bg-white px-4 text-base md:text-base"
            />
            <Button type="submit" disabled={searching} className="h-12 w-full rounded-full text-base">
              {searching ? "Procurando…" : "Buscar na lista"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            A lista completa fica só com os noivos. Digite seu nome como está no convite.
          </p>
          <div aria-live="polite" className="mt-4 space-y-3">
            {searchError ? <Alert>{searchError}</Alert> : null}
            {notice ? <Alert>{notice}</Alert> : null}
            {hits ? (
              hits.length === 0 ? null : (
                <ul className="space-y-2">
                  {hits.map((hit) => (
                    <li key={hit.guestId}>
                      <button
                        type="button"
                        onClick={() => openConvite(hit.conviteId)}
                        disabled={openingId !== null}
                        className="flex w-full flex-col items-start gap-1 rounded-2xl border border-purple/10 bg-white px-4 py-3 text-left hover:border-teal"
                      >
                        <span className="text-base font-extrabold text-purple">{hit.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {hit.conviteLabel}
                          {hit.relation ? ` · ${hit.relation}` : ""}
                        </span>
                        {hit.responded ? (
                          <Badge className="bg-magenta text-white">Resposta enviada</Badge>
                        ) : null}
                        {openingId === hit.conviteId ? (
                          <span className="text-sm font-semibold text-teal">Abrindo o convite…</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>
        </section>
      ) : null}

      {step === "party" && convite ? (
        <section className="mt-6 space-y-4">
          <div className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
            <p className="text-xs font-extrabold tracking-[0.18em] text-magenta uppercase">Convite</p>
            <h2 className="mt-1 font-heading text-3xl text-purple italic">{convite.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Os nomes abaixo já estão autorizados.{" "}
              {convite.plusOneCap === 0
                ? "Não há vaga para acompanhante além desses nomes."
                : `Dá para incluir até ${convite.plusOneCap} acompanhante${convite.plusOneCap > 1 ? "s" : ""} a mais.`}
            </p>
          </div>
          {drafts.map((draft) => (
            <article key={draft.key} className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
              {draft.kind === "named" ? (
                <div>
                  <h3 className="text-lg font-extrabold text-purple">{draft.name}</h3>
                  {draft.relation ? <p className="text-sm text-muted-foreground">{draft.relation}</p> : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`nome-${draft.key}`}>Acompanhante</Label>
                    <button
                      type="button"
                      className="text-sm font-bold text-magenta"
                      onClick={() => {
                        setDrafts((current) => current.filter((item) => item.key !== draft.key));
                        setCapError(null);
                      }}
                    >
                      Remover
                    </button>
                  </div>
                  <Input
                    id={`nome-${draft.key}`}
                    value={draft.name}
                    onChange={(event) => updateDraft(draft.key, { name: event.target.value })}
                    placeholder="Nome do acompanhante"
                    className="h-12 rounded-2xl text-base md:text-base"
                  />
                </div>
              )}
              <div className="mt-4 space-y-3">
                {moments.map((moment) => (
                  <div key={moment.id} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="font-bold text-purple">{moment.name}</p>
                      <p className="text-xs text-muted-foreground">{moment.timeLabel}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Choice
                        pressed={draft.moments[moment.id] === true}
                        onClick={() => setMoment(draft.key, moment.id, true)}
                        tone="yes"
                      >
                        Sim
                      </Choice>
                      <Choice
                        pressed={draft.moments[moment.id] === false}
                        onClick={() => setMoment(draft.key, moment.id, false)}
                        tone="no"
                      >
                        Não
                      </Choice>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
          <div>
            <Button type="button" variant="outline" className="h-12 w-full rounded-full" onClick={addCompanion}>
              Incluir acompanhante
            </Button>
            {capError ? (
              <div className="mt-3">
                <Alert>{capError}</Alert>
              </div>
            ) : null}
          </div>
          {formError ? <Alert>{formError}</Alert> : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-12 rounded-full" onClick={() => setStep("search")}>
              Voltar
            </Button>
            <Button type="button" className="h-12 flex-1 rounded-full" onClick={continueToDetails}>
              Continuar
            </Button>
          </div>
        </section>
      ) : null}

      {step === "details" && convite ? (
        <section className="mt-6 space-y-4">
          <div className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
            <h2 className="font-heading text-3xl text-purple italic">Para a cozinha e a pista</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Restrições são opcionais. A música entra na lista do DJ.
            </p>
          </div>
          {coming.length === 0 ? (
            <p className="rounded-[1.75rem] bg-white p-5 text-sm ring-1 ring-purple/10">
              Se ninguém puder ir, pode seguir assim mesmo — os noivos ficam sabendo.
            </p>
          ) : (
            coming.map((draft) => (
              <fieldset key={draft.key} className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
                <legend className="px-1 text-base font-extrabold text-purple">{draft.name || "Acompanhante"}</legend>
                <div className="mt-3 grid gap-3">
                  <DietBox
                    label="Sem glúten"
                    checked={draft.diet.gluten}
                    onChange={(gluten) => updateDraft(draft.key, { diet: { ...draft.diet, gluten } })}
                  />
                  <DietBox
                    label="Sem lactose"
                    checked={draft.diet.lactose}
                    onChange={(lactose) => updateDraft(draft.key, { diet: { ...draft.diet, lactose } })}
                  />
                  <DietBox
                    label="Vegetariano"
                    checked={draft.diet.vegetarian}
                    onChange={(vegetarian) => updateDraft(draft.key, { diet: { ...draft.diet, vegetarian } })}
                  />
                  <DietBox
                    label="Vegano"
                    checked={draft.diet.vegan}
                    onChange={(vegan) => updateDraft(draft.key, { diet: { ...draft.diet, vegan } })}
                  />
                </div>
                <Label htmlFor={`outra-${draft.key}`} className="mt-4">
                  Alergia ou outra restrição
                </Label>
                <Textarea
                  id={`outra-${draft.key}`}
                  value={draft.diet.other}
                  onChange={(event) =>
                    updateDraft(draft.key, { diet: { ...draft.diet, other: event.target.value } })
                  }
                  placeholder="Opcional"
                  className="mt-2 rounded-2xl text-base md:text-base"
                />
              </fieldset>
            ))
          )}
          <div className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
            <Label htmlFor="musica" className="text-base text-purple">
              Qual música não pode faltar para você ir para a pista?
            </Label>
            <Input
              id="musica"
              value={song}
              onChange={(event) => setSong(event.target.value)}
              placeholder="Opcional"
              className="mt-3 h-12 rounded-2xl text-base md:text-base"
            />
          </div>
          {formError ? <Alert>{formError}</Alert> : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-12 rounded-full" onClick={() => setStep("party")}>
              Voltar
            </Button>
            <Button type="button" className="h-12 flex-1 rounded-full" disabled={saving} onClick={save}>
              {saving ? "Guardando…" : "Enviar confirmação"}
            </Button>
          </div>
        </section>
      ) : null}

      {step === "done" ? (
        <section className="mt-6 space-y-4">
          {anyoneComing ? (
            <>
              <div className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
                <h2 className="font-heading text-3xl text-purple italic">Presença confirmada</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cada pessoa que vem ganha um ingresso. No dia, mostre o QR na recepção.
                </p>
              </div>
              {tickets.map((ticket) => (
                <article key={ticket.code} className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
                  <h3 className="text-lg font-extrabold text-purple">{ticket.name}</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {ticket.moments.map((moment) => (
                      <li key={moment.name}>
                        <span className="font-bold text-teal">{moment.name}</span>
                        <span className="text-muted-foreground"> · {moment.timeLabel}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 font-mono text-sm font-bold text-magenta">{ticket.code}</p>
                  <Link href={`/ingresso/${ticket.code}`} className="mt-3 inline-flex font-bold text-teal">
                    Abrir ingresso
                  </Link>
                </article>
              ))}
            </>
          ) : (
            <div className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
              <h2 className="font-heading text-3xl text-purple italic">Sentiremos sua falta</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Avisamos a Helena e o Miguel. Se os planos mudarem, dá para atualizar por aqui.
              </p>
            </div>
          )}
          <Button type="button" variant="outline" className="h-12 rounded-full" onClick={() => setStep("party")}>
            Alterar respostas
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function guestToDraft(guest: Convite["guests"][number], momentIds: number[]): Draft {
  const moments: Record<number, boolean | null> = {};
  for (const id of momentIds) {
    const found = guest.moments.find((moment) => moment.momentId === id);
    moments[id] = found ? found.attending : null;
  }
  return {
    key: `g-${guest.id}`,
    guestId: guest.id,
    name: guest.name,
    relation: guest.relation,
    kind: guest.kind,
    moments,
    diet: guest.diet,
  };
}

function Choice({
  pressed,
  onClick,
  tone,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  tone: "yes" | "no";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-11 rounded-full border text-sm font-extrabold",
        pressed && tone === "yes" && "border-teal bg-teal text-white",
        pressed && tone === "no" && "border-purple bg-purple text-white",
        !pressed && "border-purple/15 bg-white text-purple",
      )}
    >
      {children}
    </button>
  );
}

function DietBox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-semibold text-purple">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} className="size-5" />
      {label}
    </label>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl bg-magenta/10 px-4 py-3 text-sm font-semibold text-purple">
      {children}
    </p>
  );
}

"use client";

import { useState } from "react";
import { dayReply, searchGuests } from "@/lib/actions";
import type { DayReply, SearchHit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HojeDesk() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [guest, setGuest] = useState<SearchHit | null>(null);
  const [command, setCommand] = useState("");
  const [reply, setReply] = useState<DayReply | null>(null);
  const [asking, setAsking] = useState(false);

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearching(true);
    setNotice(null);
    setHits(null);
    setGuest(null);
    setReply(null);
    try {
      const result = await searchGuests(query);
      if (result.status === "short") setNotice("Digite pelo menos 3 letras.");
      else if (result.status === "none") {
        setNotice("Não encontramos esse nome na lista dos noivos.");
      } else if (result.status === "broad") {
        setNotice("Encontramos vários nomes parecidos. Inclua o sobrenome para continuar.");
      } else setHits(result.hits);
    } catch {
      setNotice("Não conseguimos buscar agora. Tente de novo.");
    } finally {
      setSearching(false);
    }
  }

  async function onAsk(event: React.FormEvent) {
    event.preventDefault();
    if (!guest) return;
    setAsking(true);
    setReply(null);
    try {
      setReply(await dayReply(guest.guestId, command));
    } catch {
      setNotice("Não conseguimos responder agora.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-24">
      <p className="text-xs font-extrabold tracking-[0.22em] text-teal uppercase">No dia</p>
      <h1 className="mt-2 font-heading text-4xl text-purple italic sm:text-5xl">Mesa e cronograma</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ainda não há um telefone do evento. Identifique-se na lista e escreva Mesa ou Cronograma.
      </p>

      <section className="mt-6 rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
        <form onSubmit={onSearch} className="space-y-3">
          <Label htmlFor="nome-hoje">Seu nome</Label>
          <Input
            id="nome-hoje"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: Ana Clara Mendes"
            autoComplete="name"
            className="h-12 rounded-2xl text-base md:text-base"
          />
          <Button type="submit" disabled={searching} className="h-12 w-full rounded-full text-base">
            {searching ? "Procurando…" : "Buscar na lista"}
          </Button>
        </form>
        {notice ? <p className="mt-4 rounded-2xl bg-magenta/10 px-4 py-3 text-sm font-semibold text-purple">{notice}</p> : null}
        {hits ? (
          <ul className="mt-4 space-y-2">
            {hits.map((hit) => (
              <li key={hit.guestId}>
                <button
                  type="button"
                  onClick={() => {
                    setGuest(hit);
                    setReply(null);
                    setHits(null);
                  }}
                  className="flex w-full flex-col items-start rounded-2xl border border-purple/10 px-4 py-3 text-left hover:border-teal"
                >
                  <span className="font-extrabold text-purple">{hit.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {hit.conviteLabel}
                    {hit.relation ? ` · ${hit.relation}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {guest ? (
        <section className="mt-4 rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
          <p className="text-sm text-muted-foreground">{guest.conviteLabel}</p>
          <h2 className="font-heading text-3xl text-purple italic">{guest.name}</h2>
          <form onSubmit={onAsk} className="mt-4 space-y-3">
            <Label htmlFor="pedido">O que você quer saber?</Label>
            <Input
              id="pedido"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Mesa ou Cronograma"
              className="h-12 rounded-2xl text-base md:text-base"
            />
            <Button type="submit" disabled={asking} className="h-12 w-full rounded-full">
              {asking ? "Olhando…" : "Perguntar"}
            </Button>
          </form>
          {reply ? <ReplyCard reply={reply} /> : null}
        </section>
      ) : null}
    </div>
  );
}

function ReplyCard({ reply }: { reply: DayReply }) {
  if (reply.status === "missing") {
    return <p className="mt-4 text-sm font-semibold text-purple">Não encontramos esse nome na lista dos noivos.</p>;
  }
  if (reply.status === "hint") {
    return <p className="mt-4 rounded-2xl bg-orange/10 px-4 py-3 text-sm font-semibold text-purple">Escreva Mesa ou Cronograma.</p>;
  }
  return (
    <div className="mt-4 space-y-3 text-sm">
      {reply.status === "mesa" ? (
        <p className="font-heading text-3xl text-purple italic">{reply.tableLabel ?? "A mesa ainda não foi marcada."}</p>
      ) : (
        <div>
          <p className="font-extrabold text-purple">Cronograma</p>
          <ul className="mt-2 space-y-1">
            {reply.lines.map((line) => (
              <li key={`${line.timeLabel}-${line.name}`}>
                <span className="font-extrabold text-teal">{line.timeLabel}</span>
                <span> – {line.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {reply.mapsUrl ? (
        <a className="block font-bold text-teal" href={reply.mapsUrl} target="_blank" rel="noreferrer">
          Abrir no Google Maps
        </a>
      ) : null}
      {reply.wazeUrl ? (
        <a className="block font-bold text-magenta" href={reply.wazeUrl} target="_blank" rel="noreferrer">
          Abrir no Waze
        </a>
      ) : null}
      {reply.ticketUrl ? (
        <a className="block font-bold text-purple" href={reply.ticketUrl}>
          Seu ingresso
        </a>
      ) : (
        <p className="text-muted-foreground">O ingresso aparece depois da confirmação de presença.</p>
      )}
    </div>
  );
}

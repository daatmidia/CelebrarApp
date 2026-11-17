"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { moveSalesLead, saveSalesLead } from "@/lib/actions";
import { EVENT_TYPES } from "@/lib/event-types";
import { formatLongDay, parseBrlToCents } from "@/lib/finance";
import { formatBrl } from "@/lib/planner-docs";
import { SALES_SOURCES, SALES_STAGES, salesBoardTotals } from "@/lib/sales";
import type { SalesLead, SalesStage } from "@/lib/types";

const fieldClass = "mt-1 w-full rounded-2xl border border-purple/15 bg-white px-3 py-2 text-sm text-purple outline-none focus:border-teal";

export function VendasDesk({ leads }: { leads: SalesLead[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const totals = salesBoardTotals(leads);

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Diga o nome do contato.");
      return;
    }
    if (whatsapp.trim().length < 8) {
      toast.error("Diga o WhatsApp.");
      return;
    }
    if (!eventType) {
      toast.error("Escolha o tipo de evento.");
      return;
    }
    if (!source) {
      toast.error("Diga como chegou.");
      return;
    }
    const amountCents = amount.trim() ? parseBrlToCents(amount) : 0;
    if (amountCents == null) {
      toast.error("Informe o valor estimado.");
      return;
    }
    startTransition(async () => {
      const result = await saveSalesLead({
        name,
        whatsapp,
        eventType,
        eventDate,
        amountCents,
        source,
        returnDate,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Contato no funil.");
      setName("");
      setWhatsapp("");
      setEventType("");
      setEventDate("");
      setAmount("");
      setSource("");
      setReturnDate("");
      router.refresh();
    });
  }

  function move(id: number, stage: SalesStage) {
    startTransition(async () => {
      const result = await moveSalesLead(id, stage);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Vendas</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Do primeiro oi até a proposta. Quem fecha vira evento na agenda.</p>

      <details open className="mt-6 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <summary className="cursor-pointer font-heading text-2xl text-purple italic">Como funciona</summary>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Cada contato entra em Novo contato. Dali segue para Em conversa, Reunião e Proposta enviada. Em negociação reúne quem ainda está no começo. Em jogo reúne reunião e proposta. Fechamento mostra quem já recebeu a proposta.
        </p>
      </details>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Em negociação" hint="Novo contato e conversa" count={totals.negociacao.count} amountCents={totals.negociacao.amountCents} />
        <SummaryCard label="Em jogo" hint="Reunião e proposta" count={totals.jogo.count} amountCents={totals.jogo.amountCents} />
        <SummaryCard label="Fechamento" hint="Propostas enviadas" count={totals.fechamento.count} amountCents={totals.fechamento.amountCents} />
      </div>

      <form onSubmit={add} className="mt-6 space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Novo contato</h2>
        <Field label="Nome" id="vendas-nome">
          <input id="vendas-nome" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="WhatsApp" id="vendas-whatsapp">
          <input id="vendas-whatsapp" inputMode="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="Tipo de evento" id="vendas-tipo">
          <select id="vendas-tipo" value={eventType} onChange={(event) => setEventType(event.target.value)} className={fieldClass}>
            <option value="">Escolha o tipo</option>
            {EVENT_TYPES.map((type) => (
              <option key={type.key} value={type.label}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data" id="vendas-data">
          <input id="vendas-data" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className={fieldClass} />
        </Field>
        <Field label="Valor estimado" id="vendas-valor">
          <input id="vendas-valor" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className={fieldClass} />
        </Field>
        <Field label="Como chegou" id="vendas-origem">
          <select id="vendas-origem" value={source} onChange={(event) => setSource(event.target.value)} className={fieldClass}>
            <option value="">Escolha a origem</option>
            {SALES_SOURCES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data de retorno" id="vendas-retorno">
          <input id="vendas-retorno" type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} className={fieldClass} />
        </Field>
        <button type="submit" disabled={pending} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          Adicionar ao funil
        </button>
      </form>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SALES_STAGES.map((stage) => {
          const rows = leads.filter((lead) => lead.stage === stage.key);
          return (
            <section key={stage.key} className="rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
              <h2 className="font-heading text-xl text-purple italic">{stage.label}</h2>
              <p className="text-xs font-bold text-teal">{rows.length}</p>
              {rows.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Ninguém nesta etapa.</p>
              ) : (
                <ul className="mt-3 grid gap-3">
                  {rows.map((lead) => (
                    <li key={lead.id} className="rounded-2xl bg-[#f6eefb] p-3">
                      <p className="font-bold text-purple">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.eventType} · {lead.whatsapp}
                      </p>
                      <p className="text-sm text-purple">
                        {lead.amountCents > 0 ? formatBrl(lead.amountCents) : "Valor a combinar"}
                        {lead.eventDate ? ` · ${formatLongDay(lead.eventDate)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.source}
                        {lead.returnDate ? ` · retorno ${formatLongDay(lead.returnDate)}` : ""}
                      </p>
                      <label className="mt-2 block text-xs font-bold text-purple">
                        Etapa
                        <select
                          aria-label={`Etapa de ${lead.name}`}
                          value={lead.stage}
                          disabled={pending}
                          onChange={(event) => move(lead.id, event.target.value as SalesStage)}
                          className={fieldClass}
                        >
                          {SALES_STAGES.map((item) => (
                            <option key={item.key} value={item.key}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, hint, count, amountCents }: { label: string; hint: string; count: number; amountCents: number }) {
  return (
    <article className="rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
      <p className="text-xs font-extrabold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-heading text-3xl text-purple italic">{count}</p>
      <p className="text-sm text-teal">{formatBrl(amountCents)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </article>
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

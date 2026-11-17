"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveLedgerEntry } from "@/lib/actions";
import {
  FINANCE_CATEGORIES,
  financeDefaultDate,
  financeMonthKey,
  financeMonthLabel,
  financeTotals,
  formatLongDay,
  parseBrlToCents,
  shiftFinanceMonth,
} from "@/lib/finance";
import { formatBrl } from "@/lib/planner-docs";
import type { FinanceEventOption, LedgerEntry, LedgerKind } from "@/lib/types";

const fieldClass = "mt-1 w-full rounded-2xl border border-purple/15 bg-white px-3 py-2 text-sm text-purple outline-none focus:border-teal";

export function FinanceiroDesk({
  year,
  month,
  entries,
  events,
}: {
  year: number;
  month: number;
  entries: LedgerEntry[];
  events: FinanceEventOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const [kind, setKind] = useState<LedgerKind>("despesa");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(financeDefaultDate(year, month));
  const [category, setCategory] = useState("");
  const [eventKey, setEventKey] = useState("");
  const [settled, setSettled] = useState(false);
  const totals = financeTotals(entries);
  const previous = shiftFinanceMonth(year, month, -1);
  const next = shiftFinanceMonth(year, month, 1);
  const eventName = (key: string) => events.find((event) => event.key === key)?.label ?? "Sem evento (do cerimonial)";
  const openEntries = entries.filter((entry) => entry.kind === "entrada" && !entry.settled);

  function launch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = parseBrlToCents(amount);
    if (description.trim().length < 2) {
      toast.error("Descreva o lançamento.");
      return;
    }
    if (amountCents == null) {
      toast.error("Informe o valor.");
      return;
    }
    if (!date) {
      toast.error("Escolha a data.");
      return;
    }
    if (!category) {
      toast.error("Escolha a categoria.");
      return;
    }
    startTransition(async () => {
      const result = await saveLedgerEntry({
        kind,
        description,
        amountCents,
        date,
        category,
        eventKey,
        settled,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Lançamento salvo.");
      setDescription("");
      setAmount("");
      setCategory("");
      setEventKey("");
      setSettled(false);
      router.push(`/cerimonial/financeiro?mes=${date.slice(0, 7)}`);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
          <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Financeiro</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">O que entrou, o que saiu e o que ainda falta receber.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-full bg-teal px-4 py-2 text-sm font-extrabold text-white"
        >
          + Lançamento
        </button>
      </div>

      <details open className="mt-6 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <summary className="cursor-pointer font-heading text-2xl text-purple italic">Como funciona</summary>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Recebido soma as entradas deste mês já marcadas. Pago soma as despesas com Já paguei. Saldo é Recebido menos Pago. A receber é o que ainda falta entrar, e A cobrar lista cada um desses valores. Movimento do mês mostra tudo o que foi lançado. Sem evento (do cerimonial) guarda o que não pertence a um casamento ou evento.
        </p>
      </details>

      <div className="mt-5 flex items-center justify-center gap-3">
        <Link
          href={`/cerimonial/financeiro?mes=${financeMonthKey(previous.year, previous.month)}`}
          aria-label="Mês anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-purple ring-1 ring-purple/15"
        >
          ‹
        </Link>
        <p className="min-w-48 text-center font-heading text-2xl text-purple italic">{financeMonthLabel(year, month)}</p>
        <Link
          href={`/cerimonial/financeiro?mes=${financeMonthKey(next.year, next.month)}`}
          aria-label="Próximo mês"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-purple ring-1 ring-purple/15"
        >
          ›
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TotalCard label="Recebido" value={totals.recebido} tone="text-teal" />
        <TotalCard label="Pago" value={totals.pago} tone="text-magenta" />
        <TotalCard label="Saldo" value={totals.saldo} tone="text-purple" />
        <TotalCard label="A receber" value={totals.aReceber} tone="text-orange" />
      </div>

      <section className="mt-6">
        <h2 className="font-heading text-2xl text-purple italic">A cobrar</h2>
        {openEntries.length === 0 ? (
          <p className="mt-3 rounded-[1.5rem] border border-dashed border-purple/20 bg-white px-4 py-6 text-center text-sm text-muted-foreground">
            Nada a cobrar neste mês.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {openEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
                <div className="min-w-0">
                  <p className="truncate font-bold text-purple">{entry.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatLongDay(entry.date)} · {entry.category} · {eventName(entry.eventKey)}
                  </p>
                </div>
                <p className="shrink-0 font-bold text-orange">{formatBrl(entry.amountCents)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-heading text-2xl text-purple italic">Movimento do mês</h2>
        {entries.length === 0 ? (
          <p className="mt-3 rounded-[1.5rem] border border-dashed border-purple/20 bg-white px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum lançamento neste mês.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {entries.map((entry) => {
              const status = movementStatus(entry);
              return (
                <li key={entry.id} className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-purple">{entry.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.kind === "entrada" ? "Entrada" : "Despesa"} · {formatLongDay(entry.date)} · {entry.category} · {eventName(entry.eventKey)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-bold ${status.tone}`}>{entry.kind === "despesa" ? "−" : "+"}{formatBrl(entry.amountCents)}</p>
                    <p className={`text-xs font-bold ${status.tone}`}>{status.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {open ? (
        <form onSubmit={launch} className="mt-6 space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
          <h2 className="font-heading text-2xl text-purple italic">+ Lançamento</h2>
          <div className="flex flex-wrap gap-2">
            <KindButton current={kind} value="despesa" onPick={setKind}>
              Despesa
            </KindButton>
            <KindButton current={kind} value="entrada" onPick={setKind}>
              Entrada
            </KindButton>
          </div>
          <Field label="Descrição" id="financeiro-descricao">
            <input id="financeiro-descricao" value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="Valor" id="financeiro-valor">
            <input id="financeiro-valor" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className={fieldClass} />
          </Field>
          <Field label="Data" id="financeiro-data">
            <input id="financeiro-data" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="Categoria" id="financeiro-categoria">
            <select id="financeiro-categoria" value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}>
              <option value="">Escolha a categoria</option>
              {FINANCE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Evento" id="financeiro-evento">
            <select id="financeiro-evento" value={eventKey} onChange={(event) => setEventKey(event.target.value)} className={fieldClass}>
              <option value="">Sem evento (do cerimonial)</option>
              {events.map((event) => (
                <option key={event.key} value={event.key}>
                  {event.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-bold text-purple">
            <input
              id="financeiro-pago"
              type="checkbox"
              checked={settled}
              onChange={(event) => setSettled(event.target.checked)}
              className="size-4 accent-[#3b1253]"
            />
            Já paguei
          </label>
          <button type="submit" disabled={pending} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
            Lançar
          </button>
        </form>
      ) : null}
    </div>
  );
}

function movementStatus(entry: LedgerEntry) {
  if (entry.kind === "entrada") {
    return entry.settled
      ? { label: "Recebido", tone: "text-teal" }
      : { label: "A receber", tone: "text-orange" };
  }
  return entry.settled ? { label: "Pago", tone: "text-magenta" } : { label: "A pagar", tone: "text-muted-foreground" };
}

function TotalCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
      <p className="text-xs font-extrabold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className={`mt-2 font-heading text-2xl italic ${tone}`}>{formatBrl(value)}</p>
    </article>
  );
}

function KindButton({
  current,
  value,
  onPick,
  children,
}: {
  current: LedgerKind;
  value: LedgerKind;
  onPick: (value: LedgerKind) => void;
  children: string;
}) {
  const selected = current === value;
  const tone = value === "despesa" ? "bg-magenta text-white" : "bg-teal text-white";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onPick(value)}
      className={`rounded-full px-4 py-2 text-sm font-bold ${selected ? tone : "text-purple ring-1 ring-purple/15"}`}
    >
      {children}
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

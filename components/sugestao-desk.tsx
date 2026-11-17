"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSuggestion } from "@/lib/actions";
import { SUGGESTION_BLOCKERS } from "@/lib/suggestions";
import type { Suggestion } from "@/lib/types";

const fieldClass = "mt-1 w-full rounded-2xl border border-purple/15 bg-white px-3 py-2 text-sm text-purple outline-none focus:border-teal";

export function SugestaoDesk({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [blocker, setBlocker] = useState<string>(SUGGESTION_BLOCKERS[0]);

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (body.trim().length < 8) {
      toast.error("Escreva a sugestão.");
      return;
    }
    startTransition(async () => {
      const result = await saveSuggestion({ body, blocker });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Sugestão enviada.");
      setBody("");
      setBlocker(SUGGESTION_BLOCKERS[0]);
      router.refresh();
    });
  }

  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Sugerir melhorias</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Escreva o que faria o Celebrar melhor no seu dia. Cada envio fica no banco de sugestões, para quem desenvolve o app.
      </p>

      <form onSubmit={send} className="mt-6 space-y-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <label className="block text-sm font-bold text-purple" htmlFor="sugestao-texto">
          Sugestão
          <textarea
            id="sugestao-texto"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            placeholder="O que você quer no Celebrar"
            className={fieldClass}
          />
        </label>
        <fieldset>
          <legend className="text-sm font-bold text-purple">Isso impede você de usar o Celebrar?</legend>
          <div className="mt-2 grid gap-2">
            {SUGGESTION_BLOCKERS.map((item) => (
              <label key={item} className="flex items-center gap-2 rounded-2xl bg-[#f6eefb] px-3 py-2 text-sm text-purple">
                <input
                  type="radio"
                  name="sugestao-impede"
                  value={item}
                  checked={blocker === item}
                  onChange={() => setBlocker(item)}
                  className="accent-teal"
                />
                {item}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={pending} className="rounded-full bg-teal px-5 py-2 text-sm font-extrabold text-white disabled:opacity-60">
          Enviar sugestão
        </button>
      </form>

      <section className="mt-6 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Banco de sugestões</h2>
        {suggestions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma sugestão no banco ainda.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {suggestions.map((item) => (
              <li key={item.id} className="rounded-2xl bg-[#f6eefb] px-4 py-3">
                <p className="text-sm leading-relaxed text-purple">{item.body}</p>
                <p className="mt-1 text-xs font-bold text-teal">{item.blocker}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sentWhen(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function sentWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

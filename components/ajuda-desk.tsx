"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveHelpMessage } from "@/lib/actions";
import { HELP_EMAIL, HELP_TOPICS } from "@/lib/help";
import type { HelpMessage } from "@/lib/types";

const fieldClass = "mt-1 w-full rounded-2xl border border-purple/15 bg-white px-3 py-2 text-sm text-purple outline-none focus:border-teal";

const TOUR = [
  { title: "Agenda", text: "Abra o mês e toque no evento. Dali saem o cronograma, o salão e os documentos." },
  { title: "Clientes", text: "A ficha do casal guarda o contrato, o local e quem fala com você." },
  { title: "Equipe", text: "No campo Time do evento, digite o nome e ligue a pessoa já salva na equipe." },
  { title: "Financeiro", text: "Lance o sinal, o que já foi pago e o que ainda falta receber." },
] as const;

export function AjudaDesk({ messages }: { messages: HelpMessage[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [topic, setTopic] = useState<string>(HELP_TOPICS[0]);
  const [body, setBody] = useState("");
  const [watching, setWatching] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!watching || !playing) return;
    const timer = window.setTimeout(() => {
      setStep((current) => (current + 1) % TOUR.length);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [watching, playing, step]);

  function watch() {
    setStep(0);
    setPlaying(true);
    setWatching(true);
  }

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (body.trim().length < 8) {
      toast.error("Escreva a mensagem.");
      return;
    }
    startTransition(async () => {
      const result = await saveHelpMessage({ topic, body });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Mensagem enviada.");
      setBody("");
      setTopic(HELP_TOPICS[0]);
      router.refresh();
    });
  }

  const frame = TOUR[step] ?? TOUR[0];

  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Ajuda</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Uma dúvida no meio do evento, ou o primeiro passo no Celebrar. Escreva para a gente ou assista o vídeo de dois minutos.
      </p>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
        <form onSubmit={send} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
          <h2 className="font-heading text-2xl text-purple italic">Fale com a gente</h2>
          <label className="mt-4 block text-sm font-bold text-purple" htmlFor="ajuda-assunto">
            Sobre o quê?
            <select id="ajuda-assunto" value={topic} onChange={(event) => setTopic(event.target.value)} className={fieldClass}>
              {HELP_TOPICS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm font-bold text-purple" htmlFor="ajuda-mensagem">
            Mensagem
            <textarea
              id="ajuda-mensagem"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              placeholder="Conte o que aconteceu"
              className={fieldClass}
            />
          </label>
          <button type="submit" disabled={pending} className="mt-4 rounded-full bg-teal px-5 py-2 text-sm font-extrabold text-white disabled:opacity-60">
            Enviar mensagem
          </button>
          <p className="mt-4 text-sm text-muted-foreground">
            Ou escreva direto para{" "}
            <a href={`mailto:${HELP_EMAIL}`} className="font-bold text-teal">
              {HELP_EMAIL}
            </a>
          </p>
        </form>

        <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
          <p className="text-xs font-extrabold tracking-[0.16em] text-teal uppercase">Vídeo</p>
          <button
            type="button"
            onClick={watch}
            className="relative mt-3 flex aspect-video w-full items-end overflow-hidden rounded-2xl bg-gradient-to-br from-purple via-[#64208a] to-teal p-4 text-left text-white"
          >
            <span className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-lg text-purple shadow-lg">
              ▶
            </span>
            <span className="font-heading text-2xl italic">Comece por aqui</span>
          </button>
          <h2 className="mt-4 font-heading text-2xl text-purple italic">Comece por aqui · 2 min</h2>
          <button type="button" onClick={watch} className="mt-4 rounded-full bg-purple px-5 py-2 text-sm font-bold text-white">
            Assistir
          </button>
        </section>
      </div>

      {messages.length > 0 ? (
        <section className="mt-6 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
          <h2 className="font-heading text-2xl text-purple italic">Enviadas</h2>
          <ul className="mt-3 grid gap-3">
            {messages.map((message) => (
              <li key={message.id} className="rounded-2xl bg-[#f6eefb] px-4 py-3">
                <p className="text-xs font-extrabold tracking-[0.14em] text-teal uppercase">{message.topic}</p>
                <p className="mt-1 text-sm leading-relaxed text-purple">{message.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sentWhen(message.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {watching ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-purple/40 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="ajuda-video-titulo" className="w-full max-w-lg overflow-hidden rounded-[1.5rem] bg-white">
            <div className="relative aspect-video bg-gradient-to-br from-purple via-[#64208a] to-teal p-6 text-white">
              <p className="text-xs font-extrabold tracking-[0.16em] text-white/80 uppercase">Vídeo · 2 min</p>
              <h2 id="ajuda-video-titulo" className="mt-8 font-heading text-4xl italic">
                {frame.title}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/90">{frame.text}</p>
              <p className="absolute right-4 bottom-4 text-xs font-bold">
                {step + 1} / {TOUR.length}
                {playing ? " · reproduzindo" : " · pausado"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <button
                type="button"
                onClick={() => setPlaying((current) => !current)}
                className="rounded-full bg-teal px-4 py-2 text-sm font-extrabold text-white"
              >
                {playing ? "Pausar" : "Continuar"}
              </button>
              <button type="button" onClick={() => setWatching(false)} className="rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15">
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
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

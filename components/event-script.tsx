"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveCeremonyEvent } from "@/lib/actions";
import type { CeremonyEvent, CeremonyMoment } from "@/lib/types";

export function EventScript({ event }: { event: CeremonyEvent }) {
  const [moments, setMoments] = useState<CeremonyMoment[]>(event.moments);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveCeremonyEvent({
        id: event.id,
        title: event.title,
        date: event.date,
        place: event.place,
        team: event.team,
        tasks: event.tasks,
        moments,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Roteiro atualizado.");
    });
  }

  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-label="Roteiro do dia">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-2xl text-purple italic">Roteiro do dia</h2>
          <button
            type="button"
            className="text-sm font-bold text-teal"
            onClick={() => setMoments((current) => [...current, { timeLabel: "", title: "", body: "" }])}
          >
            Novo momento
          </button>
        </div>
        <ol className="mt-3 space-y-3" data-moments={moments.length}>
          {moments.map((moment, index) => (
            <li key={index} className="rounded-2xl bg-secondary p-3">
              <div className="grid gap-2 sm:grid-cols-[7rem_1fr_auto]">
                <input
                  value={moment.timeLabel}
                  aria-label={`Horário do momento ${index + 1}`}
                  onChange={(input) =>
                    setMoments((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? { ...item, timeLabel: input.target.value } : item)),
                    )
                  }
                  className="rounded-xl border border-purple/10 px-3 py-2 text-sm"
                />
                <input
                  value={moment.title}
                  aria-label={`Momento ${index + 1}`}
                  onChange={(input) =>
                    setMoments((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, title: input.target.value } : item)))
                  }
                  className="rounded-xl border border-purple/10 px-3 py-2 text-sm font-semibold"
                />
                <button
                  type="button"
                  className="text-xs font-bold text-magenta"
                  onClick={() => setMoments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Tirar
                </button>
              </div>
              <textarea
                value={moment.body}
                aria-label={`Texto do momento ${index + 1}`}
                onChange={(input) =>
                  setMoments((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, body: input.target.value } : item)))
                }
                rows={2}
                className="mt-2 w-full rounded-xl border border-purple/10 px-3 py-2 text-sm"
              />
            </li>
          ))}
        </ol>
      </section>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={save} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white">
          Salvar
        </button>
        <Link href={`/cerimonial/evento/${event.id}`} className="rounded-full px-5 py-2 text-sm font-bold text-purple ring-1 ring-purple/15">
          Voltar ao evento
        </Link>
      </div>
    </div>
  );
}

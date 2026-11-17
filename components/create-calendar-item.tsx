"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPlannerMeeting, createPlannerVisit } from "@/lib/actions";
import { cn } from "cn";

export function CreateMeeting({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createPlannerMeeting(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Reunião salva no calendário.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-orange/15 px-4 py-2 text-orange ring-1 ring-orange/30"
      >
        Criar Reunião
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple/40 px-4">
          <form onSubmit={submit} className="w-full max-w-md rounded-[1.5rem] bg-white p-6" aria-label="Criar reunião">
            <h2 className="font-heading text-3xl text-purple italic">Criar Reunião</h2>
            <p className="mt-1 text-sm text-muted-foreground">A reunião fica no dia escolhido, em laranja.</p>
            <label className="mt-4 block text-sm font-bold text-purple" htmlFor="reuniao-data">
              Data
            </label>
            <input
              id="reuniao-data"
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
            <label className="mt-4 block text-sm font-bold text-purple" htmlFor="reuniao-assunto">
              Assunto
            </label>
            <input
              id="reuniao-assunto"
              name="title"
              required
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
            <label className="mt-4 block text-sm font-bold text-purple" htmlFor="reuniao-hora">
              Horário
            </label>
            <input
              id="reuniao-hora"
              name="timeLabel"
              placeholder="15h00"
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
            <label className="mt-4 block text-sm font-bold text-purple" htmlFor="reuniao-texto">
              Anotação
            </label>
            <textarea
              id="reuniao-texto"
              name="body"
              rows={3}
              placeholder="Opcional"
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-orange px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Salvar reunião
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function CreateVisit({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"ensaio" | "visita">("visita");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("mode", mode);
    startTransition(async () => {
      const result = await createPlannerVisit(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ensaio ou visita técnica salva no calendário.");
      setOpen(false);
      setMode("visita");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-teal/15 px-4 py-2 text-teal ring-1 ring-teal/30"
      >
        Criar Ensaio/Visita Técnica
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple/40 px-4">
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-[1.5rem] bg-white p-6"
            aria-label="Criar ensaio ou visita técnica"
          >
            <h2 className="font-heading text-3xl text-purple italic">Criar Ensaio/Visita Técnica</h2>
            <p className="mt-1 text-sm text-muted-foreground">O item fica no dia escolhido, como visita técnica.</p>
            <label className="mt-4 block text-sm font-bold text-purple" htmlFor="visita-data">
              Data
            </label>
            <input
              id="visita-data"
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
            <fieldset className="mt-4">
              <legend className="text-sm font-bold text-purple">Tipo</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["ensaio", "Ensaio"],
                    ["visita", "Visita técnica"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={mode === id}
                    onClick={() => setMode(id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-bold ring-1 ring-teal/30",
                      mode === id ? "bg-teal text-white ring-teal" : "bg-white text-teal",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block text-sm font-bold text-purple" htmlFor="visita-texto">
              O que será feito
            </label>
            <textarea
              id="visita-texto"
              name="body"
              rows={4}
              required
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
            <label className="mt-4 block text-sm font-bold text-purple" htmlFor="visita-hora">
              Horário
            </label>
            <input
              id="visita-hora"
              name="timeLabel"
              placeholder="10h00"
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPlannerNote } from "@/lib/actions";
import type { PlannerNoteKind } from "@/lib/types";
import { cn } from "cn";

const kinds: { id: PlannerNoteKind; label: string }[] = [
  { id: "anotacao", label: "Anotação" },
  { id: "fotos", label: "Fotos" },
];

export function CreateNote({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PlannerNoteKind>("anotacao");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("noteKind", kind);
    startTransition(async () => {
      const result = await createPlannerNote(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Nota salva no calendário.");
      setOpen(false);
      setKind("anotacao");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-note/15 px-4 py-2 text-note ring-1 ring-note/30"
      >
        Criar Nota
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple/40 px-4">
          <form onSubmit={submit} className="w-full max-w-md rounded-[1.5rem] bg-white p-6" aria-label="Criar nota">
            <h2 className="font-heading text-3xl text-purple italic">Criar Nota</h2>
            <p className="mt-1 text-sm text-muted-foreground">A nota fica no dia escolhido do calendário.</p>
            <label className="mt-4 block text-sm font-bold text-purple" htmlFor="nota-data">
              Data
            </label>
            <input
              id="nota-data"
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
            <fieldset className="mt-4">
              <legend className="text-sm font-bold text-purple">Tipo</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {kinds.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={kind === item.id}
                    onClick={() => setKind(item.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-bold ring-1 ring-purple/15",
                      kind === item.id ? "bg-purple text-white ring-purple" : "bg-white text-purple",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {kind === "fotos" ? (
              <div className="mt-4">
                <label className="block text-sm font-bold text-purple" htmlFor="nota-fotos">
                  Fotos
                </label>
                <input
                  id="nota-fotos"
                  name="photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="mt-1 block w-full text-sm"
                />
                <label className="mt-3 block text-sm font-bold text-purple" htmlFor="nota-legenda">
                  Legenda
                </label>
                <textarea
                  id="nota-legenda"
                  name="body"
                  rows={3}
                  placeholder="Opcional"
                  className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
                />
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-sm font-bold text-purple" htmlFor="nota-texto">
                  Anotação
                </label>
                <textarea
                  id="nota-texto"
                  name="body"
                  rows={4}
                  required
                  className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
                />
              </div>
            )}
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
                className="rounded-full bg-purple px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Salvar nota
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

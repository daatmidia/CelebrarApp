"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePlannerCalendarItem, updatePlannerCalendarItem } from "@/lib/actions";
import type { PlannerCalendarItem } from "@/lib/types";
import { cn } from "cn";

export function CalendarItemDialog({ item, onClose }: { item: PlannerCalendarItem; onClose: () => void }) {
  const router = useRouter();
  const role = item.kind === "reuniao" ? "reuniao" : item.noteKind === "visita" || item.kind === "evento" ? "visita" : "nota";
  const photos = role === "nota" && item.noteKind === "fotos";
  const customTitle = role === "reuniao" || item.kind === "evento";
  const [mode, setMode] = useState<"ensaio" | "visita">(item.title === "Ensaio" ? "ensaio" : "visita");
  const [kept, setKept] = useState<string[]>(item.photos);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("id", String(item.id));
    if (role === "visita" && item.noteKind === "visita") data.set("mode", mode);
    for (const photo of kept) data.append("keep", photo);
    startTransition(async () => {
      const result = await updatePlannerCalendarItem(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Item atualizado no calendário.");
      onClose();
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deletePlannerCalendarItem(item.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Item apagado do calendário.");
      setConfirming(false);
      onClose();
      router.refresh();
    });
  }

  const heading = role === "reuniao" ? "Reunião" : role === "visita" ? (item.title === "Ensaio" ? "Ensaio" : "Visita técnica") : photos ? "Fotos" : "Nota";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple/40 px-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-white p-6" aria-label={`Editar ${heading}`}>
        <h2 className="font-heading text-3xl text-purple italic">{heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Altere o texto, a data e o horário. Salvar atualiza o calendário.</p>
        <label className="mt-4 block text-sm font-bold text-purple" htmlFor="item-data">
          Data
        </label>
        <input
          id="item-data"
          name="date"
          type="date"
          required
          defaultValue={item.date}
          className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
        />
        <label className="mt-4 block text-sm font-bold text-purple" htmlFor="item-hora">
          Horário
        </label>
        <input
          id="item-hora"
          name="timeLabel"
          defaultValue={item.timeLabel ?? ""}
          placeholder="15h00"
          className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
        />
        {customTitle ? (
          <>
            <label className="mt-4 block text-sm font-bold text-purple" htmlFor="item-titulo">
              {role === "reuniao" ? "Assunto" : "Nome"}
            </label>
            <input
              id="item-titulo"
              name="title"
              required
              defaultValue={item.title}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
          </>
        ) : (
          <input type="hidden" name="title" value={item.title} />
        )}
        {role === "visita" && item.noteKind === "visita" ? (
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
        ) : null}
        <label className="mt-4 block text-sm font-bold text-purple" htmlFor="item-texto">
          {photos ? "Legenda" : role === "reuniao" ? "Anotação" : "Texto"}
        </label>
        <textarea
          id="item-texto"
          name="body"
          rows={4}
          required={!photos && role !== "reuniao"}
          defaultValue={item.body}
          className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
        />
        {photos ? (
          <div className="mt-4">
            <p className="text-sm font-bold text-purple">Fotos</p>
            {item.photos.length ? (
              <ul className="mt-2 space-y-2">
                {item.photos.map((photo) => (
                  <li key={photo} className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <label className="text-sm">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={kept.includes(photo)}
                        onChange={(input) =>
                          setKept((current) => (input.target.checked ? [...current, photo] : current.filter((itemPath) => itemPath !== photo)))
                        }
                      />
                      Manter
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="mt-3 block text-sm font-bold text-purple" htmlFor="item-fotos">
              Novas fotos
            </label>
            <input id="item-fotos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-1 block w-full text-sm" />
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className="rounded-full bg-magenta px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Apagar
          </button>
          <button type="submit" disabled={pending} className="rounded-full bg-purple px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            Salvar
          </button>
        </div>
      </form>
      {confirming ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-purple/40 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="apagar-item-titulo" className="w-full max-w-md rounded-[1.5rem] bg-white p-6">
            <h2 id="apagar-item-titulo" className="font-heading text-2xl text-purple italic">
              Apagar
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-purple">Tem certeza que deseja apagar? O item sai do calendário.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="rounded-full bg-magenta px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteCerimonialEvent } from "@/lib/actions";
import type { EventSupplierOwner } from "@/lib/types";

const confirmText = "Tem certeza que deseja apagar o evento? Você vai remover todas as informações do histórico.";

export function DeleteEventButton({ kind, eventKey }: { kind: EventSupplierOwner; eventKey: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function confirm() {
    startTransition(async () => {
      const result = await deleteCerimonialEvent(kind, eventKey);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.replace("/cerimonial");
    });
  }

  return (
    <>
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-magenta px-5 py-2 text-sm font-bold text-white"
        >
          Apagar evento
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apagar-evento-titulo"
            className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-[0_24px_60px_-36px_rgba(59,18,83,0.65)]"
          >
            <h2 id="apagar-evento-titulo" className="font-heading text-2xl text-purple italic">
              Apagar evento
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-purple">{confirmText}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="rounded-full bg-magenta px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

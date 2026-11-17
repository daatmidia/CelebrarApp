"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCeremonyEvent, importCeremonyLines } from "@/lib/actions";
import { EVENT_TYPES } from "@/lib/event-types";

const icons: Record<string, ReactNode> = {
  casamento: <RingsIcon />,
  quinze: <CrownIcon />,
  formatura: <CapIcon />,
  corporativo: <CaseIcon />,
  aniversario: <CakeIcon />,
  bodas: <HeartsIcon />,
  outro: <SparkIcon />,
};

export function NovoEvento() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sequence, setSequence] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [created, setCreated] = useState<{ id: number; label: string } | null>(null);

  function choose(typeKey: string, label: string) {
    startTransition(async () => {
      const result = await createCeremonyEvent(typeKey);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (sequence) {
        setCreated({ id: result.id, label });
        toast.success(`${label} criado. Escolha o próximo.`);
        return;
      }
      router.push(`/cerimonial/evento/${result.id}`);
    });
  }

  function bring() {
    startTransition(async () => {
      const result = await importCeremonyLines(importText);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.ids.length === 1 ? "1 evento criado neste mês." : `${result.ids.length} eventos criados neste mês.`,
      );
      router.push("/cerimonial");
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link href="/cerimonial" className="text-sm font-semibold text-[#a6844a]">
        Calendário
      </Link>
      <h1 className="mt-4 font-heading text-5xl font-medium tracking-tight text-[#1c2434]">Novo evento</h1>
      <p className="mt-3 text-[15px] text-[#5c6670]">
        Escolha o tipo: as tarefas e o roteiro do dia já vêm prontos, e você ajusta depois.
      </p>

      <div className="mt-6 rounded-[1.25rem] border border-[#ead9bc] bg-[#fbf6ee] p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1c2434] text-[#f3d48a]">
            <SparkIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[#1c2434]">Tem vários eventos? Traga todos de uma vez</p>
            <p className="mt-0.5 text-sm text-[#5c6670]">
              Cole a lista ou mande foto, PDF ou planilha: a IA monta cada um, com tarefas e roteiro.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setImportOpen((open) => !open)}
            className="shrink-0 rounded-full border border-[#b08948] px-4 py-1.5 text-sm font-semibold text-[#a6844a]"
          >
            Trazer
          </button>
        </div>
        {importOpen ? (
          <div className="mt-4">
            <label className="text-sm font-semibold text-[#1c2434]" htmlFor="trazer-lista">
              Um evento por linha
            </label>
            <textarea
              id="trazer-lista"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              rows={4}
              placeholder={"Chá da Laura\nConfraternização da equipe"}
              className="mt-2 w-full rounded-2xl border border-[#ead9bc] bg-white px-3 py-2 text-sm text-[#1c2434]"
            />
            <button
              type="button"
              disabled={pending}
              onClick={bring}
              className="mt-2 rounded-full bg-[#1c2434] px-4 py-2 text-sm font-semibold text-white"
            >
              Trazer agora
            </button>
          </div>
        ) : null}
      </div>

      <p className="mt-5 text-sm text-[#5c6670]">
        Quer registrar eventos que já aconteceram?{" "}
        <button
          type="button"
          aria-pressed={sequence}
          onClick={() => setSequence((value) => !value)}
          className="font-semibold text-[#a6844a] underline decoration-[#a6844a]/40 underline-offset-2"
        >
          Registre um atrás do outro
        </button>
      </p>
      {sequence ? (
        <p className="mt-1 text-sm text-[#5c6670]">Cada tipo criado fica neste mês. Você escolhe o próximo em seguida.</p>
      ) : null}
      {created ? (
        <p className="mt-2 text-sm font-semibold text-[#1c2434]">
          {created.label} criado.{" "}
          <Link href={`/cerimonial/evento/${created.id}`} className="text-[#a6844a] underline">
            Ajustar tarefas e roteiro
          </Link>
        </p>
      ) : null}

      <h2 className="mt-8 text-base font-bold text-[#1c2434]">Tipo de evento</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {EVENT_TYPES.map((type) => (
          <button
            key={type.key}
            type="button"
            disabled={pending}
            onClick={() => choose(type.key, type.label)}
            className="flex min-h-36 flex-col items-start rounded-2xl border border-[#efe4d4] bg-white p-4 text-left shadow-[0_1px_0_rgba(28,36,52,0.03)] transition hover:border-[#d9c4a2] disabled:opacity-60"
          >
            <span className="text-[#b08948]">{icons[type.key]}</span>
            <span className="mt-3 font-bold text-[#1c2434]">{type.label}</span>
            <span className="mt-1 text-sm leading-snug text-[#8b939c]">
              {type.tasks} tarefas · {type.moments} momentos
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RingsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="11" cy="15" r="6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="15" r="6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M5 19h18l-1.5-9-4.5 4L14 7l-3 7-4.5-4L5 19z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CapIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M3 12 14 7l11 5-11 5L3 12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 14.5V19c2 2 10 2 12 0v-4.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CaseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 10V8a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CakeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M8 22h12v-7H8v7zM7 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 11c0-2 2-2 2-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function HeartsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M9 16c-2-2-4-3-4-5a3 3 0 0 1 5-2l1 1 1-1a3 3 0 0 1 5 2c0 2-2 3-4 5l-2 2-2-2z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 12c1-2 3-2 4-1 1 1 1 3-1 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
      <path d="M11 1.5 12.4 8 19 9.2 12.4 10.6 11 17.5 9.6 10.6 3 9.2 9.6 8 11 1.5z" />
    </svg>
  );
}

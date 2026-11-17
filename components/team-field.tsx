"use client";

import Link from "next/link";
import { useState } from "react";
import type { EventTeamMember } from "@/lib/types";

export type TeamOption = EventTeamMember & { nickname: string };

export function TeamField({
  id,
  people,
  selected,
  onChange,
}: {
  id: string;
  people: TeamOption[];
  selected: TeamOption[];
  onChange: (next: TeamOption[]) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  const matches = needle
    ? people
        .filter((person) => {
          if (selected.some((item) => item.id === person.id)) return false;
          const hay = `${person.name} ${person.nickname}`.toLocaleLowerCase("pt-BR");
          return hay.includes(needle);
        })
        .slice(0, 6)
    : [];

  return (
    <div>
      <label className="mt-3 block text-sm font-bold text-purple" htmlFor={id}>
        Time
      </label>
      <input
        id={id}
        value={query}
        onChange={(input) => setQuery(input.target.value)}
        placeholder="Nome de quem trabalha"
        autoComplete="off"
        role="combobox"
        aria-expanded={matches.length > 0}
        aria-controls={`${id}-opcoes`}
        className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm text-purple outline-none focus:border-teal"
      />
      {needle && matches.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Ninguém na equipe com esse nome.</p>
      ) : null}
      {matches.length > 0 ? (
        <ul id={`${id}-opcoes`} role="listbox" className="mt-2 overflow-hidden rounded-2xl border border-purple/15 bg-white">
          {matches.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                role="option"
                onClick={() => {
                  onChange([...selected, person]);
                  setQuery("");
                }}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-[#f6eefb]"
              >
                <span className="font-bold text-purple">
                  {person.name}
                  {person.nickname ? <span className="font-semibold text-muted-foreground"> · {person.nickname}</span> : null}
                </span>
                <span className="shrink-0 text-sm text-teal">{person.role || "Sem função"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {selected.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {selected.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f6eefb] px-3 py-2">
              <div className="min-w-0">
                <Link href={`/cerimonial/equipe/${person.id}`} className="font-bold text-purple">
                  {person.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {person.role || "Sem função"} · {person.whatsapp || "Sem WhatsApp"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange(selected.filter((item) => item.id !== person.id))}
                className="shrink-0 text-sm font-bold text-magenta"
              >
                Tirar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { TeamPerson } from "@/lib/types";

export function EquipeDesk({ people }: { people: TeamPerson[] }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
          <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Equipe</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Gerentes, assistentes e freelancers que trabalham com você.</p>
        </div>
        <Link href="/cerimonial/equipe/nova" className="rounded-full bg-teal px-4 py-2 text-sm font-extrabold text-white">
          + Pessoa
        </Link>
      </div>
      {people.length === 0 ? (
        <section className="mt-6 rounded-[1.5rem] bg-white p-6 ring-1 ring-purple/10">
          <h2 className="font-heading text-2xl text-purple italic">Cadastre quem trabalha com você</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            A ficha guarda foto, WhatsApp, nascimento, endereço, condução, Pix e tamanhos.
          </p>
          <Link href="/cerimonial/equipe/nova" className="mt-5 inline-flex rounded-full bg-purple px-5 py-2 text-sm font-bold text-white">
            Cadastrar a primeira pessoa
          </Link>
        </section>
      ) : (
        <ul className="mt-6 grid gap-3">
          {people.map((person) => (
            <li key={person.id} className="flex gap-4 rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
              {person.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.photo} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#f6eefb] text-lg font-extrabold text-teal">
                  {person.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 truncate font-bold text-purple">
                    {person.name}
                    {person.nickname ? <span className="font-semibold text-muted-foreground"> · {person.nickname}</span> : null}
                  </p>
                  <Link
                    href={`/cerimonial/equipe/${person.id}`}
                    className="shrink-0 rounded-full bg-purple px-4 py-1.5 text-sm font-bold text-white"
                  >
                    Editar
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">{[person.role, person.bond].filter(Boolean).join(" · ") || "Sem função"}</p>
                <p className="mt-1 text-sm text-purple">{person.whatsapp || "Sem WhatsApp"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-5 text-sm text-muted-foreground">
        Quem entra no app fica em{" "}
        <Link href="/cerimonial/ajustes/equipe" className="font-bold text-teal">
          Ajustes
        </Link>{" "}
        → Equipe com acesso.
      </p>
    </div>
  );
}

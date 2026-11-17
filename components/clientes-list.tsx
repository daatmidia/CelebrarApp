"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClientSummary } from "@/lib/types";

export function ClientesList({ clients }: { clients: ClientSummary[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("pt-BR");
    const digits = query.replace(/\D/g, "");
    if (!text && !digits) return clients;
    return clients.filter((client) => {
      const name = client.name.toLocaleLowerCase("pt-BR");
      const phone = client.phone.toLocaleLowerCase("pt-BR");
      const phoneDigits = client.phone.replace(/\D/g, "");
      return name.includes(text) || phone.includes(text) || (digits.length > 0 && phoneDigits.includes(digits));
    });
  }, [clients, query]);

  return (
    <div className="mt-4">
      <label className="sr-only" htmlFor="buscar-cliente">
        Buscar por nome ou telefone
      </label>
      <input
        id="buscar-cliente"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nome ou telefone"
        className="w-full rounded-2xl border border-purple/15 bg-white px-4 py-3 text-sm text-purple outline-none placeholder:text-muted-foreground focus:border-teal"
      />
      {clients.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Os clientes aparecem aqui quando você cria um evento.</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum cliente com esse nome ou telefone.</p>
      ) : (
        <ul className="mt-4 divide-y divide-purple/10 overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-purple/10">
          {filtered.map((client) => (
            <li key={client.id}>
              <Link href={`/cerimonial/clientes/${client.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f6eefb]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-purple">{client.name}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {client.phone || "Sem telefone"}
                    {" · "}
                    {client.eventCount === 1 ? "1 evento" : `${client.eventCount} eventos`}
                  </span>
                </span>
                <span className="text-teal" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

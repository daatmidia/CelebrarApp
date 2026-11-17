"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addEventSupplier } from "@/lib/actions";
import type { EventSupplier, EventSupplierOwner, SupplierRecord } from "@/lib/types";

export function EventSuppliers({
  ownerKind,
  ownerKey,
  suppliers,
  directory = [],
}: {
  ownerKind: EventSupplierOwner;
  ownerKey: string;
  suppliers: EventSupplier[];
  directory?: Pick<SupplierRecord, "id" | "name" | "category">[];
}) {
  const [items, setItems] = useState(suppliers);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const result = await addEventSupplier(ownerKind, ownerKey, name, role);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setItems(result.suppliers ?? []);
      setName("");
      setRole("");
      toast.success("Fornecedor adicionado.");
    });
  }

  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-label="Fornecedores do evento">
        <h2 className="font-heading text-2xl text-purple italic">Deste evento</h2>
        <ul className="mt-4 divide-y divide-purple/10">
          {items.map((supplier) => (
            <li key={supplier.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <p className="font-bold text-purple">{supplier.name}</p>
              <p className="text-sm text-muted-foreground">{supplier.role}</p>
            </li>
          ))}
        </ul>
      </section>
      <form
        className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <h2 className="font-heading text-2xl text-purple italic">Adicionar</h2>
        {directory.length > 0 ? (
          <div className="mt-4">
            <label className="block text-sm font-bold text-purple" htmlFor="fornecedor-agenda">
              Da sua agenda
            </label>
            <select
              id="fornecedor-agenda"
              defaultValue=""
              onChange={(event) => {
                const chosen = directory.find((item) => String(item.id) === event.target.value);
                if (!chosen) return;
                setName(chosen.name);
                setRole(chosen.category);
              }}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            >
              <option value="">Escolher quem está neste evento</option>
              {directory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.category ? ` — ${item.category}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-purple" htmlFor="fornecedor-nome">
              Nome
            </label>
            <input
              id="fornecedor-nome"
              value={name}
              onChange={(input) => setName(input.target.value)}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-purple" htmlFor="fornecedor-funcao">
              Função
            </label>
            <input
              id="fornecedor-funcao"
              value={role}
              onChange={(input) => setRole(input.target.value)}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button type="submit" disabled={pending} className="mt-4 rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          Adicionar
        </button>
      </form>
    </div>
  );
}

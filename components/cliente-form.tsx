"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveClient } from "@/lib/actions";
import type { ClientDetails } from "@/lib/types";

function formatCpf(digits: string) {
  const value = digits.replace(/\D/g, "").slice(0, 11);
  if (value.length !== 11) return digits;
  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function ClienteForm({ client }: { client: ClientDetails }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [cpf, setCpf] = useState(formatCpf(client.cpf));
  const [address, setAddress] = useState(client.address);

  function save() {
    startTransition(async () => {
      const result = await saveClient({ id: client.id, name, phone, cpf, address });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Dados do cliente salvos.");
      router.refresh();
    });
  }

  return (
    <div className="mt-5 space-y-4">
      <form
        className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <h2 className="font-heading text-2xl text-purple italic">Dados</h2>
        <div className="mt-4 grid gap-3">
          <Field label="Nome" id="cliente-nome">
            <input id="cliente-nome" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="Telefone" id="cliente-telefone">
            <input id="cliente-telefone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" className={fieldClass} />
          </Field>
          <Field label="CPF" id="cliente-cpf">
            <input id="cliente-cpf" value={cpf} onChange={(event) => setCpf(event.target.value)} inputMode="numeric" className={fieldClass} />
          </Field>
          <Field label="Endereço" id="cliente-endereco">
            <textarea id="cliente-endereco" value={address} onChange={(event) => setAddress(event.target.value)} rows={3} className={fieldClass} />
          </Field>
        </div>
        <button type="submit" disabled={pending} className="mt-4 rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          Salvar
        </button>
      </form>
      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-label="Eventos do cliente">
        <h2 className="font-heading text-2xl text-purple italic">Eventos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Contrato, parcelas e convidados ficam dentro de cada evento.</p>
        {client.events.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Este cliente ainda não tem evento.</p>
        ) : (
          <ul className="mt-4 divide-y divide-purple/10">
            {client.events.map((event) => (
              <li key={event.href} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-bold text-purple">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.typeLabel} · {formatDate(event.date)}
                  </p>
                </div>
                <Link href={event.href} className="text-sm font-bold text-teal">
                  Abrir evento
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const fieldClass = "mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm text-purple outline-none focus:border-teal";

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-purple" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

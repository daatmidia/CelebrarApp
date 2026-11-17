"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSuppliers } from "@/lib/actions";

const fieldClass = "mt-1 w-full rounded-2xl border border-purple/15 bg-white px-3 py-2 text-sm text-purple outline-none focus:border-teal";

const categories = [
  "Buffet",
  "Fotografia",
  "Filmagem",
  "Flores",
  "Decoração",
  "Música",
  "Som",
  "Iluminação",
  "Bolo e doces",
  "Bebidas",
  "Convites",
  "Beleza",
  "Trajes",
  "Local",
  "Transporte",
  "Cerimonial",
  "Outro",
];

export function FornecedorForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [notes, setNotes] = useState("");

  function save() {
    if (!category) {
      toast.error("Escolha a categoria.");
      return;
    }
    startTransition(async () => {
      const result = await saveSuppliers([{ name, category, contactName, phone, email, instagram, notes }]);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Fornecedor cadastrado.");
      router.push("/cerimonial/fornecedores");
      router.refresh();
    });
  }

  return (
    <form
      className="mt-5 space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <Field label="Nome" id="fornecedor-nome">
        <input id="fornecedor-nome" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
      </Field>
      <Field label="Categoria" id="fornecedor-categoria">
        <select id="fornecedor-categoria" value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}>
          <option value="">Escolha a categoria</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Field label="Contato (pessoa)" id="fornecedor-contato">
        <input id="fornecedor-contato" value={contactName} onChange={(event) => setContactName(event.target.value)} className={fieldClass} />
      </Field>
      <Field label="WhatsApp" id="fornecedor-whatsapp">
        <input id="fornecedor-whatsapp" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" className={fieldClass} />
      </Field>
      <Field label="E-mail" id="fornecedor-email">
        <input id="fornecedor-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
      </Field>
      <Field label="@instagram" id="fornecedor-instagram">
        <input
          id="fornecedor-instagram"
          value={instagram}
          onChange={(event) => setInstagram(event.target.value)}
          placeholder="@atelie"
          className={fieldClass}
        />
      </Field>
      <Field label="Observações" id="fornecedor-observacoes">
        <textarea id="fornecedor-observacoes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={fieldClass} />
      </Field>
      <button type="submit" disabled={pending} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
        Adicionar
      </button>
    </form>
  );
}

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

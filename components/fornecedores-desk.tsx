"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSuppliers } from "@/lib/actions";
import { parseSupplierList, supplierExamples } from "@/lib/supplier-parse";
import type { SupplierDraft, SupplierRecord } from "@/lib/types";

const chips = [
  { key: "whatsapp", label: "Contatos do WhatsApp" },
  { key: "caderno", label: "Foto do caderno" },
  { key: "planilha", label: "Planilha" },
  { key: "pdf", label: "PDF" },
] as const;

type Chip = (typeof chips)[number]["key"];

export function FornecedoresDesk({ suppliers }: { suppliers: SupplierRecord[] }) {
  const router = useRouter();
  const [chip, setChip] = useState<Chip>("caderno");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [review, setReview] = useState<SupplierDraft[] | null>(null);
  const [pending, startTransition] = useTransition();

  async function attach(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const name = file.name.toLowerCase();
    const textLike =
      file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".vcf");
    if (!textLike) {
      toast.error("Não consegui ler o texto desse arquivo. Cole os contatos na área acima.");
      return;
    }
    setText(await file.text());
    toast.success("Arquivo lido. Toque em Ler com IA para revisar.");
  }

  function readWithAi() {
    const result = parseSupplierList(text);
    if (!result.ok) {
      toast.error(result.error);
      setReview(null);
      return;
    }
    setReview(result.people);
  }

  function saveReview() {
    if (!review) return;
    startTransition(async () => {
      const result = await saveSuppliers(review);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(review.length === 1 ? "1 fornecedor salvo." : `${review.length} fornecedores salvos.`);
      setReview(null);
      setText("");
      setFileName("");
      router.refresh();
    });
  }

  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Traga a sua lista de fornecedores</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={chip === item.key}
              onClick={() => setChip(item.key)}
              className={
                chip === item.key
                  ? "rounded-full bg-teal px-3 py-1 text-xs font-bold text-white"
                  : "rounded-full bg-[#f6eefb] px-3 py-1 text-xs font-bold text-purple"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="lista-fornecedores">
          Lista de fornecedores
        </label>
        <textarea
          id="lista-fornecedores"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          placeholder={supplierExamples[chip]}
          className="mt-3 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm text-purple outline-none placeholder:text-muted-foreground focus:border-teal"
        />
        {fileName ? <p className="mt-2 text-xs text-muted-foreground">Arquivo: {fileName}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-full border border-purple/20 px-4 py-2 text-sm font-bold text-purple">
            Anexar arquivo
            <input
              type="file"
              accept=".txt,.csv,.tsv,.vcf,text/plain,text/csv,application/pdf,image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                void attach(file);
                event.target.value = "";
              }}
            />
          </label>
          <button type="button" onClick={readWithAi} className="rounded-full bg-purple px-4 py-2 text-sm font-bold text-white">
            Ler com IA
          </button>
        </div>
        {review ? (
          <div className="mt-5 border-t border-purple/10 pt-4">
            <h3 className="text-sm font-extrabold text-purple">Revise antes de salvar</h3>
            <ul className="mt-3 space-y-3">
              {review.map((person, index) => (
                <li key={`${person.name}-${index}`} className="grid gap-2 rounded-2xl bg-[#f6eefb] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <input
                    aria-label={`Nome ${index + 1}`}
                    value={person.name}
                    onChange={(event) => updateReview(setReview, index, "name", event.target.value)}
                    className="rounded-xl border border-purple/15 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    aria-label={`Categoria ${index + 1}`}
                    value={person.category}
                    onChange={(event) => updateReview(setReview, index, "category", event.target.value)}
                    placeholder="Categoria"
                    className="rounded-xl border border-purple/15 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    aria-label={`Telefone ${index + 1}`}
                    value={person.phone}
                    onChange={(event) => updateReview(setReview, index, "phone", event.target.value)}
                    placeholder="Telefone"
                    className="rounded-xl border border-purple/15 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setReview((current) => current?.filter((_, item) => item !== index) ?? null)}
                    className="text-sm font-bold text-note"
                  >
                    Tirar
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={pending || review.length === 0}
              onClick={saveReview}
              className="mt-3 rounded-full bg-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              Salvar fornecedores
            </button>
          </div>
        ) : null}
      </section>
      <p className="text-sm text-muted-foreground">
        Prefere cadastrar um por um?{" "}
        <Link href="/cerimonial/fornecedores/novo" className="font-bold text-teal">
          + Cadastrar fornecedor
        </Link>
      </p>
      {suppliers.length > 0 ? (
        <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-label="Agenda de fornecedores">
          <h2 className="font-heading text-2xl text-purple italic">Sua agenda</h2>
          <ul className="mt-3 divide-y divide-purple/10">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className="py-3">
                <p className="font-bold text-purple">{supplier.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[supplier.category, supplier.contactName, supplier.phone].filter(Boolean).join(" · ") || "Sem categoria"}
                </p>
                {supplier.email || supplier.instagram ? (
                  <p className="text-sm text-muted-foreground">
                    {[supplier.email, supplier.instagram ? `@${supplier.instagram}` : ""].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {supplier.notes ? <p className="mt-1 text-sm text-purple">{supplier.notes}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function updateReview(
  setReview: React.Dispatch<React.SetStateAction<SupplierDraft[] | null>>,
  index: number,
  key: keyof SupplierDraft,
  value: string,
) {
  setReview((current) => current?.map((person, item) => (item === index ? { ...person, [key]: value } : person)) ?? null);
}

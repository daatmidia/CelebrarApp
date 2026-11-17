import Link from "next/link";
import { FornecedorForm } from "@/components/fornecedor-form";

export const metadata = { title: "Cadastrar fornecedor" };

export default function NovoFornecedorPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href="/cerimonial/fornecedores" className="text-sm font-bold text-teal">
        Fornecedores
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Cadastrar fornecedor</h1>
      <FornecedorForm />
    </main>
  );
}

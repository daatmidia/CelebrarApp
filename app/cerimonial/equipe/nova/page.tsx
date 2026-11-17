import Link from "next/link";
import { EquipeForm } from "@/components/equipe-form";

export const metadata = { title: "Cadastrar pessoa" };

export default function NovaPessoaPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href="/cerimonial/equipe" className="text-sm font-bold text-teal">
        Equipe
      </Link>
      <p className="mt-3 text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Nova pessoa</h1>
      <p className="mt-2 text-sm text-muted-foreground">Foto, apelido, vínculo, tamanhos e a chave Pix ficam nesta ficha.</p>
      <EquipeForm />
    </main>
  );
}

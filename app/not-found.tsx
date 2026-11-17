import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <BrandLogo className="h-24 w-24" />
      <h1 className="mt-4 font-heading text-4xl text-purple italic">Página não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">Esse endereço não faz parte do casamento.</p>
      <Link href="/" className="mt-6 font-extrabold text-teal">
        Voltar para Celebrarapp
      </Link>
    </main>
  );
}

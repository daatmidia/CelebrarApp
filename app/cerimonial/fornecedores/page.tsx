import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { FornecedoresDesk } from "@/components/fornecedores-desk";
import { listSuppliers } from "@/lib/db";

export const metadata = { title: "Fornecedores" };

export default function FornecedoresPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <FornecedoresBody />
    </Suspense>
  );
}

async function FornecedoresBody() {
  await connection();
  await io();
  const suppliers = listSuppliers();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Fornecedores</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Sua agenda de fornecedores, com as suas notas. Em cada evento é só escolher quem está nele.
      </p>
      <FornecedoresDesk suppliers={suppliers} />
    </main>
  );
}

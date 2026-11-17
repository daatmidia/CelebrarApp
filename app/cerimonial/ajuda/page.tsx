import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { AjudaDesk } from "@/components/ajuda-desk";
import { listHelpMessages } from "@/lib/db";

export const metadata = { title: "Ajuda" };

export default function AjudaPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-5xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <AjudaBody />
    </Suspense>
  );
}

async function AjudaBody() {
  await connection();
  await io();
  const messages = listHelpMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <AjudaDesk messages={messages} />
    </main>
  );
}

import { Suspense } from "react";
import { io } from "next/cache";
import { connection } from "next/server";
import { EquipeDesk } from "@/components/equipe-desk";
import { listTeamPeople } from "@/lib/db";

export const metadata = { title: "Equipe" };

export default function EquipePage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <EquipeBody />
    </Suspense>
  );
}

async function EquipeBody() {
  await connection();
  await io();
  const people = listTeamPeople();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <EquipeDesk people={people} />
    </main>
  );
}

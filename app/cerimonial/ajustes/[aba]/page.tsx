import { Suspense } from "react";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AjustesDesk } from "@/components/ajustes-desk";
import { getCerimonialSettings, listAccessInvites, listPlannerWeddings } from "@/lib/db";
import { getOrigin } from "@/lib/origin";
import { formatBrl } from "@/lib/planner-docs";
import { isAjustesTab } from "@/lib/settings";

export const metadata = { title: "Ajustes" };

export default function AjustesPage({ params }: { params: Promise<{ aba: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto mt-8 h-80 max-w-3xl animate-pulse rounded-[1.75rem] bg-white" />}>
      <AjustesBody params={params} />
    </Suspense>
  );
}

async function AjustesBody({ params }: { params: Promise<{ aba: string }> }) {
  await connection();
  await io();
  const { aba } = await params;
  if (!isAjustesTab(aba)) notFound();
  const settings = getCerimonialSettings();
  const invites = listAccessInvites();
  const origin = await getOrigin();
  const wedding = listPlannerWeddings()[0];
  const sample = {
    cliente: wedding ? `${wedding.partnerA} e ${wedding.partnerB}` : "Helena e Miguel",
    evento: "Casamento",
    data: wedding?.dateLabel || "17 de abril de 2027",
    local: wedding ? `${wedding.venueName}` : "Haras Vale Verde",
    valor: formatBrl(1_800_000),
    cerimonial: settings.brandName,
    cidade: settings.city || "Chapecó",
    whatsapp: settings.whatsapp || "o WhatsApp da marca",
  };
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <AjustesDesk key={aba} aba={aba} settings={settings} invites={invites} origin={origin} sample={sample} />
    </main>
  );
}

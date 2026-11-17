"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { savePlannerDetails } from "@/lib/actions";
import { TeamField, type TeamOption } from "@/components/team-field";
import type { PlannerCouple, PlannerGuestStatus } from "@/lib/types";
import {
  DOCUMENT_ORDER,
  DOCUMENT_TITLES,
  type DocumentId,
  contractParagraphs,
  formatBrl,
  receiptParagraph,
} from "@/lib/planner-docs";
import { cn } from "cn";

const statusLabel: Record<PlannerGuestStatus, string> = {
  confirmado: "Confirmado",
  parcial: "Parcial",
  pendente: "Pendente",
  ausente: "Não vai",
};

export function CoupleFile({ couple, people }: { couple: PlannerCouple; people: TeamOption[] }) {
  const [tab, setTab] = useState<"noivos" | "documentos">("noivos");
  const [date, setDate] = useState(couple.weddingDate);
  const [startTime, setStartTime] = useState(couple.startTime);
  const [ceremony, setCeremony] = useState(couple.ceremony);
  const [team, setTeam] = useState<TeamOption[]>(
    couple.teamMembers.map((member) => people.find((person) => person.id === member.id) ?? { ...member, nickname: "" }),
  );
  const [savingTeam, startSavingTeam] = useTransition();
  const [documentId, setDocumentId] = useState<DocumentId | null>(null);
  const groups: { label: string; guests: PlannerCouple["guests"] }[] = [];
  for (const guest of couple.guests) {
    const current = groups.find((group) => group.label === guest.conviteLabel);
    if (current) current.guests.push(guest);
    else groups.push({ label: guest.conviteLabel, guests: [guest] });
  }
  const paid = couple.payments.reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Ficha do casal">
        <TabButton active={tab === "noivos"} onClick={() => setTab("noivos")}>
          Noivos
        </TabButton>
        <TabButton
          active={tab === "documentos"}
          onClick={() => {
            setTab("documentos");
          }}
        >
          Documentos
        </TabButton>
      </div>

      {tab === "noivos" ? (
        <div className="mt-4 space-y-4">
          <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
            <h2 className="font-heading text-2xl text-purple italic">Detalhes do casamento</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-purple" htmlFor="casal-data">
                  Data
                </label>
                <input
                  id="casal-data"
                  type="date"
                  value={date}
                  onChange={(input) => setDate(input.target.value)}
                  className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-purple" htmlFor="casal-hora">
                  Horário
                </label>
                <input
                  id="casal-hora"
                  value={startTime}
                  onChange={(input) => setStartTime(input.target.value)}
                  className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <label className="mt-3 block text-sm font-bold text-purple" htmlFor="casal-texto">
              Texto
            </label>
            <textarea
              id="casal-texto"
              value={ceremony}
              onChange={(input) => setCeremony(input.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Local" value={couple.venueName} />
              <Detail label="Cidade" value={couple.venueCity} />
              <Detail label="Endereço" value={couple.venueAddress} />
              <Detail label="Convidados" value={String(couple.guestCount)} />
              <Detail label="Confirmados" value={String(couple.confirmedCount)} />
              <Detail label="Pendentes" value={String(couple.pendingCount)} />
            </dl>
            <TeamField id="casal-time" people={people} selected={team} onChange={setTeam} />
            <button
              type="button"
              disabled={savingTeam}
              onClick={() => {
                startSavingTeam(async () => {
                  const result = await savePlannerDetails({
                    slug: couple.slug,
                    date,
                    startTime,
                    ceremony,
                    team: "",
                    teamMemberIds: team.map((person) => person.id),
                  });
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Evento atualizado.");
                });
              }}
              className="mt-3 rounded-full bg-purple px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              Salvar
            </button>
          </section>
          <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-label="Lista de convidados">
            <h2 className="font-heading text-2xl text-purple italic">Lista que os noivos cadastraram</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {couple.guestCount} convidados · {couple.confirmedCount} confirmaram · {couple.pendingCount} ainda sem resposta
            </p>
            <div className="mt-4 space-y-4">
              {groups.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-extrabold tracking-[0.16em] text-teal uppercase">{group.label}</h3>
                  <ul className="mt-2 divide-y divide-purple/10">
                    {group.guests.map((guest) => (
                      <li key={guest.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                        <div>
                          <p className="font-bold text-purple">{guest.name}</p>
                          <p className="text-sm text-muted-foreground">{guest.relation}</p>
                        </div>
                        <p className="text-sm">
                          <span
                            className={cn(
                              "font-extrabold",
                              guest.status === "confirmado" && "text-teal",
                              guest.status === "parcial" && "text-orange",
                              guest.status === "pendente" && "text-magenta",
                              guest.status === "ausente" && "text-muted-foreground",
                            )}
                          >
                            {statusLabel[guest.status]}
                          </span>
                          <span className="text-muted-foreground"> · {guest.note}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            O Celebrarapp gera estes documentos a partir do casamento cadastrado.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DOCUMENT_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={documentId === id}
                onClick={() => setDocumentId(id)}
                className={cn(
                  "rounded-2xl px-4 py-3 text-left text-sm font-bold ring-1 transition",
                  documentId === id ? "bg-purple text-white ring-purple" : "bg-white text-purple ring-purple/10 hover:ring-teal",
                )}
              >
                {DOCUMENT_TITLES[id]}
              </button>
            ))}
          </div>
          {documentId ? (
            <article className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" data-document={documentId}>
              <p className="text-xs font-extrabold tracking-[0.16em] text-teal uppercase">{couple.contract.studio}</p>
              <h2 className="mt-1 font-heading text-3xl text-purple italic">{DOCUMENT_TITLES[documentId]}</h2>
              {documentId === "contrato" ? (
                <div className="mt-4 space-y-3 text-sm leading-relaxed">
                  {contractParagraphs(couple).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
              {documentId === "recibos" ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm">
                    Total contratado {formatBrl(couple.contract.feeCents)} · recebido {formatBrl(paid)} · saldo{" "}
                    {formatBrl(couple.contract.feeCents - paid)}
                  </p>
                  {couple.payments.map((payment) => (
                    <section key={payment.id} className="rounded-2xl bg-secondary p-4">
                      <h3 className="font-bold text-purple">{payment.receiptNumber}</h3>
                      <p className="mt-2 text-sm leading-relaxed">{receiptParagraph(couple, payment)}</p>
                    </section>
                  ))}
                </div>
              ) : null}
              {documentId === "roteiro" ? (
                <ol className="mt-4 space-y-4">
                  {couple.script.map((line) => (
                    <li key={line.id}>
                      <p className="text-xs font-extrabold tracking-[0.14em] text-magenta">{line.timeLabel}</p>
                      <h3 className="font-bold text-purple">{line.title}</h3>
                      <p className="text-sm leading-relaxed">{line.body}</p>
                    </li>
                  ))}
                </ol>
              ) : null}
              {documentId === "fornecedores" ? (
                <ul className="mt-4 space-y-4">
                  {couple.vendors.map((vendor) => (
                    <li key={vendor.id} className="rounded-2xl bg-secondary p-4">
                      <p className="text-xs font-extrabold tracking-[0.14em] text-teal uppercase">{vendor.role}</p>
                      <h3 className="font-bold text-purple">{vendor.name}</h3>
                      <p className="text-sm">{vendor.contactName}</p>
                      <p className="text-sm">{vendor.phone}</p>
                      <p className="text-sm">{vendor.email}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{vendor.notes}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {documentId === "checklist" ? (
                <ul className="mt-4 space-y-2">
                  {couple.checklist.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 rounded-2xl bg-secondary px-4 py-3">
                      <span className={cn("text-xs font-extrabold uppercase", item.done ? "text-teal" : "text-orange")}>
                        {item.done ? "Feito" : "A fazer"}
                      </span>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ) : (
            <p className="text-sm text-muted-foreground">Escolha um documento para gerar.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-3 text-sm font-extrabold",
        active ? "bg-teal text-white" : "bg-white text-purple ring-1 ring-purple/10",
      )}
    >
      {children}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-extrabold tracking-[0.14em] text-teal uppercase">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

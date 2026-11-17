"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveGuestProfile } from "@/lib/actions";
import type { Convite, HostReport, RoomTable } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClass = "h-11 w-full rounded-2xl border border-input bg-white px-3 text-base text-purple";

export function HostReportCard({ report }: { report: HostReport }) {
  return (
    <section className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-extrabold text-purple">A festa agora</h3>
        <p className="text-xs text-muted-foreground">Atualiza sozinho enquanto esta porta está aberta.</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="Convidados" value={report.guests} />
        <Figure label="Confirmados" value={report.confirmed} />
        <Figure label="Ainda pendentes" value={report.pending} />
        <Figure label="Lugares livres" value={report.freeSeats} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Lugar livre = lugares definidos menos quem confirmou.</p>
      {report.tables.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma mesa com lugares definidos.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {report.tables.map((table) => (
            <li key={table.number} className="rounded-2xl bg-muted/70 px-3 py-2 text-sm">
              <span className="font-extrabold text-purple">Mesa {table.number}</span>
              <span className="text-muted-foreground">
                {" "}
                · {table.seats} {table.seats === 1 ? "lugar" : "lugares"} · {table.confirmed}{" "}
                {table.confirmed === 1 ? "confirmado" : "confirmados"} · {table.free} {table.free === 1 ? "livre" : "livres"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/70 px-3 py-3">
      <p className="text-2xl font-extrabold text-purple">{value}</p>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

export function GuestProfileForm({
  convites,
  room,
  onReport,
}: {
  convites: Convite[];
  room: RoomTable[];
  onReport: (report: HostReport) => void;
}) {
  const router = useRouter();
  const people = useMemo(
    () =>
      convites.flatMap((convite) =>
        convite.guests.map((guest) => ({
          guest,
          convite,
        })),
      ),
    [convites],
  );
  const [guestId, setGuestId] = useState<string>("novo");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [conviteId, setConviteId] = useState<string>("novo");
  const [conviteLabel, setConviteLabel] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [seats, setSeats] = useState("");
  const [pending, startTransition] = useTransition();

  function seatsFor(number: string) {
    const found = room.find((table) => String(table.number) === number);
    return found ? String(found.seats) : number ? "8" : "";
  }

  function loadGuest(value: string) {
    setGuestId(value);
    if (value === "novo") {
      setName("");
      setRelation("");
      setPhone("");
      setConviteId("novo");
      setConviteLabel("");
      setTableNumber("");
      setSeats("");
      return;
    }
    const found = people.find((item) => String(item.guest.id) === value);
    if (!found) return;
    setName(found.guest.name);
    setRelation(found.guest.relation);
    setPhone(found.guest.phoneDisplay ?? "");
    setConviteId(String(found.convite.id));
    setConviteLabel(found.convite.label);
    const mesa = found.convite.tableNumber ? String(found.convite.tableNumber) : "";
    setTableNumber(mesa);
    setSeats(seatsFor(mesa));
  }

  function chooseConvite(value: string) {
    setConviteId(value);
    if (value === "novo") return;
    const convite = convites.find((item) => String(item.id) === value);
    if (!convite) return;
    setConviteLabel(convite.label);
    const mesa = convite.tableNumber ? String(convite.tableNumber) : "";
    setTableNumber(mesa);
    setSeats(seatsFor(mesa));
  }

  return (
    <form
      className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await saveGuestProfile({
            guestId: guestId === "novo" ? null : Number(guestId),
            name,
            relation,
            phone,
            conviteId: conviteId === "novo" ? null : Number(conviteId),
            conviteLabel,
            tableNumber,
            seats,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          onReport(result.report);
          toast.success(guestId === "novo" ? "Convidado adicionado." : "Convidado salvo.");
          if (guestId === "novo") {
            setName("");
            setRelation("");
            setPhone("");
            setConviteLabel("");
            setTableNumber("");
            setSeats("");
          }
          router.refresh();
        });
      }}
    >
      <h3 className="font-extrabold text-purple">{guestId === "novo" ? "Novo convidado" : "Editar convidado"}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        A mesa vale para o convite inteiro. Quem confirma e o acompanhante continuam juntos.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="pessoa">Pessoa</Label>
          <select id="pessoa" className={`${fieldClass} mt-1`} value={guestId} onChange={(event) => loadGuest(event.target.value)}>
            <option value="novo">Nova pessoa</option>
            {people.map((item) => (
              <option key={item.guest.id} value={item.guest.id}>
                {item.guest.name} · {item.convite.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="nome-convidado">Nome</Label>
          <Input id="nome-convidado" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-11 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="relacao">Relação</Label>
          <Input id="relacao" value={relation} onChange={(event) => setRelation(event.target.value)} className="mt-1 h-11 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="11 90000-0000"
            className="mt-1 h-11 rounded-2xl"
          />
        </div>
        <div>
          <Label htmlFor="convite-pessoa">Convite</Label>
          <select id="convite-pessoa" className={`${fieldClass} mt-1`} value={conviteId} onChange={(event) => chooseConvite(event.target.value)}>
            <option value="novo">Novo convite</option>
            {convites.map((convite) => (
              <option key={convite.id} value={convite.id}>
                {convite.label}
              </option>
            ))}
          </select>
        </div>
        {conviteId === "novo" ? (
          <div className="sm:col-span-2">
            <Label htmlFor="novo-convite">Nome do convite</Label>
            <Input
              id="novo-convite"
              value={conviteLabel}
              onChange={(event) => setConviteLabel(event.target.value)}
              placeholder="Ex.: Família Souza"
              className="mt-1 h-11 rounded-2xl"
            />
          </div>
        ) : null}
        <div>
          <Label htmlFor="mesa-pessoa">Mesa</Label>
          <Input
            id="mesa-pessoa"
            value={tableNumber}
            onChange={(event) => {
              const value = event.target.value;
              setTableNumber(value);
              if (/^\d+$/.test(value)) setSeats(seatsFor(value));
            }}
            inputMode="numeric"
            className="mt-1 h-11 rounded-2xl"
          />
        </div>
        <div>
          <Label htmlFor="lugares">Lugares nesta mesa</Label>
          <Input
            id="lugares"
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
            inputMode="numeric"
            className="mt-1 h-11 rounded-2xl"
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="mt-4 h-11 rounded-full">
        {pending ? "Salvando…" : "Salvar convidado"}
      </Button>
    </form>
  );
}

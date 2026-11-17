"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addGuest,
  addMoment,
  createConvite,
  deleteConvite,
  deleteGuest,
  deleteMoment,
  loadHostReport,
  prepareDispatch,
  prepareReminder,
  updateConvite,
  updateGuest,
  updateMoment,
  updatePlaceLinks,
  updateScheduleItem,
  updateTable,
  addScheduleItem,
  deleteScheduleItem,
} from "@/lib/actions";
import type { Convite, DispatchRow, Guest, HostReport, Moment, PanelData, ScheduleItem } from "@/lib/types";
import { formatWhen } from "@/lib/text";
import { GuestProfileForm, HostReportCard } from "@/components/anfitriao-desk";
import { CheckinDesk } from "@/components/checkin-desk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";

const sections = [
  ["lista", "Lista"],
  ["respostas", "Respostas"],
  ["buffet", "Buffet"],
  ["musicas", "Músicas"],
  ["momentos", "Momentos"],
  ["mesas", "Mesas"],
  ["dia", "Dia"],
  ["whatsapp", "WhatsApp"],
  ["recepcao", "Recepção"],
] as const;

type Section = (typeof sections)[number][0];

const statusLabel: Record<Convite["status"], string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  parcial: "Parcial",
  ausente: "Não vai",
};

const doorClass =
  "flex min-h-52 flex-col items-start justify-between rounded-[1.75rem] bg-white p-6 text-left ring-1 ring-purple/10 transition hover:ring-teal";

export function PainelApp({ data }: { data: PanelData }) {
  const router = useRouter();
  const [door, setDoor] = useState<"anfitriao" | null>(null);
  const [booted, setBooted] = useState(false);
  const [report, setReport] = useState<HostReport>(data.hostReport);
  const reportToken = useRef(0);
  const reportKey = `${data.hostReport.guests}:${data.hostReport.confirmed}:${data.hostReport.pending}:${data.hostReport.freeSeats}`;

  useEffect(() => {
    const saved = sessionStorage.getItem("celebrar-porta");
    if (saved === "cerimonial") {
      sessionStorage.removeItem("celebrar-porta");
      router.replace("/cerimonial/entrar");
      return;
    }
    if (saved === "anfitriao") setDoor("anfitriao");
    setBooted(true);
  }, [router]);

  useEffect(() => {
    setReport(data.hostReport);
  }, [reportKey, data]);

  useEffect(() => {
    if (door !== "anfitriao") return;
    let cancel = false;
    const pull = async () => {
      const token = ++reportToken.current;
      const next = await loadHostReport();
      if (!cancel && token === reportToken.current) setReport(next);
    };
    const timer = window.setInterval(pull, 4000);
    document.addEventListener("visibilitychange", pull);
    void pull();
    return () => {
      cancel = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [door]);

  function openHost() {
    sessionStorage.setItem("celebrar-porta", "anfitriao");
    setDoor("anfitriao");
  }

  if (!booted) return <div className="h-64 animate-pulse rounded-[1.75rem] bg-white" />;

  if (!door) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/cerimonial/entrar" aria-label="Cerimonial" className={doorClass}>
          <span className="text-xs font-extrabold tracking-[0.18em] text-teal uppercase">Entrar</span>
          <span className="font-heading text-4xl text-purple italic">Cerimonial</span>
          <span className="text-sm text-muted-foreground">Calendário do mês e os documentos de cada casal.</span>
        </Link>
        <button type="button" aria-label="Anfitrião" onClick={openHost} className={doorClass}>
          <span className="text-xs font-extrabold tracking-[0.18em] text-teal uppercase">Entrar</span>
          <span className="font-heading text-4xl text-purple italic">Anfitrião</span>
          <span className="text-sm text-muted-foreground">Convidados, mesas, RSVP e o dia da festa.</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading text-3xl text-purple italic">Anfitrião</h2>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full"
          onClick={() => {
            sessionStorage.removeItem("celebrar-porta");
            setDoor(null);
          }}
        >
          Trocar porta
        </Button>
      </div>
      <div className="space-y-4">
        <HostReportCard report={report} />
        <GuestProfileForm
          convites={data.convites}
          room={data.room}
          onReport={(next) => {
            reportToken.current += 1;
            setReport(next);
          }}
        />
        <CoupleTools data={data} />
      </div>
    </div>
  );
}

function CoupleTools({ data }: { data: PanelData }) {
  const [section, setSection] = useState<Section>("lista");
  useEffect(() => {
    const saved = sessionStorage.getItem("celebrar-painel");
    if (sections.some(([id]) => id === saved)) setSection(saved as Section);
  }, []);
  function choose(next: Section) {
    sessionStorage.setItem("celebrar-painel", next);
    setSection(next);
  }
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-5">
        <Stat label="Convidados" value={data.stats.guests} />
        <Stat label="Convites" value={data.stats.convites} />
        <Stat label="Responderam" value={data.stats.responded} />
        <Stat label="Pendentes" value={data.stats.pending} />
        <Stat label="Entraram" value={data.stats.checkedIn} />
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {sections.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => choose(id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-sm font-extrabold",
              section === id ? "bg-teal text-white" : "bg-white text-purple ring-1 ring-purple/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {section === "lista" ? <GuestList convites={data.convites} /> : null}
        {section === "respostas" ? <Responses data={data} /> : null}
        {section === "buffet" ? <Buffet data={data} /> : null}
        {section === "musicas" ? <Songs data={data} /> : null}
        {section === "momentos" ? <MomentsEditor moments={data.moments} /> : null}
        {section === "mesas" ? <Tables convites={data.convites} /> : null}
        {section === "dia" ? <DayDesk data={data} /> : null}
        {section === "whatsapp" ? <Reminders data={data} /> : null}
        {section === "recepcao" ? <CheckinDesk recent={data.recentCheckins} /> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-purple/10">
      <p className="text-2xl font-extrabold text-purple">{value}</p>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

function GuestList({ convites }: { convites: Convite[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [cap, setCap] = useState("0");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <form
        className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await createConvite(label, Number(cap));
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setLabel("");
            setCap("0");
            toast.success("Convite criado.");
            router.refresh();
          });
        }}
      >
        <h2 className="font-extrabold text-purple">Novo convite</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ex.: Família Souza" className="h-11 rounded-2xl" />
          <Input value={cap} onChange={(event) => setCap(event.target.value)} inputMode="numeric" aria-label="Limite de acompanhantes" className="h-11 rounded-2xl" />
          <Button type="submit" disabled={pending} className="h-11 rounded-full">
            Adicionar
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">O número é o limite de acompanhantes extras, além dos nomes.</p>
      </form>
      {convites.length === 0 ? <Empty>Nenhum convite ainda.</Empty> : convites.map((convite) => <ConviteCard key={convite.id} convite={convite} />)}
    </div>
  );
}

function ConviteCard({ convite }: { convite: Convite }) {
  const router = useRouter();
  const [label, setLabel] = useState(convite.label);
  const [cap, setCap] = useState(String(convite.plusOneCap));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <article className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={convite.status} />
          {convite.tableNumber ? (
            <span className="rounded-full bg-orange px-2.5 py-0.5 text-xs font-extrabold text-white">
              Mesa {convite.tableNumber}
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          {convite.guests.filter((guest) => guest.kind === "plus_one").length} acompanhante(s) incluído(s)
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          <Label htmlFor={`convite-${convite.id}`}>Convite</Label>
          <Input id={`convite-${convite.id}`} value={label} onChange={(event) => setLabel(event.target.value)} className="mt-1 h-11 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor={`cap-${convite.id}`}>+1</Label>
          <Input id={`cap-${convite.id}`} value={cap} onChange={(event) => setCap(event.target.value)} inputMode="numeric" className="mt-1 h-11 rounded-2xl" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-10 rounded-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateConvite(convite.id, label, Number(cap));
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Convite salvo.");
                router.refresh();
              }
            })
          }
        >
          Salvar convite
        </Button>
        <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => setConfirmDelete(true)}>
          Excluir convite
        </Button>
        {confirmDelete ? (
          <Button
            type="button"
            variant="destructive"
            className="h-10 rounded-full"
            onClick={() =>
              startTransition(async () => {
                const result = await deleteConvite(convite.id);
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Convite excluído.");
                  router.refresh();
                }
              })
            }
          >
            Confirmar exclusão
          </Button>
        ) : null}
      </div>
      <ul className="mt-4 space-y-3">
        {convite.guests.map((guest) => (
          <GuestRow key={guest.id} guest={guest} />
        ))}
      </ul>
      <NewGuest conviteId={convite.id} />
    </article>
  );
}

function GuestRow({ guest }: { guest: Guest }) {
  const router = useRouter();
  const [name, setName] = useState(guest.name);
  const [relation, setRelation] = useState(guest.relation);
  const [phone, setPhone] = useState(guest.phoneDisplay ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl bg-muted/60 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{guest.kind === "plus_one" ? "Acompanhante" : "Nome do convite"}</Badge>
        {guest.checkedInAt ? <Badge className="bg-purple text-white">Entrou</Badge> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Nome" className="h-11 rounded-2xl bg-white" />
        <Input value={relation} onChange={(event) => setRelation(event.target.value)} aria-label="Relação" className="h-11 rounded-2xl bg-white" />
        <Input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Telefone" placeholder="11 90000-0000" className="h-11 rounded-2xl bg-white" />
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateGuest(guest.id, name, relation, phone);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Convidado salvo.");
                router.refresh();
              }
            })
          }
        >
          Salvar
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-full text-magenta"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteGuest(guest.id);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Convidado removido.");
                router.refresh();
              }
            })
          }
        >
          Excluir
        </Button>
      </div>
    </li>
  );
}

function NewGuest({ conviteId }: { conviteId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();
  if (!open) {
    return (
      <Button type="button" variant="outline" className="mt-3 h-10 rounded-full" onClick={() => setOpen(true)}>
        Adicionar pessoa
      </Button>
    );
  }
  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await addGuest(conviteId, name, relation, phone);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Pessoa adicionada.");
            setName("");
            setRelation("");
            setPhone("");
            setOpen(false);
            router.refresh();
          }
        });
      }}
    >
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="h-11 rounded-2xl" required />
      <Input value={relation} onChange={(event) => setRelation(event.target.value)} placeholder="Relação, ex.: primo" className="h-11 rounded-2xl" />
      <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Telefone com DDD" className="h-11 rounded-2xl" />
      <Button type="submit" disabled={pending} className="h-11 rounded-full">
        Salvar pessoa
      </Button>
    </form>
  );
}

function Responses({ data }: { data: PanelData }) {
  const [filter, setFilter] = useState<"todos" | Convite["status"] | "entrou">("todos");
  const rows = data.convites.flatMap((convite) =>
    convite.guests.map((guest) => ({ guest, convite })),
  );
  const visible = rows.filter(({ guest, convite }) => {
    if (filter === "todos") return true;
    if (filter === "entrou") return Boolean(guest.checkedInAt);
    return convite.status === filter;
  });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">
        {(["todos", "pendente", "confirmado", "parcial", "ausente", "entrou"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold",
              filter === item ? "bg-purple text-white" : "bg-white text-purple ring-1 ring-purple/10",
            )}
          >
            {item === "todos" ? "Todos" : item === "entrou" ? "Já entrou" : statusLabel[item]}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <Empty>Nenhuma resposta neste filtro.</Empty> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {visible.map(({ guest, convite }) => (
          <li key={guest.id} className="rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold text-purple">{guest.name}</p>
                <p className="text-sm text-muted-foreground">{convite.label}</p>
              </div>
              <StatusBadge status={convite.status} />
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {data.moments.map((moment) => {
                const answer = guest.moments.find((item) => item.momentId === moment.id);
                const label = answer == null ? "—" : answer.attending ? "Sim" : "Não";
                return (
                  <li key={moment.id}>
                    <span className={answer?.attending ? "font-bold text-teal" : "text-muted-foreground"}>{label}</span>
                    {" · "}
                    {moment.name}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Buffet({ data }: { data: PanelData }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Entre quem já confirmou pelo menos um momento.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {data.dietary.counts.map((item) => (
          <div key={item.key} className="rounded-2xl bg-white p-3 ring-1 ring-purple/10">
            <p className="text-3xl font-extrabold text-magenta">{item.count}</p>
            <p className="text-sm font-bold text-purple">{item.label}</p>
          </div>
        ))}
      </div>
      {data.dietary.notes.length === 0 ? (
        <Empty>Nenhuma restrição anotada ainda.</Empty>
      ) : (
        <ul className="space-y-2">
          {data.dietary.notes.map((note) => (
            <li key={`${note.name}-${note.detail}`} className="rounded-2xl bg-white p-4 ring-1 ring-purple/10">
              <p className="font-extrabold text-purple">{note.name}</p>
              <p className="text-sm">{note.detail}</p>
              <p className="text-xs text-muted-foreground">
                {note.conviteLabel} · {note.moments}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Songs({ data }: { data: PanelData }) {
  if (data.songs.length === 0) return <Empty>A pista ainda está sem pedidos.</Empty>;
  return (
    <ul className="space-y-2">
      {data.songs.map((song) => (
        <li key={song.conviteId} className="rounded-2xl bg-white p-4 ring-1 ring-purple/10">
          <p className="font-heading text-2xl text-purple italic">“{song.song}”</p>
          <p className="text-sm font-semibold text-magenta">{song.conviteLabel}</p>
        </li>
      ))}
    </ul>
  );
}

function MomentsEditor({ moments }: { moments: Moment[] }) {
  return (
    <div className="space-y-3">
      {moments.map((moment) => (
        <MomentCard key={moment.id} moment={moment} canDelete={moments.length > 1} />
      ))}
      <NewMoment />
    </div>
  );
}

function MomentCard({ moment, canDelete }: { moment: Moment; canDelete: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(moment.name);
  const [timeLabel, setTimeLabel] = useState(moment.timeLabel);
  const [description, setDescription] = useState(moment.description);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateMoment(moment.id, name, timeLabel, description);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Momento salvo.");
            router.refresh();
          }
        });
      }}
    >
      <p className="text-sm font-extrabold text-teal">{moment.headcount} confirmados</p>
      <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Nome do momento" className="mt-2 h-11 rounded-2xl" />
      <Input value={timeLabel} onChange={(event) => setTimeLabel(event.target.value)} aria-label="Horário" className="mt-2 h-11 rounded-2xl" />
      <Textarea value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Descrição" className="mt-2 rounded-2xl" />
      <div className="mt-3 flex gap-2">
        <Button type="submit" disabled={pending} className="h-10 rounded-full">
          Salvar
        </Button>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-full text-magenta"
            onClick={() =>
              startTransition(async () => {
                const result = await deleteMoment(moment.id);
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Momento removido.");
                  router.refresh();
                }
              })
            }
          >
            Excluir
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function NewMoment() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await addMoment(name, timeLabel, description);
          if (!result.ok) toast.error(result.error);
          else {
            setName("");
            setTimeLabel("");
            setDescription("");
            toast.success("Momento adicionado.");
            router.refresh();
          }
        });
      }}
    >
      <h3 className="font-extrabold text-purple">Novo momento</h3>
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="mt-2 h-11 rounded-2xl" />
      <Input value={timeLabel} onChange={(event) => setTimeLabel(event.target.value)} placeholder="Quando" className="mt-2 h-11 rounded-2xl" />
      <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição" className="mt-2 rounded-2xl" />
      <Button type="submit" disabled={pending} className="mt-3 h-11 rounded-full">
        Adicionar momento
      </Button>
    </form>
  );
}

function Reminders({ data }: { data: PanelData }) {
  const router = useRouter();
  const [onlyFresh, setOnlyFresh] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const rows = data.reminders.filter((row) => (onlyFresh ? !row.reminderPreparedAt : true));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        O botão abre o WhatsApp com a mensagem pronta. O envio acontece na conversa — não é um chatbot.
        Guardamos o horário em que o lembrete foi preparado.
      </p>
      <label className="flex items-center gap-2 text-sm font-bold text-purple">
        <input type="checkbox" checked={onlyFresh} onChange={(event) => setOnlyFresh(event.target.checked)} />
        Só quem ainda não recebeu lembrete
      </label>
      {link ? (
        <p className="rounded-2xl bg-orange/10 p-3 text-sm">
          O navegador bloqueou a janela.{" "}
          <a className="font-extrabold text-teal" href={link} target="_blank" rel="noreferrer">
            Abrir conversa
          </a>
        </p>
      ) : null}
      {rows.length === 0 ? <Empty>Todo mundo já respondeu.</Empty> : null}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.guestId} className="rounded-2xl bg-white p-4 ring-1 ring-purple/10">
            <p className="font-extrabold text-purple">{row.name}</p>
            <p className="text-sm text-muted-foreground">
              {row.conviteLabel}
              {row.phoneDisplay ? ` · ${row.phoneDisplay}` : " · sem telefone"}
            </p>
            {row.reminderPreparedAt ? (
              <p className="text-sm font-semibold text-magenta">Lembrete preparado em {formatWhen(row.reminderPreparedAt)}</p>
            ) : null}
            {row.phone ? (
              <Button
                type="button"
                className="mt-3 h-11 rounded-full"
                disabled={pendingId === row.guestId}
                onClick={() => {
                  setPendingId(row.guestId);
                  void prepareReminder(row.guestId).then((result) => {
                    setPendingId(null);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    const opened = window.open(result.url, "_blank", "noopener,noreferrer");
                    setLink(opened ? null : result.url);
                    toast.success("Lembrete preparado.");
                    router.refresh();
                  });
                }}
              >
                {row.reminderPreparedAt ? "Abrir de novo" : "Abrir WhatsApp"}
              </Button>
            ) : (
              <p className="mt-2 text-sm">Sem telefone neste nome. Vale pedir o número para alguém da família.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tables({ convites }: { convites: Convite[] }) {
  const groups = new Map<string, Convite[]>();
  for (const convite of [...convites].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))) {
    const key = convite.tableNumber ? String(convite.tableNumber) : "sem";
    groups.set(key, [...(groups.get(key) ?? []), convite]);
  }
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === "sem") return 1;
    if (b === "sem") return -1;
    return Number(a) - Number(b);
  });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Quem confirmou e o acompanhante sentam na mesma mesa. O sistema guarda um número só para o convite inteiro.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => (
          <article key={key} className="rounded-[1.75rem] bg-white p-4 ring-1 ring-purple/10">
            <h3 className="font-heading text-2xl text-purple italic">{key === "sem" ? "Sem mesa" : `Mesa ${key}`}</h3>
            <div className="mt-3 space-y-4">
              {(groups.get(key) ?? []).map((convite) => (
                <div key={convite.id}>
                  <p className="font-extrabold text-purple">{convite.label}</p>
                  <SeatedNames convite={convite} />
                  <TableEditor convite={convite} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SeatedNames({ convite }: { convite: Convite }) {
  const seated = convite.guests.filter((guest) => guest.moments.some((moment) => moment.attending));
  if (seated.length === 0) {
    return <p className="mt-1 text-sm text-muted-foreground">Aguardando confirmação. A mesa já está reservada para o convite.</p>;
  }
  return (
    <ul className="mt-1 space-y-1 text-sm">
      {seated.map((guest) => (
        <li key={guest.id} className="text-purple">
          <span className="font-semibold">{guest.name}</span>
          {guest.kind === "plus_one" ? <span className="text-magenta"> · acompanhante</span> : null}
        </li>
      ))}
    </ul>
  );
}

function TableEditor({ convite }: { convite: Convite }) {
  const router = useRouter();
  const [value, setValue] = useState(convite.tableNumber ? String(convite.tableNumber) : "");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateTable(convite.id, value);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success(value ? `Mesa ${value} salva.` : "Mesa removida.");
            router.refresh();
          }
        });
      }}
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        inputMode="numeric"
        aria-label={`Mesa de ${convite.label}`}
        placeholder="Nº"
        className="h-10 w-20 rounded-2xl"
      />
      <Button type="submit" disabled={pending} className="h-10 rounded-full">
        Salvar mesa
      </Button>
    </form>
  );
}

function DayDesk({ data }: { data: PanelData }) {
  return (
    <div className="space-y-4">
      <PlaceLinks mapsUrl={data.wedding.mapsUrl} wazeUrl={data.wedding.wazeUrl} />
      <ScheduleEditor items={data.schedule} />
      <DispatchList rows={data.dispatches} />
    </div>
  );
}

function PlaceLinks({ mapsUrl, wazeUrl }: { mapsUrl: string; wazeUrl: string }) {
  const router = useRouter();
  const [maps, setMaps] = useState(mapsUrl);
  const [waze, setWaze] = useState(wazeUrl);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updatePlaceLinks(maps, waze);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Links do lugar salvos.");
            router.refresh();
          }
        });
      }}
    >
      <h2 className="font-extrabold text-purple">Como chegar</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        O pin do demo é a Pousada Vale Verde, na estrada de Tiradentes. O haras do convite é fictício.
      </p>
      <Label htmlFor="maps" className="mt-3">
        Google Maps
      </Label>
      <Input id="maps" value={maps} onChange={(event) => setMaps(event.target.value)} className="mt-1 h-11 rounded-2xl" />
      <Label htmlFor="waze" className="mt-3">
        Waze
      </Label>
      <Input id="waze" value={waze} onChange={(event) => setWaze(event.target.value)} className="mt-1 h-11 rounded-2xl" />
      <Button type="submit" disabled={pending} className="mt-3 h-11 rounded-full">
        Salvar links
      </Button>
    </form>
  );
}

function ScheduleEditor({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="space-y-3">
      <h2 className="font-extrabold text-purple">Cronograma do sábado</h2>
      <p className="text-sm text-muted-foreground">
        A cerimônia do fim de semana usa o mesmo 16h30. Estes horários entram na mensagem de quem confirmou.
      </p>
      {items.map((item) => (
        <ScheduleRow key={item.id} item={item} canDelete={items.length > 1} />
      ))}
      <NewScheduleItem />
    </div>
  );
}

function ScheduleRow({ item, canDelete }: { item: ScheduleItem; canDelete: boolean }) {
  const router = useRouter();
  const [timeLabel, setTimeLabel] = useState(item.timeLabel);
  const [name, setName] = useState(item.name);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-2 rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10 sm:grid-cols-[7rem_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateScheduleItem(item.id, timeLabel, name);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Horário salvo.");
            router.refresh();
          }
        });
      }}
    >
      <Input value={timeLabel} onChange={(event) => setTimeLabel(event.target.value)} aria-label="Hora" className="h-11 rounded-2xl" />
      <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Momento" className="h-11 rounded-2xl" />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-11 rounded-full">
          Salvar
        </Button>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-full text-magenta"
            onClick={() =>
              startTransition(async () => {
                const result = await deleteScheduleItem(item.id);
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Horário removido.");
                  router.refresh();
                }
              })
            }
          >
            Excluir
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function NewScheduleItem() {
  const router = useRouter();
  const [timeLabel, setTimeLabel] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-2 rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10 sm:grid-cols-[7rem_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await addScheduleItem(timeLabel, name);
          if (!result.ok) toast.error(result.error);
          else {
            setTimeLabel("");
            setName("");
            toast.success("Horário adicionado.");
            router.refresh();
          }
        });
      }}
    >
      <Input value={timeLabel} onChange={(event) => setTimeLabel(event.target.value)} placeholder="20h00" className="h-11 rounded-2xl" />
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Festa" className="h-11 rounded-2xl" />
      <Button type="submit" disabled={pending} className="h-11 rounded-full">
        Adicionar
      </Button>
    </form>
  );
}

function DispatchList({ rows }: { rows: DispatchRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [link, setLink] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <h2 className="font-extrabold text-purple">Mensagem para quem confirmou</h2>
      <p className="text-sm text-muted-foreground">
        Preparar disparo guarda o texto e o horário. Se houver telefone, abre o WhatsApp com essa mensagem. O envio continua na conversa — não há API.
      </p>
      {link ? (
        <p className="rounded-2xl bg-orange/10 p-3 text-sm">
          O navegador bloqueou a janela.{" "}
          <a className="font-extrabold text-teal" href={link} target="_blank" rel="noreferrer">
            Abrir conversa
          </a>
        </p>
      ) : null}
      {rows.length === 0 ? <Empty>Ninguém confirmou presença ainda.</Empty> : null}
      <ul className="space-y-3">
        {rows.map((row) => {
          const text = row.storedMessage ?? row.message;
          return (
            <li key={row.guestId} className="rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
              <p className="font-extrabold text-purple">{row.name}</p>
              <p className="text-sm text-muted-foreground">
                {row.conviteLabel}
                {row.tableNumber ? ` · Mesa ${row.tableNumber}` : " · sem mesa"}
                {row.phoneDisplay ? ` · ${row.phoneDisplay}` : " · sem telefone"}
              </p>
              {row.preparedAt ? (
                <p className="text-sm font-semibold text-magenta">Disparo preparado em {formatWhen(row.preparedAt)}</p>
              ) : null}
              <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-muted/70 p-3 font-sans text-sm text-purple">{text}</pre>
              <Button
                type="button"
                className="mt-3 h-11 rounded-full"
                disabled={pendingId === row.guestId}
                onClick={() => {
                  setPendingId(row.guestId);
                  void prepareDispatch(row.guestId).then((result) => {
                    setPendingId(null);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    if (result.url) {
                      const opened = window.open(result.url, "_blank", "noopener,noreferrer");
                      setLink(opened ? null : result.url);
                    } else {
                      setLink(null);
                      toast.message("Mensagem guardada. Este nome está sem telefone.");
                    }
                    toast.success("Disparo preparado.");
                    router.refresh();
                  });
                }}
              >
                {row.preparedAt ? "Preparar de novo" : "Preparar disparo"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: Convite["status"] }) {
  const className =
    status === "confirmado"
      ? "bg-teal text-white"
      : status === "parcial"
        ? "bg-magenta text-white"
        : status === "ausente"
          ? "bg-purple/10 text-purple"
          : "bg-orange text-white";
  return <Badge className={className}>{statusLabel[status]}</Badge>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[1.5rem] bg-white p-5 text-sm text-muted-foreground ring-1 ring-purple/10">{children}</p>;
}

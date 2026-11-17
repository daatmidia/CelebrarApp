"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveCeremonyEvent } from "@/lib/actions";
import type { CeremonyEvent, CeremonyTask } from "@/lib/types";
import { TeamField, type TeamOption } from "@/components/team-field";

export function EventEditor({ event, people }: { event: CeremonyEvent; people: TeamOption[] }) {
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.date);
  const [startTime, setStartTime] = useState(event.startTime);
  const [place, setPlace] = useState(event.place);
  const [team, setTeam] = useState<TeamOption[]>(
    event.teamMembers.map((member) => people.find((person) => person.id === member.id) ?? { ...member, nickname: "" }),
  );
  const [tasks, setTasks] = useState<CeremonyTask[]>(event.tasks);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const horario = startTime.trim();
      const moments = event.moments.length
        ? event.moments.map((moment, index) => (index === 0 ? { ...moment, timeLabel: horario || "Horário a definir" } : moment))
        : horario
          ? [{ timeLabel: horario, title: "Início", body: "" }]
          : event.moments;
      const result = await saveCeremonyEvent({
        id: event.id,
        title,
        date,
        place,
        team: "",
        teamMemberIds: team.map((person) => person.id),
        tasks,
        moments,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Evento atualizado.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <p className="text-xs font-extrabold tracking-[0.16em] text-teal uppercase">{event.typeLabel}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {tasks.length} tarefas · {event.moments.length} momentos. Ajuste o que precisar.
        </p>
        <label className="mt-4 block text-sm font-bold text-purple" htmlFor="evento-nome">
          Nome
        </label>
        <input
          id="evento-nome"
          value={title}
          onChange={(input) => setTitle(input.target.value)}
          className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-purple" htmlFor="evento-data">
              Data
            </label>
            <input
              id="evento-data"
              type="date"
              value={date}
              onChange={(input) => setDate(input.target.value)}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-purple" htmlFor="evento-local">
              Local
            </label>
            <input
              id="evento-local"
              value={place}
              onChange={(input) => setPlace(input.target.value)}
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2"
            />
          </div>
        </div>
            <label className="mt-3 block text-sm font-bold text-purple" htmlFor="evento-hora">
              Horário
            </label>
            <input
              id="evento-hora"
              value={startTime}
              onChange={(input) => setStartTime(input.target.value)}
              placeholder="14h00"
              className="mt-1 w-full rounded-2xl border border-purple/15 px-3 py-2 text-sm"
            />
        <TeamField id="evento-time" people={people} selected={team} onChange={setTeam} />
      </div>

      <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-label="Tarefas">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-2xl text-purple italic">Tarefas</h2>
          <button
            type="button"
            className="text-sm font-bold text-teal"
            onClick={() => setTasks((current) => [...current, { label: "", done: false }])}
          >
            Nova tarefa
          </button>
        </div>
        <ul className="mt-3 space-y-2" data-tasks={tasks.length}>
          {tasks.map((task, index) => (
            <li key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.done}
                aria-label={`Concluir ${task.label || "tarefa"}`}
                onChange={(input) =>
                  setTasks((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, done: input.target.checked } : item)))
                }
              />
              <input
                value={task.label}
                aria-label={`Tarefa ${index + 1}`}
                onChange={(input) =>
                  setTasks((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, label: input.target.value } : item)))
                }
                className="min-w-0 flex-1 rounded-xl border border-purple/10 px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="text-xs font-bold text-magenta"
                onClick={() => setTasks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                Tirar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={save} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white">
          Salvar
        </button>
        <Link href="/cerimonial" className="rounded-full px-5 py-2 text-sm font-bold text-purple ring-1 ring-purple/15">
          Voltar ao calendário
        </Link>
      </div>
    </div>
  );
}

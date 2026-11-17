"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { moveRoomTable } from "@/lib/actions";
import { ceremonialGroups } from "@/lib/text";
import type { Convite, RoomTable } from "@/lib/types";
import { cn } from "cn";

const landmarks = [
  { id: "noivos", label: "Noivos", className: "left-1/2 top-[7%] w-28 -translate-x-1/2 bg-purple text-white" },
  { id: "buffet", label: "Buffet", className: "left-[4%] top-[38%] w-20 bg-orange text-white" },
  { id: "pista", label: "Pista", className: "left-1/2 top-[74%] h-12 w-36 -translate-x-1/2 bg-teal text-white" },
  { id: "entrada", label: "Entrada", className: "bottom-2 left-1/2 h-10 w-28 -translate-x-1/2 bg-magenta text-white" },
] as const;

export function CerimonialDesk({
  convites,
  room,
  onRoom,
}: {
  convites: Convite[];
  room: RoomTable[];
  onRoom: (room: RoomTable[]) => void;
}) {
  const [filter, setFilter] = useState<number | null>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    number: number;
    dx: number;
    dy: number;
    moved: boolean;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [, startTransition] = useTransition();
  const groups = ceremonialGroups(convites).filter((group) => filter == null || group.tableNumber === filter);

  function point(event: React.PointerEvent) {
    const rect = floorRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 50, y: 50 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }

  function move(number: number, x: number, y: number) {
    const next = room.map((table) => (table.number === number ? { ...table, x, y } : table));
    onRoom(next);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arraste a mesa pelo salão. Toque nela para ver só quem senta ali. A ordem é sobrenome e depois o nome. O acompanhante fica no convite.
      </p>
      <div
        ref={floorRef}
        className="relative h-[28rem] overflow-hidden rounded-[1.75rem] bg-[#f7f1ea] ring-1 ring-purple/15 sm:h-[32rem]"
      >
        <div className="pointer-events-none absolute inset-3 rounded-[1.4rem] border border-dashed border-purple/20" />
        {landmarks.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-none absolute z-0 flex h-11 items-center justify-center rounded-full text-xs font-extrabold tracking-wide",
              item.className,
            )}
          >
            {item.label}
          </div>
        ))}
        {room.map((table) => {
          const selected = filter === table.number;
          return (
            <button
              key={table.number}
              type="button"
              aria-label={`Mesa ${table.number}`}
              aria-pressed={selected}
              className={cn(
                "absolute z-10 flex size-14 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full text-sm font-extrabold shadow-sm ring-2",
                selected ? "bg-orange text-white ring-orange" : "bg-white text-purple ring-purple/20",
              )}
              style={{ left: `${table.x}%`, top: `${table.y}%` }}
              onPointerDown={(event) => {
                const here = point(event);
                dragRef.current = {
                  number: table.number,
                  dx: table.x - here.x,
                  dy: table.y - here.y,
                  moved: false,
                  x: table.x,
                  y: table.y,
                  startX: event.clientX,
                  startY: event.clientY,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.number !== table.number) return;
                const here = point(event);
                const x = Math.min(96, Math.max(4, here.x + drag.dx));
                const y = Math.min(96, Math.max(4, here.y + drag.dy));
                if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8) drag.moved = true;
                drag.x = x;
                drag.y = y;
                move(table.number, x, y);
              }}
              onPointerUp={() => {
                const drag = dragRef.current;
                dragRef.current = null;
                if (!drag || drag.number !== table.number) return;
                if (!drag.moved) {
                  setFilter((current) => (current === table.number ? null : table.number));
                  return;
                }
                startTransition(async () => {
                  const result = await moveRoomTable(drag.number, drag.x, drag.y);
                  if (!result.ok) toast.error(result.error);
                });
              }}
            >
              {table.number}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-extrabold text-purple">{filter == null ? "Lista da festa" : `Mesa ${filter}`}</h3>
        {filter != null ? (
          <button type="button" className="text-sm font-bold text-teal" onClick={() => setFilter(null)}>
            Ver todos
          </button>
        ) : null}
      </div>
      {groups.length === 0 ? (
        <p className="rounded-[1.75rem] bg-white p-5 text-sm ring-1 ring-purple/10">
          {filter == null ? "A lista ainda está vazia." : "Ninguém desta mesa está na lista."}
        </p>
      ) : (
        <ol className="space-y-3">
          {groups.map((group) => (
            <li key={group.conviteId} className="rounded-[1.75rem] bg-white p-4 ring-1 ring-purple/10">
              <p className="text-xs font-bold text-muted-foreground">
                {group.conviteLabel}
                {group.tableNumber ? ` · Mesa ${group.tableNumber}` : " · Sem mesa"}
              </p>
              <ul className="mt-2 space-y-1">
                {group.people.map((person) => (
                  <li key={person.id} className={person.companion ? "pl-4 text-sm text-magenta" : "font-semibold text-purple"}>
                    {person.display}
                    {person.companion ? " · acompanhante" : ""}
                    {person.relation && !person.companion ? (
                      <span className="font-normal text-muted-foreground"> · {person.relation}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

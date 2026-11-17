"use client";

import { useState } from "react";
import { CerimonialDesk } from "@/components/cerimonial-desk";
import type { Convite, RoomTable } from "@/lib/types";

export function SalaoView({ convites, room }: { convites: Convite[]; room: RoomTable[] }) {
  const [tables, setTables] = useState(room);
  return <CerimonialDesk convites={convites} room={tables} onRoom={setTables} />;
}

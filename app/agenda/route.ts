import { listAgendaFeed } from "@/lib/db";
import { buildIcs } from "@/lib/settings";

export async function GET() {
  const body = buildIcs(listAgendaFeed());
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": "attachment; filename=\"celebrar-agenda.ics\"",
    },
  });
}

"use client";

import Link from "next/link";
import { formatBrl } from "@/lib/planner-docs";
import type { YearReport } from "@/lib/reports";

export function RelatoriosDesk({ report }: { report: YearReport }) {
  const previous = report.year - 1;
  const next = report.year + 1;
  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.2em] text-teal uppercase">Cerimonial</p>
      <h1 className="font-heading text-4xl text-purple italic sm:text-5xl">Relatórios</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">O ano dos eventos, do que foi contratado e do que entrou.</p>

      <div className="mt-5 flex items-center justify-center gap-3">
        <Link href={`/cerimonial/relatorios?ano=${previous}`} aria-label="Ano anterior" className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-purple ring-1 ring-purple/15">
          ‹
        </Link>
        <p className="min-w-24 text-center font-heading text-3xl text-purple italic">{report.year}</p>
        <Link href={`/cerimonial/relatorios?ano=${next}`} aria-label="Próximo ano" className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-purple ring-1 ring-purple/15">
          ›
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Eventos no ano" value={String(report.events)} hint="Casamentos e eventos na agenda" />
        <Card label="Contratado" value={formatBrl(report.contractedCents)} hint="Soma dos contratos do ano" />
        <Card label="Recebido no ano" value={formatBrl(report.receivedCents)} hint="Recibos e entradas já pagas" />
        <Card label="Ticket médio" value={formatBrl(report.averageCents)} hint="Contratado dividido pelos eventos" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Eventos por mês">
          <ColumnChart labels={report.months.map((month) => month.short)} values={report.eventsByMonth} tone="bg-purple" />
        </ChartCard>
        <ChartCard title="Recebido por mês">
          <ColumnChart labels={report.months.map((month) => month.short)} values={report.receivedByMonth} tone="bg-teal" format={formatBrl} />
        </ChartCard>
        <ChartCard title="Eventos por tipo">
          <RankList rows={report.eventsByType.map((item) => ({ label: item.label, count: item.count }))} empty="Nenhum evento neste ano." />
        </ChartCard>
        <ChartCard title="Fornecedores mais contratados">
          <RankList rows={report.suppliers.map((item) => ({ label: item.name, count: item.count }))} empty="Nenhum fornecedor contratado neste ano." />
        </ChartCard>
      </div>

      <section className="mt-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Vendas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Contatos do funil neste ano. Fechados são as propostas enviadas.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Card label="Contatos" value={String(report.contacts)} hint="Entraram no funil" />
          <Card label="Fechados" value={String(report.closed)} hint="Proposta enviada" />
          <Card label="Taxa de fechamento" value={`${report.closeRate}%`} hint="Fechados sobre contatos" />
        </div>
      </section>

      <section className="mt-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-2xl text-purple italic">Ver os números mês a mês</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm text-purple">
            <thead>
              <tr className="text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
                <th className="py-2 font-extrabold">Mês</th>
                <th className="py-2 font-extrabold">Eventos</th>
                <th className="py-2 font-extrabold">Contratado</th>
                <th className="py-2 font-extrabold">Recebido</th>
              </tr>
            </thead>
            <tbody>
              {report.months.map((month) => (
                <tr key={month.label} className="border-t border-purple/10">
                  <td className="py-2 font-bold">{month.label}</td>
                  <td className="py-2">{month.events}</td>
                  <td className="py-2">{formatBrl(month.contractedCents)}</td>
                  <td className="py-2">{formatBrl(month.receivedCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-[1.5rem] bg-white p-4 ring-1 ring-purple/10">
      <p className="text-xs font-extrabold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-heading text-2xl text-purple italic">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </article>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
      <h2 className="font-heading text-2xl text-purple italic">{title}</h2>
      {children}
    </section>
  );
}

function ColumnChart({ labels, values, tone, format }: { labels: string[]; values: number[]; tone: string; format?: (value: number) => string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="mt-4 flex h-40 items-end gap-1">
      {values.map((value, index) => (
        <div key={labels[index]} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
          <div
            className={`w-full rounded-t-md ${tone}`}
            style={{ height: value ? `${Math.max(8, (value / max) * 100)}%` : "0%" }}
            title={format ? format(value) : String(value)}
          />
          <span className="mt-1 text-[10px] font-bold text-purple">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

function RankList({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) return <p className="mt-3 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="mt-4 grid gap-2">
      {rows.slice(0, 8).map((row) => (
        <li key={row.label}>
          <div className="flex items-center justify-between text-sm text-purple">
            <span className="font-bold">{row.label}</span>
            <span>{row.count}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-[#f6eefb]">
            <div className="h-2 rounded-full bg-magenta" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

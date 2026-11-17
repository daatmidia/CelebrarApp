"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkInByCode, checkInGuest, searchCheckin } from "@/lib/actions";
import type { CheckinResult, CheckinSearchHit } from "@/lib/types";
import { formatWhen } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CheckinDesk({
  initialCode = "",
  recent = [],
}: {
  initialCode?: string;
  recent?: { name: string; conviteLabel: string; checkedInAt: string }[];
}) {
  const router = useRouter();
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [code, setCode] = useState(initialCode);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CheckinSearchHit[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    if (!initialCode || started.current) return;
    started.current = true;
    void submitCode(initialCode);
    // The reception link is opened once per scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  useEffect(() => {
    if (!cameraOn) return;
    let scanner: { stop: () => Promise<void>; isScanning: boolean } | null = null;
    let cancelled = false;
    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const instance = new Html5Qrcode("celebrar-qr");
      scanner = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (text) => {
          void submitCode(text);
        },
        () => undefined,
      );
    }
    start().catch(() => {
      setCameraError("Não conseguimos acessar a câmera. Busque pelo nome ou digite o código.");
      setCameraOn(false);
    });
    return () => {
      cancelled = true;
      if (scanner?.isScanning) void scanner.stop().catch(() => undefined);
    };
    // submitCode is stable enough for the lifetime of a scan session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  async function submitCode(raw: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setCameraOn(false);
    try {
      const next = await checkInByCode(raw);
      setResult(next);
      if (next.status === "ok") router.refresh();
    } catch {
      setResult({ status: "unknown" });
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  async function onCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submitCode(code);
  }

  async function onNameSearch(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setHits(null);
    try {
      const found = await searchCheckin(query);
      if (found.status === "short") setNotice("Digite pelo menos 3 letras.");
      else if (found.status === "none") setNotice("Ninguém com esse nome na lista.");
      else if (found.status === "broad") setNotice("Há mais de um nome parecido. Inclua o sobrenome.");
      else setHits(found.hits);
    } catch {
      setNotice("Não conseguimos buscar agora.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmGuest(guestId: number) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const next = await checkInGuest(guestId);
      setResult(next);
      if (next.status === "ok") router.refresh();
    } catch {
      setResult({ status: "unknown" });
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
        <h2 className="font-heading text-3xl text-purple italic">Recepção</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Aponte a câmera para o QR do ingresso. Se a câmera falhar, busque pelo nome.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl bg-purple/5">
          <div id="celebrar-qr" className="min-h-16" />
        </div>
        {cameraError ? <p className="mt-3 text-sm font-semibold text-magenta">{cameraError}</p> : null}
        <Button
          type="button"
          className="mt-4 h-12 w-full rounded-full"
          onClick={() => {
            setCameraError(null);
            setCameraOn((value) => !value);
          }}
        >
          {cameraOn ? "Parar câmera" : "Ligar câmera"}
        </Button>
      </section>

      <form onSubmit={onCodeSubmit} className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
        <Label htmlFor="codigo">Código do ingresso</Label>
        <Input
          id="codigo"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="CEL-A1C4M8"
          className="mt-2 h-12 rounded-2xl font-mono text-base md:text-base"
        />
        <Button type="submit" disabled={busy} className="mt-3 h-12 w-full rounded-full">
          {busy ? "Registrando…" : "Registrar entrada"}
        </Button>
      </form>

      <form onSubmit={onNameSearch} className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
        <Label htmlFor="busca-recepcao">Buscar pelo nome</Label>
        <Input
          id="busca-recepcao"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: João Pedro"
          className="mt-2 h-12 rounded-2xl text-base md:text-base"
        />
        <Button type="submit" variant="outline" disabled={busy} className="mt-3 h-12 w-full rounded-full">
          Procurar
        </Button>
        {notice ? <p className="mt-3 text-sm font-semibold text-purple">{notice}</p> : null}
        {hits ? (
          <ul className="mt-3 space-y-2">
            {hits.map((hit) => (
              <li key={hit.guestId} className="rounded-2xl border border-purple/10 p-3">
                <p className="font-extrabold text-purple">{hit.name}</p>
                <p className="text-sm text-muted-foreground">
                  {hit.conviteLabel}
                  {hit.relation ? ` · ${hit.relation}` : ""}
                </p>
                <p className="text-sm">{hit.momentSummary}</p>
                {hit.checkedInAt ? (
                  <p className="text-sm font-semibold text-magenta">Já entrou às {formatWhen(hit.checkedInAt)}</p>
                ) : null}
                <Button
                  type="button"
                  className="mt-2 h-11 rounded-full"
                  disabled={!hit.canCheckIn || busy}
                  onClick={() => confirmGuest(hit.guestId)}
                >
                  {hit.canCheckIn ? "Registrar entrada" : "Sem confirmação"}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>

      {result ? <ResultCard result={result} /> : null}

      <section className="rounded-[1.75rem] bg-white p-5 ring-1 ring-purple/10">
        <h3 className="font-extrabold text-purple">Últimas entradas</h3>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Ninguém passou pela recepção ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {recent.map((item) => (
              <li key={`${item.name}-${item.checkedInAt}`}>
                <span className="font-bold text-purple">{item.name}</span>
                <span className="text-muted-foreground"> · {item.conviteLabel} · {formatWhen(item.checkedInAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ResultCard({ result }: { result: CheckinResult }) {
  if (result.status === "unknown") {
    return (
      <section role="alert" className="rounded-[1.75rem] bg-magenta/10 p-5">
        <h3 className="font-heading text-3xl text-purple italic">Código não encontrado</h3>
        <p className="mt-2 text-sm">Confira o ingresso ou busque pelo nome.</p>
      </section>
    );
  }
  if (result.status === "not-coming") {
    return (
      <section role="alert" className="rounded-[1.75rem] bg-orange/10 p-5">
        <h3 className="font-heading text-3xl text-purple italic">{result.name}</h3>
        <p className="mt-2 text-sm">
          {result.conviteLabel} ainda não confirmou presença em nenhum momento.
        </p>
      </section>
    );
  }
  const already = result.status === "already";
  return (
    <section className="rounded-[1.75rem] bg-white p-5 ring-2 ring-teal">
      <p className="text-xs font-extrabold tracking-[0.18em] text-teal uppercase">
        {already ? "Já tinha entrado" : "Entrada registrada"}
      </p>
      <h3 className="mt-1 font-heading text-4xl text-purple italic">{result.guest.name}</h3>
      <p className="text-sm font-semibold text-magenta">{result.guest.conviteLabel}</p>
      {result.guest.checkedInAt ? (
        <p className="mt-2 text-sm">
          {already ? "Entrada registrada às" : "Agora"} {formatWhen(result.guest.checkedInAt)}
        </p>
      ) : null}
      <ul className="mt-4 space-y-1 text-sm">
        {result.guest.moments.map((moment) => (
          <li key={moment.name} className={moment.attending ? "font-bold text-purple" : "text-muted-foreground"}>
            {moment.attending ? "Sim" : "Não"} · {moment.name}
            <span className="font-normal"> · {moment.timeLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

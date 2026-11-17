"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CERIMONIAL_SEED,
  matchCerimonialAccount,
  readCerimonialSession,
  saveCerimonialAccount,
  writeCerimonialSession,
} from "@/lib/cerimonial-session";

export function CerimonialLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (readCerimonialSession()) {
      router.replace("/cerimonial");
      return;
    }
    setReady(true);
  }, [router]);

  function enter(conta: { email: string; name: string }) {
    writeCerimonialSession(conta);
    router.replace("/cerimonial");
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "criar") {
      const message = saveCerimonialAccount({ name, email, password });
      if (message) {
        setError(message);
        return;
      }
      enter({ email: email.trim().toLowerCase(), name: name.trim() });
      return;
    }
    const conta = matchCerimonialAccount(email, password);
    if (!conta) {
      setError("E-mail ou senha não conferem.");
      return;
    }
    enter(conta);
  }

  if (!ready) return <div className="min-h-dvh bg-[#f3efe8]" />;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f3efe8] px-4 py-10">
      <section className="w-full max-w-md rounded-[1.75rem] border border-[#eadfce] bg-[#fffdf8] px-6 py-8 shadow-[0_24px_60px_-36px_rgba(59,18,83,0.45)] sm:px-8">
        <p className="text-[11px] font-extrabold tracking-[0.22em] text-magenta uppercase">Cerimonial</p>
        <h1 className="mt-2 font-heading text-5xl font-medium text-purple">{mode === "entrar" ? "Entrar" : "Criar conta"}</h1>
        <p className="mt-3 text-[15px] text-[#5c5348]">
          {mode === "entrar" ? "A agenda do seu cerimonial." : "A conta fica neste navegador e já abre a agenda."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "criar" ? (
            <div className="space-y-2">
              <Label htmlFor="nome" className="font-semibold text-purple">
                Nome
              </Label>
              <Input
                id="nome"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 rounded-xl border-[#eadfce] bg-white px-3"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email" className="font-semibold text-purple">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-xl border-[#eadfce] bg-white px-3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha" className="font-semibold text-purple">
              Senha
            </Label>
            <Input
              id="senha"
              type="password"
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl border-[#eadfce] bg-white px-3"
            />
          </div>
          {error ? <p className="text-sm font-semibold text-magenta">{error}</p> : null}
          <Button type="submit" className="h-11 rounded-full bg-purple px-6 text-white hover:bg-purple/90">
            {mode === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-[#5c5348]">
          {mode === "entrar" ? (
            <>
              Ainda não tenho conta.{" "}
              <button type="button" className="font-semibold text-magenta underline-offset-2 hover:underline" onClick={() => { setMode("criar"); setError(""); }}>
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tenho conta.{" "}
              <button type="button" className="font-semibold text-magenta underline-offset-2 hover:underline" onClick={() => { setMode("entrar"); setError(""); }}>
                Entrar
              </button>
            </>
          )}
        </p>
        {mode === "entrar" ? (
          <p className="mt-4 text-xs text-[#8a7d6e]">
            Demonstração: {CERIMONIAL_SEED.email} / {CERIMONIAL_SEED.password}
          </p>
        ) : null}
      </section>
    </main>
  );
}

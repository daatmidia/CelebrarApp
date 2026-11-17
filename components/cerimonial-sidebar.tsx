"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { readCerimonialSession } from "@/lib/cerimonial-session";
import { cn } from "cn";

const mainItems = [
  { href: "/cerimonial", label: "Agenda", icon: "agenda" },
  { href: "/cerimonial/clientes", label: "Clientes", icon: "clientes" },
  { href: "/cerimonial/equipe", label: "Equipe", icon: "equipe" },
  { href: "/cerimonial/fornecedores", label: "Fornecedores", icon: "fornecedores" },
  { href: "/cerimonial/financeiro", label: "Financeiro", icon: "financeiro" },
  { href: "/cerimonial/relatorios", label: "Relatórios", icon: "relatorios" },
  { href: "/cerimonial/vendas", label: "Vendas", icon: "vendas" },
] as const;

const supportItems = [
  { href: "/cerimonial/ajustes", label: "Ajustes", icon: "ajustes" },
  { href: "/cerimonial/ajuda", label: "Ajuda", icon: "ajuda" },
  { href: "/cerimonial/sugestao", label: "Sugerir melhorias", icon: "sugestao" },
] as const;

export function CerimonialShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [noite, setNoite] = useState(false);
  const [gate, setGate] = useState<"checking" | "in">("checking");
  const [conta, setConta] = useState<{ name: string; email: string } | null>(null);
  const login = pathname === "/cerimonial/entrar";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (login) return;
    const session = readCerimonialSession();
    if (!session) {
      router.replace("/cerimonial/entrar");
      return;
    }
    setConta(session);
    setGate("in");
  }, [login, pathname, router]);

  useEffect(() => {
    setNoite(localStorage.getItem("celebrar-cerimonial-noite") === "1");
  }, []);

  function toggleNoite() {
    setNoite((current) => {
      const next = !current;
      localStorage.setItem("celebrar-cerimonial-noite", next ? "1" : "0");
      return next;
    });
  }

  function install() {
    toast("No celular, abra o menu do navegador e escolha Adicionar à tela de início.");
  }

  const novoAtivo = pathname === "/cerimonial/novo";

  function itemActive(href: string) {
    const section = pathname.split("/")[2] ?? "";
    const reserved = new Set([
      "entrar",
      "novo",
      "vendas",
      "financeiro",
      "clientes",
      "fornecedores",
      "equipe",
      "relatorios",
      "ajustes",
      "ajuda",
      "sugestao",
    ]);
    const agenda =
      pathname === "/cerimonial" ||
      section === "evento" ||
      section === "salao" ||
      (section !== "" && !reserved.has(section));
    return href === "/cerimonial" ? agenda : pathname === href || pathname.startsWith(`${href}/`);
  }

  function menuLink(item: { href: string; label: string; icon: string }) {
    const active = itemActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/85",
          active && "bg-white/10 text-white",
        )}
      >
        <NavIcon name={item.icon} active={active} />
        {item.label}
      </Link>
    );
  }

  if (login) return children;
  if (gate !== "in") return <div className="min-h-dvh bg-[#f3efe8]" />;

  return (
    <div className={cn("flex min-h-dvh", noite && "bg-[#1a0b28]")}>
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-purple/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-dvh w-[272px] flex-col bg-[#3b1253] text-white transition md:sticky md:top-0 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <Link href="/" aria-label="Início do Celebrar" className="shrink-0 rounded-xl">
            <BrandLogo priority className="h-11 w-11" />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-teal">Celebrar</p>
            <p className="mt-1 text-[11px] leading-snug font-medium text-white/90">
              Gestão inteligente para eventos extraordinários.
            </p>
          </div>
        </div>
        <div className="px-3">
          <Link
            href="/cerimonial/novo"
            aria-current={novoAtivo ? "page" : undefined}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-full text-sm font-extrabold text-white",
              "bg-[linear-gradient(90deg,#00a0a0,#e16520_58%,#d3286b)]",
              novoAtivo && "ring-2 ring-white/80",
            )}
          >
            + Novo evento
          </Link>
        </div>
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3" aria-label="Cerimonial">
          {mainItems.map((item) => menuLink(item))}
        </nav>
        <div className="mt-auto border-t border-white/10 px-3 py-3">
          <div className="space-y-1">{supportItems.map((item) => menuLink(item))}</div>
          <button
            type="button"
            onClick={install}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/85"
          >
            <NavIcon name="celular" />
            Instalar no celular
          </button>
          <button
            type="button"
            aria-pressed={noite}
            onClick={toggleNoite}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/85",
              noite && "bg-white/10 text-white",
            )}
          >
            <NavIcon name="noite" active={noite} />
            Tema noite
          </button>
          <div className="mt-2 flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6eefb] text-sm font-extrabold text-teal">
              {initials(conta?.name ?? "")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">{conta?.name}</span>
              <span className="block truncate text-xs text-white/70">{conta?.email}</span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </aside>
      <div className={cn("min-w-0 flex-1", noite && "text-[#f6eefb]")}>
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#3b1253] px-4 py-3 text-white md:hidden">
          <button type="button" aria-label="Abrir menu" onClick={() => setOpen(true)} className="font-extrabold">
            Menu
          </button>
          <Link href="/" aria-label="Início do Celebrar" className="shrink-0">
            <BrandLogo className="h-8 w-8" />
          </Link>
          <span className="min-w-0">
            <span className="block text-xs font-extrabold tracking-[0.16em] text-teal">Celebrar</span>
            <span className="block text-[10px] leading-tight font-medium text-white/90">
              Gestão inteligente para eventos extraordinários.
            </span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "C";
}

function NavIcon({ name, active = false }: { name: string; active?: boolean }) {
  const color = active ? "#00a0a0" : "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
      {name === "agenda" ? <path d="M4 3.5h10v11H4zM4 7h10M7 2.5v2M11 2.5v2" stroke={color} strokeWidth="1.4" /> : null}
      {name === "vendas" ? <path d="M4 4h6l4 4-6 6-4-4V4z" stroke={color} strokeWidth="1.4" /> : null}
      {name === "financeiro" ? <path d="M3.5 9h11M5 6.5h8v7H5z" stroke={color} strokeWidth="1.4" /> : null}
      {name === "clientes" ? <path d="M9 8.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM4.5 14.2c.6-2 2.2-3 4.5-3s3.9 1 4.5 3" stroke={color} strokeWidth="1.4" /> : null}
      {name === "fornecedores" ? <path d="M3.5 13.5V8L9 4.5 14.5 8v5.5H3.5zM7.5 13.5V10h3v3.5" stroke={color} strokeWidth="1.4" /> : null}
      {name === "equipe" ? (
        <>
          <circle cx="6.2" cy="7" r="1.7" stroke={color} strokeWidth="1.4" />
          <circle cx="12" cy="6.4" r="1.9" stroke={color} strokeWidth="1.4" />
          <path d="M2.8 13.4c.5-1.6 1.8-2.4 3.4-2.4s2.9.8 3.4 2.4M10 13.6c.4-1.4 1.5-2.1 3-2.1 1.4 0 2.5.7 3 2.1" stroke={color} strokeWidth="1.4" />
        </>
      ) : null}
      {name === "relatorios" ? <path d="M4 14V8M9 14V4M14 14v-5" stroke={color} strokeWidth="1.4" strokeLinecap="round" /> : null}
      {name === "ajustes" ? <path d="M4 5h10M4 9h10M4 13h10M6 5v0M12 9v0M8 13v0" stroke={color} strokeWidth="1.4" strokeLinecap="round" /> : null}
      {name === "ajuda" ? (
        <>
          <circle cx="9" cy="9" r="6" stroke={color} strokeWidth="1.4" />
          <path d="M7.2 7.2a1.8 1.8 0 1 1 2.5 1.7c-.5.3-.7.6-.7 1.1V11" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : null}
      {name === "sugestao" ? <path d="M9 3.2a4 4 0 0 1 2 7.4V12H7v-1.4A4 4 0 0 1 9 3.2zM7.5 14h3" stroke={color} strokeWidth="1.4" /> : null}
      {name === "celular" ? <path d="M7 2.8h4.2v12.4H7zM8.6 13.2h1" stroke={color} strokeWidth="1.4" /> : null}
      {name === "noite" ? <path d="M10.5 3.2A5.2 5.2 0 1 0 14.8 10 4.2 4.2 0 0 1 10.5 3.2z" stroke={color} strokeWidth="1.4" /> : null}
    </svg>
  );
}

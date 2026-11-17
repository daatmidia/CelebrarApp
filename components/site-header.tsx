import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "cn";

const links = [
  { href: "/rsvp", label: "Presença" },
  { href: "/convite", label: "Convite" },
  { href: "/hoje", label: "No dia" },
  { href: "/recepcao", label: "Recepção" },
  { href: "/painel", label: "Painel" },
] as const;

export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="relative z-30 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <BrandLogo priority className="h-14 w-14 sm:h-16 sm:w-16" />
          <span className="truncate text-lg font-extrabold tracking-tight text-purple sm:text-xl">
            Celebrarapp
          </span>
        </Link>
        <nav className="flex max-w-full gap-1.5 overflow-x-auto text-sm font-bold">
          {links.map((link) => {
            const active = current === link.href;
            const panel = link.href === "/painel";
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3 py-2",
                  panel && !active && "bg-purple text-white",
                  active && "bg-teal text-white",
                  !panel && !active && "text-purple hover:bg-secondary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="h-1 bg-[linear-gradient(90deg,#00a0a0,#3b1253_38%,#e16520_68%,#d3286b)]" />
    </header>
  );
}

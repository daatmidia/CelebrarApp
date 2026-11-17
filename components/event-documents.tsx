import Link from "next/link";
import type { EventDocumentSection } from "@/lib/event-documents";
import { cn } from "cn";

export function EventPageLinks({
  documentosHref,
  cronogramaHref,
  fornecedoresHref,
  current,
}: {
  documentosHref: string;
  cronogramaHref: string;
  fornecedoresHref: string;
  current?: "documentos" | "cronograma" | "fornecedores";
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
      <Link
        href={cronogramaHref}
        aria-current={current === "cronograma" ? "page" : undefined}
        className={cn(
          "rounded-full px-4 py-2 ring-1 ring-purple/10",
          current === "cronograma" ? "bg-purple text-white ring-purple" : "bg-white text-purple",
        )}
      >
        Cronograma
      </Link>
      <Link href="/cerimonial/salao" className="rounded-full bg-white px-4 py-2 text-purple ring-1 ring-purple/10">
        Desenho do salão
      </Link>
      <Link
        href={documentosHref}
        aria-current={current === "documentos" ? "page" : undefined}
        className={cn(
          "rounded-full px-4 py-2 ring-1 ring-purple/10",
          current === "documentos" ? "bg-purple text-white ring-purple" : "bg-white text-purple",
        )}
      >
        Documentos
      </Link>
      <Link
        href={fornecedoresHref}
        aria-current={current === "fornecedores" ? "page" : undefined}
        className={cn(
          "rounded-full px-4 py-2 ring-1 ring-purple/10",
          current === "fornecedores" ? "bg-purple text-white ring-purple" : "bg-white text-purple",
        )}
      >
        Fornecedores
      </Link>
    </div>
  );
}

export function EventDocuments({ sections }: { sections: EventDocumentSection[] }) {
  return (
    <div className="mt-5 space-y-4">
      {sections.map((section) => (
        <section key={section.title} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10" aria-label={section.title}>
          <h2 className="font-heading text-2xl text-purple italic">{section.title}</h2>
          <ul className="mt-3 space-y-2">
            {section.lines.map((line) => (
              <li key={line} className="text-sm leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

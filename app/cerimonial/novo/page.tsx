import { NovoEvento } from "@/components/novo-evento";

export const metadata = {
  title: "Novo evento",
};

export default function NovoEventoPage() {
  return (
    <main className="bg-[#f6f1e8] px-4 py-8">
      <NovoEvento />
    </main>
  );
}

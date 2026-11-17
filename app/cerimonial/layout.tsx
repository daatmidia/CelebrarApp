import { CerimonialShell } from "@/components/cerimonial-sidebar";

export default function CerimonialLayout({ children }: { children: React.ReactNode }) {
  return <CerimonialShell>{children}</CerimonialShell>;
}

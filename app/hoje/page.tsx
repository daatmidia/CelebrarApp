import { SiteHeader } from "@/components/site-header";
import { HojeDesk } from "@/components/hoje-desk";

export const metadata = {
  title: "No dia",
};

export default function HojePage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader current="/hoje" />
      <HojeDesk />
    </div>
  );
}

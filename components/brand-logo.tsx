import Image from "next/image";
import { cn } from "cn";

export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-celebrar.png"
      alt=""
      width={1024}
      height={1024}
      quality={95}
      priority={priority}
      className={cn("h-14 w-14 shrink-0 object-fill", className)}
    />
  );
}

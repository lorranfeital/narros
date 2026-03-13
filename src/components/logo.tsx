import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

type LogoProps = {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  showText?: boolean;
};

export function Logo({
  className,
  textClassName,
  iconClassName,
  showText = true,
}: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/narros-favicon.svg"
        alt="Narros logo"
        width={28}
        height={28}
        className={cn(iconClassName)}
      />
      {showText && (
        <span
          className={cn(
            "font-body text-xl font-bold text-foreground",
            textClassName
          )}
        >
          Narros
        </span>
      )}
    </Link>
  );
}

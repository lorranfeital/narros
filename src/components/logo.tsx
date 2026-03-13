import { cn } from "@/lib/utils";
import Link from "next/link";

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
      <div className={cn("bg-primary h-7 w-7 clip-logo", iconClassName)} />
      {showText && (
        <span
          className={cn(
            "font-headline text-xl font-medium text-foreground",
            textClassName
          )}
        >
          Narros
        </span>
      )}
    </Link>
  );
}

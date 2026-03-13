import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

type LogoProps = {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
};

export function Logo({
  className,
  iconClassName,
  showText = true,
}: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center", className)}>
      {showText ? (
        <Image
          src="/narros-logo.svg"
          alt="Narros logo"
          width={100}
          height={28}
          className={cn(iconClassName)}
        />
      ) : (
        <Image
          src="/narros-favicon.svg"
          alt="Narros logo"
          width={28}
          height={28}
          className={cn(iconClassName)}
        />
      )}
    </Link>
  );
}

import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  className?: string;
};

export default function SectionDivider({ label, className }: Props) {
  return (
    <div className={cn("relative my-6 flex items-center", className)}>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      {label ? (
        <span className="absolute left-1/2 -translate-x-1/2 bg-background px-3 text-xs font-medium text-foreground/70">
          {label}
        </span>
      ) : null}
    </div>
  );
}
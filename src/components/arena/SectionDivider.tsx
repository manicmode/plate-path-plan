import { Sparkles } from "lucide-react";

export default function SectionDivider({ title }: { title: string }) {
  if (!title) {
    // Slim divider without text
    return (
      <div className="h-px w-full bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
    );
  }

  return (
    <div className="relative my-6">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
        <Sparkles className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
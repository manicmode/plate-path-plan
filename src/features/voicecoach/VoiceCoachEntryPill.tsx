import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useVoiceCoachAllowed } from "@/features/voicecoach/flags";

type Props = { className?: string; to?: string; onClick?: () => void };

export default function VoiceCoachEntryPill({ className, to = "/voice-agent", onClick }: Props) {
  const navigate = useNavigate();
  const allowed = useVoiceCoachAllowed();
  if (!allowed) return null;

  return (
    <button
      onClick={onClick ?? (() => navigate(to))}
      aria-label="Speak to Coach"
      className={cn(
        // ---- ORIGINAL PILL LOOK (dark pill + soft glow) ----
        "inline-flex items-center gap-2 rounded-full px-4 py-2",
        "bg-slate-800/70 backdrop-blur border border-white/10",
        "text-slate-100 font-semibold",
        // soft long shadow glow (teal/cyan) you liked
        "shadow-[0_10px_28px_rgba(16,185,129,0.35),0_18px_50px_rgba(56,189,248,0.20)]",
        "hover:bg-slate-800/85 hover:shadow-[0_12px_34px_rgba(16,185,129,0.42),0_22px_60px_rgba(56,189,248,0.26)]",
        "active:scale-[0.98] transition select-none",
        className
      )}
    >
      <span className="text-lg leading-none">🎙️</span>
      <span className="leading-none">Speak to Coach</span>
    </button>
  );
}
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { nlog, HERO_REV } from "@/lib/debugNudge";

type Cta = { key: string; text: string };
type Ctx = { now?: Date; weekday?: number; hour?: number };

function selectFeaturedCta(ctx: Ctx): Cta {
  // Time-of-day / day-of-week selection
  const now = ctx.now ?? new Date();
  const hour = ctx.hour ?? now.getHours();
  const weekday = ctx.weekday ?? now.getDay(); // 0 Sun … 6 Sat

  // Examples — tune copy to your voice:
  if (hour >= 6 && hour < 11) {
    return { key: "morning", text: "Good morning — set your tone with real foods and calm focus." };
  }
  if (hour >= 11 && hour < 15) {
    return { key: "midday", text: "Midday check: hydrate, move a little, and pick whole ingredients." };
  }
  if (hour >= 15 && hour < 19) {
    return { key: "afternoon", text: "Afternoon reset — fiber, protein, and a short walk go a long way." };
  }
  if (hour >= 19 && hour < 23) {
    return { key: "evening", text: "Evening wind-down: simple dinner, low added sugar, restful sleep." };
  }
  // Weekend nudge
  if (weekday === 6 || weekday === 0) {
    return { key: "weekend", text: "Weekends count too — keep it simple and enjoy mindful meals." };
  }
  // Fallback featured if none matched
  return { key: "any", text: "Small choices add up — choose real food and steady routines." };
}

const DEFAULT_CTA: Cta = {
  key: "default",
  text: "Your intelligent wellness companion is ready.",
};

function HeroTextRotator({
  className,
}: { className?: string }) {
  const [phase, setPhase] = useState<"featured" | "default">("featured");
  const [featured, setFeatured] = useState<Cta>(() => selectFeaturedCta({}));
  const [animDurationSec, setAnimDurationSec] = useState<number>(10);
  const runOnceRef = useRef(false);

  // Choose featured on mount (and when hour changes if you later wire context)
  useEffect(() => {
    if (runOnceRef.current) return;
    runOnceRef.current = true;
    const pick = selectFeaturedCta({});
    setFeatured(pick);
    nlog("HERO][FEATURED_PICK", { key: pick.key, text: pick.text });
  }, []);

  // Compute duration based on text length so speed feels consistent
  useEffect(() => {
    const len = featured.text.length;
    // Clamp between 8s and 16s for one pass
    const seconds = Math.min(16, Math.max(8, Math.round(len * 0.18)));
    setAnimDurationSec(seconds);
  }, [featured.text]);

  const onAnimStart = () => {
    nlog("HERO][ANIM_START", { key: featured.key, seconds: animDurationSec });
  };

  const onAnimEnd = () => {
    // animation-iteration-count=2 fires once at the very end
    nlog("HERO][ANIM_END", { key: featured.key });
    setPhase("default");
    nlog("HERO][DEFAULT_SHOW", { key: DEFAULT_CTA.key });
  };

  return (
    <div
      className={clsx(
        "hero-train relative overflow-hidden",
        "whitespace-nowrap", // never wrap
        className
      )}
      aria-live="polite"
    >
      {phase === "featured" ? (
        <span
          className="hero-line hero-train__runner"
          style={
            {
              // drive CSS animation speed
              "--hero-train-duration": `${animDurationSec}s`,
            } as React.CSSProperties
          }
          onAnimationStart={onAnimStart}
          onAnimationEnd={onAnimEnd}
        >
          {featured.text}
        </span>
      ) : (
        <span className="hero-line hero-default__jump">
          {DEFAULT_CTA.text}
        </span>
      )}
    </div>
  );
}

// Wrapper component that builds context and passes to robust rotator
interface HomeCtaTickerProps {
  className?: string;
}

export const HomeCtaTicker: React.FC<HomeCtaTickerProps> = ({ className }) => {
  return <HeroTextRotator className={className} />;
};
import * as React from "react";

type Props = {
  foodName?: string | null;
  names?: string[] | null;
};

export function LinkedChips({ foodName, names }: Props) {
  const items = (foodName ? [foodName] : names ?? []);
  if (!items.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((n, i) => (
        <span
          key={`${n}-${i}`}
          className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
        >
          {n}
        </span>
      ))}
    </div>
  );
}
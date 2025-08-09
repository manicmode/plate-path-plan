import SectionCollapsible from "@/components/ui/SectionCollapsible";
import * as React from "react";

export default function SubCollapsible(
  props: React.ComponentProps<typeof SectionCollapsible>
) {
  const { className = "", ...rest } = props;
  return (
    <SectionCollapsible
      {...rest}
      className={`rounded-xl border border-white/5 ${className}`}
    />
  );
}

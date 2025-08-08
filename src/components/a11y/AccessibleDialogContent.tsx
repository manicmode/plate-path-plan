// src/components/a11y/AccessibleDialogContent.tsx
import * as React from "react";
import { useId, useEffect } from "react";
import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Props = React.ComponentProps<typeof DialogContent> & {
  titleText?: string;
  descriptionText?: string;
};

export default function AccessibleDialogContent({
  children,
  titleText = "Dialog",
  descriptionText = "This dialog requires your attention.",
  ...props
}: Props) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    console.info("[A11y] AccessibleDialogContent mounted", { titleId, descId, titleText });
  }, [titleId, descId, titleText]);

  return (
    <DialogContent aria-describedby={descId} {...props}>
      <DialogTitle id={titleId} className="sr-only">
        {titleText}
      </DialogTitle>
      <DialogDescription id={descId} className="sr-only">
        {descriptionText}
      </DialogDescription>
      {children}
    </DialogContent>
  );
}
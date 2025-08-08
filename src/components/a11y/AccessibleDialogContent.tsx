import * as React from "react";
import { useId } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Props = {
  title: string;          // required
  description: string;    // required
  children: React.ReactNode;
  className?: string;
};

export default function AccessibleDialogContent({ title, description, children, className }: Props) {
  const titleId = useId();
  const descId = useId();

  React.useEffect(() => {
    console.info("[A11y] AccessibleDialogContent mounted", { titleId, descId, titleText: title });
  }, [titleId, descId, title]);

  return (
    <DialogContent
      aria-describedby={descId}
      className={className}
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogDescription id={descId}>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}
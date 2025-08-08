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
    console.info("[A11y] AccessibleDialogContent mounted", { titleText: title, descriptionText: description, titleId, descId });
    
    // In development, warn about empty title or description
    if (process.env.NODE_ENV === 'development') {
      if (!title || title.trim() === '') {
        console.warn("[A11y] AccessibleDialogContent: Empty title provided. This may cause accessibility issues.");
      }
      if (!description || description.trim() === '') {
        console.warn("[A11y] AccessibleDialogContent: Empty description provided. This may cause accessibility issues.");
      }
    }
  }, [title, description, titleId, descId]);

  return (
    <DialogContent
      aria-describedby={descId}
      className={className}
    >
      <DialogHeader className="sr-only">
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogDescription id={descId}>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}
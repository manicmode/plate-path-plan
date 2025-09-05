import * as React from "react";
import { useId } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const OVERLAY_Z = "z-[110]";
const CONTENT_Z = "z-[120]";

type Props = React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
  title: string;
  description?: string;
  showCloseButton?: boolean; // default: true
  children: React.ReactNode;
};

export default function AccessibleDialogContent({ 
  title, 
  description, 
  className, 
  showCloseButton = true, 
  children, 
  ...rest 
}: Props) {
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
    <Dialog.Portal>
      <Dialog.Overlay
        data-testid="dialog-overlay"
        className={cn(
          "fixed inset-0 bg-black/75 backdrop-blur-2xl",
          OVERLAY_Z
        )}
      />
      <Dialog.Content
        data-testid="dialog-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={rest["aria-labelledby"] || titleId}
        aria-describedby={rest["aria-describedby"] || descId}
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[92vw] sm:w-full sm:max-w-md rounded-xl border bg-background shadow-xl",
          "outline-none p-6 gap-4 grid",
          "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          CONTENT_Z,
          className
        )}
        {...rest}
      >
        <DialogHeader className="sr-only">
          <DialogTitle id={titleId}>{title}</DialogTitle>
          <DialogDescription id={descId}>{description}</DialogDescription>
        </DialogHeader>
        {showCloseButton ? (
          <Dialog.Close aria-label="Close" className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        ) : null}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
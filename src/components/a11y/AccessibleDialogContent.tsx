import * as React from "react";
import { useId } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
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
    <DialogPrimitive.Content
      {...rest}
      aria-describedby={descId}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
    >
      <DialogHeader className="sr-only">
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogDescription id={descId}>{description}</DialogDescription>
      </DialogHeader>
      {showCloseButton ? (
        <DialogPrimitive.Close aria-label="Close" className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      ) : null}
      {children}
    </DialogPrimitive.Content>
  );
}
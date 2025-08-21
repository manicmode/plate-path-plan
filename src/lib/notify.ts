// Try sonner first; fall back to shadcn's use-toast
let useShadcnToast: undefined | (() => { toast: (opts: any) => void });
try {
  // dynamic import so bundlers don't cry if the file doesn't exist
  // @ts-ignore
  useShadcnToast = require("@/hooks/use-toast")?.useToast;
} catch {}

let sonnerToast: any;
try {
  sonnerToast = require("sonner")?.toast;
} catch {}

type Msg = string;

export const notify = {
  success(msg: Msg) {
    if (sonnerToast) return sonnerToast.success(msg);
    const t = useShadcnToast?.(); return t?.toast?.({ title: "Success", description: msg });
  },
  error(msg: Msg) {
    if (sonnerToast) return sonnerToast.error(msg);
    const t = useShadcnToast?.(); return t?.toast?.({ variant: "destructive", title: "Error", description: msg });
  },
  info(msg: Msg) {
    if (sonnerToast) return sonnerToast(msg);
    const t = useShadcnToast?.(); return t?.toast?.({ title: "Info", description: msg });
  },
};
// Try sonner first; fall back to shadcn's use-toast
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

type Msg = string;

export const notify = {
  success(msg: Msg) {
    if (toast) return toast.success(msg);
    const t = useToast?.(); return t?.toast?.({ title: "Success", description: msg });
  },
  error(msg: Msg) {
    if (toast) return toast.error(msg);
    const t = useToast?.(); return t?.toast?.({ variant: "destructive", title: "Error", description: msg });
  },
  info(msg: Msg) {
    if (toast) return toast(msg);
    const t = useToast?.(); return t?.toast?.({ title: "Info", description: msg });
  },
};
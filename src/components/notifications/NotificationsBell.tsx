import { useNotifications } from "@/hooks/useNotifications";
import { Bell } from "lucide-react";

export default function NotificationsBell() {
  const { rows, loading } = useNotifications(20);
  const unread = rows.filter(n => !n.read_at).length;

  return (
    <div className="relative inline-flex items-center">
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
          {unread}
        </span>
      )}
    </div>
  );
}
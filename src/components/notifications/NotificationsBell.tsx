import React, { useState } from 'react';
import { useNotifications } from "@/hooks/useNotifications";
import { Bell } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationsList } from './NotificationsList';

export default function NotificationsBell() {
  const { rows, loading } = useNotifications(20);
  const unread = rows.filter(n => !n.read_at).length;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationsList />
      </PopoverContent>
    </Popover>
  );
}
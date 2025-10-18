import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";

export const ClientHeader = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userInitial, setUserInitial] = useState<string>("");
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Try to get full_name from metadata
        const fullName = user.user_metadata?.full_name;
        if (fullName) {
          setUserName(fullName);
          setUserInitial(fullName.charAt(0).toUpperCase());
        } else if (user.email) {
          // Take email prefix and capitalize each word
          const emailPrefix = user.email.split('@')[0];
          const formatted = emailPrefix
            .split(/[._-]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          setUserName(formatted);
          setUserInitial(formatted.charAt(0).toUpperCase());
        }
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background">
      {/* Left: Greeting */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">👋</span>
        <h1 className="text-xl font-semibold text-foreground">
          Hello, {userName}!
        </h1>
      </div>

      {/* Right: Pill container with bell + avatar */}
      <div className="flex items-center gap-2 bg-muted rounded-full px-2 py-1">
        {/* Notification Bell */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2 hover:bg-background/50 rounded-full transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          )}
        </button>

        {/* Avatar */}
        <button
          onClick={() => navigate("/account")}
          className="w-10 h-10 rounded-full bg-muted-foreground flex items-center justify-center text-background font-semibold hover:opacity-80 transition-opacity"
          aria-label="Account"
        >
          {userInitial}
        </button>
      </div>
    </div>
  );
};

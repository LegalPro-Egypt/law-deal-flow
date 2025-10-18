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
        const firstName = user.user_metadata?.first_name;
        const lastName = user.user_metadata?.last_name;
        const fullName = user.user_metadata?.full_name;
        
        let displayName = "";
        
        if (firstName && lastName) {
          displayName = `${firstName} ${lastName}`;
        } else if (fullName) {
          displayName = fullName;
        } else if (firstName) {
          displayName = firstName;
        } else {
          displayName = "User";
        }
        
        setUserName(displayName);
        setUserInitial(displayName.charAt(0).toUpperCase());
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background">
      {/* Left: Greeting */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-2xl">👋</span>
          <span className="text-base font-normal text-muted-foreground">Hello,</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {userName}!
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

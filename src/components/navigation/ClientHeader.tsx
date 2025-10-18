import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";

export const ClientHeader = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string>("");
  const [userInitial, setUserInitial] = useState<string>("");
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        let extractedFirstName = "";
        
        // Try to get first_name from metadata
        if (user.user_metadata?.first_name) {
          extractedFirstName = user.user_metadata.first_name;
        } 
        // Else try to extract from full_name
        else if (user.user_metadata?.full_name) {
          extractedFirstName = user.user_metadata.full_name.split(' ')[0];
        } 
        // Else use email prefix
        else if (user.email) {
          const emailPrefix = user.email.split('@')[0];
          extractedFirstName = emailPrefix
            .split(/[._-]/)[0]
            .charAt(0).toUpperCase() + emailPrefix.split(/[._-]/)[0].slice(1);
        }
        
        setFirstName(extractedFirstName);
        setUserInitial(extractedFirstName.charAt(0).toUpperCase());
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2 bg-background">
      {/* Left: Greeting */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xl">👋</span>
          <span className="font-normal text-muted-foreground">Hello,</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {firstName}
        </h1>
      </div>

      {/* Right: Pill container with bell + avatar */}
      <div className="flex items-center gap-2 bg-background border border-border rounded-full px-2 py-1">
        {/* Notification Bell */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2 hover:bg-muted/50 rounded-full transition-colors"
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
          className="w-10 h-10 rounded-full bg-muted-foreground flex items-center justify-center text-background font-medium hover:opacity-80 transition-opacity"
          aria-label="Account"
        >
          {userInitial}
        </button>
      </div>
    </div>
  );
};

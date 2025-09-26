import { Link, useNavigate } from "react-router-dom";
import { Search, LogOut, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { NotificationMenu } from "@/components/NotificationMenu";

export function AdminHeader() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleLogoClick = () => {
    navigate("/admin");
  };

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 h-full">
        {/* Left side: Sidebar trigger + Logo */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8" />
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">L</span>
            </div>
            LegalAI Admin
          </button>
        </div>

        {/* Center: Search with Command K */}
        <div className="relative flex-1 max-w-md mx-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search... (⌘K)"
            className="pl-10 pr-10"
            onClick={() => {
              // TODO: Implement command palette
              console.log("Command palette not implemented yet");
            }}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>

        {/* Right side: Notifications + User menu */}
        <div className="flex items-center gap-4">
          <NotificationMenu />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {profile?.first_name?.[0] || profile?.email?.[0]?.toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {profile?.first_name && profile?.last_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : 'Admin'
                  }
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
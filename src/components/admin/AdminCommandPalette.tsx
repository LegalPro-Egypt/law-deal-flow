import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { LayoutDashboard } from "lucide-react";

interface SidebarGroupConfig {
  id: string;
  label: string;
  items: {
    title: string;
    url: string;
    icon: React.ComponentType<any>;
    badge?: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  }[];
}

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sidebarGroups: SidebarGroupConfig[];
}

export function AdminCommandPalette({ 
  open, 
  onOpenChange, 
  sidebarGroups 
}: AdminCommandPaletteProps) {
  const navigate = useNavigate();

  const handleSelect = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search admin pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Dashboard */}
        <CommandGroup heading="Main">
          <CommandItem onSelect={() => handleSelect('/admin')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
        </CommandGroup>

        {/* Groups */}
        {sidebarGroups.map((group) => (
          <CommandGroup key={group.id} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem 
                key={item.url} 
                onSelect={() => handleSelect(item.url)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
                {item.badge && parseInt(item.badge) > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
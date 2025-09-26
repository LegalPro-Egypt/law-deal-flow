import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Scale,
  FileSignature,
  LifeBuoy,
  Brain,
  Activity,
  HandHeart,
  Clock,
  MessageCircle,
  ClipboardCheck,
  FileSearch,
  Receipt,
  DollarSign,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Menu,
  Search
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdminCommandPalette } from "./AdminCommandPalette";

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

const sidebarGroups: SidebarGroupConfig[] = [
  {
    id: "users",
    label: "Users",
    items: [
      { title: "Clients", url: "/admin/clients", icon: Users },
      { title: "Lawyers", url: "/admin/lawyers", icon: Scale },
      { title: "Lawyer Requests", url: "/admin/lawyers/requests", icon: FileSignature, badge: "3", badgeVariant: "destructive" },
      { title: "Support Tickets", url: "/admin/support", icon: LifeBuoy, badge: "2", badgeVariant: "destructive" },
    ]
  },
  {
    id: "community",
    label: "Community",
    items: [
      { title: "AI Intakes", url: "/admin/intakes/ai", icon: Brain, badge: "5", badgeVariant: "destructive" },
      { title: "Analytics", url: "/admin/analytics", icon: Activity },
      { title: "Pro Bono", url: "/admin/lawyers/pro-bono", icon: HandHeart },  
      { title: "Waiting List", url: "/admin/lawyers/waiting-list", icon: Clock, badge: "12", badgeVariant: "secondary" },
      { title: "Anonymous Q&A", url: "/admin/anonymous", icon: MessageCircle, badge: "7", badgeVariant: "secondary" },
    ]
  },
  {
    id: "reviews",
    label: "Reviews",
    items: [
      { title: "Cases for Review", url: "/admin/cases/review", icon: ClipboardCheck, badge: "4", badgeVariant: "destructive" },
      { title: "Proposals for Review", url: "/admin/proposals/review", icon: FileSearch, badge: "2", badgeVariant: "destructive" },
    ]
  },
  {
    id: "reports",
    label: "Reports", 
    items: [
      { title: "Payments (Completed)", url: "/admin/reports/payments?status=completed", icon: Receipt },
      { title: "Payments (Pending)", url: "/admin/reports/payments?status=pending", icon: Receipt },
      { title: "Money Requests (Completed)", url: "/admin/reports/money-requests?status=completed", icon: DollarSign },
      { title: "Money Requests (Pending)", url: "/admin/reports/money-requests?status=pending", icon: DollarSign },
      { title: "Cases (Completed)", url: "/admin/reports/cases?status=completed", icon: Briefcase },
      { title: "Cases (Pending)", url: "/admin/reports/cases?status=pending", icon: Briefcase },
      { title: "Cases (Active)", url: "/admin/reports/cases?status=active", icon: Briefcase },
    ]
  }
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const collapsed = state === "collapsed";

  // Load expanded state from localStorage
  useEffect(() => {
    const savedExpanded = localStorage.getItem('admin-sidebar-expanded');
    if (savedExpanded) {
      try {
        const parsed = JSON.parse(savedExpanded);
        setExpandedGroups(new Set(parsed));
      } catch (error) {
        console.error('Failed to parse expanded groups from localStorage:', error);
      }
    } else {
      // Default to all groups expanded
      setExpandedGroups(new Set(sidebarGroups.map(g => g.id)));
    }
  }, []);

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem('admin-sidebar-expanded', JSON.stringify([...expandedGroups]));
  }, [expandedGroups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const isActive = (path: string) => {
    if (path === '/admin' && location.pathname === '/admin') return true;
    if (path !== '/admin' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getNavClassName = (path: string) => {
    return isActive(path) 
      ? "bg-muted text-primary font-medium" 
      : "hover:bg-muted/50";
  };

  // Keyboard shortcut to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Sidebar className={collapsed ? "w-14" : "w-60"}>
        <SidebarContent>
          {/* Command Palette Trigger */}
          {!collapsed && (
            <div className="p-2">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setShowCommandPalette(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                Search... 
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
          )}

          {/* Dashboard Link */}
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/admin" 
                    end 
                    className={getNavClassName('/admin')}
                    aria-current={isActive('/admin') ? "page" : undefined}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Expandable Groups */}
          {sidebarGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            
            return (
              <SidebarGroup key={group.id}>
                <Collapsible 
                  open={isExpanded} 
                  onOpenChange={() => toggleGroup(group.id)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="hover:bg-muted/50 cursor-pointer flex items-center justify-between">
                      {!collapsed && (
                        <>
                          <span>{group.label}</span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </>
                      )}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                className={getNavClassName(item.url)}
                                aria-current={isActive(item.url) ? "page" : undefined}
                                title={collapsed ? item.title : undefined}
                              >
                                <item.icon className="mr-2 h-4 w-4" />
                                {!collapsed && (
                                  <div className="flex items-center justify-between w-full">
                                    <span>{item.title}</span>
                                    {item.badge && parseInt(item.badge) > 0 && (
                                      <Badge 
                                        variant={item.badgeVariant || "default"} 
                                        className="ml-auto"
                                      >
                                        {item.badge}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      </Sidebar>

      {/* Command Palette */}
      <AdminCommandPalette 
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        sidebarGroups={sidebarGroups}
      />
    </>
  );
}
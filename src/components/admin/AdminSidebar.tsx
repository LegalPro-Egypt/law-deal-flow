import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
  DollarSign,
  CreditCard,
  FolderOpen,
  ChevronDown,
  BarChart3,
  TrendingUp,
  PieChart,
  FileBarChart,
  UserCheck,
  Calendar,
  Settings,
  Shield,
  ShieldCheck,
  User
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAdminData } from "@/hooks/useAdminData";

export function AdminSidebar() {
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { stats } = useAdminData();
  
  // Always show labels on mobile, hide only when desktop is collapsed
  const showLabels = isMobile || state !== "collapsed";

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, setOpenMobile]);

  // Ensure mobile sidebar is always in "open" state to show labels
  useEffect(() => {
    if (isMobile) {
      setOpen(true);
    }
  }, [isMobile, setOpen]);

  const handleNavClick = () => {
    // Only collapse sidebar on mobile, keep open on desktop for better UX
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const [openGroups, setOpenGroups] = useState({
    users: true,
    community: true,
    reviews: true,
    "forms-policies": true,
    reports: true,
  });

  const isActive = (path: string) => {
    if (path === "/admin") return currentPath === "/admin";
    return currentPath.startsWith(path);
  };

  const toggleGroup = (groupKey: keyof typeof openGroups) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Badge helpers
  const getBadgeCount = (type: string) => {
    switch (type) {
      case 'intakes':
        return stats.pendingIntakes;
      case 'lawyers-requests':
        return 0; // This would need to be fetched separately
      case 'support':
        return 0; // This would need to be fetched separately  
      case 'analytics':
        return 0;
      case 'pro-bono':
        return 0; // This would need to be fetched separately
      case 'waiting-list':
        return 0; // This would need to be fetched separately
      case 'cases-review':
        return stats.pendingReviews;
      case 'proposals-review':
        return stats.pendingProposals;
      case 'contracts-review':
        return stats.pendingContracts || 0;
      default:
        return 0;
    }
  };

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {/* Dashboard - Fixed Item */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild data-active={isActive("/admin")}>
                <Link to="/admin" onClick={handleNavClick}>
                  <LayoutDashboard className="h-4 w-4" />
                  {showLabels && <span>Dashboard</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Users Group */}
        <Collapsible open={openGroups.users} onOpenChange={() => toggleGroup('users')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1">
                <span>Users</span>
                {showLabels && <ChevronDown className={`h-4 w-4 transition-transform ${openGroups.users ? 'rotate-180' : ''}`} />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/clients")}>
                      <Link to="/admin/clients" onClick={handleNavClick}>
                        <Users className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>Clients</span>
                            {stats.totalClients > 0 && (
                              <Badge variant="secondary" className="ml-auto">
                                {stats.totalClients}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/lawyers")}>
                      <Link to="/admin/lawyers" onClick={handleNavClick}>
                        <Scale className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>Lawyers</span>
                            {stats.totalLawyers > 0 && (
                              <Badge variant="secondary" className="ml-auto">
                                {stats.totalLawyers}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/lawyers/requests")}>
                      <Link to="/admin/lawyers/requests" onClick={handleNavClick}>
                        <FileSignature className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>Lawyer Requests</span>
                            {getBadgeCount('lawyers-requests') > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {getBadgeCount('lawyers-requests')}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/support")}>
                      <Link to="/admin/support" onClick={handleNavClick}>
                        <LifeBuoy className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>Support Tickets</span>
                            {getBadgeCount('support') > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {getBadgeCount('support')}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Community Group */}
        <Collapsible open={openGroups.community} onOpenChange={() => toggleGroup('community')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1">
              <span>Community</span>
              {showLabels && <ChevronDown className={`h-4 w-4 transition-transform ${openGroups.community ? 'rotate-180' : ''}`} />}
            </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/intakes/ai")}>
                      <Link to="/admin/intakes/ai" onClick={handleNavClick}>
                        <Brain className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>AI Intakes</span>
                            {stats.pendingIntakes > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {stats.pendingIntakes}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/analytics")}>
                      <Link to="/admin/analytics" onClick={handleNavClick}>
                        <Activity className="h-4 w-4" />
                        {showLabels && <span>Analytics</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/lawyers/pro-bono")}>
                      <Link to="/admin/lawyers/pro-bono" onClick={handleNavClick}>
                        <HandHeart className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>Pro Bono</span>
                            {getBadgeCount('pro-bono') > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {getBadgeCount('pro-bono')}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/lawyers/waiting-list")}>
                      <Link to="/admin/lawyers/waiting-list" onClick={handleNavClick}>
                        <Clock className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>Waiting List</span>
                            {getBadgeCount('waiting-list') > 0 && (
                              <Badge variant="secondary" className="ml-auto">
                                {getBadgeCount('waiting-list')}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/anonymous")}>
                      <Link to="/admin/anonymous" onClick={handleNavClick}>
                        <MessageCircle className="h-4 w-4" />
                        {showLabels && <span>Anonymous Q&A</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Reviews Group */}
        <Collapsible open={openGroups.reviews} onOpenChange={() => toggleGroup('reviews')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1">
              <span>Reviews</span>
              {showLabels && <ChevronDown className={`h-4 w-4 transition-transform ${openGroups.reviews ? 'rotate-180' : ''}`} />}
            </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/cases/review")}>
                      <Link to="/admin/cases/review" onClick={handleNavClick}>
                        <ClipboardCheck className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>Cases for Review</span>
                            {stats.pendingReviews > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {stats.pendingReviews}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/proposals/review")}>
                      <Link to="/admin/proposals/review" onClick={handleNavClick}>
                        <FileSearch className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>Proposals for Review</span>
                            {getBadgeCount('proposals-review') > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {getBadgeCount('proposals-review')}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/contracts/review")}>
                      <Link to="/admin/contracts/review" onClick={handleNavClick}>
                        <FileSignature className="h-4 w-4" />
                        {showLabels && (
                          <>
                            <span>Contracts for Review</span>
                            {getBadgeCount('contracts-review') > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {getBadgeCount('contracts-review')}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Forms & Policies Group */}
        <Collapsible open={openGroups["forms-policies"]} onOpenChange={() => toggleGroup("forms-policies")}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1">
              <span>Forms & Policies</span>
              {showLabels && <ChevronDown className={`h-4 w-4 transition-transform ${openGroups["forms-policies"] ? 'rotate-180' : ''}`} />}
            </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/forms-policies/lawyer-forms")}>
                      <Link to="/admin/forms-policies/lawyer-forms" onClick={handleNavClick}>
                        <Users className="h-4 w-4" />
                        {showLabels && <span>Lawyer Forms</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/forms-policies/client-forms")}>
                      <Link to="/admin/forms-policies/client-forms" onClick={handleNavClick}>
                        <User className="h-4 w-4" />
                        {showLabels && <span>Client Forms</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/forms-policies/terms-privacy")}>
                      <Link to="/admin/forms-policies/terms-privacy" onClick={handleNavClick}>
                        <Shield className="h-4 w-4" />
                        {showLabels && <span>Terms & Privacy</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/forms-policies/lawyer-contracts")}>
                      <Link to="/admin/forms-policies/lawyer-contracts" onClick={handleNavClick}>
                        <ShieldCheck className="h-4 w-4" />
                        {showLabels && <span>Lawyer Partner Contracts</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Reports Group */}
        <Collapsible open={openGroups.reports} onOpenChange={() => toggleGroup('reports')}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1">
              <span>Reports</span>
              {showLabels && <ChevronDown className={`h-4 w-4 transition-transform ${openGroups.reports ? 'rotate-180' : ''}`} />}
            </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/reports/payments")}>
                      <Link to="/admin/reports/payments" onClick={handleNavClick}>
                        <DollarSign className="h-4 w-4" />
                        {showLabels && <span>Payments Report</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/reports/revenue")}>
                      <Link to="/admin/reports/revenue" onClick={handleNavClick}>
                        <TrendingUp className="h-4 w-4" />
                        {showLabels && <span>Revenue by Case</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/reports/case-status")}>
                      <Link to="/admin/reports/case-status" onClick={handleNavClick}>
                        <PieChart className="h-4 w-4" />
                        {showLabels && <span>Case Status Report</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/reports/case-type")}>
                      <Link to="/admin/reports/case-type" onClick={handleNavClick}>
                        <FileBarChart className="h-4 w-4" />
                        {showLabels && <span>Case Type Report</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/reports/proposals")}>
                      <Link to="/admin/reports/proposals" onClick={handleNavClick}>
                        <UserCheck className="h-4 w-4" />
                        {showLabels && <span>Proposals Report</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild data-active={isActive("/admin/reports/consultations")}>
                      <Link to="/admin/reports/consultations" onClick={handleNavClick}>
                        <Calendar className="h-4 w-4" />
                        {showLabels && <span>Consultation Report</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  );
}
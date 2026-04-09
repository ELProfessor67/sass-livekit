import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useAccountMinutes } from "@/hooks/useAccountMinutes";
import { ChartBar, Phone, Robot, ChatCircle, Users, Megaphone, User, Gear, CreditCard, Lightning, SignOut, Shield, TreeStructure, MagnifyingGlass, Bell } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { ThemeToggleMinimal } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function useTrialCountdown(trialEndsAt: string | null | undefined) {
  const [countdown, setCountdown] = useState<{ label: string; isExpired: boolean; isUrgent: boolean } | null>(null);

  useEffect(() => {
    if (!trialEndsAt) {
      setCountdown(null);
      return;
    }

    const update = () => {
      const now = new Date();
      const end = new Date(trialEndsAt);
      const diffMs = end.getTime() - now.getTime();

      if (diffMs <= 0) {
        setCountdown({ label: "Trial expired", isExpired: true, isUrgent: true });
        return;
      }

      const totalMinutes = Math.floor(diffMs / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;

      let label: string;
      if (days > 0) {
        label = `Trial ends in ${days}d ${hours}h`;
      } else if (hours > 0) {
        label = `Trial ends in ${hours}h ${minutes}m`;
      } else {
        label = `Trial ends in ${minutes}m`;
      }

      setCountdown({ label, isExpired: false, isUrgent: days === 0 });
    };

    update();
    const interval = setInterval(update, 60000); // update every minute
    return () => clearInterval(interval);
  }, [trialEndsAt]);

  return countdown;
}

export default function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isImpersonating, originalUser, exitImpersonation } = useAuth();
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const { uiStyle } = useTheme();
  const { remainingMinutes, percentageUsed, isLoading: minutesLoading } = useAccountMinutes();
  const { websiteSettings } = useWebsiteSettings();
  const { workspaces, isOwner, isManager, isViewer } = useWorkspace();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const trialCountdown = useTrialCountdown(user?.trialEndsAt);

  const showDeleteAccount = !websiteSettings?.slug_name &&
    workspaces.length === 1 &&
    workspaces[0]?.name === "Main Account" &&
    !user?.trialEndsAt;

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '');

      const response = await fetch(`${apiUrl}/api/v1/user/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Account deleted successfully");
        await signOut();
        navigate("/");
      } else {
        toast.error(data.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("An error occurred while deleting account");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const navItems = [{
    icon: <ChartBar size={18} weight="bold" />,
    label: "Dashboard",
    to: "/dashboard"
  }, {
    icon: <Robot size={18} weight="bold" />,
    label: "Assistants",
    to: "/assistants"
  }, {
    icon: <ChatCircle size={18} weight="bold" />,
    label: "Conversations",
    to: "/conversations"
  }, {
    icon: <Users size={18} weight="bold" />,
    label: "Contacts",
    to: "/contacts"
  }, {
    icon: <Megaphone size={18} weight="bold" />,
    label: "Campaigns",
    to: "/campaigns"
  }, {
    icon: <Phone size={18} weight="bold" />,
    label: "Calls",
    to: "/calls"
  }, {
    icon: <TreeStructure size={18} weight="bold" />,
    label: "Composer",
    to: "/workflows"
  }].filter(item => {
    // Hidden modules based on role
    // For now, all basic modules are visible to everyone, but specific actions inside are restricted
    return true;
  });

  // Add admin panel to nav items if user is admin
  if (isAdmin) {
    navItems.push({
      icon: <Shield size={18} weight="bold" />,
      label: "Admin",
      to: "/admin"
    });
  }

  return (
    <header className="relative z-50 transition-all duration-300">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left section - Logo */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {websiteSettings?.logo ? (
                  <img
                    src={websiteSettings.logo}
                    alt={websiteSettings.website_name || "Logo"}
                    className="h-10 w-auto object-contain max-w-[150px]"
                  />
                ) : (
                  <img
                    src="/logo.png"
                    alt="Wave Runner"
                    className="h-10 w-auto object-contain max-w-[150px]"
                  />
                )}
                <WorkspaceSwitcher />
              </div>
            ) : (
              <>
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {websiteSettings?.logo ? (
                    <img
                      src={websiteSettings.logo}
                      alt={websiteSettings.website_name || "Logo"}
                      className="h-10 w-auto object-contain max-w-[150px]"
                    />
                  ) : (
                    <img
                      src="/logo.png"
                      className="h-10 w-auto object-contain max-w-[150px]"
                    />
                  )}
                </Link>
                <h1 className="font-sans font-light text-xl tracking-tight text-foreground">
                  {websiteSettings?.website_name || "AI Call Center"}
                </h1>
              </>
            )}

            {/* Impersonation Indicator */}
            {isImpersonating && originalUser && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                <Shield className="h-4 w-4 text-orange-500" weight="bold" />
                <span className="text-sm text-orange-500 font-medium">
                  Impersonating: {user?.fullName || user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await exitImpersonation();
                    toast.success('Exited impersonation mode');
                  }}
                  className="h-6 w-6 p-0 hover:bg-orange-500/20"
                >
                  <SignOut className="h-4 w-4 text-orange-500" weight="bold" />
                </Button>
              </div>
            )}
          </div>

          {/* Center section - Navigation */}
          {isAuthenticated && (
            <div className="flex-1 flex justify-center items-center gap-4">
              <nav className={cn(
                "flex items-center p-1 shadow-xl",
                uiStyle === "glass" ? "nav-glass" : "nav-minimal"
              )}>
                {navItems.map(item => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link key={item.to} to={item.to}>
                      <button className={cn(
                        "px-4 py-2 rounded-full text-sm font-sans tracking-tighter transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2",
                        isActive
                          ? cn("text-foreground shadow-lg", uiStyle === "glass" ? "nav-item-active-glass" : "nav-item-active-minimal")
                          : cn("text-muted-foreground hover:text-foreground",
                            uiStyle === "glass" ? "hover:bg-white/10" : "hover:bg-muted/50")
                      )}>
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Right section - User controls */}
          <div className="flex items-center space-x-3">
            <ThemeToggleMinimal />

            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full transition-all hover:scale-105">
                      <Avatar className="h-9 w-9 ring-2 ring-white/20 shadow-lg">
                        <AvatarFallback className="bg-white/20 backdrop-blur-sm text-in-container font-medium">
                          {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[16rem] p-0 rounded-2xl">
                    <div className="p-4 border-b border-border/20 bg-muted/5 rounded-t-2xl">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-white/20 shadow-sm">
                          <AvatarFallback className="bg-white/20 backdrop-blur-sm text-in-container font-medium text-base">
                            {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user?.fullName || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user?.email || 'user@example.com'}
                          </p>
                          {!minutesLoading && (
                            <Link to="/billing" className="block mt-1">
                              <p className={cn(
                                "text-xs font-medium truncate transition-colors hover:text-foreground",
                                percentageUsed >= 90 ? "text-destructive" :
                                  percentageUsed >= 75 ? "text-yellow-600" : "text-emerald-600"
                              )}>
                                {remainingMinutes.toLocaleString()} minutes left
                              </p>
                            </Link>
                          )}
                          {trialCountdown && (
                            <Link to="/billing" className="block mt-1.5">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "px-2 py-0 h-5 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80",
                                  trialCountdown.isExpired
                                    ? "bg-destructive/10 text-destructive border-destructive/30"
                                    : trialCountdown.isUrgent
                                      ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                )}
                              >
                                {trialCountdown.isExpired ? (
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                ) : trialCountdown.isUrgent ? (
                                  <Clock className="w-2.5 h-2.5" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                {trialCountdown.label}
                              </Badge>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground rounded-xl">
                        <Link to="/settings?tab=account&subtab=profile" className="flex items-center gap-3">
                          <User className="h-4 w-4" weight="bold" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground rounded-xl">
                        <Link to="/settings?tab=workspace" className="flex items-center gap-3">
                          <Gear className="h-4 w-4" weight="bold" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      {(isOwner || isManager) && (
                        <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground rounded-xl">
                          <Link to="/settings?tab=integrations" className="flex items-center gap-3">
                            <Lightning className="h-4 w-4" weight="bold" />
                            <span>Integrations</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {isOwner && (
                        <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground rounded-xl">
                          <Link to="/billing" className="flex items-center gap-3">
                            <CreditCard className="h-4 w-4" weight="bold" />
                            <span>Billing</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </div>

                    <div className="border-t border-border/40 p-2">
                      {showDeleteAccount && (
                        <DropdownMenuItem
                          className="cursor-pointer flex items-center gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl mb-1"
                          onSelect={(e) => {
                            e.preventDefault();
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Account</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => {
                          signOut();
                          navigate('/');
                        }}
                      >
                        <SignOut className="h-4 w-4" weight="bold" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </div>

                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogContent className="bg-[#1C1C1C] border-white/10 text-white rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl font-medium">Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription className="text-white/60">
                            This action cannot be undone. This will permanently delete your account
                            and remove all your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                          >
                            {isDeleting ? "Deleting..." : "Delete Account"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useAccountMinutes } from "@/hooks/useAccountMinutes";
import { BarChart3, Phone, Bot, Search, Bell, MessageSquare, Users, Megaphone, User, Settings, CreditCard, Zap, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggleMinimal } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";

export default function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isImpersonating, originalUser, exitImpersonation } = useAuth();
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const { uiStyle } = useTheme();
  const { remainingMinutes, percentageUsed, isLoading: minutesLoading } = useAccountMinutes();
  const { websiteSettings } = useWebsiteSettings();

  const navItems = [{
    icon: <BarChart3 size={16} />,
    label: "Dashboard",
    to: "/dashboard"
  }, {
    icon: <Bot size={16} />,
    label: "Assistants",
    to: "/assistants"
  }, {
    icon: <MessageSquare size={16} />,
    label: "Conversations",
    to: "/conversations"
  }, {
    icon: <Users size={16} />,
    label: "Contacts",
    to: "/contacts"
  }, {
    icon: <Megaphone size={16} />,
    label: "Campaigns",
    to: "/campaigns"
  }, {
    icon: <Phone size={16} />,
    label: "Calls",
    to: "/calls"
  }];

  // Add admin panel to nav items if user is admin
  if (isAdmin) {
    navItems.push({
      icon: <Shield size={16} />,
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
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {websiteSettings?.logo ? (
                <img
                  src={websiteSettings.logo}
                  alt={websiteSettings.website_name || "Logo"}
                  className="h-8 w-auto object-contain max-w-[150px]"
                />
              ) : (
                <h1 className="font-sans font-light text-xl tracking-tight text-foreground">
                  {websiteSettings?.website_name || "AI Call Center"}
                </h1>
              )}
            </Link>
            <h1 className="font-sans font-light text-xl tracking-tight text-foreground">
              {websiteSettings?.website_name || "AI Call Center"}
            </h1>

            {/* Impersonation Indicator */}
            {isImpersonating && originalUser && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                <Shield className="h-4 w-4 text-orange-500" />
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
                  <LogOut className="h-3 w-3 text-orange-500" />
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
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground rounded-xl">
                        <Link to="/settings?tab=account&subtab=profile" className="flex items-center gap-3">
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground rounded-xl">
                        <Link to="/settings?tab=workspace" className="flex items-center gap-3">
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground rounded-xl">
                        <Link to="/settings?tab=integrations" className="flex items-center gap-3">
                          <Zap className="h-4 w-4" />
                          <span>Integrations</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground rounded-xl">
                        <Link to="/billing" className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4" />
                          <span>Billing</span>
                        </Link>
                      </DropdownMenuItem>
                    </div>

                    <div className="border-t border-border/40 p-2">
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => {
                          signOut();
                          navigate('/');
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </div>
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
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Search, BarChart3, Phone, Bot, MessageSquare, Users, Megaphone, User, Settings, CreditCard, Zap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggleMinimal } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
export default function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const navItems = [{
    icon: <BarChart3 size={16} />,
    label: "Dashboard",
    to: "/"
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
  return <header className="relative z-50 transition-all duration-300">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left section - Logo */}
          <div className="flex items-center gap-4">
            <h1 className="font-sans font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              AI Call Center
            </h1>
          </div>

          {/* Center section - Navigation */}
          {isAuthenticated && (
            <div className="flex-1 flex justify-center">
              <nav className="flex items-center bg-white/10 backdrop-blur-md border border-white/30 rounded-full p-1 shadow-xl">
                {navItems.map(item => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link key={item.to} to={item.to}>
                      <button className={cn(
                        "px-4 py-2 rounded-full text-sm font-sans tracking-tighter transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2",
                        isActive 
                          ? "bg-white/30 backdrop-blur-md text-foreground shadow-lg" 
                          : "text-muted-foreground hover:bg-white/10"
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Search</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Notifications</TooltipContent>
                </Tooltip>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full transition-all hover:scale-105">
                      <Avatar className="h-9 w-9 ring-2 ring-background shadow-lg">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 mt-2 p-0">
                    <div className="p-4 border-b border-border/40 bg-accent/20">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-sm">
                          <AvatarFallback className="bg-primary/15 text-primary font-semibold text-base">
                            {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {user?.fullName || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user?.email || 'user@example.com'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground">
                        <Link to="/profile" className="flex items-center gap-3">
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground">
                        <Link to="/settings" className="flex items-center gap-3">
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground">
                        <Link to="/integrations" className="flex items-center gap-3">
                          <Zap className="h-4 w-4" />
                          <span>Integrations</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground hover:text-foreground">
                        <Link to="/billing" className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4" />
                          <span>Billing</span>
                        </Link>
                      </DropdownMenuItem>
                    </div>
                    
                    <div className="border-t border-border/40 p-2">
                      <DropdownMenuItem 
                        className="cursor-pointer flex items-center gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          logout();
                          navigate('/login');
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
    </header>;
}
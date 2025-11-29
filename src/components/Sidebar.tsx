
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Phone,
  Settings,
  HelpCircle,
  Menu,
  X,
  Bot,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggleMinimal } from "./ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";

interface SidebarLinkProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  onClick?: () => void;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { websiteSettings } = useWebsiteSettings();
  console.log('[Sidebar] websiteSettings:', websiteSettings);

  const links = [
    { icon: <BarChart3 size={20} className="text-primary/80" />, label: "Dashboard", to: "/dashboard" },
    { icon: <Bot size={20} className="text-primary/80" />, label: "Assistants", to: "/assistants" },
    { icon: <Phone size={20} className="text-primary/80" />, label: "Calls", to: "/calls" },
    { icon: <MessageSquare size={20} className="text-primary/80" />, label: "Conversations", to: "/conversations" },
    { icon: <Settings size={20} className="text-primary/80" />, label: "Settings", to: "/settings" },
  ];

  const SidebarLink = ({ icon, label, to }: SidebarLinkProps) => {
    const isActive = location.pathname === to;

    return (
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start liquid-space-md mb-2 py-3 liquid-rounded-md liquid-transition",
          "hover:liquid-glass-light border border-transparent",
          isActive
            ? "liquid-glass-medium text-foreground border-primary/20 shadow-[0_4px_16px_rgba(255,74,113,0.2)]"
            : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:border-primary/10"
        )}
        asChild
      >
        <Link to={to}>
          <div className="liquid-transition group-hover:scale-110">
            {icon}
          </div>
          {!collapsed && <span className="font-extralight tracking-wide">{label}</span>}
        </Link>
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "flex h-screen flex-col liquid-glass-heavy border-r border-white/10 liquid-transition",
        "shadow-[0_0_60px_rgba(0,0,0,0.3)]",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            {websiteSettings?.logo ? (
              <img
                src={websiteSettings.logo}
                alt={websiteSettings.website_name || "Logo"}
                className="h-8 w-auto object-contain max-w-[120px]"
              />
            ) : (
              <span className="font-extralight text-liquid-premium text-lg tracking-wider truncate">
                {websiteSettings?.website_name || "AI Call Center"}
              </span>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:liquid-glass-light hover:text-sidebar-accent-foreground ml-auto liquid-rounded-md liquid-transition shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        <div className="flex flex-col liquid-space-sm">
          {links.map((link) => (
            <SidebarLink
              key={link.label}
              icon={link.icon}
              label={link.label}
              to={link.to}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-white/10 p-4 flex flex-col liquid-space-md">
        {!collapsed && (
          <div className="liquid-glass-light liquid-rounded-md p-2">
            <ThemeToggleMinimal />
          </div>
        )}

        <div className="flex items-center justify-between">
          <SidebarLink
            icon={<HelpCircle size={20} className="text-primary/80" />}
            label="Help & Support"
            to="/help"
          />
        </div>

        <div className="flex items-center liquid-space-sm px-2 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="liquid-rounded-md hover:liquid-glass-light p-2 flex items-center liquid-space-sm w-full justify-start liquid-transition"
              >
                <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-primary/80 text-white ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-extralight">
                    JD
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <span className="text-sm text-sidebar-foreground font-extralight tracking-wide">
                    John Doe
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 liquid-glass-heavy liquid-rounded-lg border border-primary/20 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            >
              <DropdownMenuLabel className="font-extralight tracking-wide">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem className="liquid-transition hover:liquid-glass-light liquid-rounded-sm">
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="liquid-transition hover:liquid-glass-light liquid-rounded-sm" asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem className="liquid-transition hover:liquid-glass-light liquid-rounded-sm">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

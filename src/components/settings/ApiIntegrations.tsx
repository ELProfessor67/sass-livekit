import React, { useState, useEffect, useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Building2, AlertCircle, Mail, Database, Users, Zap, Globe, MessageSquare } from "lucide-react";
import { CheckCircle, CaretRight, MagnifyingGlass } from "phosphor-react";
import { useToast } from "@/hooks/use-toast";
import { TwilioAuthDialog } from "./TwilioAuthDialog";
import { CalendarAuthDialog } from "./CalendarAuthDialog";
import { TwilioIntegrationCard } from "./integrations/TwilioIntegrationCard";
import { CalendarIntegrationCard } from "./CalendarIntegrationCard";
import { WhatsAppIntegrationCard } from "./WhatsAppIntegrationCard";
import { SMTPAuthDialog } from "./SMTPAuthDialog";
import { SMTPIntegrationCard } from "./SMTPIntegrationCard";
import { SecurityCard } from "./integrations/SecurityCard";
import type { TwilioIntegration } from "./integrations/types";
import { TwilioCredentialsService } from "@/lib/twilio-credentials";
import { CalendarCredentialsService, type UserCalendarCredentials, type CalendarCredentialsInput } from "@/lib/calendar-credentials";
import { WhatsAppCredentialsService } from "@/lib/whatsapp-credentials";
import { SMTPCredentialsService, type UserSMTPCredentials } from "@/lib/smtp-credentials";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { cn } from "@/lib/utils";
import {
  GoHighLevelIcon,
  HubSpotIcon,
  SlackIcon,
  TwilioIcon,
  WhatsAppIcon,
  CalcomIcon,
  FacebookLeadsIcon,
  SalesforceIcon,
  ZohoIcon,
  GoogleAdsIcon,
  TelnyxIcon,
} from "@/components/composer/nodes/IntegrationIcons";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  status: string;
  category: string;
  brandColor: string;
}

const integrationList: Integration[] = [
  // Leads
  {
    id: "facebook",
    name: "Facebook",
    description: "Capture leads from Facebook ads and forms",
    icon: FacebookLeadsIcon,
    status: "available",
    category: "Leads",
    brandColor: "#1877F2",
  },
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Capture leads from Google campaigns",
    icon: GoogleAdsIcon,
    status: "available",
    category: "Leads",
    brandColor: "#4285F4",
  },
  // CRM
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync HubSpot contacts and log call activity automatically",
    icon: HubSpotIcon,
    status: "available",
    category: "CRM",
    brandColor: "#ff7a59",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Connect your Salesforce CRM to sync contacts and opportunities",
    icon: SalesforceIcon,
    status: "available",
    category: "CRM",
    brandColor: "#00a1e0",
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    description: "Integrate with Zoho CRM for seamless contact management",
    icon: ZohoIcon,
    status: "available",
    category: "CRM",
    brandColor: "#e42527",
  },
  {
    id: "gohighlevel",
    name: "GoHighLevel",
    description: "All-in-one CRM and marketing automation platform",
    icon: GoHighLevelIcon,
    status: "available",
    category: "CRM",
    brandColor: "#7c3aed",
  },
  // Communication
  {
    id: "twilio",
    name: "Twilio",
    description: "Cloud communications platform for voice, SMS, and video",
    icon: TwilioIcon,
    status: "available",
    category: "Communication",
    brandColor: "#f22f46",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send notifications and updates to your Slack channels",
    icon: SlackIcon,
    status: "available",
    category: "Communication",
    brandColor: "#4A154B",
  },
  {
    id: "telnyx",
    name: "Telnyx",
    description: "Global connectivity platform for voice and messaging",
    icon: TelnyxIcon,
    status: "available",
    category: "Communication",
    brandColor: "#00d9ff",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Connect WhatsApp Business for messaging capabilities",
    icon: WhatsAppIcon,
    status: "available",
    category: "Communication",
    brandColor: "#25D366",
  },
  {
    id: "smtp",
    name: "SendGrid",
    description: "Optional: use your own SendGrid account to send emails from your domain",
    icon: Mail,
    status: "available",
    category: "Communication",
    brandColor: "#1A82E2",
  },
  // Calendar
  {
    id: "calcom",
    name: "Cal.com",
    description: "Open-source scheduling infrastructure for everyone",
    icon: CalcomIcon,
    status: "available",
    category: "Calendar",
    brandColor: "#292929",
  },
];

const categories = [
  { id: "all", label: "All" },
  { id: "leads", label: "Leads" },
  { id: "crm", label: "CRM" },
  { id: "communication", label: "Communication" },
  { id: "calendar", label: "Calendars" },
];

export function ApiIntegrations() {
  const { canEdit, currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [twilioIntegrations, setTwilioIntegrations] = useState<TwilioIntegration[]>([]);
  const [calendarIntegrations, setCalendarIntegrations] = useState<UserCalendarCredentials[]>([]);
  const [whatsappIntegrations, setWhatsappIntegrations] = useState<any[]>([]);
  const [slackConnections, setSlackConnections] = useState<any[]>([]);
  const [facebookConnections, setFacebookConnections] = useState<any[]>([]);
  const [hubspotConnections, setHubSpotConnections] = useState<any[]>([]);
  const [ghlConnections, setGhlConnections] = useState<any[]>([]);
  const [smtpCredentials, setSmtpCredentials] = useState<UserSMTPCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detail panel visibility (shown below the grid when toggled)
  const [showTwilioDetails, setShowTwilioDetails] = useState(false);
  const [showCalendarDetails, setShowCalendarDetails] = useState(false);
  const [showWhatsappDetails, setShowWhatsappDetails] = useState(false);
  const [showSmtpDetails, setShowSmtpDetails] = useState(false);

  // workspaceId: null = main account, string = specific workspace
  const workspaceId = currentWorkspace?.id ?? null;

  const buildWorkspaceParam = () =>
    workspaceId ? `&workspaceId=${workspaceId}` : '&workspaceId=main';

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadTwilioCredentials = async () => {
    try {
      setIsLoading(true);
      const credentials = await TwilioCredentialsService.getAllCredentials(workspaceId);
      const mapped: TwilioIntegration[] = credentials.map(cred => ({
        id: cred.id,
        name: "Twilio",
        description: `Voice and SMS communications${cred.trunk_sid ? ' with auto-generated trunk' : ''}`,
        status: "connected" as const,
        lastUsed: formatLastUsed(cred.updated_at),
        details: {
          account: maskAccountSid(cred.account_sid),
          label: cred.label,
          trunkSid: cred.trunk_sid,
        },
      }));
      setTwilioIntegrations(mapped);
    } catch (error) {
      console.error("Error loading Twilio credentials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCalendarCredentials = async () => {
    try {
      const credentials = await CalendarCredentialsService.getAllCredentials(workspaceId);
      setCalendarIntegrations(credentials);
    } catch (error) {
      console.error("Error loading calendar credentials:", error);
    }
  };

  const loadWhatsAppCredentials = async () => {
    try {
      const credentials = await WhatsAppCredentialsService.getAllCredentials(workspaceId);
      const mapped = credentials.map(cred => ({
        id: cred.id,
        name: "WhatsApp Business",
        description: `WhatsApp Business messaging${cred.label ? ` - ${cred.label}` : ''}`,
        status: "connected" as const,
        lastUsed: formatLastUsed(cred.updated_at),
        details: { number: maskWhatsAppNumber(cred.whatsapp_number), label: cred.label },
      }));
      setWhatsappIntegrations(mapped);
    } catch (error) {
      console.error("Error loading WhatsApp credentials:", error);
    }
  };

  const loadSlackConnections = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/v1/connections?provider=slack&userId=${user.id}${buildWorkspaceParam()}`);
      const data = await res.json();
      setSlackConnections(data.connections || []);
    } catch (error) {
      console.error("Error loading Slack connections:", error);
    }
  };

  const loadFacebookConnections = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/v1/connections?provider=facebook&userId=${user.id}${buildWorkspaceParam()}`);
      const data = await res.json();
      setFacebookConnections(data.connections || []);
    } catch (error) {
      console.error("Error loading Facebook connections:", error);
    }
  };

  const loadHubSpotConnections = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/v1/connections?provider=hubspot&userId=${user.id}${buildWorkspaceParam()}`);
      const data = await res.json();
      setHubSpotConnections(data.connections || []);
    } catch (error) {
      console.error("Error loading HubSpot connections:", error);
    }
  };

  const loadGHLConnections = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/v1/connections?provider=gohighlevel&userId=${user.id}${buildWorkspaceParam()}`);
      const data = await res.json();
      setGhlConnections(data.connections || []);
    } catch (error) {
      console.error("Error loading GHL connections:", error);
    }
  };

  const loadSMTPCredentials = async () => {
    try {
      const creds = await SMTPCredentialsService.getCredentials(workspaceId);
      setSmtpCredentials(creds);
    } catch (error) {
      console.error("Error loading SMTP credentials:", error);
    }
  };

  // Reload whenever user or workspace changes
  useEffect(() => {
    // Reset all connection states first to prevent stale "Connected" badges 
    // from showing when switching between workspaces
    setTwilioIntegrations([]);
    setCalendarIntegrations([]);
    setWhatsappIntegrations([]);
    setSlackConnections([]);
    setFacebookConnections([]);
    setHubSpotConnections([]);
    setGhlConnections([]);
    setSmtpCredentials(null);

    loadTwilioCredentials();
    loadCalendarCredentials();
    loadWhatsAppCredentials();
    loadSlackConnections();
    loadFacebookConnections();
    loadHubSpotConnections();
    loadGHLConnections();
    loadSMTPCredentials();
    setShowTwilioDetails(false);
    setShowCalendarDetails(false);
    setShowWhatsappDetails(false);
    setShowSmtpDetails(false);
  }, [user, workspaceId]);

  // Handle OAuth callback params
  useEffect(() => {
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const phase = searchParams.get('phase');

    const clean = (...keys: string[]) => {
      keys.forEach(k => searchParams.delete(k));
      setSearchParams(searchParams, { replace: true });
    };

    if (status === 'connected' && provider === 'facebook') {
      if (phase === '1') {
        toast({ title: "Facebook connected", description: "Your Facebook account is connected. Connect your pages to enable lead capture.", duration: 5000 });
        loadFacebookConnections();
        clean('status', 'provider', 'phase', 'connectionId');
      } else if (phase === '2') {
        toast({ title: "Page permissions granted", description: "You can now select and manage Facebook pages for lead capture." });
        loadFacebookConnections();
        clean('status', 'provider', 'phase');
      } else {
        loadFacebookConnections();
        clean('status', 'provider');
      }
    } else if (status === 'error' && provider === 'facebook') {
      toast({ title: "Connection failed", description: "Failed to connect Facebook. Please try again.", variant: "destructive" });
      clean('status', 'provider', 'phase');
    } else if (status === 'connected' && provider === 'slack') {
      toast({ title: "Slack connected", description: "Your Slack workspace has been connected." });
      loadSlackConnections();
      clean('status', 'provider');
    } else if (status === 'error' && provider === 'slack') {
      toast({ title: "Connection failed", description: "Failed to connect Slack. Please try again.", variant: "destructive" });
      clean('status', 'provider');
    } else if (status === 'connected' && provider === 'hubspot') {
      toast({ title: "HubSpot connected", description: "Your HubSpot account has been connected successfully." });
      loadHubSpotConnections();
      clean('status', 'provider');
    } else if (status === 'error' && provider === 'hubspot') {
      const message = searchParams.get('message');
      toast({ title: "Connection failed", description: message ? decodeURIComponent(message) : "Failed to connect HubSpot. Please try again.", variant: "destructive" });
      clean('status', 'provider', 'message');
    } else if (status === 'connected' && provider === 'gohighlevel') {
      toast({ title: "GoHighLevel connected", description: "Your GoHighLevel account has been connected successfully." });
      loadGHLConnections();
      clean('status', 'provider');
    } else if (status === 'error' && provider === 'gohighlevel') {
      const message = searchParams.get('message');
      toast({ title: "Connection failed", description: message ? decodeURIComponent(message) : "Failed to connect GoHighLevel. Please try again.", variant: "destructive" });
      clean('status', 'provider', 'message');
    }
  }, [searchParams]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const maskAccountSid = (sid: string) => {
    if (sid.length <= 8) return sid;
    return sid.substring(0, 2) + "*".repeat(sid.length - 6) + sid.substring(sid.length - 4);
  };

  const maskWhatsAppNumber = (number: string) => {
    if (number.length <= 4) return number;
    return number.slice(0, -4).replace(/./g, '*') + number.slice(-4);
  };

  const formatLastUsed = (dateString: string) => {
    const diffInHours = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  // ── Connection status per integration ────────────────────────────────────

  const isConnected = (id: string) => {
    switch (id) {
      case "twilio": return twilioIntegrations.length > 0;
      case "calcom": return calendarIntegrations.length > 0;
      case "whatsapp": return whatsappIntegrations.length > 0;
      case "slack": return slackConnections.length > 0;
      case "facebook": return facebookConnections.length > 0;
      case "hubspot": return hubspotConnections.length > 0;
      case "gohighlevel": return ghlConnections.length > 0;
      case "smtp": return smtpCredentials !== null;
      default: return false;
    }
  };

  // ── Facebook page permissions helper ─────────────────────────────────────

  const hasPagePermissions = (conn: any) =>
    conn?.metadata?.has_page_permissions === true ||
    conn?.scopes?.includes('pages_show_list') ||
    (conn?.metadata?.pages && conn.metadata.pages.length > 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTwilioConnect = async (data: { accountSid: string; authToken: string; label: string }) => {
    try {
      const isValid = await TwilioCredentialsService.testCredentials(data);
      if (!isValid) {
        toast({ title: "Invalid credentials", description: "Please check your Twilio credentials and try again.", variant: "destructive" });
        throw new Error("Invalid credentials");
      }
      await TwilioCredentialsService.saveCredentials(data, workspaceId);
      await loadTwilioCredentials();
      toast({ title: "Twilio connected", description: "Your Twilio account has been connected successfully." });
    } catch (error) {
      toast({ title: "Connection failed", description: "Failed to connect your Twilio account. Please try again.", variant: "destructive" });
      throw error;
    }
  };

  const handleRemoveTwilio = async (id: string) => {
    try {
      await TwilioCredentialsService.deleteCredentials(id);
      await loadTwilioCredentials();
      toast({ title: "Integration removed", description: "The Twilio integration has been removed successfully." });
    } catch {
      toast({ title: "Removal failed", description: "Failed to remove the integration. Please try again.", variant: "destructive" });
    }
  };

  const handleRefreshTwilio = async (id: string) => {
    try {
      await TwilioCredentialsService.setActiveCredentials(id);
      await loadTwilioCredentials();
      toast({ title: "Integration refreshed", description: "The Twilio integration has been set as active." });
    } catch {
      toast({ title: "Refresh failed", description: "Failed to refresh the integration. Please try again.", variant: "destructive" });
    }
  };

  const handleCalendarConnect = async (data: CalendarCredentialsInput) => {
    try {
      await CalendarCredentialsService.saveCredentials(data, workspaceId);
      await loadCalendarCredentials();
      toast({ title: "Calendar connected", description: "Your calendar integration has been connected successfully." });
    } catch {
      toast({ title: "Connection failed", description: "Failed to connect your calendar. Please try again.", variant: "destructive" });
      throw new Error("Failed");
    }
  };

  const handleRemoveCalendar = async (id: string) => {
    try {
      await CalendarCredentialsService.deleteCredentials(id);
      await loadCalendarCredentials();
      toast({ title: "Integration removed", description: "The calendar integration has been removed successfully." });
    } catch {
      toast({ title: "Removal failed", description: "Failed to remove the calendar integration. Please try again.", variant: "destructive" });
    }
  };

  const handleRefreshCalendar = async (id: string) => {
    try {
      await CalendarCredentialsService.setActiveCredentials(id);
      await loadCalendarCredentials();
      toast({ title: "Integration refreshed", description: "The calendar integration has been set as active." });
    } catch {
      toast({ title: "Refresh failed", description: "Failed to refresh the calendar integration. Please try again.", variant: "destructive" });
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!canEdit || !user?.id) return;
    const map: Record<string, any[]> = { slack: slackConnections, facebook: facebookConnections, hubspot: hubspotConnections, gohighlevel: ghlConnections };
    const connections = map[provider] || [];
    if (!connections.length) return;
    try {
      await Promise.all(connections.map(conn =>
        fetch(`/api/v1/connections/${conn.id}?userId=${user.id}${buildWorkspaceParam()}`, { method: 'DELETE' })
      ));
      if (provider === 'slack') await loadSlackConnections();
      if (provider === 'facebook') await loadFacebookConnections();
      if (provider === 'hubspot') await loadHubSpotConnections();
      if (provider === 'gohighlevel') await loadGHLConnections();
      toast({ title: "Disconnected", description: `Successfully disconnected ${provider}.` });
    } catch {
      toast({ title: "Disconnection failed", description: `Failed to disconnect ${provider}. Please try again.`, variant: "destructive" });
    }
  };

  const handleCardClick = (id: string) => {
    if (!canEdit) {
      toast({ title: "Permission Denied", description: "You do not have permission to manage integrations.", variant: "destructive" });
      return;
    }
    if (id === "twilio") { setShowTwilioDetails(p => !p); return; }
    if (id === "calcom") { setShowCalendarDetails(p => !p); return; }
    if (id === "whatsapp") { setShowWhatsappDetails(p => !p); return; }
    if (id === "smtp") { setShowSmtpDetails(p => !p); return; }
    if (!user?.id) return;
    const oauthMap: Record<string, string> = {
      slack: `/api/v1/connections/slack/auth?userId=${user.id}${buildWorkspaceParam()}`,
      facebook: `/api/v1/connections/facebook/auth?userId=${user.id}${buildWorkspaceParam()}`,
      gohighlevel: `/api/v1/connections/gohighlevel/auth?userId=${user.id}${buildWorkspaceParam()}`,
      hubspot: `/api/v1/connections/hubspot/auth?userId=${user.id}${buildWorkspaceParam()}`,
    };
    if (oauthMap[id]) { window.location.href = oauthMap[id]; return; }
    toast({ title: "Coming Soon", description: `${id} integration is coming soon!` });
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const displayIntegrations = useMemo(() => {
    return integrationList.map(i => ({ ...i, status: isConnected(i.id) ? "connected" : "available" }));
  }, [twilioIntegrations, calendarIntegrations, whatsappIntegrations, slackConnections, facebookConnections, hubspotConnections, ghlConnections, smtpCredentials]);

  const filteredIntegrations = useMemo(() => {
    let result = displayIntegrations;
    if (activeCategory !== "all") {
      result = result.filter(i => i.category.toLowerCase() === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return result;
  }, [displayIntegrations, activeCategory, searchQuery]);

  const groupedIntegrations = useMemo(() => {
    const groups: Record<string, typeof filteredIntegrations> = {};
    filteredIntegrations.forEach(i => {
      if (!groups[i.category]) groups[i.category] = [];
      groups[i.category].push(i);
    });
    return groups;
  }, [filteredIntegrations]);

  // ── Card component ────────────────────────────────────────────────────────

  const IntegrationCard = ({ integration }: { integration: typeof displayIntegrations[0] }) => {
    const IconComponent = integration.icon;
    const connected = integration.status === "connected";
    const oauthProviders = ["slack", "facebook", "hubspot", "gohighlevel"];
    const isOAuth = oauthProviders.includes(integration.id);

    // Facebook: check if any connection is missing page permissions
    const fbNeedsPages = integration.id === "facebook" && connected &&
      facebookConnections.some(conn => !hasPagePermissions(conn));

    const cardContent = (
      <Card className="group cursor-pointer transition-all duration-200">
        <div className="p-5">
          {/* Icon + connected badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 flex items-center justify-center">
              <IconComponent size={28} />
            </div>
            {connected && (
              <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                <CheckCircle weight="fill" className="w-3.5 h-3.5" />
                Connected
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="font-medium text-foreground text-sm mb-1.5">
            {integration.name}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mb-4">
            {integration.description}
          </p>

          {/* Facebook: pages alert */}
          {fbNeedsPages && (
            <div className="mb-3 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Connect your Facebook Pages to enable lead capture.</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {integration.category}
            </span>
            <div className="flex items-center gap-2">
              {/* Facebook Connect Pages button */}
              {fbNeedsPages && user?.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/api/v1/connections/facebook/auth?userId=${user.id}&phase=2${buildWorkspaceParam()}`;
                  }}
                  className="text-[10px] font-medium text-blue-600 hover:text-blue-700 underline"
                >
                  Connect Pages
                </button>
              )}
              {/* Disconnect button for connected OAuth integrations */}
              {connected && isOAuth && canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDisconnect(integration.id);
                  }}
                  className="text-[10px] font-medium text-destructive hover:text-destructive/80"
                >
                  Disconnect
                </button>
              )}
              <CaretRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </Card>
    );

    // Twilio: toggle detail panel if connected, open auth dialog if not
    if (integration.id === "twilio") {
      if (connected) {
        return (
          <div onClick={() => handleCardClick("twilio")}>
            {cardContent}
          </div>
        );
      }
      return (
        <TwilioAuthDialog onSuccess={handleTwilioConnect}>
          {cardContent}
        </TwilioAuthDialog>
      );
    }

    // Cal.com: always use dialog (handles both add & manage internally)
    if (integration.id === "calcom") {
      return (
        <CalendarAuthDialog
          onSuccess={handleCalendarConnect}
          integrations={calendarIntegrations}
          onRemove={handleRemoveCalendar}
          onRefresh={handleRefreshCalendar}
        >
          {cardContent}
        </CalendarAuthDialog>
      );
    }

    // SMTP: wrap with auth dialog
    if (integration.id === "smtp") {
      return (
        <SMTPAuthDialog
          onSuccess={loadSMTPCredentials}
          initialData={smtpCredentials}
          workspaceId={workspaceId}
        >
          {cardContent}
        </SMTPAuthDialog>
      );
    }

    return (
      <div onClick={() => handleCardClick(integration.id)}>
        {cardContent}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light tracking-[0.2px] text-foreground">Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your favorite tools and services
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Workspace scope badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs shrink-0">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Scope:</span>
            <span className="font-medium text-foreground">
              {currentWorkspace?.workspace_name ?? "Main Account"}
            </span>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
              activeCategory === cat.id
                ? "bg-foreground text-background"
                : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Integration sections */}
      <div className="space-y-8">
        {Object.keys(groupedIntegrations).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No integrations found.</p>
          </div>
        ) : (
          Object.entries(groupedIntegrations).map(([category, items]) => (
            <div key={category} className="space-y-4">
              {/* Category header */}
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-foreground">{category}</h3>
                <span className="text-sm text-muted-foreground">{items.length}</span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map(integration => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
              </div>

              {/* Inline detail panels – shown below category when toggled */}
              {category === "Communication" && showTwilioDetails && twilioIntegrations.length > 0 && (
                <div className="mt-4">
                  <TwilioIntegrationCard
                    integrations={twilioIntegrations}
                    onSuccess={handleTwilioConnect}
                    onRemove={handleRemoveTwilio}
                    onRefresh={handleRefreshTwilio}
                  />
                </div>
              )}
              {category === "Calendar" && showCalendarDetails && calendarIntegrations.length > 0 && (
                <div className="mt-4">
                  <CalendarIntegrationCard
                    integrations={calendarIntegrations}
                    onSuccess={handleCalendarConnect}
                    onRemove={handleRemoveCalendar}
                    onRefresh={handleRefreshCalendar}
                  />
                </div>
              )}
              {category === "Communication" && showWhatsappDetails && whatsappIntegrations.length > 0 && (
                <div className="mt-4">
                  <WhatsAppIntegrationCard
                    integrations={whatsappIntegrations}
                    onIntegrationsChange={setWhatsappIntegrations}
                    workspaceId={workspaceId}
                  />
                </div>
              )}
              {category === "Communication" && showSmtpDetails && (
                <div className="mt-4">
                  <SMTPIntegrationCard />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Security card */}
      <SecurityCard />
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Buildings, UploadSimple, Globe, Clock, Briefcase } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const workspaceSettingsSchema = z.object({
  workspace_name: z.string().min(1, "Workspace name is required"),
  timezone: z.string().min(1, "Timezone is required"),
  company_address: z.string().optional(),
  company_phone: z.string().optional(),
  company_website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  company_industry: z.string().optional(),
  company_size: z.string().optional(),
  company_description: z.string().optional(),
});

type WorkspaceSettingsForm = z.infer<typeof workspaceSettingsSchema>;

const timezones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time" },
  { value: "Asia/Tokyo", label: "Japan Standard Time" },
  { value: "Asia/Shanghai", label: "China Standard Time" },
  { value: "Australia/Sydney", label: "Australian Eastern Time" },
];

const companySizes = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

const industries = [
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "education", label: "Education" },
  { value: "consulting", label: "Consulting" },
  { value: "real-estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

export function GeneralSettings() {
  const { currentWorkspace, refreshWorkspaces, canManageSettings: canEdit } = useWorkspace();
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<WorkspaceSettingsForm>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: {
      workspace_name: "",
      timezone: "UTC",
      company_address: "",
      company_phone: "",
      company_website: "",
      company_industry: "",
      company_size: "",
      company_description: "",
    },
  });

  useEffect(() => {
    if (currentWorkspace) {
      form.reset({
        workspace_name: currentWorkspace.workspace_name,
        timezone: currentWorkspace.timezone || "UTC",
        company_address: currentWorkspace.company_address || "",
        company_phone: currentWorkspace.company_phone || "",
        company_website: currentWorkspace.company_website || "",
        company_industry: currentWorkspace.company_industry || "",
        company_size: currentWorkspace.company_size || "",
        company_description: currentWorkspace.company_description || "",
      });
      setLogoUrl(currentWorkspace.logo_url || "");
    }
  }, [currentWorkspace, form]);

  const handleLogoUpload = async (file: File) => {
    if (!file || !currentWorkspace) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      // Include user ID in path to satisfy RLS policy: auth.uid()::text = (storage.foldername(name))[1]
      const fileName = `${user.id}/${currentWorkspace.id || 'default'}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('workspace-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('workspace-logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      // If this is a virtual workspace (id is null), we should not try to update it directly.
      // The user will need to click "Save Changes" which will now handle creating the workspace.
      if (currentWorkspace.id) {
        const { error: updateError } = await supabase
          .from('workspace_settings')
          .update({ logo_url: publicUrl })
          .eq('id', currentWorkspace.id);

        if (updateError) throw updateError;
        await refreshWorkspaces();
      }
      
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: WorkspaceSettingsForm) => {
    if (!currentWorkspace) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (currentWorkspace.id) {
        // Update existing workspace
        const { error } = await supabase
          .from('workspace_settings')
          .update({
            ...data,
            logo_url: logoUrl,
          })
          .eq('id', currentWorkspace.id);

        if (error) throw error;
      } else {
        // Create new workspace from virtual Main Account
        const { error } = await supabase
          .from('workspace_settings')
          .insert({
            ...data,
            logo_url: logoUrl,
            user_id: user.id,
            workspace_type: 'simple'
          });

        if (error) throw error;
      }

      await refreshWorkspaces();
      toast.success("Workspace settings saved successfully");
    } catch (error) {
      console.error("Error saving workspace settings:", error);
      toast.error("Failed to save workspace settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-[0.2px] text-foreground">General Settings</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Configure your workspace logo, name, timezone, and business information
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card variant="glass" className="backdrop-blur-xl bg-white/[0.02] border-white/[0.08]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground">
                <Buildings size={20} weight="duotone" className="text-primary" />
                Workspace Settings
              </CardTitle>
              <CardDescription className="leading-relaxed">
                Customize your workspace identity and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4 pb-4 border-b border-border/30">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] backdrop-blur-sm flex items-center justify-center overflow-hidden hover:border-white/[0.2] transition-all duration-300 group">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Workspace logo" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Buildings size={28} weight="duotone" className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !canEdit}
                      className="backdrop-blur-sm bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-200"
                    >
                      <UploadSimple size={16} weight="duotone" className="mr-2" />
                      {isUploading ? "Uploading..." : "Upload Logo"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    PNG, JPG or SVG • Max 5MB • Recommended 200x200px
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="workspace_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Workspace Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="backdrop-blur-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock size={16} weight="duotone" />
                        Timezone
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                        <FormControl>
                          <SelectTrigger className="backdrop-blur-sm">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="backdrop-blur-xl bg-background/95">
                          {timezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card variant="glass" className="backdrop-blur-xl bg-white/[0.02] border-white/[0.08]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground">
                <Briefcase size={20} weight="duotone" className="text-primary" />
                Business Information
              </CardTitle>
              <CardDescription className="leading-relaxed">
                Additional details about your company (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="company_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">Company Address</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="resize-none min-h-[80px] backdrop-blur-sm"
                        placeholder="123 Business St, City, State, Country"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contact Information
                  </span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="company_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="backdrop-blur-sm"
                            placeholder="+1 (555) 123-4567"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Website</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="backdrop-blur-sm"
                            placeholder="https://www.example.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company Details
                  </span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="company_industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Industry</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                          <FormControl>
                            <SelectTrigger className="backdrop-blur-sm">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="backdrop-blur-xl bg-background/95">
                            {industries.map((industry) => (
                              <SelectItem key={industry.value} value={industry.value}>
                                {industry.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Company Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                          <FormControl>
                            <SelectTrigger className="backdrop-blur-sm">
                              <SelectValue placeholder="Select company size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="backdrop-blur-xl bg-background/95">
                            {companySizes.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="company_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Company Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="resize-none min-h-[100px] backdrop-blur-sm"
                          placeholder="Brief description of your company and what you do..."
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground leading-relaxed">
                        Tell us about your business (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="pt-6 border-t border-border/30">
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSaving || !canEdit}
                className="px-8 backdrop-blur-sm bg-primary/90 hover:bg-primary transition-all duration-200 border border-primary/20"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
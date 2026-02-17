import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Globe, Clock, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<WorkspaceSettingsForm>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: {
      workspace_name: "My Workspace",
      timezone: "UTC",
      company_address: "",
      company_phone: "",
      company_website: "",
      company_industry: "",
      company_size: "",
      company_description: "",
    },
  });

  const onSubmit = async (data: WorkspaceSettingsForm) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('workspace_settings')
        .upsert({
          user_id: user.id,
          ...data,
        });

      if (error) throw error;

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
          Configure your workspace name, timezone, and business information
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Workspace Information */}
          <Card variant="glass" className="backdrop-blur-xl bg-white/[0.02] border-white/[0.08]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground">
                <Building2 className="w-5 h-5 text-primary" />
                Workspace Information
              </CardTitle>
              <CardDescription className="leading-relaxed">
                Customize your workspace identity and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="workspace_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Workspace Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9 backdrop-blur-sm" />
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
                        <Clock className="w-4 h-4" />
                        Timezone
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 backdrop-blur-sm">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                <Briefcase className="w-5 h-5 text-primary" />
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
                        className="h-9 backdrop-blur-sm min-h-[80px]"
                        placeholder="123 Business St, City, State, Country"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                          className="h-9 backdrop-blur-sm"
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
                          className="h-9 backdrop-blur-sm"
                          placeholder="https://www.example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Industry</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 backdrop-blur-sm">
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 backdrop-blur-sm">
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                        className="h-9 backdrop-blur-sm min-h-[100px]"
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
            </CardContent>
          </Card>

          <div className="pt-6 border-t border-border/30">
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
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
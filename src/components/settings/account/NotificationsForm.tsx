import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionHeading, BodyText } from "@/components/ui/typography";
const notificationsFormSchema = z.object({
  notifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  weeklyReports: z.boolean().default(true)
});
type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;
const defaultValues: NotificationsFormValues = {
  notifications: true,
  marketingEmails: false,
  weeklyReports: true
};
export function NotificationsForm() {
  const {
    toast
  } = useToast();
  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues
  });
  function onSubmit(data: NotificationsFormValues) {
    toast({
      title: "Notification preferences updated",
      description: "Your notification settings have been saved."
    });
    console.log(data);
  }
  return <Card className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-2xl">
      <CardHeader className="pb-6">
        <h3 className="text-xl font-medium text-foreground">Notification Preferences</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Configure how you receive notifications
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="notifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.01] p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-foreground font-medium">Push Notifications</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about important account activity
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="marketingEmails"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.01] p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-foreground font-medium">Marketing Emails</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Receive emails about new features and updates
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="weeklyReports"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.01] p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-foreground font-medium">Weekly Reports</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Get weekly summaries of your call center performance
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end pt-4">
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Save Preferences
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>;
}
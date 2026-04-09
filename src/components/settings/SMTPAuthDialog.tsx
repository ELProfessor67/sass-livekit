import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    ThemedDialog,
    ThemedDialogTrigger,
    ThemedDialogContent,
    ThemedDialogHeader,
} from "@/components/ui/themed-dialog";
import { DialogFooter } from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import { SMTPCredentialsService, type UserSMTPCredentials } from "@/lib/smtp-credentials";

const sendgridFormSchema = z.object({
    from_name: z.string().optional(),
    from_email: z.string().email({ message: "Invalid sender email address." }),
    api_key: z.string().min(1, { message: "SendGrid API key is required." }),
});

type SendGridFormValues = z.infer<typeof sendgridFormSchema>;

interface SMTPAuthDialogProps {
    onSuccess?: () => void;
    children?: React.ReactNode;
    initialData?: UserSMTPCredentials | null;
    workspaceId?: string | null;
}

export function SMTPAuthDialog({ onSuccess, children, initialData, workspaceId }: SMTPAuthDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<SendGridFormValues>({
        resolver: zodResolver(sendgridFormSchema),
        defaultValues: {
            from_name: initialData?.from_name || "",
            from_email: initialData?.from_email || "",
            api_key: initialData?.smtp_pass || "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                from_name: initialData.from_name || "",
                from_email: initialData.from_email || "",
                api_key: initialData.smtp_pass || "",
            });
        }
    }, [initialData, form]);

    async function onSubmit(data: SendGridFormValues) {
        try {
            setIsLoading(true);
            await SMTPCredentialsService.saveCredentials(
                { api_key: data.api_key, from_email: data.from_email, from_name: data.from_name },
                workspaceId
            );

            toast({ title: "Success", description: "SendGrid credentials saved successfully!" });
            if (onSuccess) onSuccess();
            setOpen(false);
        } catch (error) {
            console.error("Error saving SendGrid credentials:", error);
            toast({
                title: "Error",
                description: "Failed to save SendGrid credentials. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <ThemedDialog open={open} onOpenChange={setOpen}>
            <ThemedDialogTrigger asChild>
                {children || (
                    <Button className="inline-flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>Connect SendGrid</span>
                    </Button>
                )}
            </ThemedDialogTrigger>
            <ThemedDialogContent className="sm:max-w-md bg-white">
                <ThemedDialogHeader
                    title="SendGrid Configuration"
                    description="Enter your SendGrid API key and verified sender details to send emails."
                />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-1">
                        <FormField
                            control={form.control}
                            name="from_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sender Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., My Agency Team" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="from_email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Verified Sender Email *</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="notifications@myagency.com" {...field} />
                                    </FormControl>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Must be a verified sender address in your SendGrid account.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="api_key"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SendGrid API Key *</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="SG.xxxxxxxxxxxxxx" {...field} />
                                    </FormControl>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Create an API key at sendgrid.com → Settings → API Keys with "Mail Send" permission.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4 gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Configuration"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </ThemedDialogContent>
        </ThemedDialog>
    );
}

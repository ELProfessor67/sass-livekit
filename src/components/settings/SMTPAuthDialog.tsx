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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import { SMTPCredentialsService, type UserSMTPCredentials, type SMTPCredentialsInput } from "@/lib/smtp-credentials";

const smtpFormSchema = z.object({
    from_name: z.string().optional(),
    from_email: z.string().email({
        message: "Invalid sender email address.",
    }),
    smtp_host: z.string().min(1, {
        message: "SMTP Host is required.",
    }),
    smtp_port: z.number().int().positive({
        message: "Valid port number is required.",
    }),
    smtp_user: z.string().min(1, {
        message: "SMTP Username is required.",
    }),
    smtp_pass: z.string().min(1, {
        message: "SMTP Password is required.",
    }),
    smtp_secure: z.boolean().default(false),
});

type SMTPFormValues = z.infer<typeof smtpFormSchema>;

interface SMTPAuthDialogProps {
    onSuccess?: () => void;
    children?: React.ReactNode;
    initialData?: UserSMTPCredentials | null;
}

export function SMTPAuthDialog({ onSuccess, children, initialData }: SMTPAuthDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<SMTPFormValues>({
        resolver: zodResolver(smtpFormSchema),
        defaultValues: {
            from_name: initialData?.from_name || "",
            from_email: initialData?.from_email || "",
            smtp_host: initialData?.smtp_host || "",
            smtp_port: initialData?.smtp_port || 587,
            smtp_user: initialData?.smtp_user || "",
            smtp_pass: initialData?.smtp_pass || "",
            smtp_secure: initialData?.smtp_secure || false,
        },
    });

    // Update form values when initialData changes
    useEffect(() => {
        if (initialData) {
            form.reset({
                from_name: initialData.from_name || "",
                from_email: initialData.from_email || "",
                smtp_host: initialData.smtp_host || "",
                smtp_port: initialData.smtp_port || 587,
                smtp_user: initialData.smtp_user || "",
                smtp_pass: initialData.smtp_pass || "",
                smtp_secure: initialData.smtp_secure || false,
            });
        }
    }, [initialData, form]);

    async function onSubmit(data: SMTPFormValues) {
        try {
            setIsLoading(true);
            await SMTPCredentialsService.saveCredentials(data as SMTPCredentialsInput);

            toast({
                title: "Success",
                description: "SMTP credentials saved successfully!",
            });

            if (onSuccess) {
                onSuccess();
            }
            setOpen(false);
        } catch (error) {
            console.error("Error saving SMTP credentials:", error);
            toast({
                title: "Error",
                description: "Failed to save SMTP credentials. Please try again.",
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
                        <span>Connect SMTP</span>
                    </Button>
                )}
            </ThemedDialogTrigger>
            <ThemedDialogContent className="sm:max-w-md bg-white">
                <ThemedDialogHeader
                    title="SMTP Configuration"
                    description="Enter your SMTP server details to send emails from your own domain."
                />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
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
                                    <FormLabel>Sender Email *</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="notifications@myagency.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <FormField
                                    control={form.control}
                                    name="smtp_host"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>SMTP Host *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="smtp.example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="col-span-1">
                                <FormField
                                    control={form.control}
                                    name="smtp_port"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Port *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="587"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="smtp_user"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SMTP Username *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Username or email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="smtp_pass"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SMTP Password *</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Enter password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="smtp_secure"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Use secure connection (SSL/TLS)
                                        </FormLabel>
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            Enable for port 465 (Implicit SSL). Disable for port 587 (STARTTLS).
                                        </p>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
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

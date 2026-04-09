import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Plus, Settings, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SMTPCredentialsService, type UserSMTPCredentials } from "@/lib/smtp-credentials";

export function SMTPIntegrationCard() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [credentials, setCredentials] = useState<UserSMTPCredentials | null>(null);
    const [formData, setFormData] = useState({ api_key: "", from_email: "", from_name: "" });

    useEffect(() => {
        loadCredentials();
    }, []);

    const loadCredentials = async () => {
        try {
            const creds = await SMTPCredentialsService.getCredentials();
            setCredentials(creds);
            if (creds) {
                setFormData({
                    api_key: creds.smtp_pass,
                    from_email: creds.from_email,
                    from_name: creds.from_name || "",
                });
            }
        } catch (error) {
            console.error("Error loading SendGrid credentials:", error);
        }
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const validation = SMTPCredentialsService.validateCredentials(formData);
            if (!validation.isValid) {
                toast({ title: "Validation Error", description: validation.errors.join(", "), variant: "destructive" });
                return;
            }
            await SMTPCredentialsService.saveCredentials(formData);
            toast({ title: "Success", description: "SendGrid credentials saved successfully!" });
            setIsDialogOpen(false);
            await loadCredentials();
        } catch (error) {
            console.error("Error saving SendGrid credentials:", error);
            toast({ title: "Error", description: "Failed to save credentials. Please try again.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!credentials) return;
        try {
            await SMTPCredentialsService.deleteCredentials(credentials.id);
            toast({ title: "Success", description: "SendGrid credentials removed successfully!" });
            setCredentials(null);
            setFormData({ api_key: "", from_email: "", from_name: "" });
        } catch (error) {
            console.error("Error deleting SendGrid credentials:", error);
            toast({ title: "Error", description: "Failed to remove credentials. Please try again.", variant: "destructive" });
        }
    };

    const maskApiKey = (key: string) => {
        if (key.length <= 8) return key;
        return key.slice(0, 5) + "•".repeat(key.length - 9) + key.slice(-4);
    };

    return (
        <Card className="border-indigo-200 bg-indigo-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Mail className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-medium text-indigo-900">
                            SendGrid
                        </CardTitle>
                        <CardDescription className="text-indigo-700">
                            Override system emails — send from your own SendGrid account and verified domain
                        </CardDescription>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                        Email Delivery
                    </Badge>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {credentials ? <Settings className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                                {credentials ? "Edit Configuration" : "Add Configuration"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>SendGrid Configuration</DialogTitle>
                                <DialogDescription>
                                    Enter your SendGrid API key and verified sender details.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 px-1">
                                <div className="space-y-2">
                                    <Label htmlFor="from_name">Sender Name</Label>
                                    <Input
                                        id="from_name"
                                        placeholder="e.g., My Agency Team"
                                        value={formData.from_name}
                                        onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="from_email">Verified Sender Email *</Label>
                                    <Input
                                        id="from_email"
                                        type="email"
                                        placeholder="notifications@myagency.com"
                                        value={formData.from_email}
                                        onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Must be verified in your SendGrid account.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="api_key">SendGrid API Key *</Label>
                                    <Input
                                        id="api_key"
                                        type="password"
                                        placeholder="SG.xxxxxxxxxxxxxx"
                                        value={formData.api_key}
                                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Create at sendgrid.com → Settings → API Keys with "Mail Send" permission.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {isLoading ? "Saving..." : "Save Configuration"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {!credentials ? (
                    <div className="text-center py-6">
                        <Mail className="h-12 w-12 text-indigo-300 mx-auto mb-3" />
                        <p className="text-indigo-600 font-medium mb-1">Using system email sender</p>
                        <p className="text-indigo-500 text-sm">
                            Add your own SendGrid API key to send emails from your verified domain instead.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-200">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="h-5 w-5 text-indigo-600" />
                                <div>
                                    <p className="font-medium text-indigo-900">
                                        {credentials.from_name
                                            ? `${credentials.from_name} <${credentials.from_email}>`
                                            : credentials.from_email}
                                    </p>
                                    <p className="text-sm text-indigo-600 font-mono">
                                        API Key: {maskApiKey(credentials.smtp_pass)}
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDelete}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Remove Credentials"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

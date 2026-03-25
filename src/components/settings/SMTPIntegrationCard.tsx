import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Plus, Settings, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SMTPCredentialsService, type UserSMTPCredentials, type SMTPCredentialsInput } from "@/lib/smtp-credentials";

export function SMTPIntegrationCard() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [credentials, setCredentials] = useState<UserSMTPCredentials | null>(null);
    const [formData, setFormData] = useState<SMTPCredentialsInput>({
        smtp_host: "",
        smtp_port: 587,
        smtp_user: "",
        smtp_pass: "",
        smtp_secure: false,
        from_email: "",
        from_name: ""
    });

    useEffect(() => {
        loadSMTPCredentials();
    }, []);

    const loadSMTPCredentials = async () => {
        try {
            const creds = await SMTPCredentialsService.getCredentials();
            setCredentials(creds);
            if (creds) {
                setFormData({
                    smtp_host: creds.smtp_host,
                    smtp_port: creds.smtp_port,
                    smtp_user: creds.smtp_user,
                    smtp_pass: creds.smtp_pass,
                    smtp_secure: creds.smtp_secure,
                    from_email: creds.from_email,
                    from_name: creds.from_name || ""
                });
            }
        } catch (error) {
            console.error("Error loading SMTP credentials:", error);
        }
    };

    const handleSaveCredentials = async () => {
        try {
            setIsLoading(true);

            const validation = SMTPCredentialsService.validateCredentials(formData);
            if (!validation.isValid) {
                toast({
                    title: "Validation Error",
                    description: validation.errors.join(", "),
                    variant: "destructive",
                });
                return;
            }

            await SMTPCredentialsService.saveCredentials(formData);

            toast({
                title: "Success",
                description: "SMTP credentials saved successfully!",
            });

            setIsDialogOpen(false);
            await loadSMTPCredentials();
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
    };

    const handleDeleteCredentials = async () => {
        if (!credentials) return;
        try {
            await SMTPCredentialsService.deleteCredentials(credentials.id);

            toast({
                title: "Success",
                description: "SMTP credentials deleted successfully!",
            });

            setCredentials(null);
            setFormData({
                smtp_host: "",
                smtp_port: 587,
                smtp_user: "",
                smtp_pass: "",
                smtp_secure: false,
                from_email: "",
                from_name: ""
            });
        } catch (error) {
            console.error("Error deleting SMTP credentials:", error);
            toast({
                title: "Error",
                description: "Failed to delete SMTP credentials. Please try again.",
                variant: "destructive",
            });
        }
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
                            Custom Email (SMTP)
                        </CardTitle>
                        <CardDescription className="text-indigo-700">
                            Configure your own SMTP server to send workspace invitations
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
                                <DialogTitle>SMTP Configuration</DialogTitle>
                                <DialogDescription>
                                    Enter your SMTP server details to send emails from your own domain.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
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
                                    <Label htmlFor="from_email">Sender Email *</Label>
                                    <Input
                                        id="from_email"
                                        type="email"
                                        placeholder="notifications@myagency.com"
                                        value={formData.from_email}
                                        onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="smtp_host">SMTP Host *</Label>
                                        <Input
                                            id="smtp_host"
                                            placeholder="smtp.example.com"
                                            value={formData.smtp_host}
                                            onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-2">
                                        <Label htmlFor="smtp_port">Port *</Label>
                                        <Input
                                            id="smtp_port"
                                            type="number"
                                            placeholder="587"
                                            value={formData.smtp_port}
                                            onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_user">SMTP Username *</Label>
                                    <Input
                                        id="smtp_user"
                                        placeholder="Username or email"
                                        value={formData.smtp_user}
                                        onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_pass">SMTP Password *</Label>
                                    <Input
                                        id="smtp_pass"
                                        type="password"
                                        placeholder="Enter your password or app passkey"
                                        value={formData.smtp_pass}
                                        onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="smtp_secure"
                                        checked={formData.smtp_secure}
                                        onChange={(e) => setFormData({ ...formData, smtp_secure: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <Label htmlFor="smtp_secure" className="font-normal">
                                        Use secure connection (SSL/TLS - usually required for port 465)
                                    </Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveCredentials}
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
                        <p className="text-indigo-600 font-medium mb-1">No SMTP credentials configured</p>
                        <p className="text-indigo-500 text-sm">
                            You must configure SMTP settings to invite members to your workspaces.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-200">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="h-5 w-5 text-indigo-600" />
                                <div>
                                    <p className="font-medium text-indigo-900">
                                        {credentials.from_name ? `${credentials.from_name} (${credentials.from_email})` : credentials.from_email}
                                    </p>
                                    <p className="text-sm text-indigo-600">SMTP Host: {credentials.smtp_host}:{credentials.smtp_port}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleDeleteCredentials}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Remove Credentials"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

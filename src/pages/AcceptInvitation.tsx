import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function AcceptInvitation() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    const { refreshWorkspaces } = useWorkspace();
    const [isLoading, setIsLoading] = useState(true);
    const [invitation, setInvitation] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Invitation token is missing");
            setIsLoading(false);
            return;
        }

        fetchInvitationDetails();
    }, [token]);

    const fetchInvitationDetails = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api/v1/workspaces/invitation-details/${token}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch invitation details");
            }

            setInvitation(data.invitation);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // Redirect to login with return URL
                toast.info("Please login to accept the invitation");
                navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api/v1/workspaces/accept-invitation`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ token })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to accept invitation");
            }

            toast.success("Welcome! You have joined the workspace.");
            await refreshWorkspaces();
            navigate("/");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsAccepting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
                <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                <p className="mt-4 text-muted-foreground animate-pulse">Verifying invitation...</p>
            </div>
        );
    }

    if (error || !invitation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
                <Card className="w-full max-w-md border-destructive/20 bg-destructive/5 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                            <XCircle className="text-destructive w-8 h-8" />
                        </div>
                        <CardTitle className="text-xl">Invalid Invitation</CardTitle>
                        <CardDescription>{error || "This invitation is no longer valid."}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                            Go Home
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background bg-gradient-to-b from-background to-primary/5">
            <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-inner">
                        {invitation.workspace_settings?.logo_url ? (
                            <img src={invitation.workspace_settings.logo_url} alt="Logo" className="w-10 h-10 object-contain" />
                        ) : (
                            <CheckCircle className="text-primary w-10 h-10" />
                        )}
                    </div>
                    <CardTitle className="text-2xl font-light tracking-tight">Workspace Invitation</CardTitle>
                    <CardDescription className="text-base mt-2">
                        You've been invited to join <span className="text-foreground font-medium">{invitation.workspace_settings?.workspace_name}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-6">
                    <p className="text-muted-foreground">
                        You will join as a <span className="text-foreground font-medium capitalize">{invitation.role}</span>.
                        {invitation.email && (
                            <> This invitation was sent to <span className="text-foreground font-medium">{invitation.email}</span>.</>
                        )}
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button
                        onClick={handleAccept}
                        className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={isAccepting}
                    >
                        {isAccepting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            "Accept & Join Workspace"
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/")}
                        className="w-full text-muted-foreground hover:text-foreground"
                        disabled={isAccepting}
                    >
                        Decline
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

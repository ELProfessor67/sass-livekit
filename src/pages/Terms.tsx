import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";

const Terms = () => {
    const { websiteSettings } = useWebsiteSettings();
    const appName = websiteSettings?.website_name || "AI Call Center";

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <Button variant="ghost" asChild className="mb-8">
                    <Link to="/">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Link>
                </Button>

                <h1 className="text-4xl font-bold mb-8 tracking-tight">Terms of Service</h1>
                <p className="text-muted-foreground mb-4">Last Updated: January 26, 2026</p>

                <div className="space-y-8 text-muted-foreground">
                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">1. Agreement to Terms</h2>
                        <p>
                            By accessing or using {appName}, you agree to be bound by these Terms of Service.
                            If you do not agree to all of the terms, do not use the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
                        <p>
                            {appName} provides AI-powered call management, integration tools (including Facebook Lead Ads),
                            and workflow automation services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Responsibilities</h2>
                        <p>
                            You are responsible for maintaining the confidentiality of your account and for all activities
                            that occur under your account. You agree to use the service in compliance with all applicable laws
                            and regulations, including anti-spam and privacy laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">4. Third-Party Integrations</h2>
                        <p>
                            Our service allows you to connect to third-party platforms like Facebook. Your use of those integrations
                            is subject to the terms and policies of those respective platforms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">5. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, {appName} shall not be liable for any indirect, incidental,
                            special, consequential, or punitive damages resulting from your use of the service.
                        </p>
                    </section>
                </div>

                <footer className="mt-16 pt-8 border-t border-border text-center text-sm">
                    &copy; 2026 {appName}. All rights reserved.
                </footer>
            </div>
        </div>
    );
};

export default Terms;

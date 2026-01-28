import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";

const Privacy = () => {
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

                <h1 className="text-4xl font-bold mb-8 tracking-tight">Privacy Policy</h1>
                <p className="text-muted-foreground mb-4">Last Updated: January 26, 2026</p>

                <div className="space-y-8 text-muted-foreground">
                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
                        <p>
                            Welcome to {appName}. We respect your privacy and are committed to protecting your personal data.
                            This privacy policy will inform you as to how we look after your personal data when you visit our website
                            or use our services and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">2. Data We Collect</h2>
                        <p>
                            When you use {appName}, we may collect the following types of information:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Identity Data:</strong> First name, last name, username or similar identifier.</li>
                            <li><strong>Contact Data:</strong> Email address and telephone numbers.</li>
                            <li><strong>Lead Data:</strong> Provided via integrations like Facebook Lead Ads, including contact info and form responses.</li>
                            <li><strong>Technical Data:</strong> IP address, login data, browser type, and version.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Data</h2>
                        <p>
                            We use your data to provide our services, specifically:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-2">
                            <li>To process and manage your integrations (e.g., Facebook Lead Ads).</li>
                            <li>To trigger automated workflows as defined by your account settings.</li>
                            <li>To provide customer support and improve our service.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">4. Facebook Data & Lead Ads</h2>
                        <p>
                            If you connect your Facebook account to {appName}, we receive and store leads generated via your Lead Forms.
                            This data is used solely to execute the workflows you configure in our platform. We do not sell or share
                            this lead data with third parties independent of your directed workflows.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Deletion</h2>
                        <p>
                            You may request the deletion of your data at any time by contacting us through your account settings
                            or via our support email. Disconnecting your Facebook integration will stop all future data ingestion.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-foreground mb-4">6. Contact Us</h2>
                        <p>
                            For any questions regarding this Privacy Policy, please contact our support team.
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

export default Privacy;

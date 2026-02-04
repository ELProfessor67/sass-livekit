import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Mail, Globe } from "lucide-react";

const PRIVACY_LAST_UPDATED = "January 22, 2025";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="text-black mb-8">
          <Link to="/">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-4xl font-bold mb-2 tracking-tight text-black">
          Privacy Policy
        </h1>
        <p className="text-black/80 mb-8">
          Last updated: {PRIVACY_LAST_UPDATED}
        </p>

        <p className="text-black mb-8">
          Wave Runner Media LLC ("Wave Runner," "we," "our," or "us") is
          committed to protecting your privacy. This Privacy Policy explains
          how we collect, use, disclose, and safeguard your personal information
          when you use the WaveRunner AI platform ("Platform"), visit our
          website, or interact with our services.
        </p>

        <div className="space-y-8 text-black">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              1. Scope and Applicability
            </h2>
            <p className="mb-4">
              This Privacy Policy applies to all users of the WaveRunner AI
              platform, including individuals who:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Visit our website or marketing pages</li>
              <li>Create an account or subscribe to our services</li>
              <li>Use our AI voice agent, workflow automation, or communication tools</li>
              <li>Interact with AI agents deployed by our customers</li>
              <li>Contact us for support or inquiries</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              2. Role Under Data Protection Laws
            </h2>
            <p className="mb-4">
              Wave Runner acts as a Data Controller for personal data related to
              account management, billing, website usage, and marketing activities.
            </p>
            <p>
              Wave Runner acts as a Data Processor when processing customer
              content (such as call recordings, transcripts, messages, and
              workflow data) on behalf of our customers, who remain the Data
              Controllers of that content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              3. What Information Do We Collect?
            </h2>
            <h3 className="text-lg font-medium mb-2">Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Account information (name, email, phone number, company name)</li>
              <li>Billing and payment information</li>
              <li>Content you create or upload (AI agent configurations, scripts, workflows)</li>
              <li>Communications with our support team</li>
              <li>Survey responses and feedback</li>
            </ul>
            <h3 className="text-lg font-medium mb-2">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Device and browser information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent on platform)</li>
              <li>Call and conversation data (recordings, transcripts, metadata) when using our AI voice agents</li>
              <li>Log data and analytics</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
            <h3 className="text-lg font-medium mb-2">Information from Third Parties</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Integration data from connected services (CRMs, calendars, communication platforms)</li>
              <li>Payment processor information</li>
              <li>Business information from data enrichment services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              4. How Do We Use The Information We Collect?
            </h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative communications (service updates, security alerts)</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Improve and optimize our platform and services</li>
              <li>Develop new features and functionality</li>
              <li>Send marketing communications (with your consent where required)</li>
              <li>Detect and prevent fraud, abuse, or security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              5. Do We Share Your Personal Information?
            </h2>
            <p className="mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our platform (hosting, payment processing, analytics, customer support)</li>
              <li><strong>Integration Partners:</strong> Services you choose to connect (CRMs, calendars, etc.) as directed by you</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or legal process</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> For any other purpose disclosed at the time of collection</li>
            </ul>
            <p>
              A list of our current subprocessors is available at{" "}
              <a href="https://waverunnerai.com/subprocessors" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                waverunnerai.com/subprocessors
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              6. Cookies & Tracking Technologies
            </h2>
            <p className="mb-4">
              We use cookies and similar technologies to enhance your experience,
              analyze usage patterns, and deliver targeted advertising. Types of
              cookies we use include:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Essential Cookies:</strong> Required for basic platform functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
              <li><strong>Advertising Cookies:</strong> Used to deliver relevant ads and track campaign performance</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <h3 className="text-lg font-medium mb-2">Specific Tracking Technologies</h3>
            <p className="mb-4">
              <strong>RB2B and Vector:</strong> We use RB2B and Vector for B2B
              visitor identification and lead enrichment. These services may
              identify business visitors based on IP address and publicly
              available business information. This data is used solely for
              business-to-business marketing purposes. If you wish to opt out of
              this tracking, you may contact us or use browser-based opt-out
              mechanisms.
            </p>
            <p className="mb-4">
              <strong>Microsoft Clarity and Microsoft Advertising:</strong> We
              partner with Microsoft Clarity and Microsoft Advertising to capture
              how you use and interact with our website through behavioral
              metrics, heatmaps, and session replay to improve and market our
              products and services. Website usage data is captured using first
              and third-party cookies and other tracking technologies to
              determine the popularity of products and services and online
              activity. Additionally, we use this information for site
              optimization, fraud and security purposes, and advertising. For more
              information about how Microsoft collects and uses your data, visit
              the Microsoft Privacy Statement.
            </p>
            <h3 className="text-lg font-medium mb-2">EEA Cookie Consent</h3>
            <p className="mb-4">
              For users located in the European Economic Area, non-essential
              cookies (including analytics, advertising, and enrichment
              technologies) are only set after you provide explicit consent
              through our cookie consent banner or preference manager.
            </p>
            <p>
              You can manage cookie preferences through your browser settings or
              our cookie preference center.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              7. How Do We Secure Your Personal Information?
            </h2>
            <p>
              We implement industry-standard security measures to protect your
              personal information, including encryption in transit and at rest,
              access controls, regular security assessments, and secure
              development practices. However, no method of transmission over the
              Internet is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              8. Data Retention & Storage
            </h2>
            <p className="mb-4">
              We retain your personal information for as long as necessary to
              fulfill the purposes outlined in this Privacy Policy, unless a
              longer retention period is required or permitted by law. When
              determining retention periods, we consider the nature of the data,
              our legitimate business needs, and applicable legal requirements.
            </p>
            <p className="mb-4">Example retention periods include:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Account data:</strong> Retained while the account is active</li>
              <li><strong>Call recordings and transcripts:</strong> 90 days by default, or deleted upon request</li>
              <li><strong>Logs and analytics data:</strong> Up to 12 months for security, troubleshooting, and performance monitoring</li>
            </ul>
            <p className="mb-4">
              Your data is stored on servers provided by DigitalOcean, located in
              the United States. For users in the European Economic Area (EEA),
              data transfers to the United States are conducted in compliance
              with applicable data protection laws, including the use of
              Standard Contractual Clauses (SCCs) where required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              9. Your Data Subject Rights
            </h2>
            <p className="mb-4">
              Depending on your location, you may have rights regarding your
              personal information:
            </p>
            <h3 className="text-lg font-medium mb-2">GDPR Rights (EEA Residents)</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Right of Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Right to Restriction:</strong> Request limited processing of your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Right to Object:</strong> Object to processing based on legitimate interests or direct marketing</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
              <li><strong>Right to Lodge a Complaint:</strong> File a complaint with your local data protection authority</li>
            </ul>
            <h3 className="text-lg font-medium mb-2">CCPA Rights (California Residents)</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Right to know what personal information is collected</li>
              <li>Right to request deletion of personal information</li>
              <li>Right to opt-out of the sale of personal information</li>
              <li>Right to non-discrimination for exercising privacy rights</li>
            </ul>
            <h3 className="text-lg font-medium mb-2">Nevada Residents</h3>
            <p className="mb-4">
              Nevada residents may opt out of the sale of covered information
              under Nevada law.
            </p>
            <p>
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:privacy@waverunnerai.com" className="text-primary hover:underline">
                privacy@waverunnerai.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              10. How We Respond to Do Not Track Signals
            </h2>
            <p>
              Some browsers offer a "Do Not Track" (DNT) feature. We currently do
              not respond to DNT signals because there is no industry-standard
              interpretation. However, you can manage tracking preferences through
              our cookie settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              11. Children Under 16
            </h2>
            <p>
              Our services are not intended for children under 16. We do not
              knowingly collect personal information from children under 16. If
              we learn that we have collected such information, we will take
              steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              12. Region-Specific Disclosures
            </h2>
            <p className="mb-4">
              <strong>California:</strong> Under the CCPA, California residents
              have specific rights regarding their personal information. We do
              not sell personal information as defined by the CCPA. For details
              on the categories of information collected and our data practices,
              see the sections above.
            </p>
            <p className="mb-4">
              <strong>Nevada:</strong> We do not sell covered information as
              defined under Nevada law. Nevada residents may submit opt-out
              requests to privacy@waverunnerai.com.
            </p>
            <p>
              <strong>European Economic Area (EEA):</strong> If you are located
              in the EEA, we process your data under lawful bases including
              consent, contract performance, legitimate interests, and legal
              obligations. You have additional rights under GDPR as described
              above.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              13. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify
              you of any material changes by posting the new Privacy Policy on
              this page and updating the "Last Updated" date. For significant
              changes, we may also provide additional notice (such as email
              notification).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              14. Contact Us
            </h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy or our data
              practices, please contact us:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a
                  href="mailto:privacy@waverunnerai.com"
                  className="text-primary hover:underline"
                >
                  privacy@waverunnerai.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="h-4 w-4 shrink-0" />
                <a
                  href="https://waverunnerai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  waverunnerai.com
                </a>
              </li>
            </ul>
          </section>
        </div>

       
      </div>
    </div>
  );
};

export default Privacy;

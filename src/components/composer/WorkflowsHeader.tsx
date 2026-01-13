
import { Workflow } from "lucide-react";
import { PageHeading, PageSubtext } from "@/components/ui/typography";
import { IconBackground } from "@/components/ui/icon-background";

export default function WorkflowsHeader() {
    return (
        <div className="backdrop-blur-xl bg-white/[0.02] border-b border-white/[0.05]">
            <div className="container flex flex-col space-y-[var(--space-lg)] py-[var(--space-2xl)] px-[var(--space-2xl)] md:px-[var(--space-3xl)] lg:px-[var(--space-4xl)]">
                <div className="flex items-center gap-[var(--space-xl)] max-w-7xl mx-auto w-full">
                    <IconBackground
                        icon={Workflow}
                        className="bg-primary/20 text-primary liquid-rounded-2xl p-[var(--space-lg)] shadow-[0_0_20px_rgba(var(--primary),0.2)]"
                    />
                    <div>
                        <PageHeading className="text-5xl font-extralight tracking-tight text-foreground">
                            Workflows
                        </PageHeading>
                        <PageSubtext className="mt-2 text-xl font-light text-muted-foreground/80">
                            Build and manage your automation workflows to streamline your operations
                        </PageSubtext>
                    </div>
                </div>
            </div>
        </div>
    );
}

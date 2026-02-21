
import { Badge } from "@/components/ui/badge";
import { RoleSwitcher } from "@/components/composer/RoleSwitcher";

export default function WorkflowsHeader() {
    return (
        <div className="backdrop-blur-xl bg-white/[0.02] border-b border-white/[0.05]">
            <div className="container flex flex-col space-y-[var(--space-lg)] py-[var(--space-2xl)] px-[var(--space-2xl)] md:px-[var(--space-3xl)] lg:px-[var(--space-4xl)]">
                <div className="flex flex-col max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <h1 className="text-[28px] font-light tracking-[0.2px] text-foreground">
                            Composer
                        </h1>
                        <Badge variant="secondary" className="text-xs">Beta</Badge>
                        <RoleSwitcher variant="compact" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium tracking-[0.1px] mt-1">
                        Compose and automate workflows for your operations
                    </p>
                </div>
            </div>
        </div>
    );
}

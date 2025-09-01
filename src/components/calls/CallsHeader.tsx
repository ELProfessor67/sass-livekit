
import { Phone } from "lucide-react";
import { PageHeading, PageSubtext } from "@/components/ui/typography";
import { IconBackground } from "@/components/ui/icon-background";

export default function CallsHeader() {
  return (
    <div className="backdrop-blur-sm">
      <div className="container flex flex-col space-y-[var(--space-lg)] py-[var(--space-3xl)] px-[var(--space-2xl)] md:px-[var(--space-3xl)] lg:px-[var(--space-4xl)]">
        <div className="flex items-center gap-[var(--space-lg)] max-w-7xl mx-auto w-full">
          <IconBackground 
            icon={Phone} 
            className="bg-primary/10 text-primary liquid-rounded-xl p-[var(--space-md)]" 
          />
          <div>
            <PageHeading className="font-[var(--font-extralight)] text-foreground">
              Call Logs
            </PageHeading>
            <PageSubtext className="mt-[var(--space-md)] font-[var(--font-light)] text-muted-foreground">
              View and manage all customer call records
            </PageSubtext>
          </div>
        </div>
      </div>
    </div>
  );
}

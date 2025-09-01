import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface TermsOfUseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted: () => void;
}

export function TermsOfUseDialog({ open, onOpenChange, onAccepted }: TermsOfUseDialogProps) {
  const [agreed, setAgreed] = useState(false);

  const handleAccept = () => {
    if (agreed) {
      onAccepted();
      setAgreed(false); // Reset for next time
    }
  };

  const handleClose = () => {
    setAgreed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-[var(--text-xl)] font-[var(--font-semibold)] text-theme-primary">
            Terms of Use
          </DialogTitle>
          <p className="text-[var(--text-sm)] text-theme-secondary">
            Please read and accept the terms before creating your campaign
          </p>
        </DialogHeader>

        <div className="space-y-[var(--space-xl)] py-[var(--space-lg)] max-h-[60vh] overflow-y-auto">
          <div className="space-y-6 text-[var(--text-sm)] leading-relaxed">
            <div>
              <h3 className="font-[var(--font-semibold)] text-theme-primary mb-[var(--space-md)]">Legal Compliance is Your Duty</h3>
              <p className="text-theme-secondary">
                You are solely responsible for ensuring your use of the services complies with all applicable laws, 
                including telemarketing regulations (like TCPA, Do-Not-Call), rules about prerecorded messages, 
                obtaining necessary recipient consent, accurate Caller ID information, required disclosures, and call recording laws.
              </p>
            </div>

            <div>
              <h3 className="font-[var(--font-semibold)] text-theme-primary mb-[var(--space-md)]">Consent is Required</h3>
              <p className="text-theme-secondary">
                You must obtain and maintain proof of the necessary consent, existing business relationship, 
                or valid legal exemption before making communications where required by law.
              </p>
            </div>

            <div>
              <h3 className="font-[var(--font-semibold)] text-theme-primary mb-[var(--space-md)]">Service Provided "AS IS"</h3>
              <p className="text-theme-secondary">
                The services and website content are provided without any warranties or guarantees of accuracy, 
                completeness, reliability, or fitness for a particular purpose. Use is entirely at your own risk.
              </p>
            </div>

            <div>
              <h3 className="font-[var(--font-semibold)] text-theme-primary mb-[var(--space-md)]">Limited Liability</h3>
              <p className="text-theme-secondary">
                Wave Runner Media will not be liable for lost profits or various indirect, special, incidental, 
                or consequential damages arising from your use of the service.
              </p>
            </div>

            <div>
              <h3 className="font-[var(--font-semibold)] text-theme-primary mb-[var(--space-md)]">Indemnification</h3>
              <p className="text-theme-secondary">
                You agree to cover any costs, losses, or damages incurred by the service provider resulting from 
                your breach of these terms, negligence, or misuse of the services (including legal fees).
              </p>
            </div>

            <div>
              <h3 className="font-[var(--font-semibold)] text-theme-primary mb-[var(--space-md)]">Data Usage License</h3>
              <p className="text-theme-secondary">
                You grant Wave Runner Media a license to use the data you provide to operate, maintain, and improve the services. 
                The provider owns aggregated usage and statistical data.
              </p>
            </div>

            <div>
              <h3 className="font-[var(--font-semibold)] text-theme-primary mb-[var(--space-md)]">Confidentiality</h3>
              <p className="text-theme-secondary">
                Both parties agree to protect confidential information shared between them according to the terms outlined.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-[var(--space-lg)] border-t border-theme-light">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-[var(--space-md)]">
              <Checkbox 
                id="agree-terms" 
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked as boolean)}
              />
              <label 
                htmlFor="agree-terms" 
                className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary cursor-pointer"
              >
                I have read and agree to the Terms of Use
              </label>
            </div>
            
            <div className="flex gap-[var(--space-md)]">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleAccept} 
                disabled={!agreed}
                className="px-[var(--space-xl)]"
              >
                Next
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
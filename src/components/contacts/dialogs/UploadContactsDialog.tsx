import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactFileUpload } from "@/components/contacts/ContactFileUpload";
import { AlertTriangle, Upload, FileText, CheckCircle } from "lucide-react";

interface ContactList {
  id: string;
  name: string;
  count: number;
  createdAt: string;
}

interface UploadContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactLists: ContactList[];
}

type UploadStep = 'select-list' | 'consent' | 'upload' | 'mapping';

export function UploadContactsDialog({
  open,
  onOpenChange,
  contactLists,
}: UploadContactsDialogProps) {
  const [currentStep, setCurrentStep] = useState<UploadStep>('select-list');
  const [selectedListId, setSelectedListId] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleClose = () => {
    setCurrentStep('select-list');
    setSelectedListId("");
    setConsentGiven(false);
    setUploadedFile(null);
    onOpenChange(false);
  };

  const handleNext = () => {
    if (currentStep === 'select-list' && selectedListId) {
      setCurrentStep('consent');
    } else if (currentStep === 'consent' && consentGiven) {
      setCurrentStep('upload');
    } else if (currentStep === 'upload' && uploadedFile) {
      setCurrentStep('mapping');
    }
  };

  const handleBack = () => {
    if (currentStep === 'consent') {
      setCurrentStep('select-list');
    } else if (currentStep === 'upload') {
      setCurrentStep('consent');
    } else if (currentStep === 'mapping') {
      setCurrentStep('upload');
    }
  };

  const selectedList = contactLists.find(list => list.id === selectedListId);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-list':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="list-select" className="text-sm font-medium">
                Select Contact List
              </Label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose which list to upload contacts to" />
                </SelectTrigger>
                <SelectContent>
                  {contactLists.map(list => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name} ({list.count} contacts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedList && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Contacts will be added to "{selectedList.name}" which currently has {selectedList.count} contacts.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'consent':
        return (
          <div className="space-y-6">
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Important:</strong> Please review and accept our data processing terms before uploading contacts.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-theme-primary mb-2">Data Processing Agreement</h4>
                <p className="text-theme-secondary leading-relaxed">
                  By uploading contact information, you confirm that you have the necessary permissions 
                  to share this data and that all contacts have provided appropriate consent for their 
                  information to be used for business communications.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-theme-primary mb-2">Privacy & Security</h4>
                <p className="text-theme-secondary leading-relaxed">
                  We implement industry-standard security measures to protect your contact data. 
                  All information is encrypted in transit and at rest, and access is restricted to 
                  authorized personnel only.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-theme-primary mb-2">Data Usage</h4>
                <p className="text-theme-secondary leading-relaxed">
                  Contact information will be used exclusively for the purposes you specify and in 
                  accordance with applicable privacy laws including GDPR, CCPA, and CAN-SPAM regulations.
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="consent-checkbox"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                  className="mt-1"
                />
                <div>
                  <Label
                    htmlFor="consent-checkbox"
                    className="text-sm font-medium cursor-pointer leading-relaxed"
                  >
                    I acknowledge that I have read and agree to the data processing terms above. 
                    I confirm that I have the necessary permissions to upload and use this contact data 
                    for business communications.
                  </Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Upload Contact File</h3>
              <p className="text-theme-secondary text-sm">
                Upload a CSV or Excel file containing your contact information.
              </p>
            </div>

            <ContactFileUpload
              onFileSelect={(file) => setUploadedFile(file)}
              acceptedTypes=".csv,.xlsx,.xls"
              maxSize={10}
              selectedFile={uploadedFile}
            />


            <div className="text-xs text-theme-secondary space-y-1">
              <p><strong>Supported formats:</strong> CSV, XLSX, XLS</p>
              <p><strong>Required columns:</strong> First Name, Phone or Email</p>
              <p><strong>Optional columns:</strong> Last Name, Company, Notes</p>
              <p><strong>Maximum file size:</strong> 10 MB</p>
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Column Mapping</h3>
              <p className="text-theme-secondary text-sm">
                Map your file columns to contact fields. Required fields are marked with *.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 p-3 bg-surface-elevated rounded-lg">
                <div className="text-sm font-medium">Required Fields *</div>
                <div className="text-sm font-medium">Your File Columns</div>
              </div>

              {[
                { field: 'First Name *', type: 'text', required: true },
                { field: 'Phone/Email *', type: 'contact', required: true },
                { field: 'Last Name', type: 'text', required: false },
                { field: 'Company', type: 'text', required: false },
                { field: 'Notes', type: 'text', required: false },
              ].map((mapping, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 p-3 border border-theme-light rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{mapping.field}</span>
                    {mapping.required && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                    )}
                  </div>
                  <Select defaultValue={index === 0 ? "column_a" : index === 1 ? "column_b" : ""}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="column_a">Column A</SelectItem>
                      <SelectItem value="column_b">Column B</SelectItem>
                      <SelectItem value="column_c">Column C</SelectItem>
                      <SelectItem value="column_d">Column D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please ensure required fields are mapped correctly. Contacts without required information will be skipped.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select-list': return 'Upload Contacts - Select List';
      case 'consent': return 'Upload Contacts - Data Processing Agreement';
      case 'upload': return 'Upload Contacts - File Upload';
      case 'mapping': return 'Upload Contacts - Column Mapping';
      default: return 'Upload Contacts';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'select-list': return 'Choose which contact list to upload your contacts to.';
      case 'consent': return 'Please review and accept our data processing terms.';
      case 'upload': return 'Upload your contact file (CSV or Excel format).';
      case 'mapping': return 'Map your file columns to contact fields.';
      default: return '';
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'select-list': return selectedListId !== "";
      case 'consent': return consentGiven;
      case 'upload': return uploadedFile !== null;
      case 'mapping': return true;
      default: return false;
    }
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case 'select-list': return 'Continue';
      case 'consent': return 'I Agree - Continue';
      case 'upload': return 'Continue';
      case 'mapping': return 'Import Contacts';
      default: return 'Next';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl backdrop-blur-xl bg-background/95 border-border/50">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-semibold">{getStepTitle()}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {renderStepContent()}
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {currentStep !== 'select-list' && (
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button 
            onClick={handleNext}
            disabled={!canProceed()}
            className={currentStep === 'mapping' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {getNextButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
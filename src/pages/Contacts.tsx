import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, Upload, Phone, Mail, MoreHorizontal, Users, FileText, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddListDialog } from "@/components/contacts/dialogs/AddListDialog";
import { AddContactDialog } from "@/components/contacts/dialogs/AddContactDialog";
import { UploadContactsDialog } from "@/components/contacts/dialogs/UploadContactsDialog";
import { formatPhoneNumber } from "@/utils/formatUtils";
import DashboardLayout from "@/layout/DashboardLayout";
import { ThemeContainer } from "@/components/theme/ThemeContainer";
import { ThemeSection } from "@/components/theme/ThemeSection";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { saveCsvFile, SaveCsvFileRequest } from "@/lib/api/csv/saveCsvFile";
import { saveCsvContacts, SaveCsvContactsRequest } from "@/lib/api/csv/saveCsvContacts";
import { fetchCsvFiles, CsvFile as DbCsvFile } from "@/lib/api/csv/fetchCsvFiles";
import { fetchCsvContacts, CsvContact as DbCsvContact } from "@/lib/api/csv/fetchCsvContacts";
import { deleteCsvFile as deleteCsvFileAPI } from "@/lib/api/csv/deleteCsvFile";
import { DeleteCsvFileDialog } from "@/components/contacts/dialogs/DeleteCsvFileDialog";
import { EditContactDialog } from "@/components/contacts/dialogs/EditContactDialog";
import { DeleteContactDialog } from "@/components/contacts/dialogs/DeleteContactDialog";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { fetchContacts } from "@/lib/api/contacts/fetchContacts";
import { fetchContactLists } from "@/lib/api/contacts/fetchContactLists";
import { useToast } from "@/hooks/use-toast";

// Mock data structures
interface ContactList {
  id: string;
  name: string;
  count: number;
  createdAt: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  listId: string;
  listName: string;
  status: 'active' | 'inactive' | 'do-not-call';
  created: string;
  doNotCall?: boolean;
}

interface CSVFile {
  id: string;
  name: string;
  uploadedAt: string;
  rowCount: number;
  data: CSVContact[];
}

interface CSVContact {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'do-not-call';
  do_not_call: boolean;
}


// CSV parsing utility function
const parseCSV = (csvText: string): CSVContact[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const data: CSVContact[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
    if (values.length !== headers.length) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Map common column names to our interface
    const contact: CSVContact = {
      first_name: row.first_name || row.firstname || row.first || row.fname || '',
      last_name: row.last_name || row.lastname || row.last || row.lname || '',
      phone: row.phone || row.phone_number || row.telephone || row.mobile || '',
      email: row.email || row.email_address || row.e_mail || '',
      status: (row.status || 'active') as 'active' | 'inactive' | 'do-not-call',
      do_not_call: row.do_not_call === 'true' || row.dnd === 'true' || row.do_not_call === '1' || row.dnd === '1' || false
    };

    // Only add if we have at least first name and either phone or email
    if (contact.first_name && (contact.phone || contact.email)) {
      data.push(contact);
    }
  }

  return data;
};

export default function Contacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedList, setSelectedList] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addListOpen, setAddListOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [uploadContactsOpen, setUploadContactsOpen] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [deleteContactOpen, setDeleteContactOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // CSV upload states
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([]);
  const [selectedCsvFile, setSelectedCsvFile] = useState<string | null>(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // CSV delete states
  const [deleteCsvOpen, setDeleteCsvOpen] = useState(false);
  const [csvToDelete, setCsvToDelete] = useState<{ id: string; name: string; contactCount: number; campaigns?: Array<{ id: string; name: string }> } | null>(null);
  const [deletingCsv, setDeletingCsv] = useState(false);

  // Load real data from database
  const loadContacts = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Load contact lists
      const listsResponse = await fetchContactLists();
      const transformedLists: ContactList[] = listsResponse.contactLists.map(list => ({
        id: list.id,
        name: list.name,
        count: list.count,
        createdAt: list.created_at.split('T')[0]
      }));
      setContactLists(transformedLists);

      // Load contacts
      const contactsResponse = await fetchContacts();
      const transformedContacts: Contact[] = contactsResponse.contacts.map(contact => ({
        id: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name || '',
        phone: contact.phone || '',
        email: contact.email || '',
        listId: contact.list_id,
        listName: contact.list_name,
        status: contact.status,
        created: contact.created_at.split('T')[0],
        doNotCall: contact.do_not_call
      }));
      setContacts(transformedContacts);

    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadContacts();
  }, [user?.id]);

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchQuery === "" || 
      contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery);
    
    const matchesList = selectedList === "all" || contact.listId === selectedList;
    
    return matchesSearch && matchesList;
  });

  const handleCreateList = async (name: string) => {
    // Refresh data after creating list
    await loadContacts();
  };

  const handleCreateContact = async (contactData: Omit<Contact, 'id' | 'listName' | 'created'>) => {
    // Refresh data after creating contact
    await loadContacts();
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setEditContactOpen(true);
  };

  const handleDeleteContact = (contact: Contact) => {
    setSelectedContact(contact);
    setDeleteContactOpen(true);
  };

  const handleContactUpdated = async () => {
    await loadContacts();
  };

  const handleContactDeleted = async () => {
    await loadContacts();
  };

  const totalContacts = contacts.length;
  const activeContacts = contacts.filter(c => c.status === 'active').length;

  // CSV handling functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    if (!user?.id) {
      alert('Please log in to upload CSV files');
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string;
          const csvData = parseCSV(csvText);
          
          if (csvData.length === 0) {
            alert('No valid contact data found in CSV file');
            setIsUploading(false);
            return;
          }

          // Save CSV file metadata to database
          const csvFileData: SaveCsvFileRequest = {
            name: file.name,
            rowCount: csvData.length,
            fileSize: file.size,
            userId: user.id
          };

          const csvFileResult = await saveCsvFile(csvFileData);
          
          if (!csvFileResult.success || !csvFileResult.csvFileId) {
            alert('Failed to save CSV file: ' + csvFileResult.error);
            setIsUploading(false);
            return;
          }

          // Save CSV contacts to database
          const csvContactsData: SaveCsvContactsRequest = {
            csvFileId: csvFileResult.csvFileId,
            contacts: csvData,
            userId: user.id
          };

          const csvContactsResult = await saveCsvContacts(csvContactsData);
          
          if (!csvContactsResult.success) {
            alert('Failed to save CSV contacts: ' + csvContactsResult.error);
            setIsUploading(false);
            return;
          }

          // Update local state
          const newCsvFile: CSVFile = {
            id: csvFileResult.csvFileId,
            name: file.name,
            uploadedAt: new Date().toISOString().split('T')[0],
            rowCount: csvData.length,
            data: csvData
          };

          setCsvFiles(prev => [...prev, newCsvFile]);
          setSelectedCsvFile(newCsvFile.id);
          setShowCsvPreview(true);
          
          alert(`Successfully uploaded ${csvContactsResult.savedCount} contacts from ${file.name}`);
        } catch (error) {
          console.error('Error processing CSV file:', error);
          alert('Error processing CSV file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsUploading(false);
    }
  };

  const handleCsvFileSelect = async (csvId: string) => {
    setSelectedCsvFile(csvId);
    setShowCsvPreview(true);

    // Load CSV contacts from database if not already loaded
    const csvFile = csvFiles.find(file => file.id === csvId);
    
    if (csvFile && csvFile.data.length === 0) {
      try {
        const response = await fetchCsvContacts(csvId);
        const csvContactsData: CSVContact[] = response.contacts.map(contact => ({
          first_name: contact.first_name,
          last_name: contact.last_name || '',
          phone: contact.phone || '',
          email: contact.email || '',
          status: contact.status,
          do_not_call: contact.do_not_call
        }));

        // Update the CSV file with loaded data
        setCsvFiles(prev => prev.map(file => 
          file.id === csvId 
            ? { ...file, data: csvContactsData }
            : file
        ));
      } catch (error) {
        console.error('Error loading CSV contacts:', error);
        alert('Error loading CSV contacts: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleRemoveCsvFile = (csvId: string) => {
    const file = csvFiles.find(f => f.id === csvId);
    if (file) {
      setCsvToDelete({
        id: file.id,
        name: file.name,
        contactCount: file.rowCount
      });
      setDeleteCsvOpen(true);
    }
  };

  const confirmDeleteCsvFile = async () => {
    if (!csvToDelete) return;

    setDeletingCsv(true);
    try {
      const result = await deleteCsvFileAPI({ csvFileId: csvToDelete.id });
      
      if (result.success) {
        // Remove from local state
        setCsvFiles(prev => prev.filter(file => file.id !== csvToDelete.id));
        if (selectedCsvFile === csvToDelete.id) {
          setSelectedCsvFile(null);
          setShowCsvPreview(false);
        }
        setDeleteCsvOpen(false);
        setCsvToDelete(null);
      } else {
        console.error('Error deleting CSV file:', result.error);
        // Update the CSV to delete with campaigns data if provided
        if (result.campaigns) {
          setCsvToDelete(prev => prev ? { ...prev, campaigns: result.campaigns } : null);
        } else {
          alert('Error deleting CSV file: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Error deleting CSV file:', error);
      alert('Error deleting CSV file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeletingCsv(false);
    }
  };

  const selectedCsvData = csvFiles.find(file => file.id === selectedCsvFile);

  // Load CSV files from database on component mount
  useEffect(() => {
    const loadCsvFiles = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetchCsvFiles();
        const csvFilesData: CSVFile[] = response.csvFiles.map(file => ({
          id: file.id,
          name: file.name,
          uploadedAt: file.uploaded_at.split('T')[0],
          rowCount: file.row_count,
          data: [] // We'll load this when needed
        }));
        setCsvFiles(csvFilesData);
      } catch (error) {
        console.error('Error loading CSV files:', error);
      }
    };

    loadCsvFiles();
  }, [user?.id]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-[var(--space-lg)] max-w-6xl">
          <ThemeContainer variant="base">
            <ThemeSection spacing="lg">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading contacts...</p>
                </div>
              </div>
            </ThemeSection>
          </ThemeContainer>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-[var(--space-lg)] max-w-6xl">
        <ThemeContainer variant="base">
          <ThemeSection spacing="lg">
          {/* Page Header */}
          <div className="space-y-[var(--space-md)]">
            <h1 className="text-4xl font-extralight tracking-tight text-foreground">
              Contacts
            </h1>
            <p className="text-muted-foreground text-lg font-light">
              Manage your contact lists and reach out to prospects efficiently
            </p>
          </div>

          {/* Main Content Card */}
          <ThemeCard variant="glass" className="overflow-hidden">
            <div className="flex min-h-[600px]">
              {/* Left Sidebar - Contact Lists & CSV Files */}
              <div className="w-56 border-r border-theme-light">
                <div className="p-[var(--space-xl)] border-b border-theme-light">
                  <div className="flex items-center justify-between mb-[var(--space-lg)]">
                    <h2 className="text-base font-light text-theme-primary tracking-wide">Lists</h2>
                    <Button
                      size="sm"
                      onClick={() => setAddListOpen(true)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-[var(--space-sm)]">
                    <div
                      className={`flex items-center justify-between p-[var(--space-md)] rounded-lg cursor-pointer transition-theme-base ${
                        selectedList === "all" && !showCsvPreview
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover-theme-accent"
                      }`}
                      onClick={() => {
                        setSelectedList("all");
                        setShowCsvPreview(false);
                      }}
                    >
                      <div className="flex items-center gap-[var(--space-md)]">
                        <Users className="h-4 w-4 text-theme-secondary" />
                        <span className="font-light text-theme-primary tracking-wide text-sm">All Contacts</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {totalContacts}
                      </Badge>
                    </div>
                    
                    {contactLists.map(list => (
                      <div
                        key={list.id}
                        className={`flex items-center justify-between p-[var(--space-md)] rounded-lg cursor-pointer transition-theme-base ${
                          selectedList === list.id && !showCsvPreview
                            ? "bg-primary/10 border border-primary/20" 
                            : "hover-theme-accent"
                        }`}
                        onClick={() => {
                          setSelectedList(list.id);
                          setShowCsvPreview(false);
                        }}
                      >
                        <div className="flex items-center gap-[var(--space-md)]">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="font-light text-theme-primary tracking-wide text-sm">{list.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {list.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CSV Files Section */}
                <div className="p-[var(--space-xl)] border-b border-theme-light">
                  <div className="flex items-center justify-between mb-[var(--space-lg)]">
                    <h2 className="text-base font-light text-theme-primary tracking-wide">CSV Files</h2>
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 w-8 p-0"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {csvFiles.length === 0 ? (
                    <div className="text-center py-4 text-theme-secondary text-sm">
                      No CSV files uploaded yet
                    </div>
                  ) : (
                    <div className="space-y-[var(--space-sm)]">
                      
                      {csvFiles.map(file => (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between p-[var(--space-md)] rounded-lg transition-theme-base group cursor-pointer ${
                            selectedCsvFile === file.id && showCsvPreview
                              ? "bg-primary/10 border border-primary/20" 
                              : "hover-theme-accent"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCsvFileSelect(file.id);
                          }}
                          style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
                        >
                          <div className="flex items-center gap-[var(--space-md)] flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-theme-secondary flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-light text-theme-primary tracking-wide text-sm truncate">
                                {file.name}
                              </div>
                              <div className="text-xs text-theme-tertiary">
                                {file.rowCount} contacts
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {file.rowCount}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCsvFile(file.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-[var(--space-xl)]">
                  <div className="space-y-[var(--space-lg)]">
                    <div className="text-sm text-theme-secondary">
                      <div className="flex justify-between">
                        <span>Total Contacts</span>
                        <span className="font-medium">{totalContacts}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Active</span>
                        <span className="font-medium text-green-600">{activeContacts}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Inactive</span>
                        <span className="font-medium text-orange-600">{totalContacts - activeContacts}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col">
                {/* Toolbar */}
                <div className="p-[var(--space-xl)] border-b border-theme-light">
                  <div className="flex items-center justify-between mb-[var(--space-lg)]">
                    <div className="flex items-center gap-[var(--space-md)]">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Upload CSV'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setUploadContactsOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload List
                      </Button>
                      <Button
                        onClick={() => setAddContactOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Contact
                      </Button>
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="flex items-center">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-secondary" />
                      <Input
                        placeholder={showCsvPreview ? "Search CSV contacts..." : "Search contacts..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Contacts Table or CSV Preview */}
                <div className="flex-1 overflow-auto">
                  {showCsvPreview && selectedCsvData ? (
                    <div className="p-[var(--space-xl)]">
                      <div className="flex items-center justify-between mb-[var(--space-lg)]">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            CSV Preview: {selectedCsvData.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedCsvData.rowCount} contacts • Uploaded on {selectedCsvData.uploadedAt}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Regular Contacts
                        </Button>
                      </div>
                      
                      <Table>
                        <TableHeader className="backdrop-blur-sm bg-white/[0.01] border-b border-white/[0.06]">
                          <TableRow className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                            <TableHead className="w-[200px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Name</TableHead>
                            <TableHead className="w-[250px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Email</TableHead>
                            <TableHead className="w-[160px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Phone Number</TableHead>
                            <TableHead className="w-[120px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Status</TableHead>
                            <TableHead className="w-[100px] text-foreground font-medium text-sm font-feature-settings tracking-tight">DND</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedCsvData.data
                            .filter(contact => {
                              if (!searchQuery) return true;
                              return (
                                contact.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                contact.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                contact.phone.includes(searchQuery)
                              );
                            })
                            .map((contact, index) => (
                              <TableRow key={index} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-foreground">
                                  {contact.first_name} {contact.last_name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {contact.email || '-'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {contact.phone ? formatPhoneNumber(contact.phone) : '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant={contact.status === 'active' ? 'default' : contact.status === 'inactive' ? 'secondary' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {contact.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {contact.do_not_call ? (
                                    <Badge variant="destructive" className="text-xs">
                                      Yes
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">No</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="backdrop-blur-sm bg-white/[0.01] border-b border-white/[0.06]">
                        <TableRow className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                          <TableHead className="w-[200px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Name</TableHead>
                          <TableHead className="w-[250px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Email</TableHead>
                          <TableHead className="w-[160px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Phone Number</TableHead>
                          <TableHead className="w-[120px] text-foreground font-medium text-sm font-feature-settings tracking-tight">Created</TableHead>
                          <TableHead className="w-[100px] text-foreground font-medium text-sm font-feature-settings tracking-tight">DND</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContacts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              {searchQuery ? "No contacts found matching your search." : "No contacts yet. Add your first contact to get started."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredContacts.map(contact => (
                            <TableRow key={contact.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                              <TableCell className="font-medium text-foreground">
                                {contact.firstName} {contact.lastName}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {contact.email}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatPhoneNumber(contact.phone)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {contact.created}
                              </TableCell>
                              <TableCell className="text-center">
                                {contact.doNotCall ? (
                                  <Badge variant="destructive" className="text-xs">
                                    Yes
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                                      Edit Contact
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => handleDeleteContact(contact)}
                                    >
                                      Delete Contact
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </ThemeCard>
          </ThemeSection>
        </ThemeContainer>
      </div>

      {/* Dialogs */}
      <AddListDialog
        open={addListOpen}
        onOpenChange={setAddListOpen}
        onCreateList={handleCreateList}
      />
      
      <AddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        onCreateContact={handleCreateContact}
        contactLists={contactLists}
      />
      
      <UploadContactsDialog
        open={uploadContactsOpen}
        onOpenChange={setUploadContactsOpen}
        contactLists={contactLists}
      />
      
      <DeleteCsvFileDialog
        open={deleteCsvOpen}
        onOpenChange={setDeleteCsvOpen}
        onConfirm={confirmDeleteCsvFile}
        csvFileName={csvToDelete?.name || ''}
        contactCount={csvToDelete?.contactCount || 0}
        campaigns={csvToDelete?.campaigns || []}
        loading={deletingCsv}
      />
      
      <EditContactDialog
        open={editContactOpen}
        onOpenChange={setEditContactOpen}
        contact={selectedContact}
        contactLists={contactLists}
        onContactUpdated={handleContactUpdated}
      />
      
      <DeleteContactDialog
        open={deleteContactOpen}
        onOpenChange={setDeleteContactOpen}
        contact={selectedContact}
        onContactDeleted={handleContactDeleted}
      />
    </DashboardLayout>
  );
}
import React, { useState } from "react";
import { Search, Plus, Upload, Phone, Mail, MoreHorizontal, Users } from "lucide-react";
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

const mockContactLists: ContactList[] = [
  { id: "1", name: "Sales Prospects", count: 147, createdAt: "2024-01-15" },
  { id: "2", name: "Customer Support", count: 89, createdAt: "2024-01-20" },
  { id: "3", name: "Marketing Leads", count: 234, createdAt: "2024-02-01" },
];

const mockContacts: Contact[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Smith",
    phone: "+14155551234",
    email: "john.smith@email.com",
    listId: "1",
    listName: "Sales Prospects",
    status: "active",
    created: "2024-01-15",
    doNotCall: false
  },
  {
    id: "2",
    firstName: "Sarah",
    lastName: "Johnson",
    phone: "+14155555678",
    email: "sarah.j@company.com",
    listId: "1",
    listName: "Sales Prospects",
    status: "active",
    created: "2024-01-18",
    doNotCall: false
  },
  {
    id: "3",
    firstName: "Mike",
    lastName: "Davis",
    phone: "+14155559876",
    email: "mike.davis@business.net",
    listId: "2",
    listName: "Customer Support",
    status: "do-not-call",
    created: "2024-01-12",
    doNotCall: true
  },
  {
    id: "4",
    firstName: "Emily",
    lastName: "Chen",
    phone: "+14155554321",
    email: "emily.chen@startup.io",
    listId: "3",
    listName: "Marketing Leads",
    status: "active",
    created: "2024-01-22",
    doNotCall: false
  },
  {
    id: "5",
    firstName: "Robert",
    lastName: "Wilson",
    phone: "+14155558765",
    email: "r.wilson@corp.com",
    listId: "1",
    listName: "Sales Prospects",
    status: "inactive",
    created: "2024-01-10",
    doNotCall: false
  }
];

export default function Contacts() {
  const [selectedList, setSelectedList] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addListOpen, setAddListOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [uploadContactsOpen, setUploadContactsOpen] = useState(false);
  const [contactLists, setContactLists] = useState<ContactList[]>(mockContactLists);
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchQuery === "" || 
      contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery);
    
    const matchesList = selectedList === "all" || contact.listId === selectedList;
    
    return matchesSearch && matchesList;
  });

  const handleCreateList = (name: string) => {
    const newList: ContactList = {
      id: Date.now().toString(),
      name,
      count: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setContactLists([...contactLists, newList]);
  };

  const handleCreateContact = (contactData: Omit<Contact, 'id' | 'listName' | 'created'>) => {
    const list = contactLists.find(l => l.id === contactData.listId);
    const newContact: Contact = {
      ...contactData,
      id: Date.now().toString(),
      listName: list?.name || "Unknown List",
      created: new Date().toISOString().split('T')[0]
    };
    setContacts([...contacts, newContact]);
    
    // Update list count
    setContactLists(lists => 
      lists.map(list => 
        list.id === contactData.listId 
          ? { ...list, count: list.count + 1 }
          : list
      )
    );
  };

  const totalContacts = contacts.length;
  const activeContacts = contacts.filter(c => c.status === 'active').length;

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
              {/* Left Sidebar - Contact Lists */}
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
                        selectedList === "all" 
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover-theme-accent"
                      }`}
                      onClick={() => setSelectedList("all")}
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
                          selectedList === list.id 
                            ? "bg-primary/10 border border-primary/20" 
                            : "hover-theme-accent"
                        }`}
                        onClick={() => setSelectedList(list.id)}
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
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacts Table */}
                <div className="flex-1 overflow-auto">
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
                                  <DropdownMenuItem>Edit Contact</DropdownMenuItem>
                                  <DropdownMenuItem>Call Contact</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
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
    </DashboardLayout>
  );
}
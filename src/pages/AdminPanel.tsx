import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, Search, Edit, Trash2, Eye, UserCheck, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layout/DashboardLayout';
import { ThemeContainer, ThemeSection, ThemeCard } from '@/components/theme';

interface User {
  id: string;
  name: string | null;
  contact: {
    email: string | null;
    phone: string | null;
    countryCode: string | null;
  } | null;
  role: string | null;
  is_active: boolean | null;
  created_on: string | null;
  updated_at: string | null;
  company: string | null;
  industry: string | null;
}


const AdminPanel = () => {
  const { user, impersonateUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isViewUserOpen, setIsViewUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [isImpersonateUserOpen, setIsImpersonateUserOpen] = useState(false);
  const [editUserData, setEditUserData] = useState<Partial<User>>({});

  // Check if current user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    fetchUsers();
  }, [isAdmin]);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_on', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };


  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(editUserData)
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User updated successfully');
      setIsEditUserOpen(false);
      setSelectedUser(null);
      setEditUserData({});
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const userId = selectedUser.id;
      let deletedCounts = {
        assistants: 0,
        campaigns: 0,
        contacts: 0,
        contactLists: 0,
        csvFiles: 0,
        csvContacts: 0,
        smsMessages: 0,
        knowledgeBases: 0,
        calendarCredentials: 0,
        whatsappCredentials: 0,
        twilioCredentials: 0,
        workspaceSettings: 0
      };

      // Delete assistants first
      const { data: assistants, error: assistantsError } = await supabase
        .from('assistant')
        .select('id')
        .eq('user_id', userId);

      if (assistantsError) throw assistantsError;

      if (assistants && assistants.length > 0) {
        const { error: deleteAssistantsError } = await supabase
          .from('assistant')
          .delete()
          .eq('user_id', userId);

        if (deleteAssistantsError) throw deleteAssistantsError;
        deletedCounts.assistants = assistants.length;
      }

      // Delete campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', userId);

      if (campaignsError) throw campaignsError;

      if (campaigns && campaigns.length > 0) {
        const { error: deleteCampaignsError } = await supabase
          .from('campaigns')
          .delete()
          .eq('user_id', userId);

        if (deleteCampaignsError) throw deleteCampaignsError;
        deletedCounts.campaigns = campaigns.length;
      }

      // Delete contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId);

      if (contactsError) throw contactsError;

      if (contacts && contacts.length > 0) {
        const { error: deleteContactsError } = await supabase
          .from('contacts')
          .delete()
          .eq('user_id', userId);

        if (deleteContactsError) throw deleteContactsError;
        deletedCounts.contacts = contacts.length;
      }

      // Delete contact lists
      const { data: contactLists, error: contactListsError } = await supabase
        .from('contact_lists')
        .select('id')
        .eq('user_id', userId);

      if (contactListsError) throw contactListsError;

      if (contactLists && contactLists.length > 0) {
        const { error: deleteContactListsError } = await supabase
          .from('contact_lists')
          .delete()
          .eq('user_id', userId);

        if (deleteContactListsError) throw deleteContactListsError;
        deletedCounts.contactLists = contactLists.length;
      }

      // Delete CSV files
      const { data: csvFiles, error: csvFilesError } = await supabase
        .from('csv_files')
        .select('id')
        .eq('user_id', userId);

      if (csvFilesError) throw csvFilesError;

      if (csvFiles && csvFiles.length > 0) {
        const { error: deleteCsvFilesError } = await supabase
          .from('csv_files')
          .delete()
          .eq('user_id', userId);

        if (deleteCsvFilesError) throw deleteCsvFilesError;
        deletedCounts.csvFiles = csvFiles.length;
      }

      // Delete CSV contacts
      const { data: csvContacts, error: csvContactsError } = await supabase
        .from('csv_contacts')
        .select('id')
        .eq('user_id', userId);

      if (csvContactsError) throw csvContactsError;

      if (csvContacts && csvContacts.length > 0) {
        const { error: deleteCsvContactsError } = await supabase
          .from('csv_contacts')
          .delete()
          .eq('user_id', userId);

        if (deleteCsvContactsError) throw deleteCsvContactsError;
        deletedCounts.csvContacts = csvContacts.length;
      }

      // Delete SMS messages
      const { data: smsMessages, error: smsMessagesError } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('user_id', userId);

      if (smsMessagesError) throw smsMessagesError;

      if (smsMessages && smsMessages.length > 0) {
        const { error: deleteSmsMessagesError } = await supabase
          .from('sms_messages')
          .delete()
          .eq('user_id', userId);

        if (deleteSmsMessagesError) throw deleteSmsMessagesError;
        deletedCounts.smsMessages = smsMessages.length;
      }

      // Delete knowledge bases
      const { data: knowledgeBases, error: knowledgeBasesError } = await supabase
        .from('knowledge_bases')
        .select('id')
        .eq('company_id', userId);

      if (knowledgeBasesError) throw knowledgeBasesError;

      if (knowledgeBases && knowledgeBases.length > 0) {
        const { error: deleteKnowledgeBasesError } = await supabase
          .from('knowledge_bases')
          .delete()
          .eq('company_id', userId);

        if (deleteKnowledgeBasesError) throw deleteKnowledgeBasesError;
        deletedCounts.knowledgeBases = knowledgeBases.length;
      }

      // Delete calendar credentials
      const { data: calendarCredentials, error: calendarCredentialsError } = await supabase
        .from('user_calendar_credentials')
        .select('id')
        .eq('user_id', userId);

      if (calendarCredentialsError) throw calendarCredentialsError;

      if (calendarCredentials && calendarCredentials.length > 0) {
        const { error: deleteCalendarCredentialsError } = await supabase
          .from('user_calendar_credentials')
          .delete()
          .eq('user_id', userId);

        if (deleteCalendarCredentialsError) throw deleteCalendarCredentialsError;
        deletedCounts.calendarCredentials = calendarCredentials.length;
      }

      // Delete WhatsApp credentials
      const { data: whatsappCredentials, error: whatsappCredentialsError } = await supabase
        .from('user_whatsapp_credentials')
        .select('id')
        .eq('user_id', userId);

      if (whatsappCredentialsError) throw whatsappCredentialsError;

      if (whatsappCredentials && whatsappCredentials.length > 0) {
        const { error: deleteWhatsappCredentialsError } = await supabase
          .from('user_whatsapp_credentials')
          .delete()
          .eq('user_id', userId);

        if (deleteWhatsappCredentialsError) throw deleteWhatsappCredentialsError;
        deletedCounts.whatsappCredentials = whatsappCredentials.length;
      }

      // Delete Twilio credentials
      const { data: twilioCredentials, error: twilioCredentialsError } = await supabase
        .from('user_twilio_credentials')
        .select('id')
        .eq('user_id', userId);

      if (twilioCredentialsError) throw twilioCredentialsError;

      if (twilioCredentials && twilioCredentials.length > 0) {
        const { error: deleteTwilioCredentialsError } = await supabase
          .from('user_twilio_credentials')
          .delete()
          .eq('user_id', userId);

        if (deleteTwilioCredentialsError) throw deleteTwilioCredentialsError;
        deletedCounts.twilioCredentials = twilioCredentials.length;
      }

      // Delete workspace settings
      const { data: workspaceSettings, error: workspaceSettingsError } = await supabase
        .from('workspace_settings')
        .select('id')
        .eq('user_id', userId);

      if (workspaceSettingsError) throw workspaceSettingsError;

      if (workspaceSettings && workspaceSettings.length > 0) {
        const { error: deleteWorkspaceSettingsError } = await supabase
          .from('workspace_settings')
          .delete()
          .eq('user_id', userId);

        if (deleteWorkspaceSettingsError) throw deleteWorkspaceSettingsError;
        deletedCounts.workspaceSettings = workspaceSettings.length;
      }

      // Finally, delete the user
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Create success message with details
      const deletedItems = Object.entries(deletedCounts)
        .filter(([_, count]) => count > 0)
        .map(([item, count]) => `${count} ${item}`)
        .join(', ');

      const successMessage = deletedItems 
        ? `User deleted successfully along with: ${deletedItems}`
        : 'User deleted successfully';

      toast.success(successMessage);
      setIsDeleteUserOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      
      // Provide more specific error messages
      if (error.code === '23503') {
        toast.error('Cannot delete user: User still has associated data. Please contact support.');
      } else if (error.message?.includes('not_admin')) {
        toast.error('Access denied: Admin privileges required to delete users.');
      } else {
        toast.error(error.message || 'Failed to delete user');
      }
    }
  };

  const handleAccessAccount = (user: User) => {
    setSelectedUser(user);
    setIsImpersonateUserOpen(true);
  };

  const confirmImpersonation = async () => {
    if (!selectedUser) return;

    try {
      console.log('AdminPanel: Starting impersonation for user:', selectedUser);
      const result = await impersonateUser(selectedUser.id);
      console.log('AdminPanel: Impersonation result:', result);
      
      if (result.success) {
        toast.success(result.message);
        setIsImpersonateUserOpen(false);
        setSelectedUser(null);
        // Add a longer delay to ensure state is properly set before redirect
        setTimeout(() => {
          console.log('AdminPanel: Redirecting to main app after impersonation');
          window.location.href = '/';
        }, 500);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error accessing account:', error);
      toast.error('Failed to access account');
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      name: user.name,
      role: user.role,
      company: user.company,
      industry: user.industry,
      is_active: user.is_active
    });
    setIsEditUserOpen(true);
  };

  const openViewDialog = (user: User) => {
    setSelectedUser(user);
    setIsViewUserOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteUserOpen(true);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen flex items-center justify-center">
          <ThemeCard className="w-96">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You need admin privileges to access this panel.
              </CardDescription>
            </CardHeader>
          </ThemeCard>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
        <div className="container mx-auto px-[var(--space-lg)]">
          <div className="max-w-7xl mx-auto">
            <ThemeSection spacing="lg">
              <div className="flex flex-col space-y-[var(--space-md)]">
                <h1 className="text-[28px] font-light tracking-[0.2px] text-foreground">
                  Admin Panel
                </h1>
                <p className="text-muted-foreground text-sm font-medium tracking-[0.1px]">
                  Manage users and system administration
                </p>
              </div>
            </ThemeSection>

            <ThemeCard>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Users Management</CardTitle>
                    <CardDescription>
                      View and manage all system users
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                      <TableCell>{user.contact?.email || 'N/A'}</TableCell>
                      <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role || 'user'}
                      </Badge>
                      </TableCell>
                      <TableCell>{user.company || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'destructive'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleAccessAccount(user)}
                              disabled={user.role === 'admin'}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Access Account
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </ThemeCard>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input
                  id="edit-name"
                  value={editUserData.name || ''}
                  onChange={(e) => setEditUserData({...editUserData, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">Role</Label>
                <Select value={editUserData.role || ''} onValueChange={(value) => setEditUserData({...editUserData, role: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-company" className="text-right">Company</Label>
                <Input
                  id="edit-company"
                  value={editUserData.company || ''}
                  onChange={(e) => setEditUserData({...editUserData, company: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-industry" className="text-right">Industry</Label>
                <Input
                  id="edit-industry"
                  value={editUserData.industry || ''}
                  onChange={(e) => setEditUserData({...editUserData, industry: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">Status</Label>
                <Select value={editUserData.is_active ? 'active' : 'inactive'} onValueChange={(value) => setEditUserData({...editUserData, is_active: value === 'active'})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditUser}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View User Dialog */}
        <Dialog open={isViewUserOpen} onOpenChange={setIsViewUserOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Complete information about the selected user.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-white">{selectedUser.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-white">{selectedUser.contact?.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-white">{selectedUser.contact?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Role</Label>
                    <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                      {selectedUser.role || 'user'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Company</Label>
                    <p className="text-sm text-white">{selectedUser.company || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Industry</Label>
                    <p className="text-sm text-white">{selectedUser.industry || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={selectedUser.is_active ? 'default' : 'destructive'}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm text-white">
                      {selectedUser.created_on ? new Date(selectedUser.created_on).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Updated</Label>
                <p className="text-sm text-white">
                      {selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleString() : 'N/A'}
                    </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewUserOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="py-4">
                <p className="text-sm text-white">
                  You are about to delete <strong>{selectedUser.name}</strong> ({selectedUser.contact?.email}).
                  This will permanently remove their account and all associated data.
                </p>
                <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                  <p className="text-sm text-red-200 font-medium">⚠️ Warning:</p>
                  <p className="text-sm text-red-200 mt-1">
                    This action will permanently delete ALL user data including:
                  </p>
                  <ul className="text-sm text-red-200 mt-2 ml-4 list-disc">
                    <li>Assistants and their configurations</li>
                    <li>Campaigns and call history</li>
                    <li>Contacts and contact lists</li>
                    <li>CSV files and uploaded data</li>
                    <li>SMS messages and history</li>
                    <li>Knowledge bases and documents</li>
                    <li>Calendar and WhatsApp integrations</li>
                    <li>Twilio credentials and settings</li>
                    <li>Workspace preferences</li>
                  </ul>
                  <p className="text-sm text-red-200 mt-2 font-medium">
                    This action cannot be undone!
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteUserOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Impersonation Confirmation Dialog */}
        <Dialog open={isImpersonateUserOpen} onOpenChange={setIsImpersonateUserOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Access User Account</DialogTitle>
              <DialogDescription>
                You are about to impersonate this user. You will see and do everything as this user.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="py-4">
                <p className="text-sm text-white">
                  You are about to access the account of <strong>{selectedUser.name}</strong> ({selectedUser.contact?.email}).
                </p>
                <div className="mt-3 p-3 bg-orange-900/20 border border-orange-500/30 rounded-md">
                  <p className="text-sm text-orange-200 font-medium">⚠️ Warning:</p>
                  <p className="text-sm text-orange-200 mt-1">
                    This will log you in as this user. You will be able to:
                  </p>
                  <ul className="text-sm text-orange-200 mt-2 ml-4 list-disc">
                    <li>View all their data and settings</li>
                    <li>Create, edit, and delete their content</li>
                    <li>Make changes on their behalf</li>
                    <li>Access their integrations and credentials</li>
                  </ul>
                  <p className="text-sm text-orange-200 mt-2 font-medium">
                    Use this feature responsibly!
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImpersonateUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmImpersonation} className="bg-orange-600 hover:bg-orange-700">
                Access Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </ThemeContainer>
  </DashboardLayout>
);
};

export default AdminPanel;

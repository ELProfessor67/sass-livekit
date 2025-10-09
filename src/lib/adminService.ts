import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  created_on: string | null;
  company: string | null;
  industry: string | null;
}

export class AdminService {
  /**
   * Check if current user is admin
   */
  static async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      return data?.role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(): Promise<AdminUser[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          contact,
          role,
          is_active,
          created_on,
          company,
          industry
        `)
        .order('created_on', { ascending: false });

      if (error) throw error;

      return data?.map(user => ({
        ...user,
        email: user.contact?.email || null
      })) || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  static async updateUser(userId: string, updates: Partial<AdminUser>) {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(userId: string) {
    try {
      // Delete from auth.users
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      // Delete from public.users
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (authError) throw authError;
      if (profileError) throw profileError;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Search users
   */
  static async searchUsers(query: string): Promise<AdminUser[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          contact,
          role,
          is_active,
          created_on,
          company,
          industry
        `)
        .or(`name.ilike.%${query}%,contact->>email.ilike.%${query}%,company.ilike.%${query}%`)
        .order('created_on', { ascending: false });

      if (error) throw error;

      return data?.map(user => ({
        ...user,
        email: user.contact?.email || null
      })) || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}

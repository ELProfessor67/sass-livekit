# Admin Panel Documentation

## Overview

The admin panel provides comprehensive user management functionality for administrators. It allows you to view, edit, delete, and create admin users with full system access.

## Features

### 🔐 Access Control
- Only users with `admin` role can access the admin panel
- Automatic access denial for non-admin users
- Role-based navigation (admin panel only appears for admin users)

### 👥 User Management
- **View All Users**: Complete table showing all system users
- **Search Users**: Real-time search by name, email, or company
- **User Details**: Comprehensive user information display
- **Edit Users**: Update user information, roles, and status
- **Delete Users**: Remove users from the system (with confirmation)
- **Access Account**: Placeholder for account impersonation feature

### 🛡️ User Role Management
- **Change User Roles**: Update existing users to admin or user roles
- **User Profile Management**: Update user information and status

## Getting Started

### 1. Database Setup

Run the migration to set up admin role support:

```sql
-- Run the migration file
supabase/migrations/20250130000002_add_admin_role_support.sql
```

### 2. Create Your First Admin

You have several options to create your first admin user:

#### Option A: Through Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Create a new user or update an existing user
4. Update the `role` field in the `public.users` table to `admin`

#### Option B: Direct Database Update
```sql
-- Update an existing user to admin
UPDATE public.users 
SET role = 'admin' 
WHERE contact->>'email' = 'your-email@example.com';
```

#### Option C: Through Application (if you have another admin)
1. Log in as an existing admin
2. Navigate to Admin Panel
3. Find the user you want to make admin
4. Click the three-dot menu and select "Edit"
5. Change their role to "Admin" and save

### 3. Access the Admin Panel

1. Log in with your admin account
2. Look for the "Admin" tab in the navigation (shield icon)
3. Click to access the admin panel

## User Interface

### Main Table
- **Name**: User's display name
- **Email**: User's email address
- **Role**: User role (user, admin)
- **Company**: User's company name
- **Status**: Active/Inactive status
- **Created**: Account creation date
- **Actions**: Three-dot menu with available actions

### Actions Menu
Each user row has a three-dot menu with the following options:

- **👁️ View**: View complete user details
- **✏️ Edit**: Modify user information
- **👤 Access Account**: Account impersonation (placeholder)
- **🗑️ Delete**: Remove user (with confirmation)

### Edit User Dialog
- **Name**: User's display name
- **Role**: User or Admin
- **Company**: Company name
- **Industry**: Industry
- **Status**: Active or Inactive

## Security Features

### Row Level Security (RLS)
- Admins can view, edit, and delete all users
- Regular users can only access their own data
- Proper RLS policies prevent unauthorized access

### Role Validation
- Frontend checks user role before showing admin panel
- Backend validates admin permissions for all operations
- Automatic redirect for non-admin users

### Data Protection
- Sensitive operations require confirmation
- User deletion includes auth user removal
- Proper error handling and user feedback

## API Functions

The admin panel uses the `AdminService` class with the following methods:

- `isCurrentUserAdmin()`: Check if current user has admin privileges
- `getAllUsers()`: Fetch all users with their details
- `updateUser()`: Update user information
- `deleteUser()`: Delete a user completely
- `searchUsers()`: Search users by various criteria

## Troubleshooting

### Can't Access Admin Panel
1. Verify your user has `admin` role
2. Check if the migration was applied correctly
3. Ensure you're logged in with the correct account

### Can't Change User Roles
1. Verify you have admin privileges
2. Check if the user exists
3. Ensure you're not trying to change your own role

### Users Not Loading
1. Check RLS policies are correctly applied
2. Verify database connection
3. Check browser console for errors

## Future Enhancements

- **Account Impersonation**: Allow admins to log in as other users
- **Bulk Operations**: Select and modify multiple users at once
- **User Activity Logs**: Track user actions and system usage
- **Advanced Filtering**: Filter users by role, status, date range
- **Export Functionality**: Export user data to CSV/Excel
- **Audit Trail**: Track admin actions and changes

## Support

If you encounter any issues with the admin panel:

1. Check the browser console for error messages
2. Verify database permissions and RLS policies
3. Ensure all migrations have been applied
4. Check Supabase logs for backend errors

For additional help, refer to the Supabase documentation or contact your system administrator.

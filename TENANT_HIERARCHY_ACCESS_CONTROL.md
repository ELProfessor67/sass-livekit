# Tenant Hierarchy and Access Control

## Overview
This document explains the tenant hierarchy and access control rules for the multi-tenant system.

## Tenant Hierarchy

```
zainab (super-admin)
├── tenant: 'main'
├── role: 'super-admin'
└── Can see:
    ├── All main tenant users (tenant = 'main')
    └── All whitelabel admins (users with slug_name)
    └── BUT NOT whitelabel customers

gomez (whitelabel admin)
├── tenant: 'gomezlouis'
├── slug_name: 'gomezlouis'
├── role: 'admin'
└── Can see:
    ├── Themselves (slug_name = 'gomezlouis')
    └── Their customers (tenant = 'gomezlouis' AND slug_name IS NULL)

andria (whitelabel customer)
├── tenant: 'gomezlouis'
├── slug_name: NULL
├── role: 'user'
└── Can see:
    └── Only themselves
```

## Access Control Rules

### Super-Admin (zainab)
**Can see:**
- ✅ All users with `tenant = 'main'` (main tenant users)
- ✅ All users with `slug_name IS NOT NULL` (whitelabel admins like gomez)

**Cannot see:**
- ❌ Users with `tenant != 'main'` AND `slug_name IS NULL` (whitelabel customers like andria)

**Example:**
- ✅ Can see: zainab (main tenant), gomez (whitelabel admin)
- ❌ Cannot see: andria (gomez's customer)

### Whitelabel Admin (gomez)
**Can see:**
- ✅ Themselves (where `slug_name = 'gomezlouis'`)
- ✅ Their customers (where `tenant = 'gomezlouis'` AND `slug_name IS NULL`)

**Cannot see:**
- ❌ Main tenant users
- ❌ Other whitelabel admins
- ❌ Customers of other whitelabel tenants

**Example:**
- ✅ Can see: gomez (themselves), andria (their customer)
- ❌ Cannot see: zainab (main tenant), other whitelabel admins

### Whitelabel Customer (andria)
**Can see:**
- ✅ Only themselves

**Cannot see:**
- ❌ Other users (unless they have specific permissions)

## Implementation

The filtering is implemented in `server/routes/admin.js`:

```javascript
// For super-admin filtering
if (req.userRole === 'super-admin') {
  const isMainTenant = profile.tenant === 'main';
  const isWhitelabelAdmin = profile.slug_name !== null && profile.slug_name !== undefined;
  
  // Only include main tenant users or whitelabel admins
  if (!isMainTenant && !isWhitelabelAdmin) {
    return null; // Exclude whitelabel customers (e.g., andria)
  }
}
```

## Database Structure

### Users Table
- `tenant`: The tenant identifier ('main' or whitelabel slug like 'gomezlouis')
- `slug_name`: The whitelabel admin's slug (NULL for regular users and customers)
- `role`: 'super-admin', 'admin', or 'user'

### Examples

| User | tenant | slug_name | role | Visible to Super-Admin? |
|------|--------|-----------|------|-------------------------|
| zainab | main | NULL | super-admin | ✅ Yes |
| gomez | gomezlouis | gomezlouis | admin | ✅ Yes (whitelabel admin) |
| andria | gomezlouis | NULL | user | ❌ No (whitelabel customer) |

## Benefits

1. **Privacy**: Whitelabel customers are completely private to their whitelabel admin
2. **Data Isolation**: Super-admin cannot access whitelabel customer data
3. **Clear Hierarchy**: Each level has appropriate visibility
4. **Scalability**: Easy to add more whitelabel tenants without exposing their customers



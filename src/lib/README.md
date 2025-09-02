# Centralized Authentication System

This directory contains a centralized authentication system that provides a single source of truth for user authentication and profile management across the entire application.

## Files

- `auth.ts` - Core authentication service with singleton pattern
- `useAuthService.ts` - React hooks for consuming the auth service

## Features

### 🔐 Authentication Management
- User sign in/out
- User registration with metadata
- Session management
- Auth state persistence

### 👤 User Profile Management
- Complete user profile data
- Contact information (email, phone, country code)
- Company and business information
- Onboarding status
- Subscription and trial information

### 🛠️ Utility Functions
- User display name generation
- User initials for avatars
- Onboarding completion status
- Trial status and countdown
- Profile update operations

## Usage

### Basic Authentication

```typescript
import { useAuthService } from '@/hooks/useAuthService';

function MyComponent() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useAuthService();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;

  return (
    <div>
      <h1>Welcome, {user?.fullName}!</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### User Profile Operations

```typescript
import { useUserProfile } from '@/hooks/useAuthService';

function ProfileComponent() {
  const { 
    profile, 
    updateProfile, 
    getUserDisplayName, 
    getUserInitials,
    hasCompletedOnboarding,
    isTrialActive 
  } = useUserProfile();

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({
        company: 'New Company',
        industry: 'Technology'
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  return (
    <div>
      <h1>{getUserDisplayName()}</h1>
      <Avatar>
        <AvatarFallback>{getUserInitials()}</AvatarFallback>
      </Avatar>
      <p>Onboarding: {hasCompletedOnboarding() ? 'Complete' : 'Incomplete'}</p>
      <p>Trial: {isTrialActive() ? 'Active' : 'Expired'}</p>
      <button onClick={handleUpdateProfile}>Update Profile</button>
    </div>
  );
}
```

### Simple User Data Access

```typescript
import { useCurrentUser } from '@/hooks/useAuthService';

function SimpleComponent() {
  const user = useCurrentUser();
  
  return (
    <div>
      <p>User ID: {user?.id}</p>
      <p>Email: {user?.email}</p>
      <p>Company: {user?.company}</p>
    </div>
  );
}
```

### Authentication Status Only

```typescript
import { useAuthStatus } from '@/hooks/useAuthService';

function ConditionalComponent() {
  const { isAuthenticated, isLoading } = useAuthStatus();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {isAuthenticated ? (
        <div>Authenticated content</div>
      ) : (
        <div>Please sign in</div>
      )}
    </div>
  );
}
```

## Data Structure

### AuthUser Interface

```typescript
interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  phone?: string | null;
  countryCode?: string | null;
  company?: string | null;
  industry?: string | null;
  teamSize?: string | null;
  role?: string | null;
  useCase?: string | null;
  theme?: string | null;
  notifications?: boolean | null;
  goals?: any | null;
  onboardingCompleted?: boolean | null;
  plan?: string | null;
  trialEndsAt?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
```

## Migration from Old Auth System

### Before (useAuth hook)
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, signIn, signOut } = useAuth();
  // Limited user data available
}
```

### After (useAuthService hook)
```typescript
import { useAuthService } from '@/hooks/useAuthService';

function MyComponent() {
  const { user, isAuthenticated, signIn, signOut } = useAuthService();
  // Complete user profile data available
  // Additional utility functions available
}
```

## Benefits

1. **Centralized State**: Single source of truth for authentication
2. **Rich User Data**: Access to complete user profile information
3. **Utility Functions**: Built-in helpers for common operations
4. **Type Safety**: Full TypeScript support with comprehensive interfaces
5. **Performance**: Singleton pattern prevents multiple auth instances
6. **Consistency**: Same auth state across all components
7. **Extensibility**: Easy to add new user properties and methods

## Best Practices

1. **Use the appropriate hook** for your needs:
   - `useAuthService()` - Full authentication functionality
   - `useCurrentUser()` - Just user data
   - `useAuthStatus()` - Just authentication status
   - `useUserProfile()` - Profile-specific operations

2. **Handle loading states** properly:
   ```typescript
   if (isLoading) return <LoadingSpinner />;
   ```

3. **Check authentication** before accessing user data:
   ```typescript
   if (!isAuthenticated) return <LoginPrompt />;
   ```

4. **Use utility functions** instead of manual data manipulation:
   ```typescript
   // Good
   const displayName = getUserDisplayName();
   
   // Avoid
   const displayName = user?.fullName || user?.email || 'User';
   ```

## Error Handling

The auth service includes built-in error handling:

```typescript
const { error, signIn } = useAuthService();

const handleSignIn = async () => {
  try {
    await signIn(email, password);
  } catch (error) {
    // Error is automatically set in the auth state
    console.error('Sign in failed:', error);
  }
};

// Display error in UI
{error && <div className="error">{error}</div>}
```

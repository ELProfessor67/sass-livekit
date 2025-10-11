import { supabase } from '@/integrations/supabase/client';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...defaultRetryOptions, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error?.code === '23505') {
        // Duplicate key error - don't retry
        throw error;
      }
      
      if (error?.code === '23503') {
        // Foreign key constraint error - don't retry
        throw error;
      }
      
      if (error?.code === '42501') {
        // Permission denied - don't retry
        throw error;
      }
      
      console.warn(`Attempt ${attempt}/${config.maxAttempts} failed:`, error?.message || error);
      
      if (attempt < config.maxAttempts) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function supabaseWithRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  options?: RetryOptions
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await withRetry(operation, options);
    return result;
  } catch (error) {
    return { data: null, error };
  }
}

// Helper function specifically for user operations
export async function ensureUserExists(userId: string, name?: string | null): Promise<void> {
  try {
    // Check if user exists
    const { data: exists, error: checkError } = await supabaseWithRetry(() =>
      supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
    );

    if (checkError) {
      console.warn('Error checking user existence:', checkError);
    }

    // If user doesn't exist, create them
    if (!exists) {
      const { error: insertError } = await supabaseWithRetry(() =>
        supabase
          .from('users')
          .insert({ id: userId, name: name || null })
      );

      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate key - user was created by another request
          console.log('User already exists (created by another request)');
        } else {
          console.warn('Could not create user profile:', insertError);
        }
      } else {
        console.log('Successfully created user profile');
      }
    }
  } catch (error) {
    console.error('Critical error in ensureUserExists:', error);
    // Don't throw - this is a non-critical operation
  }
}

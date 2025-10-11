// Authentication utilities for the server
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Middleware to authenticate JWT tokens (like voiceagents project)
 * This replaces the simple header-based approach
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth middleware - authHeader:', authHeader ? 'Present' : 'Missing');
    console.log('Auth middleware - token length:', token ? token.length : 0);

    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify the token with Supabase
    console.log('Auth middleware - Verifying token with Supabase...');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.log('Auth middleware - Supabase error:', error.message);
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
        error: error.message
      });
    }

    if (!user) {
      console.log('Auth middleware - No user found in token');
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    console.log('Auth middleware - User authenticated:', user.id);
    req.user = { id: user.id, email: user.email };
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to extract user ID from JWT or session (legacy support)
 * This is a placeholder implementation - replace with your actual auth middleware
 */
export const extractUserId = (req, res, next) => {
  try {
    // Extract user ID from headers (for now)
    // In a real implementation, this would:
    // 1. Verify JWT token
    // 2. Extract user info from token
    // 3. Set req.user with full user object
    
    const userId = req.headers['user-id'] || req.headers['x-user-id'];
    const companyId = req.headers['company-id'] || req.headers['x-company-id'];
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'User ID required',
        message: 'Please provide user-id in headers'
      });
    }
    
    // Set user object on request
    req.user = {
      id: userId,
      companyId: companyId || userId, // Use userId as companyId if not provided
      // Add other user properties as needed
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: error.message 
    });
  }
};

/**
 * Middleware to require company ID
 */
export const requireCompanyId = (req, res, next) => {
  if (!req.user?.companyId) {
    return res.status(400).json({
      error: 'Company ID required',
      message: 'Please provide company-id in headers'
    });
  }
  next();
};

/**
 * Middleware to validate knowledge base access
 */
export const validateKnowledgeBaseAccess = (req, res, next) => {
  const { knowledgeBaseId } = req.params;
  const { companyId } = req.user;
  
  if (!knowledgeBaseId) {
    return res.status(400).json({
      error: 'Knowledge base ID required'
    });
  }
  
  // Add additional validation logic here if needed
  // For example, check if the user has access to this knowledge base
  
  next();
};

/**
 * Middleware to validate file access
 */
export const validateFileAccess = (req, res, next) => {
  const { fileId } = req.params;
  const { companyId } = req.user;
  
  if (!fileId) {
    return res.status(400).json({
      error: 'File ID required'
    });
  }
  
  // Add additional validation logic here if needed
  // For example, check if the user has access to this file
  
  next();
};

export default {
  extractUserId,
  requireCompanyId,
  validateKnowledgeBaseAccess,
  validateFileAccess
};

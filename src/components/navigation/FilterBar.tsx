import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TimeRangeSelector from "@/components/dashboard/TimeRangeSelector";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";

interface FilterBarProps {
  onRangeChange: (range: { from: Date; to: Date }) => void;
  title?: string;
  subtitle?: string;
}

export default function FilterBar({
  onRangeChange,
  title,
  subtitle
}: FilterBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { uiStyle } = useTheme();
  
  const {
    data: userData
  } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return null;
      const {
        data: usersTable,
        error: usersError
      } = await supabase.from('users').select('*').eq('id', '5cd6e70a-2dc4-479e-8b74-2ee8007f7764').single();
      console.log('Full users table row:', usersTable);
      if (usersError) {
        console.error('Error fetching from users table:', usersError);
      }
      const {
        data: profile,
        error
      } = await supabase.from('users').select('contact, name').eq('id', '5cd6e70a-2dc4-479e-8b74-2ee8007f7764').single();
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      console.log('Raw profile data:', profile);
      if (profile?.name) {
        console.log('Using name directly from users table:', profile.name);
        return {
          firstName: profile.name
        };
      }
      if (profile?.contact) {
        console.log('Contact field exists:', profile.contact);
        let contactData;
        if (typeof profile.contact === 'string') {
          try {
            contactData = JSON.parse(profile.contact);
            console.log('Parsed contact data from string:', contactData);
          } catch (e) {
            console.error('Failed to parse contact string:', e);
            contactData = {
              firstName: profile.contact
            };
          }
        } else {
          contactData = profile.contact;
          console.log('Contact data already an object:', contactData);
        }
        const firstName = contactData?.firstName || contactData?.first_name || contactData?.name || usersTable?.name || 'User';
        console.log('Extracted firstName:', firstName);
        return {
          firstName
        };
      }
      if (usersTable?.name) {
        console.log('Using name from users table as fallback:', usersTable.name);
        return {
          firstName: usersTable.name
        };
      }
      console.log('Using default name "User" as fallback');
      return {
        firstName: 'User'
      };
    }
  });

  // Handle date range changes and share them with the Calls page
  const handleRangeChange = (range: { from: Date; to: Date }) => {
    onRangeChange(range);
    
    // Store the date range in session storage for persistence
    sessionStorage.setItem('dashboardDateRange', JSON.stringify({
      from: range.from.toISOString(),
      to: range.to.toISOString()
    }));
    
    // If we're on the dashboard, update the current state for the Calls page to use later
    if (location.pathname === '/') {
      sessionStorage.setItem('lastDashboardDateRange', JSON.stringify({
        from: range.from.toISOString(),
        to: range.to.toISOString()
      }));
    }
  };

  // Get theme-aware background classes
  const getBackgroundClass = () => {
    if (uiStyle === "glass") {
      return "backdrop-blur-sm";
    } else {
      return "surface-base";
    }
  };

  return <motion.div className={`${getBackgroundClass()} px-6 py-6`} initial={{
    opacity: 0,
    y: -10
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.3,
    delay: 0.1
  }}>
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-extralight tracking-tight text-3xl text-foreground">
              Welcome back!
            </h1>
          </div>
          
          <div className="flex items-center">
            <div className="liquid-glass-medium liquid-rounded-lg border border-white/10">
              <TimeRangeSelector onRangeChange={handleRangeChange} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>;
}

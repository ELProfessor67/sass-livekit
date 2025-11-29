import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Sparkles } from "lucide-react";
import { extractTenantFromHostname } from "@/lib/tenant-utils";

export function OnboardingComplete() {
  const { data, complete } = useOnboarding();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = async () => {
    try {
      // Get signup data from localStorage
      const signupDataStr = localStorage.getItem("signup-data");
      
      if (!signupDataStr) {
        // If no signup data, check if user is already authenticated (existing flow)
        if (!user?.id) {
          toast({
            title: "Missing signup information",
            description: "Please start from the signup page.",
            variant: "destructive",
          });
          navigate("/signup");
          return;
        }
      }

      let userId = user?.id;
      let isNewUser = false;
      let signupData = null;

      // Parse signup data if it exists (before we clear it)
      if (signupDataStr) {
        signupData = JSON.parse(signupDataStr);
      }

      // If we have signup data, create auth user first
      if (signupData) {
        // Get the site URL from environment variable or use current origin
        const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
        const redirectTo = `${siteUrl}/auth/callback`;

        // Extract tenant from hostname
        let tenant = extractTenantFromHostname();
        
        // If tenant is not 'main', verify it exists
        if (tenant !== 'main') {
          try {
            const { data: tenantOwner } = await supabase
              .from('users')
              .select('slug_name')
              .eq('slug_name', tenant)
              .maybeSingle();
            
            // If no tenant owner found, default to main
            if (!tenantOwner) {
              tenant = 'main';
            }
          } catch (error) {
            console.warn('Error verifying tenant, defaulting to main:', error);
            tenant = 'main';
          }
        }

        // Create auth user with email auto-confirmed
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
          options: {
            emailRedirectTo: redirectTo,
            email_confirm: true, // Auto-confirm email, skip verification
            data: {
              name: signupData.name,
              contactPhone: signupData.phone,
              countryCode: signupData.countryCode,
              tenant: tenant // Include tenant in metadata so trigger can use it
            }
          },
        });

        if (authError) {
          throw new Error(authError.message);
        }

        if (!authData.user) {
          throw new Error("Failed to create user account");
        }

        userId = authData.user.id;
        isNewUser = true;

        // Clear signup data from localStorage after we've used it
        localStorage.removeItem("signup-data");
      }

      if (!userId) {
        throw new Error("User ID is required");
      }

      // Calculate trial end date
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
      
      // Save payment method if provided
      if (data.paymentMethodId) {
        try {
          // Check if payment method already exists
          const { data: existingPaymentMethod } = await (supabase as any)
            .from('payment_methods')
            .select('id')
            .eq('stripe_payment_method_id', data.paymentMethodId)
            .maybeSingle();

          if (!existingPaymentMethod) {
            // Extract card details from payment method data if available
            const paymentMethodData: any = {
              user_id: userId,
              stripe_payment_method_id: data.paymentMethodId,
              is_default: true,
              is_active: true,
            };

            // Add optional fields if they exist in onboarding data
            if (data.cardBrand) paymentMethodData.card_brand = data.cardBrand;
            if (data.cardLast4) paymentMethodData.card_last4 = data.cardLast4;
            if (data.cardExpMonth) paymentMethodData.card_exp_month = data.cardExpMonth;
            if (data.cardExpYear) paymentMethodData.card_exp_year = data.cardExpYear;
            if (signupData?.email || data.email) paymentMethodData.billing_email = signupData?.email || data.email;
            if (signupData?.name || data.name) paymentMethodData.billing_name = signupData?.name || data.name;

            const { error: paymentMethodError } = await (supabase as any)
              .from('payment_methods')
              .insert(paymentMethodData);

            if (paymentMethodError) {
              console.error('Error saving payment method:', paymentMethodError);
              // Don't throw - continue with onboarding even if payment method save fails
              toast({
                title: "Payment method not saved",
                description: "You can add a payment method later in settings.",
                variant: "default",
              });
            } else {
              console.log('Payment method saved successfully');
            }
          }
        } catch (error) {
          console.error('Error processing payment method:', error);
          // Don't throw - continue with onboarding
        }
      }

      // Determine tenant first (before creating userProfileData)
      let finalTenant = 'main';
      const tenantFromHost = extractTenantFromHostname();
      if (tenantFromHost !== 'main') {
        try {
          const { data: tenantOwner } = await supabase
            .from('users')
            .select('slug_name')
            .eq('slug_name', tenantFromHost)
            .maybeSingle();
          
          if (tenantOwner) {
            finalTenant = tenantFromHost;
          }
        } catch (error) {
          console.warn('Error verifying tenant, defaulting to main:', error);
        }
      }

      // Check if user is a white label admin (has slug_name)
      // We need to preserve their admin role and slug_name
      let userRole = data.role || "user";
      let existingSlugName = null;
      
      // Check if user already exists (set by complete-signup endpoint)
      const { data: existingUser } = await supabase
        .from('users')
        .select('slug_name, role')
        .eq('id', userId)
        .maybeSingle();
      
      if (existingUser?.slug_name) {
        // If user has slug_name, they should be admin
        userRole = 'admin';
        existingSlugName = existingUser.slug_name;
      }

      // Create/update users table with all data (signup + onboarding)
      const userProfileData: any = {
        id: userId,
        name: signupData?.name || user?.fullName || "",
        company: data.companyName,
        industry: data.industry,
        team_size: data.teamSize,
        role: userRole,
        use_case: data.useCase,
        theme: data.theme,
        notifications: data.notifications,
        goals: data.goals,
        plan: data.plan,
        minutes_limit: 0, // Start with 0 minutes - users purchase minutes separately
        minutes_used: 0,
        onboarding_completed: true,
        contact: {
          email: signupData?.email || user?.email || "",
          phone: signupData?.phone || null,
          countryCode: signupData?.countryCode || null,
        },
        is_active: true,
      };

      // Add trial_ends_at field
      userProfileData.trial_ends_at = trialEndsAt.toISOString();

      // Add white label fields if applicable
      if (existingSlugName) {
        // Preserve existing slug_name and set tenant to slug
        userProfileData.slug_name = existingSlugName;
        userProfileData.tenant = existingSlugName;
      } else {
        // Use the tenant we already determined
        userProfileData.tenant = finalTenant;
      }

      // Try to upsert with trial_ends_at, if it fails (column doesn't exist), retry without it
      let { error: profileError } = await supabase
        .from("users")
        .upsert(userProfileData);

      // If error is about trial_ends_at column not existing, retry without it
      if (profileError && profileError.message?.includes("trial_ends_at")) {
        console.warn("trial_ends_at column does not exist, retrying without it");
        const { trial_ends_at, ...userProfileDataWithoutTrial } = userProfileData;
        const { error: retryError } = await supabase
          .from("users")
          .upsert(userProfileDataWithoutTrial);
        
        if (retryError) {
          throw new Error(retryError.message);
        }
      } else if (profileError) {
        throw new Error(profileError.message);
      }

      // Mark onboarding as complete locally
      complete();

      // Clear onboarding state
      localStorage.removeItem("onboarding-state");

      toast({
        title: "Welcome aboard! 🎉",
        description: isNewUser 
          ? "Your account has been created successfully! Redirecting to login..."
          : "Your account has been set up successfully. Let's get started!",
      });

      // Redirect to login for new users, dashboard for existing users
      if (isNewUser) {
        setTimeout(() => navigate("/login"), 1000);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Could not complete setup",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const completedSteps = [
    { title: "Business Profile", description: `${data.companyName} in ${data.industry}` },
    { title: "Use Case", description: "Customized dashboard and terminology" },
    { title: "Preferences", description: `${data.theme} UI with notifications ${data.notifications ? 'enabled' : 'disabled'}` },
  ];

  return (
    <div className="text-center space-y-[var(--space-2xl)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
        className="space-y-[var(--space-lg)]"
      >
        <div className="flex justify-center mb-[var(--space-lg)]">
          <div className="relative">
            <div className="p-[var(--space-lg)] liquid-glass-premium liquid-rounded-full">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="absolute -top-2 -right-2 p-2 liquid-glass-medium liquid-rounded-full"
            >
              <Sparkles className="h-4 w-4 text-primary" />
            </motion.div>
          </div>
        </div>

        <h1 className="text-[var(--text-3xl)] font-[var(--font-bold)] text-theme-primary">
          You're all set!
        </h1>
        
        <p className="text-[var(--text-lg)] text-theme-secondary max-w-2xl mx-auto leading-relaxed">
          Welcome to your personalized dashboard{(() => {
            const signupDataStr = localStorage.getItem("signup-data");
            if (signupDataStr) {
              const signupData = JSON.parse(signupDataStr);
              return `, ${signupData.name?.split(' ')[0] || 'there'}`;
            }
            return user?.fullName ? `, ${user.fullName.split(' ')[0]}` : '';
          })()}. 
          We've customized everything based on your preferences and business needs.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-md mx-auto space-y-[var(--space-md)]"
      >
        <h3 className="text-[var(--text-base)] font-[var(--font-semibold)] text-theme-primary mb-[var(--space-lg)]">
          Setup Complete
        </h3>
        
        {completedSteps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
            className="flex items-center gap-[var(--space-md)] p-[var(--space-md)] liquid-glass-light liquid-rounded-lg"
          >
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="text-left">
              <p className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                {step.title}
              </p>
              <p className="text-[var(--text-xs)] text-theme-secondary">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="pt-[var(--space-lg)]"
      >
        <Button
          onClick={handleComplete}
          size="lg"
          className="liquid-button px-[var(--space-3xl)] py-[var(--space-lg)] text-[var(--text-base)] font-[var(--font-medium)]"
        >
          Enter Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
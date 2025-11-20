import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/SupportAccessAuthContext";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  // Function to check onboarding status and redirect appropriately
  const checkOnboardingAndRedirect = useCallback(async () => {
    try {
      // Wait a moment for user data to be available
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        // If no user, go to login
        setTimeout(() => navigate("/login"), 1500);
        return;
      }

      // Check onboarding status from database
      const { data: userData, error } = await supabase
        .from("users")
        .select("onboarding_completed")
        .eq("id", currentUser.id)
        .single();

      // Check localStorage as fallback
      const localCompleted = localStorage.getItem("onboarding-completed") === "true";

      // Determine if onboarding is completed
      const onboardingCompleted = userData?.onboarding_completed === true || localCompleted;

      // Redirect based on onboarding status
      setTimeout(() => {
        if (onboardingCompleted) {
          navigate("/dashboard");
        } else {
          // Clear any stale localStorage flag
          localStorage.removeItem("onboarding-completed");
          navigate("/onboarding");
        }
      }, 1500);
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // On error, default to onboarding to be safe
      setTimeout(() => {
        localStorage.removeItem("onboarding-completed");
        navigate("/onboarding");
      }, 1500);
    }
  }, [navigate]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error in URL hash (Supabase puts errors in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get("error");
        const errorCode = hashParams.get("error_code");
        const errorDescription = hashParams.get("error_description");

        // If there's an error in the hash, handle it
        if (error) {
          console.error("Auth error:", error, errorCode, errorDescription);
          
          // Check if it's an expired link - try to resend verification
          if (errorCode === "otp_expired" || error === "access_denied") {
            setStatus("error");
            toast({
              title: "Link expired",
              description: "This verification link has expired. Please request a new one from the login page.",
              variant: "destructive",
            });
            setTimeout(() => {
              navigate("/login?expired=true");
            }, 2000);
            return;
          }
        }

        // Get the hash from URL (Supabase includes tokens in the hash)
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        // Also check query params (some flows use query params)
        const token = searchParams.get("token");
        const typeParam = searchParams.get("type");

        if (type === "recovery" || typeParam === "recovery") {
          // Password reset flow
          navigate("/reset-password");
          return;
        }

        if (accessToken && refreshToken) {
          // Set the session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Session error:", sessionError);
            throw sessionError;
          }

          // Update user profile to set is_active
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            await supabase
              .from('users')
              .update({ is_active: true })
              .eq('id', currentUser.id);
          }

          setStatus("success");
          toast({
            title: "Email confirmed!",
            description: "Your email has been successfully verified.",
          });

          // Check onboarding status before redirecting
          await checkOnboardingAndRedirect();
        } else if (token) {
          // Handle token-based confirmation (our custom token system)
          try {
            // Verify using our custom endpoint
            const apiUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${apiUrl}/api/v1/user/verify-email?token=${token}`, {
              method: 'GET',
              redirect: 'follow'
            });

            if (response.ok) {
              setStatus("success");
              toast({
                title: "Email confirmed!",
                description: "Your email has been successfully verified.",
              });
              await checkOnboardingAndRedirect();
            } else {
              throw new Error("Verification failed");
            }
          } catch (tokenError) {
            // Fallback to Supabase OTP verification
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: "email",
            });

            if (verifyError) {
              throw verifyError;
            }

            setStatus("success");
            toast({
              title: "Email confirmed!",
              description: "Your email has been successfully verified.",
            });

            await checkOnboardingAndRedirect();
          }
        } else {
          // No tokens found, might already be confirmed or invalid link
          setStatus("error");
          toast({
            title: "Invalid confirmation link",
            description: "This confirmation link is invalid or has expired.",
            variant: "destructive",
          });

          setTimeout(() => {
            navigate("/login");
          }, 2000);
        }
      } catch (error: any) {
        console.error("Auth callback error:", error);
        setStatus("error");
        toast({
          title: "Confirmation failed",
          description: error?.message || "An error occurred while confirming your email.",
          variant: "destructive",
        });

        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, toast, user, checkOnboardingAndRedirect]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Confirming your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-foreground font-medium">Email confirmed successfully!</p>
            <p className="text-muted-foreground text-sm mt-2">Setting up your account...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-foreground font-medium">Confirmation failed</p>
            <p className="text-muted-foreground text-sm mt-2">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}


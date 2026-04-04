import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/SupportAccessAuthContext";

// Use a module-level variable to prevent redundant processing across remounts in the same session
// (e.g. React 18 Strict Mode double-mounting)
let isProcessingGlobal = false;

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const processed = useRef(false);
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
        console.log("AuthCallback: No user found after exchange, redirecting to login");
        setTimeout(() => navigate("/login"), 1500);
        return;
      }

      // Check onboarding status from database with a few retries for first-time users
      let userData = null;
      let error = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        const { data, error: queryError } = await supabase
          .from("users")
          .select("onboarding_completed")
          .eq("id", currentUser.id)
          .single();

        userData = data;
        error = queryError;

        // If we found the user or it's a non-retriable error, break
        if (userData || (error && error.code !== 'PGRST116')) {
          break;
        }

        console.log(`AuthCallback: User profile not found, attempt ${attempts + 1}/${maxAttempts}. Waiting...`);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Only use localStorage as fallback when the DB query itself fails (network/timeout/not found after retries),
      // not when it succeeds but returns a user with onboarding_completed = false/null.
      const localCompleted = localStorage.getItem("onboarding-completed") === "true";
      const dbCompleted = (userData as any)?.onboarding_completed === true;

      // If the DB query had an error (including missing row after retries), fall back to localStorage
      // For a new user, both will likely be false, which correctly leads to /onboarding
      const onboardingCompleted = error ? localCompleted : dbCompleted;

      // Redirect based on onboarding status
      const savedReturnTo = sessionStorage.getItem("returnTo");
      const isInvitation = savedReturnTo?.includes("/accept-invitation");

      if (onboardingCompleted || isInvitation) {
        // If it's an invitation, proactively mark onboarding as complete in DB
        if (isInvitation && !onboardingCompleted) {
          console.log('AuthCallback: Invitation detected, marking onboarding as complete in DB');
          try {
            await supabase
              .from("users")
              .update({ onboarding_completed: true } as any)
              .eq("id", currentUser.id);
            localStorage.setItem("onboarding-completed", "true");
          } catch (dbError) {
            console.error("Error auto-completing onboarding for invitee:", dbError);
          }
        }

        if (savedReturnTo) {
          console.log('AuthCallback: Redirecting to saved returnTo:', savedReturnTo);
          sessionStorage.removeItem("returnTo");
          navigate(savedReturnTo);
        } else {
          navigate("/dashboard");
        }
      } else {
        // Clear any stale localStorage flag
        localStorage.removeItem("onboarding-completed");
        navigate("/onboarding");
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // On error, default to onboarding to be safe
      localStorage.removeItem("onboarding-completed");
      navigate("/onboarding");
    }
  }, [navigate]);

  useEffect(() => {
    // Guard against multiple executions (common in React Strict Mode or due to dependency updates)
    if (processed.current || isProcessingGlobal) {
      console.log("AuthCallback: Already processing, skipping redundant execution");
      return;
    }
    processed.current = true;
    isProcessingGlobal = true;

    const handleAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          console.log("AuthCallback: Detecting auth code, checking current session...");

          // Check if we already have a session (might have been handled by another mount/listener)
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            console.log("AuthCallback: Session already exists, skipping exchange");
            setStatus("success");
            await checkOnboardingAndRedirect();
            return;
          }

          console.log("AuthCallback: Exchanging code for session...");
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            // Handle the specific PKCE "both auth code and code verifier should be non-empty" error
            // which often happens in race conditions if the verifier was already consumed.
            if (exchangeError.message.includes("both auth code and code verifier should be non-empty")) {
              console.warn("AuthCallback: PKCE verifier already consumed or missing. Checking if session was established anyway...");
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                console.log("AuthCallback: Session found after PKCE error, proceeding.");
                setStatus("success");
                await checkOnboardingAndRedirect();
                return;
              }
            }

            console.error("AuthCallback: Exchange error:", exchangeError);
            throw exchangeError;
          }

          setStatus("success");
          toast({
            title: "Signed in with Google",
            description: "You've been successfully signed in.",
          });

          await checkOnboardingAndRedirect();
          return;
        }


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
        const token = url.searchParams.get("token");
        const typeParam = url.searchParams.get("type");

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
  }, [navigate, toast, checkOnboardingAndRedirect]);

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



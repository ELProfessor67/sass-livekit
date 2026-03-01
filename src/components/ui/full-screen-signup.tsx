import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Separator } from "@/components/ui/separator";

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms of Service & Privacy Policy"
  })
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export const FullScreenSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { websiteSettings } = useWebsiteSettings();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const acceptTerms = watch("acceptTerms");

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      // Clear any existing onboarding state when starting fresh signup
      localStorage.removeItem("onboarding-state");
      localStorage.removeItem("onboarding-completed");

      // Actually create the auth user now
      // This avoids having to call updateUser({ email }) later which triggers 429
      const { success, message } = await signUp("", data.email, data.password);

      if (!success) {
        throw new Error(message);
      }

      // Store email and password in localStorage for OnboardingComplete convenience (though we'll use session where possible)
      const signupData = {
        email: data.email,
        password: data.password,
      };

      localStorage.setItem("signup-data", JSON.stringify(signupData));

      // Redirect to onboarding
      toast({
        title: "Account created! 🎉",
        description: "Let's set up your profile.",
      });
      navigate("/onboarding");
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden p-4">
      <div className="w-full relative max-w-xl overflow-hidden flex flex-col shadow-xl rounded-2xl backdrop-blur-xl">

        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-background to-background/80 backdrop-blur-2xl rounded-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/5 to-primary/10 rounded-2xl" />

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-secondary/30 rounded-full blur-2xl" />
        <div className="absolute top-0 left-1/4 w-16 h-16 bg-accent/20 rounded-full blur-xl" />

        {/* Right Section - Sign Up Form */}
        <div className="p-8 md:p-12 w-full flex flex-col liquid-glass-light text-foreground relative rounded-2xl">
          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col items-start mb-8">
              <div className="text-primary mb-4">
                {websiteSettings?.logo ? (
                  <img
                    src={websiteSettings.logo}
                    alt={websiteSettings.website_name || "Logo"}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <img
                    src="/logo.png"
                    alt=""
                    className="h-10 w-auto object-contain"
                  />
                )}
              </div>
              <h2 className="text-3xl font-medium mb-2 tracking-tight">
                Get Started
              </h2>
              <p className="text-muted-foreground">
                Welcome to {websiteSettings?.website_name || "AI Call Center"} — Let's get started
              </p>
            </div>

            <GoogleSignInButton text="Sign up with Google" className="mb-4" />

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="block text-sm mb-2">
                  Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  className="w-full"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="block text-sm mb-2">
                  Create new password
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Create a password"
                    className="w-full pr-12"
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-accent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="acceptTerms"
                  checked={acceptTerms || false}
                  onCheckedChange={(checked) => setValue("acceptTerms", checked as boolean)}
                  className="mt-1"
                />
                <Label
                  htmlFor="acceptTerms"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <Link to="/terms" className="text-foreground underline hover:no-underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-foreground underline hover:no-underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-destructive text-xs">{errors.acceptTerms.message}</p>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create a new account"
                )}
              </Button>

              {/* Sign In Link */}
              <div className="text-center text-muted-foreground text-sm mt-4">
                Already have account?{" "}
                <Link to="/login" className="text-foreground font-medium underline hover:no-underline">
                  Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
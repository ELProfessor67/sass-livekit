import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { useWebsiteSettings } from "@/contexts/WebsiteSettingsContext";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional()
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn } = useAuth();
  const { websiteSettings } = useWebsiteSettings();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      console.log('Starting sign in process...');
      const result = await signIn(data.email, data.password);
      console.log('Sign in result:', result);

      if (result.success) {
        console.log('Sign in successful, navigating...');

        // Clear any stale signup data (user is logging in, so they already have an account)
        localStorage.removeItem("signup-data");

        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });
        const onboardingCompleted = localStorage.getItem("onboarding-completed") === "true";
        navigate(onboardingCompleted ? "/dashboard" : "/onboarding");
      } else {
        console.log('Sign in failed:', result.message);
        toast({
          title: "Sign in failed",
          description: result.message || "Please check your credentials and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Sign in failed",
        description: error?.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: `${provider} Sign In`,
      description: "Social login not configured yet.",
    });
  };

  const handleForgotPassword = async () => {
    const email = watch("email");
    if (!email) {
      toast({ title: "Enter your email", description: "Please enter your email above to receive a reset link." });
      return;
    }
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      toast({ title: "Reset email sent", description: "Check your inbox for the password reset link." });
    } catch (error: any) {
      toast({ title: "Reset failed", description: error?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-background/80">
      <div className="absolute inset-0 bg-[url('/src/assets/glass-bg.png')] bg-cover bg-center opacity-5 pointer-events-none" />

      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-2xl shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img
              src={websiteSettings?.logo || "/logo.png"}
              alt={websiteSettings?.website_name || "Logo"}
              className="h-16 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
            Welcome back
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your {websiteSettings?.website_name || "AI Call Center"} account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Social Login Options */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full bg-white/[0.04] border-white/[0.12] hover:bg-white/[0.08]"
              onClick={() => handleSocialLogin("Google")}
            >
              <Mail className="w-4 h-4 mr-2" />
              Continue with Google
            </Button>
            <Button
              variant="outline"
              className="w-full bg-white/[0.04] border-white/[0.12] hover:bg-white/[0.08]"
              onClick={() => handleSocialLogin("Microsoft")}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Continue with Microsoft
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe || false}
                  onCheckedChange={(checked) => setValue("rememberMe", checked as boolean)}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <a
              href="/signup"
              onClick={(e) => { e.preventDefault(); navigate("/signup"); }}
              className="text-primary hover:underline font-medium cursor-pointer"
              role="link"
            >
              Sign up
            </a>
          </div> */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link
              to="/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
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
import { useAuth } from "@/contexts/AuthContext";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  countryCode: z.string().min(1, "Please select a country code"),
  phone: z.string().min(6, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms of Service & Privacy Policy"
  })
});

type SignUpFormData = z.infer<typeof signUpSchema>;

const countryCodes = [
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+1", country: "Canada", flag: "🇨🇦" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "Korea", flag: "🇰🇷" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
];

export const FullScreenSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedCountry, setSelectedCountry] = React.useState<{ code: string; country: string; flag: string } | null>(countryCodes[0]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      countryCode: countryCodes[0].code
    }
  });

  const acceptTerms = watch("acceptTerms");

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      // Client-side check to prevent duplicate phone numbers
      const { data: existsRpc } = await supabase.rpc('phone_exists', {
        _phone: data.phone,
        _country: data.countryCode,
      });

      if (existsRpc === true) {
        toast({
          title: "Phone already in use",
          description: "An account with this phone number already exists.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const result = await signUp(
        data.name,
        data.email,
        data.password,
        { phone: data.phone, countryCode: data.countryCode }
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      // For now, just show success message and redirect
      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account.",
      });
      navigate("/login");
      return;

      if (!user) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to verify your account.",
        });
        navigate("/login");
        return;
      }

      if (session) {
        // Upsert full profile row only when we have a valid session (RLS)
        try {
          await supabase.from("users").upsert({
            id: user.id,
            name: data.name,
            contact: {
              email: data.email,
              phone: data.phone,
              countryCode: data.countryCode,
            },
            is_active: true,
          });
        } catch (e: any) {
          // If unique phone constraint is hit, show friendly message
          const message: string = e?.message || "";
          if (message.includes("users_unique_phone_country_idx") || message.includes("duplicate key value") || e?.code === "23505") {
            toast({
              title: "Phone already in use",
              description: "An account with this phone number already exists.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          // otherwise ignore
        }

        const onboardingCompleted = localStorage.getItem("onboarding-completed");
        if (onboardingCompleted === "true") {
          navigate("/");
          toast({ title: "Welcome! 🎉", description: "Account created successfully." });
        } else {
          navigate("/onboarding");
          toast({ title: "Account created! 🎉", description: "Let's set up your experience." });
        }
      } else {
        // Email confirmation required
        toast({
          title: "Confirm your email",
          description: "Please verify your email to continue.",
        });
        navigate("/login");
      }
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
      <div className="w-full relative max-w-5xl overflow-hidden flex flex-col md:flex-row shadow-xl rounded-2xl backdrop-blur-xl">
        
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-background to-background/80 backdrop-blur-2xl rounded-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/5 to-primary/10 rounded-2xl" />
        
        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-secondary/30 rounded-full blur-2xl" />
        <div className="absolute top-0 left-1/4 w-16 h-16 bg-accent/20 rounded-full blur-xl" />

        {/* Left Section - Brand/Features */}
        <div className="liquid-glass-medium text-foreground p-8 md:p-12 md:w-1/2 relative rounded-l-2xl overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-medium leading-tight tracking-tight mb-6">
              Design and dev partner for{" "}
              <span className="text-primary font-semibold">startups and founders</span>.
            </h1>
            
            <div className="space-y-4 mt-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Advanced AI-powered call analytics and insights
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Real-time monitoring and performance tracking
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Enterprise-grade security and compliance
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Sign Up Form */}
        <div className="p-8 md:p-12 md:w-1/2 flex flex-col liquid-glass-light text-foreground relative rounded-r-2xl">
          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col items-start mb-8">
              <div className="text-primary mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                  <div className="w-5 h-5 bg-white rounded-sm"></div>
                </div>
              </div>
              <h2 className="text-3xl font-medium mb-2 tracking-tight">
                Get Started
              </h2>
              <p className="text-muted-foreground">
                Welcome to AI Call Center — Let's get started
              </p>
            </div>

            {/* Form */}
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Full Name */}
              <div>
                <Label htmlFor="name" className="block text-sm mb-2">
                  Full Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  placeholder="Enter your full name"
                  className="w-full"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

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

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone" className="block text-sm mb-2">
                  Phone Number
                </Label>
                <div className="flex gap-3">
                  <Select 
                    value={selectedCountry?.code} 
                    onValueChange={(value) => {
                      const country = countryCodes.find(c => c.code === value);
                      setSelectedCountry(country || countryCodes[0]);
                      setValue("countryCode", value);
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue>
                        <span className="text-sm">{selectedCountry?.flag}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="liquid-glass-medium backdrop-blur-xl border-border bg-card z-50">
                      {countryCodes.map((country, index) => (
                        <SelectItem 
                          key={`${country.code}-${country.country}-${index}`} 
                          value={country.code}
                          className="hover:bg-accent focus:bg-accent"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <span>{country.flag}</span>
                            <span>{country.code}</span>
                            <span className="text-muted-foreground">{country.country}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone number"
                    className="flex-1"
                    {...register("phone")}
                  />
                </div>
                {errors.phone && (
                  <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>
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

              {/* Alternative Method */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground font-medium">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
              >
                Continue with email code
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
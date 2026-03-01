import React, { useState } from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, ShieldCheck } from "lucide-react";

const countryCodes = [
    { code: "+1", country: "United States", flag: "🇺🇸" },
    { code: "+1", country: "Canada", flag: "🇨🇦" },
    { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
    { code: "+33", country: "France", flag: "🇫🇷" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+39", country: "Italy", flag: "🇮🇹" },
    { code: "+34", country: "Spain", flag: "🇪🇸" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+55", country: "Brazil", flag: "🇧🇷" },
    { code: "+52", country: "Mexico", flag: "🇲🇽" },
];

export function PhoneVerificationStep() {
    const { data, updateData, nextStep, prevStep } = useOnboarding();
    const { user } = useAuth();
    const { toast } = useToast();
    const [phoneNumber, setPhoneNumber] = useState(data.phone || "");
    const [countryCode, setCountryCode] = useState(data.countryCode || countryCodes[0].code);
    const [otp, setOtp] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const selectedCountry = countryCodes.find(c => c.code === countryCode) || countryCodes[0];

    const handleSendOtp = async () => {
        if (phoneNumber.length < 6) {
            toast({
                title: "Invalid phone number",
                description: "Please enter a valid phone number.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const fullPhone = `${countryCode}${phoneNumber}`;

            // If the user is already logged in (from SignUp step), we update their profile
            // Otherwise we use signInWithOtp (fallback)
            const { error } = user
                ? await supabase.auth.updateUser({ phone: fullPhone })
                : await supabase.auth.signInWithOtp({ phone: fullPhone });

            if (error) throw error;

            setIsOtpSent(true);
            toast({
                title: "OTP Sent!",
                description: `We've sent a verification code to ${fullPhone}`,
            });
        } catch (error: any) {
            toast({
                title: "Failed to send OTP",
                description: error.message || "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            toast({
                title: "Invalid OTP",
                description: "Please enter the 6-digit code sent to your phone.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const fullPhone = `${countryCode}${phoneNumber}`;

            // If we are updating an existing user, use 'phone_change' type
            // If we are doing initial sign in, use 'sms' type
            const { error } = await supabase.auth.verifyOtp({
                phone: fullPhone,
                token: otp,
                type: user ? "phone_change" : "sms",
            });

            if (error) throw error;

            updateData({ phone: phoneNumber, countryCode: countryCode });
            toast({
                title: "Phone Verified!",
                description: "Your phone number has been successfully verified.",
            });
            nextStep();
        } catch (error: any) {
            toast({
                title: "Verification Failed",
                description: error.message || "The code you entered is incorrect.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="text-center max-w-xl mx-auto space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
            >
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        {isOtpSent ? (
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        ) : (
                            <Phone className="w-8 h-8 text-primary" />
                        )}
                    </div>
                </div>
                <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">
                    {isOtpSent ? "Enter verification code" : "Verify your phone"}
                </h1>
                <p className="text-lg text-gray-500 max-w-md mx-auto">
                    {isOtpSent
                        ? `We sent a 6-digit code to ${countryCode}${phoneNumber}`
                        : "We'll send you a one-time password to secure your account."}
                </p>
            </motion.div>

            <div className="space-y-6">
                {!isOtpSent ? (
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <Select
                                value={countryCode}
                                onValueChange={setCountryCode}
                            >
                                <SelectTrigger className="w-32 h-14 rounded-xl border-gray-200">
                                    <SelectValue>
                                        <span className="flex items-center gap-2">
                                            <span>{selectedCountry.flag}</span>
                                            <span>{selectedCountry.code}</span>
                                        </span>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="liquid-glass-medium backdrop-blur-xl border-border bg-card">
                                    {countryCodes.map((country, index) => (
                                        <SelectItem
                                            key={`${country.code}-${country.country}-${index}`}
                                            value={country.code}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>{country.flag}</span>
                                                <span>{country.code}</span>
                                                <span className="text-muted-foreground">{country.country}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="tel"
                                placeholder="Phone number"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                                className="h-14 flex-1 text-lg bg-white border-gray-200 rounded-xl px-4"
                            />
                        </div>
                        <Button
                            onClick={handleSendOtp}
                            disabled={isLoading || phoneNumber.length < 6}
                            className="w-full h-14 text-lg font-medium rounded-2xl bg-[#668cff] hover:bg-[#5a7ee6] transition-all duration-300 shadow-lg shadow-[#668cff]/20"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Send Code"}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Input
                            autoFocus
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            className="h-16 text-center text-3xl tracking-[0.5em] font-bold bg-white border-gray-200 rounded-xl"
                        />
                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleVerifyOtp}
                                disabled={isLoading || otp.length !== 6}
                                className="w-full h-14 text-lg font-medium rounded-2xl bg-green-500 hover:bg-green-600 transition-all duration-300 shadow-lg shadow-green-500/20"
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Continue"}
                            </Button>
                            <button
                                onClick={() => setIsOtpSent(false)}
                                className="text-sm text-gray-500 hover:text-primary transition-colors"
                                disabled={isLoading}
                            >
                                Change phone number
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={prevStep}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                >
                    Go back
                </button>
            </div>
        </div>
    );
}

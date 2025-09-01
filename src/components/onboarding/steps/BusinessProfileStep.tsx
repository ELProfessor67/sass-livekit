import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2 } from "lucide-react";

const schema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Please select an industry"),
  teamSize: z.string().min(1, "Please select team size"),
  role: z.string().min(1, "Please select your role"),
});

type FormData = z.infer<typeof schema>;

const industries = [
  "Technology", "Healthcare", "Finance", "Real Estate", "Education", 
  "E-commerce", "Manufacturing", "Consulting", "Marketing", "Legal", 
  "Non-profit", "Government", "Other"
];

const teamSizes = [
  "Just me", "2-10 people", "11-50 people", "51-200 people", 
  "201-1000 people", "1000+ people"
];

const roles = [
  "CEO/Founder", "Sales Manager", "Marketing Manager", "Operations Manager", 
  "Customer Success", "Business Development", "Account Manager", "Team Lead", 
  "Individual Contributor", "Other"
];

export function BusinessProfileStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: data.companyName,
      industry: data.industry,
      teamSize: data.teamSize,
      role: data.role,
    },
  });

  const onSubmit = (values: FormData) => {
    updateData(values);
    nextStep();
  };

  return (
    <div className="space-y-[var(--space-2xl)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-[var(--space-md)]"
      >
        <div className="flex justify-center mb-[var(--space-md)]">
          <div className="p-[var(--space-md)] liquid-glass-light liquid-rounded-full">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-[var(--text-2xl)] font-[var(--font-bold)] text-theme-primary">
          Tell us about your business
        </h2>
        <p className="text-[var(--text-base)] text-theme-secondary max-w-xl mx-auto">
          This helps us customize your experience and show the most relevant features for your industry and role.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-[var(--space-xl)]">
            <div className="grid gap-[var(--space-xl)]">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                      Company Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your company name"
                        className="liquid-glass-light border-white/10 focus:border-primary/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-[var(--space-lg)]">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                        Industry
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="liquid-glass-light border-white/10 focus:border-primary/30">
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="liquid-glass-medium border-white/10">
                          {industries.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                        Team Size
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="liquid-glass-light border-white/10 focus:border-primary/30">
                            <SelectValue placeholder="Select team size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="liquid-glass-medium border-white/10">
                          {teamSizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
                      Your Role
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="liquid-glass-light border-white/10 focus:border-primary/30">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="liquid-glass-medium border-white/10">
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-[var(--space-md)] pt-[var(--space-lg)]">
              <Button
                type="button"
                variant="ghost"
                onClick={prevStep}
                className="liquid-glass-light hover:liquid-glass-medium"
              >
                Back
              </Button>
              <Button
                type="submit"
                className="liquid-button flex-1"
              >
                Continue
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
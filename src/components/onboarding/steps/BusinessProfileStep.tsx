import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, Variants } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
};

const schema = z.object({
  companyName: z.string().min(1, "Business name is required"),
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
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: data.companyName || "",
      industry: data.industry || "",
      teamSize: data.teamSize || "",
      role: data.role || "",
    },
  });

  const onSubmit = (values: FormData) => {
    try {
      updateData(values);
      nextStep();
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const inputClassName = "h-11 bg-white hover:!bg-white focus:!bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-[#668cff] focus:ring-2 focus:ring-[#668cff]/20 transition-all duration-200";
  const labelClassName = "block text-sm font-medium text-gray-500 mb-2";

  const isFormValid = form.watch("companyName") && form.watch("industry") && form.watch("teamSize") && form.watch("role");

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center mb-8"
      >
        <motion.h1
          variants={itemVariants}
          className="text-3xl md:text-4xl font-light text-gray-900 mb-3"
        >
          Tell me a bit about your business
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-gray-500 text-lg"
        >
          This helps me tailor everything perfectly for you.
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <Label className={labelClassName}>What's your business called?</Label>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Acme Inc."
                      className={inputClassName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <Label className={labelClassName}>What industry are you in?</Label>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={inputClassName}>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                      {industries.map((industry) => (
                        <SelectItem
                          key={industry}
                          value={industry}
                          className="text-gray-900 hover:bg-gray-50 focus:bg-[#668cff] focus:text-white"
                        >
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="teamSize"
                render={({ field }) => (
                  <FormItem>
                    <Label className={labelClassName}>Team size?</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={inputClassName}>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                        {teamSizes.map((size) => (
                          <SelectItem
                            key={size}
                            value={size}
                            className="text-gray-900 hover:bg-gray-50 focus:bg-[#668cff] focus:text-white"
                          >
                            {size}
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
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <Label className={labelClassName}>Your role?</Label>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={inputClassName}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-[9999]">
                        {roles.map((role) => (
                          <SelectItem
                            key={role}
                            value={role}
                            className="text-gray-900 hover:bg-gray-50 focus:bg-[#668cff] focus:text-white"
                          >
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

            <div className="pt-4 space-y-3">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#668cff] hover:bg-[#5a7ee6] shadow-lg shadow-[#668cff]/25 hover:shadow-xl hover:shadow-[#668cff]/35 transition-all duration-300 font-medium text-white"
                disabled={!isFormValid}
              >
                Continue
              </Button>

              <button
                type="button"
                onClick={prevStep}
                className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Go back
              </button>
            </div>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
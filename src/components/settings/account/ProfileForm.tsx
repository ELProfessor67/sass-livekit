
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { Loader2 } from "lucide-react";

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters."
  }),
  email: z.string().email(),
  company: z.string().optional(),
  bio: z.string().max(160).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm() {
  const { toast } = useToast();
  const { user, updateProfile, loading } = useAuth();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.fullName || "",
      email: user?.email || "",
      company: user?.company || "",
      bio: user?.bio || "",
    },
    mode: "onChange",
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.fullName || "",
        email: user.email || "",
        company: user.company || "",
        bio: user.bio || "",
      });
    }
  }, [user, form]);

  async function onSubmit(data: ProfileFormValues) {
    try {
      // In our DB schema, 'fullName' is stored as 'name'
      // The updateProfile function in AuthContext currently expects Partial<User>
      // We'll pass the updates and the context handler will deal with the Supabase call
      await updateProfile({
        fullName: data.name,
        company: data.company,
        bio: data.bio,
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "There was an error updating your profile."
      });
    }
  }

  if (loading && !user) {
    return (
      <Card className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-2xl p-12 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-2xl">
      <CardHeader className="pb-6">
        <h3 className="text-xl font-medium text-foreground">Personal Information</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Update your personal information and how we can contact you
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email address" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Your company" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell us a little bit about yourself" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Brief description for your profile.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

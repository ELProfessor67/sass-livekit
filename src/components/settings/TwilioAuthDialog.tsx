import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  ThemedDialog,
  ThemedDialogTrigger,
  ThemedDialogContent,
  ThemedDialogHeader,
} from "@/components/ui/themed-dialog";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone } from "lucide-react";

const twilioFormSchema = z.object({
  accountSid: z.string().min(1, {
    message: "Twilio Account SID is required.",
  }),
  authToken: z.string().min(1, {
    message: "Twilio Auth Token is required.",
  }),
  label: z.string().min(1, {
    message: "Label is required.",
  }),
});

type TwilioFormValues = z.infer<typeof twilioFormSchema>;

interface TwilioAuthDialogProps {
  onSuccess?: (data: TwilioFormValues) => void;
  children?: React.ReactNode;
}

export function TwilioAuthDialog({ onSuccess, children }: TwilioAuthDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<TwilioFormValues>({
    resolver: zodResolver(twilioFormSchema),
    defaultValues: {
      accountSid: "",
      authToken: "",
      label: "",
    },
  });

  async function onSubmit(data: TwilioFormValues) {
    console.log("TwilioAuthDialog onSubmit called with data:", data);
    try {
      if (onSuccess) {
        console.log("Calling onSuccess callback...");
        await onSuccess(data);
        console.log("onSuccess callback completed successfully");
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error in TwilioAuthDialog onSubmit:", error);
      // optional toast
      toast({
        title: "Failed to save Twilio credentials",
        variant: "destructive",
      });
    }
  }

  return (
    <ThemedDialog open={open} onOpenChange={setOpen}>
      <ThemedDialogTrigger>
        {children || (
          <Button className="text-right inline-flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>Connect Twilio</span>
          </Button>
        )}
      </ThemedDialogTrigger>
      <ThemedDialogContent>
        <ThemedDialogHeader
          title="Connect Twilio Account"
          description="Enter your Twilio credentials to connect your account. A main trunk will be created automatically."
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="accountSid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Twilio Account SID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Twilio Account SID"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Twilio Auth Token</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Twilio Auth Token"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Label for Phone Number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-row justify-between gap-4 sm:justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Import from Twilio
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}

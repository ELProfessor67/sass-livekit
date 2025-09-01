
import { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone } from "lucide-react";

const twilioFormSchema = z.object({
  accountSid: z.string().min(1, {
    message: "Twilio Account SID is required."
  }),
  authToken: z.string().min(1, {
    message: "Twilio Auth Token is required."
  }),
  label: z.string().min(1, {
    message: "Label is required."
  })
});

type TwilioFormValues = z.infer<typeof twilioFormSchema>;

interface TwilioAuthDialogProps {
  onSuccess?: (data: TwilioFormValues) => void;
}

export function TwilioAuthDialog({
  onSuccess
}: TwilioAuthDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<TwilioFormValues>({
    resolver: zodResolver(twilioFormSchema),
    defaultValues: {
      accountSid: "",
      authToken: "",
      label: ""
    }
  });

  function onSubmit(data: TwilioFormValues) {
    toast({
      title: "Twilio credentials added",
      description: "Your Twilio account has been connected successfully."
    });
    if (onSuccess) {
      onSuccess(data);
    }
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-right inline-flex items-center space-x-2">
          <Phone className="h-4 w-4" />
          <span>Connect Twilio</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border border-border/40">
        <DialogHeader>
          <DialogTitle className="text-xl font-light tracking-tight">Connect Twilio Account</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your Twilio credentials to connect your account.
          </DialogDescription>
        </DialogHeader>
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
                      className="bg-background/50 border-border/60 focus:border-primary/40"
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
                      className="bg-background/50 border-border/60 focus:border-primary/40"
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
                      className="bg-background/50 border-border/60 focus:border-primary/40"
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
                className="border-border/60 hover:bg-background/80"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-primary hover:bg-primary/90"
              >
                Import from Twilio
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

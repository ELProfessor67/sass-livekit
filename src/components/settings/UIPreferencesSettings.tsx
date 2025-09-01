import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { Monitor, Palette, Sparkles, Layers } from "lucide-react";

const uiPreferencesSchema = z.object({
  uiStyle: z.enum(["glass", "minimal"]).default("glass"),
  theme: z.enum(["light", "dark", "system"]).default("system"),
});

type UIPreferencesValues = z.infer<typeof uiPreferencesSchema>;

const defaultValues: UIPreferencesValues = {
  uiStyle: "glass",
  theme: "system",
};

export function UIPreferencesSettings() {
  const { toast } = useToast();
  const { uiStyle, setUIStyle } = useTheme();
  
  const form = useForm<UIPreferencesValues>({
    resolver: zodResolver(uiPreferencesSchema),
    defaultValues: {
      uiStyle,
      theme: "system",
    },
  });

  function onSubmit(data: UIPreferencesValues) {
    setUIStyle(data.uiStyle);
    toast({
      title: "UI preferences updated",
      description: "Your interface preferences have been saved successfully."
    });
  }

  return (
    <Card className="backdrop-blur-xl bg-card/50 border border-border/50 rounded-2xl relative z-10">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">Interface Preferences</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Customize your dashboard appearance and behavior
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* UI Style Selection */}
            <FormField
              control={form.control}
              name="uiStyle"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Layers className="h-5 w-5 text-primary" />
                      <div>
                        <FormLabel className="text-lg font-medium text-foreground">Interface Style</FormLabel>
                        <FormDescription className="text-sm text-muted-foreground">
                          Choose your preferred visual design system
                        </FormDescription>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Glass UI Option */}
                      <div 
                        className={`
                          relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
                          ${field.value === "glass" 
                            ? 'border-primary bg-primary/5 shadow-lg' 
                            : 'border-border/50 bg-card/30 hover:border-border hover:bg-card/50'
                          }
                        `}
                        onClick={() => field.onChange("glass")}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xl border border-primary/20 flex items-center justify-center">
                              <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">Glass UI</h3>
                              <p className="text-sm text-muted-foreground">Modern glassmorphism design</p>
                            </div>
                          </div>
                          
                          {/* Preview */}
                          <div className="space-y-2">
                            <div className="h-8 rounded-lg backdrop-blur-xl bg-card/30 border border-border/50"></div>
                            <div className="h-6 rounded-md backdrop-blur-xl bg-card/20 border border-border/30 w-3/4"></div>
                            <div className="h-4 rounded backdrop-blur-xl bg-card/10 border border-border/20 w-1/2"></div>
                          </div>
                        </div>
                        
                        {field.value === "glass" && (
                          <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-primary-foreground"></div>
                          </div>
                        )}
                      </div>

                      {/* Minimal Option */}
                      <div 
                        className={`
                          relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
                          ${field.value === "minimal" 
                            ? 'border-primary bg-primary/5 shadow-lg' 
                            : 'border-border/50 bg-card/30 hover:border-border hover:bg-card/50'
                          }
                        `}
                        onClick={() => field.onChange("minimal")}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                              <Monitor className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">Minimal</h3>
                              <p className="text-sm text-muted-foreground">Clean and focused interface</p>
                            </div>
                          </div>
                          
                          {/* Preview */}
                          <div className="space-y-2">
                            <div className="h-8 rounded-lg bg-card border border-border"></div>
                            <div className="h-6 rounded-md bg-muted/50 w-3/4"></div>
                            <div className="h-4 rounded bg-muted/30 w-1/2"></div>
                          </div>
                        </div>
                        
                        {field.value === "minimal" && (
                          <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-primary-foreground"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {/* Color Theme Selection */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Color Theme</p>
                    <p className="text-sm text-muted-foreground">
                      Choose between light, dark, or system preference
                    </p>
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button type="submit" className="px-8 relative z-10 pointer-events-auto">
                Save Preferences
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
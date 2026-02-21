import React from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Palette, Bell } from "lucide-react";

const goalOptions = [
  { id: "improve_conversion", label: "Improve conversion rates" },
  { id: "track_performance", label: "Track team performance" },
  { id: "analyze_calls", label: "Analyze call quality" },
  { id: "automate_reporting", label: "Automate reporting" },
  { id: "train_team", label: "Train team members" },
  { id: "scale_operations", label: "Scale operations" }
];

export function PreferencesStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const { uiStyle, theme, setUIStyle } = useTheme();

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? "glass" : "minimal";
    updateData({ theme: newTheme });
    setUIStyle(newTheme as "glass" | "minimal");
  };

  const handleNotificationChange = (checked: boolean) => {
    updateData({ notifications: checked });
  };

  const handleGoalToggle = (goalId: string) => {
    const currentGoals = data.goals || [];
    const updatedGoals = currentGoals.includes(goalId)
      ? currentGoals.filter(id => id !== goalId)
      : [...currentGoals, goalId];
    updateData({ goals: updatedGoals });
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
          <Settings className="h-10 w-10 text-[#668cff]" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Customize your experience
        </h2>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Set your preferences and let us know what you want to achieve with the platform.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="space-y-[var(--space-2xl)]"
      >
        {/* UI Theme */}
        <div className="p-[var(--space-xl)] bg-white/60 border-2 border-gray-100 rounded-xl space-y-[var(--space-lg)]">
          <div className="flex items-center gap-[var(--space-md)]">
            <Palette className="h-5 w-5 text-[#668cff]" />
            <h3 className="text-lg font-semibold text-gray-900">
              Interface Style
            </h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-900">
                Glass UI Style
              </Label>
              <p className="text-xs text-gray-500">
                Enable modern glassmorphism effects for a premium look
              </p>
            </div>
            <Switch
              checked={data.theme === "glass"}
              onCheckedChange={handleThemeChange}
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="p-[var(--space-xl)] bg-white/60 border-2 border-gray-100 rounded-xl space-y-[var(--space-lg)]">
          <div className="flex items-center gap-[var(--space-md)]">
            <Bell className="h-5 w-5 text-[#668cff]" />
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications
            </h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-900">
                Email Notifications
              </Label>
              <p className="text-xs text-gray-500">
                Get updates about your account and important events
              </p>
            </div>
            <Switch
              checked={data.notifications}
              onCheckedChange={handleNotificationChange}
            />
          </div>
        </div>

        {/* Goals */}
        <div className="p-[var(--space-xl)] bg-white/60 border-2 border-gray-100 rounded-xl space-y-[var(--space-lg)]">
          <h3 className="text-lg font-semibold text-gray-900">
            What do you want to achieve?
          </h3>
          <p className="text-sm text-gray-500">
            Select all that apply to help us provide relevant insights and recommendations.
          </p>

          <div className="grid md:grid-cols-2 gap-[var(--space-md)]">
            {goalOptions.map((goal) => (
              <div key={goal.id} className="flex items-center space-x-[var(--space-md)]">
                <Checkbox
                  id={goal.id}
                  checked={(data.goals || []).includes(goal.id)}
                  onCheckedChange={() => handleGoalToggle(goal.id)}
                  className="border-gray-300 text-[#668cff] focus:ring-[#668cff]"
                />
                <Label
                  htmlFor={goal.id}
                  className="text-sm font-normal text-gray-700 cursor-pointer"
                >
                  {goal.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="flex gap-[var(--space-md)] pt-[var(--space-lg)]">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          className="h-12 px-8 rounded-xl border-2 border-gray-100 hover:bg-gray-50 text-gray-600 font-medium"
        >
          Back
        </Button>
        <Button
          onClick={nextStep}
          className="h-12 flex-1 rounded-xl bg-[#668cff] hover:bg-[#5a7ee6] shadow-lg shadow-[#668cff]/25 hover:shadow-xl hover:shadow-[#668cff]/35 transition-all duration-300 font-medium text-white"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
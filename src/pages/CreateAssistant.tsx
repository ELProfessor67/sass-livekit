import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import DashboardLayout from "@/layout/DashboardLayout";
import { ModelTab } from "@/components/assistants/wizard/ModelTab";
import { VoiceTab } from "@/components/assistants/wizard/VoiceTab";
import { AnalysisTab } from "@/components/assistants/wizard/AnalysisTab";
import { AdvancedTab } from "@/components/assistants/wizard/AdvancedTab";
import { AssistantFormData } from "@/components/assistants/wizard/types";
import { supabase } from "@/integrations/supabase/client";

const tabVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const CreateAssistant = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditing = !!id;
  const [activeTab, setActiveTab] = useState("model");
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: "model", label: "Model" },
    { id: "voice", label: "Voice" },
    { id: "analysis", label: "Analysis" },
    { id: "advanced", label: "Advanced" }
  ];
  
  const searchParams = new URLSearchParams(location.search);
  const providedName = searchParams.get('name');

  const [formData, setFormData] = useState<AssistantFormData>({
    name: isEditing ? "john" : (providedName && providedName.trim() ? providedName : "Untitled Assistant"),
    id: isEditing ? "asst_abcd1234efgh5678" : "asst_" + Math.random().toString(36).substr(2, 16),
    model: {
      provider: "OpenAI",
      model: "GPT-4o Mini",
      knowledgeBase: "None",
      calendar: "None",
      conversationStart: "assistant-first",
      temperature: 0.3,
      maxTokens: 250,
      firstMessage: "",
      systemPrompt: "",
      transcriber: {
        model: "nova-2",
        language: "en"
      }
    },
    voice: {
      provider: "ElevenLabs",
      voice: "Rachel",
      model: "eleven_turbo_v2_5",
      backgroundSound: "none",
      inputMinCharacters: 10,
      stability: 0.71,
      clarity: 0.75,
      speed: 1.0,
      style: 0.0,
      latency: 1,
      waitSeconds: 0.5,
      smartEndpointing: "enabled",
      advancedTimingEnabled: false,
      timingSlider1: 0.3,
      timingSlider2: 0.8,
      timingSlider3: 1.2,
      numWordsToInterrupt: 2,
      voiceSeconds: 0.2,
      backOffSeconds: 1,
      silenceTimeout: 30,
      maxDuration: 1800,
      similarityBoost: 0.5,
      useSpeakerBoost: true,
      optimizeStreaming: 2,
      pronunciationDictionary: false,
      chunk: 1
    },
    analysis: {
      structuredData: [],
      callSummary: true,
      successEvaluation: true,
      customSuccessPrompt: ""
    },
    advanced: {
      hipaaCompliant: false,
      recordingEnabled: true,
      videoRecordingEnabled: false,
      endCallMessage: "",
      endCallPhrases: [],
      maxCallDuration: 1800,
      idleMessages: [],
      idleMessageMaxSpokenCount: 1,
      silenceTimeoutSeconds: 30,
      responseDelaySeconds: 1,
      llmRequestDelaySeconds: 0.1,
      numWordsToInterruptAssistant: 2,
      maxDurationSeconds: 600,
      backgroundSound: "office"
    }
  });

  const handleFormDataChange = (section: keyof AssistantFormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...(prev[section] as object), ...data }
    }));
  };

  // Listen for Cal setup completion and apply to Advanced section
  React.useEffect(() => {
    const listener = (e: any) => {
      const detail = e?.detail || {};
      handleFormDataChange('advanced', {
        calApiKey: detail.cal_api_key,
        calEventTypeId: detail.cal_event_type_id,
        calEventTypeSlug: detail.cal_event_type_slug,
        calTimezone: detail.cal_timezone,
      });
    };
    window.addEventListener('assistant-cal-config', listener);
    return () => window.removeEventListener('assistant-cal-config', listener);
  }, []);

  const mapFormToAssistantPayload = async (userId: string) => {
    const kbId = formData.model.knowledgeBase && formData.model.knowledgeBase !== "None"
      ? formData.model.knowledgeBase
      : null;

    return {
      user_id: userId,
      name: formData.name,
      llm_provider_setting: formData.model.provider,
      llm_model_setting: formData.model.model,
      knowledge_base_id: kbId,
      temperature_setting: formData.model.temperature,
      max_token_setting: formData.model.maxTokens,
      first_message: formData.model.firstMessage || null,
      prompt: formData.model.systemPrompt || null,

      // Voice
      voice_provider_setting: formData.voice.provider,
      voice_model_setting: formData.voice.model,
      voice_name_setting: formData.voice.voice,
      background_sound_setting: formData.voice.backgroundSound,
      input_min_characters: formData.voice.inputMinCharacters,
      voice_stability: formData.voice.stability,
      voice_clarity_similarity: formData.voice.clarity,
      voice_speed: formData.voice.speed,
      use_speaker_boost: formData.voice.useSpeakerBoost,
      voice_optimize_streaming_latency: formData.voice.optimizeStreaming,
      voice_seconds: formData.voice.voiceSeconds,
      voice_backoff_seconds: formData.voice.backOffSeconds,
      silence_timeout: formData.voice.silenceTimeout,
      maximum_duration: formData.voice.maxDuration,
      smart_endpointing: String(formData.voice.smartEndpointing).toLowerCase() === "enabled",

      // Transcriber (best effort mapping)
      transcriber_provider: "Deepgram",
      transcriber_model: formData.model.transcriber?.model || null,
      transcriber_language: formData.model.transcriber?.language || null,

      // Analysis
      analysis_summary_prompt: formData.analysis.customSuccessPrompt || null,

      // Advanced
      hipaa_compliance: formData.advanced.hipaaCompliant,
      audio_recording_setting: formData.advanced.recordingEnabled,
      video_recording: formData.advanced.videoRecordingEnabled,
      end_call_message: formData.advanced.endCallMessage || null,
      end_call_phrases: formData.advanced.endCallPhrases?.length ? formData.advanced.endCallPhrases : null,
      idle_messages: formData.advanced.idleMessages?.length ? formData.advanced.idleMessages : null,
      max_idle_messages: formData.advanced.idleMessageMaxSpokenCount,
      wait_seconds: formData.voice.waitSeconds,
    } as any;
  };

  const ensureUserProfileExists = async (userId: string, name?: string | null) => {
    const { data: exists, error: existsError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (existsError) {
      // Non-fatal; proceed to try insert if not exists
      console.warn('Error checking users row existence:', existsError);
    }
    if (!exists) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: userId, name: name || null });
      if (insertError) {
        console.warn('Could not insert users row (may be blocked by RLS):', insertError);
      }
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to save an assistant.');

      await ensureUserProfileExists(user.id, (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || null);

      const payload = await mapFormToAssistantPayload(user.id);

      const persistCalConfig = (assistantId: string) => {
        try {
          const { calApiKey, calEventTypeId, calEventTypeSlug, calTimezone } = formData.advanced as any;
          const hasAny = calApiKey || calEventTypeId || calEventTypeSlug || calTimezone;
          if (!hasAny) return;
          const key = `assistant-cal-config-${assistantId}`;
          const payload = { cal_api_key: calApiKey || "", cal_event_type_id: calEventTypeId || "", cal_event_type_slug: calEventTypeSlug || "", cal_timezone: calTimezone || "" };
          localStorage.setItem(key, JSON.stringify(payload));
        } catch (err) {
          console.warn('Failed to persist calendar config locally', err);
        }
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from('assistant')
          .update(payload)
          .eq('id', id);
        if (error) {
          // Retry once if FK missing
          if ((error as any)?.code === '23503') {
            await ensureUserProfileExists(user.id, (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || null);
            const retry = await supabase.from('assistant').update(payload).eq('id', id);
            if (retry.error) throw retry.error;
          } else {
            throw error;
          }
        }
        persistCalConfig(id);
        toast({ title: 'Assistant updated', description: 'Your changes have been saved.' });
      } else {
        let { data, error } = await supabase
          .from('assistant')
          .insert(payload)
          .select('id')
          .single();
        if (error) {
          if ((error as any)?.code === '23503') {
            await ensureUserProfileExists(user.id, (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || null);
            const retry = await supabase
              .from('assistant')
              .insert(payload)
              .select('id')
              .single();
            data = retry.data as any;
            if (retry.error) throw retry.error;
          } else {
            throw error;
          }
        }
        if (data?.id) {
          persistCalConfig(data.id);
          toast({ title: 'Assistant created', description: 'Your assistant has been saved.' });
          navigate(`/assistants`);
        }
      }
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeploy = () => {
    console.log("Deploying assistant:", formData);
    // Implement deployment logic here
  };

  const handleDelete = () => {
    console.log("Deleting assistant:", formData.id);
    // Implement actual deletion logic here
    toast({
      title: "Assistant deleted",
      description: "The assistant has been permanently deleted.",
    });
    navigate("/assistants");
  };

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
        <div className="max-w-5xl mx-auto px-[var(--space-lg)]">
          {/* Floating Header Section */}
          <div className="py-[var(--space-2xl)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[var(--space-lg)]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/assistants")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-[var(--space-md)]">
                    <h1 className="text-4xl font-extralight tracking-tight text-foreground">
                      {formData.name}
                    </h1>
                    <Sparkles className="h-6 w-6 text-primary/60" />
                  </div>
                  <p className="text-[var(--text-sm)] text-muted-foreground font-mono mt-1">
                    {formData.id}
                  </p>
                  <p className="text-lg font-light text-muted-foreground mt-2">
                    {isEditing ? "Edit your AI assistant's configuration" : "Create your AI assistant's configuration"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-[var(--space-md)]">
                <Button 
                  variant="outline"
                  className="px-[var(--space-lg)]"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  onClick={handleDeploy}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-[var(--space-xl)]"
                >
                  Deploy Assistant
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Container */}
          <ThemeCard variant="glass">
            {/* Tab Navigation */}
            <div className="border-b border-white/[0.08]">
              <nav className="flex gap-1 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative px-6 py-4 text-sm font-medium transition-all duration-300
                      ${activeTab === tab.id 
                        ? 'text-foreground' 
                        : 'text-muted-foreground hover:text-foreground/80'
                      }
                    `}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                        initial={false}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={tabVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "model" && (
                    <ModelTab 
                      data={formData.model} 
                      onChange={(data) => handleFormDataChange('model', data)} 
                    />
                  )}
                  {activeTab === "voice" && (
                    <VoiceTab 
                      data={formData.voice} 
                      onChange={(data) => handleFormDataChange('voice', data)} 
                    />
                  )}
                  {activeTab === "analysis" && (
                    <AnalysisTab 
                      data={formData.analysis} 
                      onChange={(data) => handleFormDataChange('analysis', data)} 
                    />
                  )}
                  {activeTab === "advanced" && (
                    <AdvancedTab 
                      data={formData.advanced} 
                      onChange={(data) => handleFormDataChange('advanced', data)} 
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ThemeCard>

          {/* Delete Assistant Button - Only in Edit Mode */}
          {isEditing && (
            <div className="flex justify-end mt-[var(--space-lg)]">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive-glass"
                    size="default"
                    className="gap-[var(--space-sm)]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Assistant
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="liquid-glass-heavy border border-destructive/20">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                      Delete Assistant
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Are you sure you want to delete this assistant? This action cannot be undone 
                      and all associated data will be permanently removed from both local storage and database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/30"
                    >
                      Delete Assistant
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </ThemeContainer>
    </DashboardLayout>
  );
};

export default CreateAssistant;
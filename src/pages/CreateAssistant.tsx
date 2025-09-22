import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Trash2, Edit3 } from "lucide-react";
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
import { N8nTab } from "@/components/assistants/wizard/N8nTab";
import { AssistantFormData } from "@/components/assistants/wizard/types";
import { useAuth } from "@/contexts/AuthContext";
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
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Debug logging
  console.log('CreateAssistant rendered', { isEditing, id, isLoading, activeTab });
  
  // Debug tab switching
  const handleTabClick = (tabId: string) => {
    console.log('Tab clicked:', tabId);
    setActiveTab(tabId);
  };

  const tabs = [
    { id: "model", label: "Model" },
    { id: "voice", label: "Voice" },
    { id: "analysis", label: "Analysis" },
    { id: "advanced", label: "Advanced" },
    { id: "n8n", label: "n8n" }
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
      backgroundSound: "office",
      firstSms: "",
      smsPrompt: "",
      whatsappNumber: "",
      whatsappKey: ""
    },
    n8n: {
      webhookUrl: "",
      webhookFields: []
    }
  });

  const handleFormDataChange = (section: keyof AssistantFormData, data: any) => {
    console.log('Form data change:', section, data);
    setFormData(prev => ({
      ...prev,
      [section]: { ...(prev[section] as object), ...data }
    }));
  };



  // Load existing assistant data when editing
  useEffect(() => {
    const loadExistingAssistant = async () => {
      if (!isEditing || !id) return;
      
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('assistant')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Failed to load assistant:', error);
          toast({
            title: 'Error',
            description: 'Failed to load assistant data. Please try again.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        if (data) {
          // Map database data to form data
          setFormData({
            name: data.name || "Untitled Assistant",
            id: data.id,
            model: {
              provider: data.llm_provider_setting || "OpenAI",
              model: data.llm_model_setting || "GPT-4o Mini",
              knowledgeBase: data.knowledge_base_id || "None",
              calendar: "None", // Not stored in DB yet
              conversationStart: "assistant-first",
              temperature: data.temperature_setting || 0.3,
              maxTokens: data.max_token_setting || 250,
              firstMessage: data.first_message || "",
              systemPrompt: data.prompt || "",
              transcriber: {
                model: data.transcriber_model || "nova-2",
                language: data.transcriber_language || "en"
              }
            },
            voice: {
              provider: data.voice_provider_setting || "ElevenLabs",
              voice: data.voice_name_setting || "Rachel",
              model: data.voice_model_setting || "eleven_turbo_v2_5",
              backgroundSound: data.background_sound_setting || "none",
              inputMinCharacters: data.input_min_characters || 10,
              stability: data.voice_stability || 0.71,
              clarity: data.voice_clarity_similarity || 0.75,
              speed: 1.0,
              style: 0.0,
              latency: 1,
              waitSeconds: data.wait_seconds || 0.5,
              smartEndpointing: data.smart_endpointing ? "enabled" : "disabled",
              advancedTimingEnabled: false,
              timingSlider1: 0.3,
              timingSlider2: 0.8,
              timingSlider3: 1.2,
              numWordsToInterrupt: 2,
              voiceSeconds: data.voice_seconds || 0.2,
              backOffSeconds: data.voice_backoff_seconds || 1,
              silenceTimeout: data.silence_timeout || 30,
              maxDuration: data.maximum_duration || 1800,
              similarityBoost: 0.5,
              useSpeakerBoost: data.use_speaker_boost || true,
              optimizeStreaming: data.voice_optimize_streaming_latency || 2,
              pronunciationDictionary: false,
              chunk: 1
            },
            analysis: {
              structuredData: [],
              callSummary: true,
              successEvaluation: true,
              customSuccessPrompt: data.analysis_summary_prompt || ""
            },
            advanced: {
              hipaaCompliant: data.hipaa_compliance || false,
              recordingEnabled: data.audio_recording_setting || true,
              videoRecordingEnabled: data.video_recording || false,
              endCallMessage: data.end_call_message || "",
              endCallPhrases: Array.isArray(data.end_call_phrases) ? data.end_call_phrases.filter(item => typeof item === 'string') : [],
              maxCallDuration: 1800,
              idleMessages: Array.isArray(data.idle_messages) ? data.idle_messages.filter(item => typeof item === 'string') : [],
              idleMessageMaxSpokenCount: 1,
              silenceTimeoutSeconds: 30,
              responseDelaySeconds: 1,
              llmRequestDelaySeconds: 0.1,
              numWordsToInterruptAssistant: 2,
              maxDurationSeconds: 600,
              backgroundSound: "office",
              firstSms: data.first_sms || "",
              smsPrompt: data.sms_prompt || "",
              whatsappNumber: (data as any).whatsapp_number || "",
              whatsappKey: (data as any).whatsapp_key || ""
            },
            n8n: {
              webhookUrl: (data as any).n8n_webhook_url || "",
              webhookFields: Array.isArray((data as any).n8n_webhook_fields) ? (data as any).n8n_webhook_fields : []
            }
          });

          // Load Cal.com config from database
          if (data.cal_api_key || data.cal_event_type_id || data.cal_event_type_slug || data.cal_timezone) {
            handleFormDataChange('advanced', {
              calApiKey: data.cal_api_key,
              calEventTypeId: data.cal_event_type_id,
              calEventTypeSlug: data.cal_event_type_slug,
              calTimezone: data.cal_timezone,
            });
          }
        }
      } catch (error) {
        console.error('Error loading assistant:', error);
        toast({
          title: 'Error',
          description: 'Failed to load assistant data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadExistingAssistant();
  }, [isEditing, id, toast]);

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

      // SMS fields
      first_sms: formData.advanced.firstSms || null,
      sms_prompt: formData.advanced.smsPrompt || null,

      // WhatsApp Business fields
      whatsapp_number: formData.advanced.whatsappNumber || null,
      whatsapp_key: formData.advanced.whatsappKey || null,

      // Cal.com Integration
      cal_api_key: (formData.advanced as any).calApiKey || null,
      cal_event_type_id: (formData.advanced as any).calEventTypeId || null,
      cal_event_type_slug: (formData.advanced as any).calEventTypeSlug || null,
      cal_timezone: (formData.advanced as any).calTimezone || null,

      // n8n Integration
      n8n_webhook_url: formData.n8n.webhookUrl || null,
      n8n_webhook_fields: formData.n8n.webhookFields?.length ? formData.n8n.webhookFields : null,
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
      if (!user?.id) throw new Error('You must be signed in to save an assistant.');

      await ensureUserProfileExists(user.id, user.fullName || null);

      const payload = await mapFormToAssistantPayload(user.id);



      if (isEditing && id) {
        const { error } = await supabase
          .from('assistant')
          .update(payload)
          .eq('id', id);
        if (error) {
          // Retry once if FK missing
          if ((error as any)?.code === '23503') {
            await ensureUserProfileExists(user.id, user.fullName || null);
            const retry = await supabase.from('assistant').update(payload).eq('id', id);
            if (retry.error) throw retry.error;
          } else {
            throw error;
          }
        }
        toast({ title: 'Assistant updated', description: 'Your changes have been saved.' });
        navigate('/assistants');
      } else {
        let { data, error } = await supabase
          .from('assistant')
          .insert(payload)
          .select('id')
          .single();
        if (error) {
          if ((error as any)?.code === '23503') {
            await ensureUserProfileExists(user.id, user.fullName || null);
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
                      {isLoading ? "Loading..." : formData.name}
                    </h1>
                    {isEditing ? (
                      <Edit3 className="h-6 w-6 text-primary/60" />
                    ) : (
                      <Sparkles className="h-6 w-6 text-primary/60" />
                    )}
                  </div>
                  <p className="text-[var(--text-sm)] text-muted-foreground font-mono mt-1">
                    {isLoading ? "..." : formData.id}
                  </p>
                  <p className="text-lg font-light text-muted-foreground mt-2">
                    {isEditing ? `Editing "${formData.name}" - Modify your AI assistant's configuration` : "Create your AI assistant's configuration"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-[var(--space-md)]">
                <Button 
                  variant="outline"
                  className="px-[var(--space-lg)]"
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  onClick={handleDeploy}
                  disabled={isLoading}
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
                    onClick={() => handleTabClick(tab.id)}
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
             
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading assistant configuration...</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    variants={tabVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    style={{ pointerEvents: 'auto' }}
                    className="pointer-events-auto"
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
                    {activeTab === "n8n" && (
                      <N8nTab 
                        data={formData.n8n} 
                        onChange={(data) => handleFormDataChange('n8n', data)} 
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
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
                    disabled={isLoading}
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
// import { useEffect, useMemo, useState } from "react";
// import DashboardLayout from "@/layout/DashboardLayout";
// import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
// import { Button } from "@/components/ui/button";
// import { LiveKitRoom, RoomAudioRenderer, StartAudio, TrackToggle, useLocalParticipant, useRoomContext } from "@livekit/components-react";
// import { DataPacket_Kind } from "livekit-client";
// import "@livekit/components-styles";
// import { useLocation, useNavigate } from "react-router-dom";
// import { createLivekitToken } from "@/lib/api/apiService";
// import { supabase } from "@/integrations/supabase/client";
// import { useAuth } from "@/contexts/SupportAccessAuthContext";

// export default function VoiceAgent() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { user } = useAuth();
//   const [token, setToken] = useState<string | null>(null);
//   const [serverUrl, setServerUrl] = useState<string>("");
//   const [connecting, setConnecting] = useState(false);
//   const [assistant, setAssistant] = useState<any>(null);

//   const assistantId = useMemo(() => {
//     const params = new URLSearchParams(location.search);
//     return params.get("assistantId");
//   }, [location.search]);

//   useEffect(() => {
//     const url = (import.meta.env.VITE_LIVEKIT_URL || (import.meta.env.LIVEKIT_URL as string | undefined)) as string | undefined;
//     console.log("url", url)
//     if (url) setServerUrl(url);
//   }, []);

//   useEffect(() => {
//     const loadAssistant = async () => {
//       if (!user?.id) {
//         console.error("User not authenticated");
//         navigate("/login");
//         return;
//       }

//       if (!assistantId) {
//         setAssistant(null);
//         return;
//       }
//       const { data, error } = await supabase
//         .from('assistant')
//         .select('id, name, prompt, first_message, llm_provider_setting, llm_model_setting, temperature_setting, max_token_setting, voice_provider_setting, voice_model_setting, voice_name_setting, background_sound_setting, wait_seconds, smart_endpointing, cal_api_key, cal_event_type_id, cal_event_type_slug, cal_timezone')
//         .eq('id', assistantId)
//         .eq('user_id', user.id) // Ensure user owns this assistant
//         .maybeSingle();
//       if (error) {
//         // eslint-disable-next-line no-console
//         console.warn('Failed to load assistant details:', error);
//         setAssistant(null);
//       } else {
//         setAssistant(data);
//       }
//     };
//     void loadAssistant();
//   }, [assistantId, navigate]);

//   const handleConnect = async () => {
//     if (!user?.id) {
//       console.error("User not authenticated");
//       navigate("/login");
//       return;
//     }

//     setConnecting(true);
//     try {
//       const tokenPayload = await createLivekitToken({
//         metadata: {
//           assistantId: assistantId || undefined,
//           assistant: assistant
//             ? {
//               id: assistant.id,
//               name: assistant.name,
//               prompt: assistant.prompt,
//               firstMessage: assistant.first_message,
//               modelProvider: assistant.llm_provider_setting,
//               model: assistant.llm_model_setting,
//               temperature: assistant.temperature_setting,
//               maxTokens: assistant.max_token_setting,
//               voiceProvider: assistant.voice_provider_setting,
//               voiceModel: assistant.voice_model_setting,
//               voiceName: assistant.voice_name_setting,
//               backgroundSound: assistant.background_sound_setting,
//               waitSeconds: assistant.wait_seconds,
//               smartEndpointing: assistant.smart_endpointing,
//               cal_api_key: assistant.cal_api_key,
//               cal_event_type_id: assistant.cal_event_type_id,
//               cal_event_type_slug: assistant.cal_event_type_slug,
//               cal_timezone: assistant.cal_timezone,
//             }
//             : undefined,
//           // Top-level fields to match agent expectations
//           prompt: assistant?.prompt,
//           instructions: assistant?.prompt,
//           first_message: assistant?.first_message,
//           assistant_name: assistant?.name,
//           cal_api_key: assistant?.cal_api_key,
//           cal_event_type_id: assistant?.cal_event_type_id,
//           cal_event_type_slug: assistant?.cal_event_type_slug,
//           cal_timezone: assistant?.cal_timezone,
//         },
//       });
//       console.log("token payload", tokenPayload)
//       if (tokenPayload?.accessToken) setToken(tokenPayload.accessToken);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setConnecting(false);
//     }
//   };

//   const handleDisconnect = () => {
//     setToken(null);
//   };

//   const AutoMic: React.FC = () => {
//     const { localParticipant } = useLocalParticipant();
//     useEffect(() => {
//       // Try enabling mic on mount; browser will prompt for permission.
//       localParticipant?.setMicrophoneEnabled(true).catch(() => {
//         // ignored; user may deny or need manual toggle
//       });
//     }, [localParticipant]);
//     return (
//       <div className="flex items-center gap-2 mt-3">
//         <TrackToggle source="microphone">
//           {(enabled) => {
//             return (
//               <Button variant={enabled ? undefined : "outline"} size="sm">
//                 {enabled ? "Mic On" : "Mic Off"}
//               </Button>
//             );
//           }}
//         </TrackToggle>
//         <span className="text-xs text-muted-foreground">Toggle your microphone</span>
//       </div>
//     );
//   };

//   const InitialConfigSender: React.FC = () => {
//     const room = useRoomContext();
//     useEffect(() => {
//       if (!room || !assistant) return;

//       // Wait for room to be fully connected
//       const publishData = async () => {
//         try {
//           // Wait for room to be connected
//           if (room.state !== 'connected') {
//             await new Promise(resolve => {
//               const handleStateChange = () => {
//                 if (room.state === 'connected') {
//                   room.off('connectionStateChanged', handleStateChange);
//                   resolve(void 0);
//                 }
//               };
//               room.on('connectionStateChanged', handleStateChange);
//             });
//           }

//           const payload = {
//             type: 'assistant_config',
//             assistant: {
//               id: assistant.id,
//               name: assistant.name,
//               prompt: assistant.prompt,
//               firstMessage: assistant.first_message,
//             },
//           };
//           const enc = new TextEncoder();
//           room.localParticipant.publishData(enc.encode(JSON.stringify(payload)), DataPacket_Kind.RELIABLE);
//         } catch (err) {
//           console.warn('Failed to publish initial assistant config', err);
//         }
//       };

//       publishData();
//     }, [room, assistant]);
//     return null;
//   };

//   return (
//     <DashboardLayout>
//       <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
//         <div className="container mx-auto px-[var(--space-2xl)] py-[var(--space-2xl)]">
//           <ThemeSection spacing="lg">
//             <div className="flex items-center justify-between pb-[var(--space-lg)]">
//               <div>
//                 <h1 className="text-3xl font-extralight tracking-tight text-foreground">Voice Agent</h1>
//                 <p className="text-muted-foreground mt-1">Speak with your assistant in a LiveKit room</p>
//               </div>
//               <div className="flex gap-2">
//                 {!token ? (
//                   <Button onClick={handleConnect} disabled={connecting || !serverUrl}>
//                     {connecting ? "Connecting…" : "Start Call"}
//                   </Button>
//                 ) : (
//                   <Button variant="outline" onClick={handleDisconnect}>End Call</Button>
//                 )}
//                 <Button variant="outline" onClick={() => navigate("/assistants")}>Back</Button>
//               </div>
//             </div>

//             <ThemeCard variant="glass" className="p-6">
//               {!token && (
//                 <div>
//                   <div className="text-muted-foreground">Select an assistant and press Start Call.</div>
//                   {assistant && (
//                     <div className="mt-4 text-sm">
//                       <div className="font-medium">{assistant.name}</div>
//                       {assistant.first_message && (
//                         <div className="text-muted-foreground mt-1">Initial: {String(assistant.first_message).slice(0, 160)}</div>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               )}
//               {token && serverUrl && (
//                 <LiveKitRoom serverUrl={serverUrl} token={token} connect>
//                   <RoomAudioRenderer />
//                   <StartAudio label="Enable audio" />
//                   <div className="text-sm text-muted-foreground mt-2">
//                     Connected{assistant?.name ? ` to Assistant ${assistant.name}` : assistantId ? ` to Assistant ${assistantId}` : ""}.
//                   </div>
//                   <AutoMic />
//                   <InitialConfigSender />
//                 </LiveKitRoom>
//               )}
//             </ThemeCard>
//           </ThemeSection>
//         </div>
//       </ThemeContainer>
//     </DashboardLayout>
//   );
// }


import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import { Button } from "@/components/ui/button";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { DataPacket_Kind } from "livekit-client";
import "@livekit/components-styles";
import { useLocation, useNavigate } from "react-router-dom";
import { createLivekitToken } from "@/lib/api/apiService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/SupportAccessAuthContext";

export default function VoiceAgent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [assistant, setAssistant] = useState<any>(null);

  const assistantId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("assistantId");
  }, [location.search]);

  // Stable room name (same for reloads per user+assistant)
  const roomName = useMemo(() => {
    if (assistantId && user?.id) return `assistant-${assistantId}-${user.id}`;
    if (user?.id) return `web-${user.id}`;
    return `web-anon-${Date.now()}`;
  }, [assistantId, user?.id]);

  useEffect(() => {
    const url =
      (import.meta.env.VITE_LIVEKIT_URL ||
        (import.meta.env.LIVEKIT_URL as string | undefined)) as
      | string
      | undefined;
    if (url) setServerUrl(url);
  }, []);

  useEffect(() => {
    const loadAssistant = async () => {
      if (!user?.id) {
        console.error("User not authenticated");
        navigate("/login");
        return;
      }

      if (!assistantId) {
        setAssistant(null);
        return;
      }
      const { data, error } = await supabase
        .from("assistant")
        .select(
          "id, name, prompt, first_message, llm_provider_setting, llm_model_setting, temperature_setting, max_token_setting, voice_provider_setting, voice_model_setting, voice_name_setting, background_sound_setting, wait_seconds, smart_endpointing, cal_api_key, cal_event_type_id, cal_event_type_slug, cal_timezone"
        )
        .eq("id", assistantId)
        .eq("user_id", user.id) // Ensure user owns this assistant
        .maybeSingle();
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("Failed to load assistant details:", error);
        setAssistant(null);
      } else {
        setAssistant(data);
      }
    };
    void loadAssistant();
  }, [assistantId, navigate, user?.id]);

  const handleConnect = async () => {
    if (!user?.id) {
      console.error("User not authenticated");
      navigate("/login");
      return;
    }

    setConnecting(true);
    try {
      // --- Build participant metadata passed to worker (stringified server-side) ---
      const participantMeta: Record<string, any> = {
        assistantId: assistantId || undefined,
        assistant: assistant
          ? {
            id: assistant.id,
            name: assistant.name,
            prompt: assistant.prompt,
            firstMessage: assistant.first_message,
            modelProvider: assistant.llm_provider_setting,
            model: assistant.llm_model_setting,
            temperature: assistant.temperature_setting,
            maxTokens: assistant.max_token_setting,
            voiceProvider: assistant.voice_provider_setting,
            voiceModel: assistant.voice_model_setting,
            voiceName: assistant.voice_name_setting,
            backgroundSound: assistant.background_sound_setting,
            waitSeconds: assistant.wait_seconds,
            smartEndpointing: assistant.smart_endpointing,
            cal_api_key: assistant.cal_api_key,
            cal_event_type_id: assistant.cal_event_type_id,
            cal_event_type_slug: assistant.cal_event_type_slug,
            cal_timezone: assistant.cal_timezone,
          }
          : undefined,
        // Top-level fields to match agent expectations (your worker reads these too)
        prompt: assistant?.prompt,
        instructions: assistant?.prompt,
        first_message: assistant?.first_message,
        assistant_name: assistant?.name,
        cal_api_key: assistant?.cal_api_key,
        cal_event_type_id: assistant?.cal_event_type_id,
        cal_event_type_slug: assistant?.cal_event_type_slug,
        cal_timezone: assistant?.cal_timezone,
        source: "web",
      };

      // --- Ask backend to embed/ensure an AGENT DISPATCH for this room ---
      const tokenPayload = await createLivekitToken({
        roomName,                 // required for dispatch
        identity: user.id,        // participant identity
        metadata: participantMeta, // participant metadata
        dispatch: {
          agentName: "ai",        // MUST match worker LK_AGENT_NAME (default "ai")
          metadata: { assistantId, source: "web" }, // goes to agent dispatch metadata
        },
        ensureDispatch: false,     // optional fallback server call to /dispatch
      });

      if (tokenPayload?.accessToken) setToken(tokenPayload.accessToken);
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setToken(null);
  };

  const AutoMic: React.FC = () => {
    const { localParticipant } = useLocalParticipant();
    useEffect(() => {
      // Try enabling mic on mount; browser will prompt for permission.
      localParticipant?.setMicrophoneEnabled(true).catch(() => {
        // ignored; user may deny or need manual toggle
      });
    }, [localParticipant]);
    return (
      <div className="flex items-center gap-2 mt-3">
        <TrackToggle source="microphone">
          {(enabled) => {
            return (
              <Button variant={enabled ? undefined : "outline"} size="sm">
                {enabled ? "Mic On" : "Mic Off"}
              </Button>
            );
          }}
        </TrackToggle>
        <span className="text-xs text-muted-foreground">Toggle your microphone</span>
      </div>
    );
  };

  const InitialConfigSender: React.FC = () => {
    const room = useRoomContext();
    useEffect(() => {
      if (!room || !assistant) return;

      const publishData = async () => {
        try {
          if (room.state !== "connected") {
            await new Promise((resolve) => {
              const handleStateChange = () => {
                if (room.state === "connected") {
                  room.off("connectionStateChanged", handleStateChange);
                  resolve(void 0);
                }
              };
              room.on("connectionStateChanged", handleStateChange);
            });
          }

          const payload = {
            type: "assistant_config",
            assistant: {
              id: assistant.id,
              name: assistant.name,
              prompt: assistant.prompt,
              firstMessage: assistant.first_message,
            },
          };
          const enc = new TextEncoder();
          room.localParticipant.publishData(
            enc.encode(JSON.stringify(payload)),
            DataPacket_Kind.RELIABLE
          );
        } catch (err) {
          console.warn("Failed to publish initial assistant config", err);
        }
      };

      publishData();
    }, [room, assistant]);
    return null;
  };

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
        <div className="container mx-auto px-[var(--space-2xl)] py-[var(--space-2xl)]">
          <ThemeSection spacing="lg">
            <div className="flex items-center justify-between pb-[var(--space-lg)]">
              <div>
                <h1 className="text-3xl font-extralight tracking-tight text-foreground">
                  Voice Agent
                </h1>
                <p className="text-muted-foreground mt-1">
                  Speak with your assistant in a LiveKit room
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Room: <span className="font-mono">{roomName}</span>
                </p>
              </div>
              <div className="flex gap-2">
                {!token ? (
                  <Button onClick={handleConnect} disabled={connecting || !serverUrl}>
                    {connecting ? "Connecting…" : "Start Call"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleDisconnect}>
                    End Call
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate("/assistants")}>
                  Back
                </Button>
              </div>
            </div>

            <ThemeCard variant="glass" className="p-6">
              {!token && (
                <div>
                  <div className="text-muted-foreground">
                    Select an assistant and press Start Call.
                  </div>
                  {assistant && (
                    <div className="mt-4 text-sm">
                      <div className="font-medium">{assistant.name}</div>
                      {assistant.first_message && (
                        <div className="text-muted-foreground mt-1">
                          Initial: {String(assistant.first_message).slice(0, 160)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {token && serverUrl && (
                <LiveKitRoom serverUrl={serverUrl} token={token} connect>
                  <RoomAudioRenderer />
                  <StartAudio label="Enable audio" />
                  <div className="text-sm text-muted-foreground mt-2">
                    Connected
                    {assistant?.name
                      ? ` to Assistant ${assistant.name}`
                      : assistantId
                        ? ` to Assistant ${assistantId}`
                        : ""}
                    .
                  </div>
                  <AutoMic />
                  <InitialConfigSender />
                </LiveKitRoom>
              )}
            </ThemeCard>
          </ThemeSection>
        </div>
      </ThemeContainer>
    </DashboardLayout>
  );
}

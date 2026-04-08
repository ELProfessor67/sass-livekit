
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
    useLocalParticipant,
    useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { createLivekitToken } from "@/lib/api/apiService";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, Loader2, Sparkles } from "lucide-react";

/* ─── env ──────────────────────────────────────────────────────────────── */

const BACKEND_URL =
    (import.meta.env.VITE_BACKEND_URL as string) || "http://localhost:4000";

const LIVEKIT_URL =
    (import.meta.env.VITE_LIVEKIT_URL as string) ||
    "wss://vokivo-agent-t4l0o6i0.livekit.cloud";

/* ─── Background ───────────────────────────────────────────────────────── */

function Background() {
    return (
        <>
            {/* base gradient */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />

            {/* orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <motion.div
                    className="absolute -top-48 -left-48 h-[520px] w-[520px] rounded-full bg-violet-700/20 blur-[140px]"
                    animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -bottom-48 -right-40 h-[480px] w-[480px] rounded-full bg-indigo-600/18 blur-[130px]"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.9, 0.5] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[360px] w-[360px] rounded-full bg-fuchsia-500/10 blur-[100px]"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                />
            </div>

            {/* dot grid */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                }}
            />
        </>
    );
}

/* ─── Glass card ───────────────────────────────────────────────────────── */

function Glass({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={["relative overflow-hidden rounded-3xl", className].join(" ")}>
            {/* frosted layer */}
            <div className="absolute inset-0 rounded-3xl bg-white/[0.04] backdrop-blur-3xl" />
            {/* border gradient */}
            <div
                className="absolute inset-0 rounded-3xl"
                style={{
                    padding: "1px",
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 50%, rgba(139,92,246,0.2) 100%)",
                    WebkitMask:
                        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                }}
            />
            {/* top sheen */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            {/* inner glow */}
            <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.2)]" />
            {/* content */}
            <div className="relative">{children}</div>
        </div>
    );
}

/* ─── Pulse rings ──────────────────────────────────────────────────────── */

function PulseRings({ active }: { active: boolean }) {
    return (
        <div className="relative flex items-center justify-center w-40 h-40">
            {active &&
                [0, 1, 2, 3].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            border: "1px solid rgba(167,139,250,0.25)",
                            boxShadow: "0 0 12px rgba(167,139,250,0.08)",
                        }}
                        initial={{ width: 80, height: 80, opacity: 0.8 }}
                        animate={{ width: 160 + i * 30, height: 160 + i * 30, opacity: 0 }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            delay: i * 0.55,
                            ease: "easeOut",
                        }}
                    />
                ))}

            {/* core */}
            <motion.div
                className="z-10 w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                    background:
                        "radial-gradient(circle at 35% 30%, rgba(167,139,250,0.25), rgba(109,40,217,0.15))",
                    border: "1px solid rgba(167,139,250,0.35)",
                    boxShadow:
                        "0 0 40px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <Mic className="w-9 h-9 text-violet-200 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            </motion.div>
        </div>
    );
}

/* ─── Avatar orb (idle) ────────────────────────────────────────────────── */

function AvatarOrb() {
    return (
        <motion.div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
                background:
                    "radial-gradient(circle at 35% 30%, rgba(167,139,250,0.3), rgba(79,38,169,0.15))",
                border: "1px solid rgba(167,139,250,0.3)",
                boxShadow:
                    "0 0 32px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
            animate={{ boxShadow: ["0 0 32px rgba(139,92,246,0.25)", "0 0 48px rgba(139,92,246,0.4)", "0 0 32px rgba(139,92,246,0.25)"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
            <Sparkles className="w-8 h-8 text-violet-200 drop-shadow-[0_0_6px_rgba(167,139,250,0.9)]" />
        </motion.div>
    );
}

/* ─── Status dot ───────────────────────────────────────────────────────── */

function StatusDot({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs text-white/40 tracking-wide">{label}</span>
        </div>
    );
}

/* ─── Glass button ─────────────────────────────────────────────────────── */

function GlassButton({
    onClick,
    disabled,
    children,
    variant = "default",
    className = "",
    title,
}: {
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    variant?: "default" | "danger" | "primary";
    className?: string;
    title?: string;
}) {
    const variants = {
        default:
            "bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.12] hover:border-white/[0.2] text-white/70 hover:text-white/90",
        danger:
            "bg-red-500/[0.12] hover:bg-red-500/[0.22] border-red-400/[0.25] hover:border-red-400/[0.45] text-red-300 hover:text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_28px_rgba(239,68,68,0.25)]",
        primary:
            "bg-violet-500/[0.18] hover:bg-violet-500/[0.28] border-violet-400/[0.3] hover:border-violet-400/[0.5] text-violet-200 hover:text-violet-100 shadow-[0_0_20px_rgba(139,92,246,0.12)] hover:shadow-[0_0_32px_rgba(139,92,246,0.3)]",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={[
                "relative overflow-hidden rounded-2xl border backdrop-blur-xl",
                "transition-all duration-300 active:scale-[0.96]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
                variants[variant],
                className,
            ].join(" ")}
        >
            {/* top sheen */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="relative">{children}</div>
        </button>
    );
}

/* ─── Idle screen ──────────────────────────────────────────────────────── */

function IdleScreen({
    assistantName,
    connecting,
    onConnect,
}: {
    assistantName: string | null;
    connecting: boolean;
    onConnect: () => void;
}) {
    return (
        <motion.div
            key="idle"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[320px] px-4"
        >
            <Glass className="w-full">
                <div className="p-8 flex flex-col items-center gap-7">
                    {/* avatar */}
                    <AvatarOrb />

                    {/* text */}
                    <div className="space-y-2 text-center">
                        <h1 className="text-[1.35rem] font-semibold tracking-tight text-white/95">
                            {assistantName || "AI Voice Assistant"}
                        </h1>
                        <p className="text-sm text-white/35 leading-relaxed max-w-[220px] mx-auto">
                            Start a real-time voice conversation with your AI agent.
                        </p>
                    </div>

                    {/* divider */}
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                    {/* CTA */}
                    <GlassButton
                        onClick={onConnect}
                        disabled={connecting || !assistantName}
                        variant="primary"
                        className="w-full h-12 font-medium text-sm"
                    >
                        <span className="flex items-center justify-center gap-2 px-4">
                            {connecting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Connecting…
                                </>
                            ) : (
                                "Start Conversation"
                            )}
                        </span>
                    </GlassButton>

                    {/* brand */}
                    <p className="text-[11px] text-white/18 tracking-widest uppercase">
                        Powered by AI
                    </p>
                </div>
            </Glass>
        </motion.div>
    );
}

/* ─── Active screen ────────────────────────────────────────────────────── */

function ActiveScreen({ assistantName }: { assistantName: string | null }) {
    return (
        <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[320px] px-4"
        >
            <Glass className="w-full">
                <div className="p-8 flex flex-col items-center gap-7">
                    {/* visualiser */}
                    <PulseRings active />

                    {/* info */}
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h2 className="text-base font-semibold text-white/90 tracking-tight">
                            {assistantName || "AI Assistant"}
                        </h2>
                        <StatusDot label="Live · Agent is listening" />
                    </div>

                    {/* divider */}
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                    {/* controls */}
                    <MicControl />
                </div>
            </Glass>
        </motion.div>
    );
}

/* ─── Mic control ──────────────────────────────────────────────────────── */

function MicControl() {
    const { localParticipant } = useLocalParticipant();
    const [isMuted, setIsMuted] = useState(!localParticipant.isMicrophoneEnabled);

    useEffect(() => {
        const sync = () => setIsMuted(!localParticipant.isMicrophoneEnabled);
        localParticipant.on("trackMuted", sync);
        localParticipant.on("trackUnmuted", sync);
        localParticipant.on("localTrackPublished", sync);
        localParticipant.on("localTrackUnpublished", sync);
        return () => {
            localParticipant.off("trackMuted", sync);
            localParticipant.off("trackUnmuted", sync);
            localParticipant.off("localTrackPublished", sync);
            localParticipant.off("localTrackUnpublished", sync);
        };
    }, [localParticipant]);

    const toggleMic = async () => {
        const enabled = localParticipant.isMicrophoneEnabled;
        await localParticipant.setMicrophoneEnabled(!enabled);
        setIsMuted(enabled);
    };

    return (
        <div className="flex items-center justify-center gap-4">
            <GlassButton
                onClick={toggleMic}
                variant={isMuted ? "danger" : "default"}
                className="w-14 h-14"
                title={isMuted ? "Unmute" : "Mute"}
            >
                <span className="flex items-center justify-center w-14 h-14">
                    {isMuted ? (
                        <MicOff className="w-5 h-5" />
                    ) : (
                        <Mic className="w-5 h-5" />
                    )}
                </span>
            </GlassButton>

            <DisconnectButton />
        </div>
    );
}

function DisconnectButton() {
    const { disconnect } = useRoomContext();
    return (
        <GlassButton
            onClick={() => disconnect()}
            variant="danger"
            className="w-14 h-14"
            title="End call"
        >
            <span className="flex items-center justify-center w-14 h-14">
                <PhoneOff className="w-5 h-5" />
            </span>
        </GlassButton>
    );
}

/* ─── Root ─────────────────────────────────────────────────────────────── */

export default function PublicAgent() {
    const { assistantId } = useParams<{ assistantId: string }>();
    const [token, setToken] = useState<string | null>(null);
    const [roomName, setRoomName] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [assistant, setAssistant] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const resumeRoomName = searchParams.get("vk_room");
    const resumeToken = searchParams.get("vk_token");

    useEffect(() => {
        if (resumeRoomName && resumeToken) {
            setRoomName(resumeRoomName);
            setToken(resumeToken);
        }
    }, [resumeRoomName, resumeToken]);

    useEffect(() => {
        document.title = assistant?.name
            ? `${assistant.name} | AI Assistant`
            : "AI Voice Assistant";
    }, [assistant]);

    useEffect(() => {
        if (!assistantId) return;
        fetch(`${BACKEND_URL}/api/v1/assistants/public/${assistantId}`)
            .then((r) => {
                if (!r.ok) throw new Error();
                return r.json();
            })
            .then(({ data }) => setAssistant(data))
            .catch(() => setError("Could not load assistant configuration."));
    }, [assistantId]);

    const handleConnect = async () => {
        setConnecting(true);
        setError(null);
        try {
            const newRoomName = `web-${assistantId}-${Math.random()
                .toString(36)
                .substring(7)}`;
            const identity = `guest-${Math.random().toString(36).substring(7)}`;
            const tokenPayload = await createLivekitToken({
                roomName: newRoomName,
                identity,
                metadata: { assistantId, source: "embed", isPublic: true },
                dispatch: {
                    agentName: "ai",
                    metadata: { assistantId, source: "embed", isPublic: true },
                },
                ensureDispatch: true,
            });
            if (tokenPayload?.accessToken) {
                setRoomName(newRoomName);
                setToken(tokenPayload.accessToken);
            } else {
                throw new Error("No access token returned");
            }
        } catch {
            setError("Failed to connect to the agent.");
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = () => {
        setToken(null);
        setRoomName(null);
    };

    return (
        <div
            className="relative flex h-screen w-full items-center justify-center overflow-hidden font-sans text-white"
            style={{ background: "#06060f" }}
        >
            <Background />

            <AnimatePresence mode="wait">
                {error ? (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-[320px] px-4"
                    >
                        <Glass className="w-full">
                            <div className="p-8 flex flex-col items-center gap-5 text-center">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{
                                        background: "rgba(239,68,68,0.1)",
                                        border: "1px solid rgba(239,68,68,0.25)",
                                    }}
                                >
                                    <span className="text-red-300 text-xl">!</span>
                                </div>
                                <p className="text-sm text-white/50 leading-relaxed">{error}</p>
                                <GlassButton
                                    onClick={() => window.location.reload()}
                                    variant="default"
                                    className="px-6 h-10 text-sm font-medium"
                                >
                                    <span className="px-2">Retry</span>
                                </GlassButton>
                            </div>
                        </Glass>
                    </motion.div>
                ) : !token ? (
                    <IdleScreen
                        assistantName={assistant?.name ?? null}
                        connecting={connecting}
                        onConnect={handleConnect}
                    />
                ) : (
                    <motion.div
                        key="room"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full flex items-center justify-center"
                    >
                        <LiveKitRoom
                            serverUrl={LIVEKIT_URL}
                            token={token}
                            connect={true}
                            audio={true}
                            onDisconnected={handleDisconnect}
                        >
                            <RoomAudioRenderer />
                            <StartAudio label="Enable audio to chat" />
                            <ActiveScreen assistantName={assistant?.name ?? null} />
                        </LiveKitRoom>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

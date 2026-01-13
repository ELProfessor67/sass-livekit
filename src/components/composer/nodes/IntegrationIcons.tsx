import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

export const GoHighLevelIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 20V10L7 5L11 10V20H8V12H6V20H3Z" fill="#FFD100" />
        <path d="M10 20V14L12 11L14 14V20H12.5V15.5H11.5V20H10Z" fill="#00B4E6" />
        <path d="M13 20V12L17 7L21 12V20H18V14H16V20H13Z" fill="#00D764" />
    </svg>
);

export const HubSpotIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M17.5 9.5V7.5C17.5 6.67 16.83 6 16 6C15.17 6 14.5 6.67 14.5 7.5V9.5C13.12 10.04 12.17 11.38 12.17 12.95C12.17 14.96 13.79 16.58 15.8 16.58C16.11 16.58 16.41 16.54 16.7 16.47L18.5 18.27C18.89 18.66 19.52 18.66 19.91 18.27C20.3 17.88 20.3 17.25 19.91 16.86L18.11 15.06C18.49 14.45 18.72 13.73 18.72 12.95C18.72 11.38 17.77 10.04 16.39 9.5H17.5ZM15.8 14.42C14.99 14.42 14.33 13.76 14.33 12.95C14.33 12.14 14.99 11.48 15.8 11.48C16.61 11.48 17.27 12.14 17.27 12.95C17.27 13.76 16.61 14.42 15.8 14.42Z" fill="#FF7A59" />
        <path d="M10.5 8H5.5C4.67 8 4 8.67 4 9.5V14.5C4 15.33 4.67 16 5.5 16H10.5C11.33 16 12 15.33 12 14.5V9.5C12 8.67 11.33 8 10.5 8ZM10 14H6V10H10V14Z" fill="#FF7A59" />
    </svg>
);

export const ShopifyIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M15.34 5.54C15.32 5.42 15.21 5.35 15.12 5.34C15.03 5.33 13.12 5.3 13.12 5.3C13.12 5.3 11.61 3.82 11.45 3.66C11.29 3.5 10.98 3.55 10.87 3.58C10.87 3.58 10.54 3.68 9.99 3.84C9.91 3.56 9.78 3.22 9.58 2.87C8.99 1.87 8.12 1.34 7.08 1.34C6.97 1.34 6.86 1.35 6.75 1.37C6.71 1.32 6.66 1.27 6.61 1.23C6.16 0.79 5.59 0.58 4.92 0.6C3.64 0.64 2.37 1.57 1.34 3.23C0.58 4.44 0 6.02 0 7.22C0 7.24 0 7.26 0 7.28C0 7.3 1.57 7.82 1.57 7.82C1.57 7.82 2.37 10.13 2.5 10.48C2.63 10.83 3.12 11.81 3.12 11.81L6.93 22.5L10.6 21.45L10.6 21.44C10.6 21.44 9.53 18.18 9.15 17.02C9.89 16.81 10.59 16.62 10.59 16.62C10.59 16.62 10.6 16.62 10.6 16.62L10.62 16.61L15.19 6.31C15.28 6.1 15.36 5.67 15.34 5.54Z" fill="#95BF47" />
        <path d="M15.12 5.34C15.03 5.33 13.12 5.3 13.12 5.3C13.12 5.3 11.61 3.82 11.45 3.66C11.39 3.6 11.31 3.57 11.22 3.55L10.6 21.44L15.19 6.31C15.28 6.1 15.36 5.67 15.34 5.54C15.32 5.42 15.21 5.35 15.12 5.34Z" fill="#5E8E3E" />
    </svg>
);

export const SlackIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A" />
    </svg>
);

export const GmailIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335" />
        <path d="M0 5.457v13.909c0 .904.732 1.636 1.636 1.636h3.819V11.73L12 16.64V9.548L5.455 4.64 3.927 3.493C2.309 2.28 0 3.434 0 5.457z" fill="#FBBC05" />
        <path d="M24 5.457L24 19.366c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64V9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#34A853" />
        <path d="M18.545 11.73V21.002h3.819c.904 0 1.636-.732 1.636-1.636V5.457c0-2.023-2.31-3.178-3.927-1.964l-1.528 1.145V11.73z" fill="#4285F4" />
        <path d="M5.455 11.73V21.002H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964l1.528 1.145V11.73z" fill="#C5221F" />
    </svg>
);

export const KlaviyoIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#12372A" />
        <path d="M6 6h3v12H6V6zm4.5 0L16.5 12l-6 6V6z" fill="#9BF0E1" />
    </svg>
);

export const GoogleSheetsIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#0F9D58" />
        <path d="M14 2v6h6" fill="#87CEAC" />
        <path d="M14 2l6 6h-6V2z" fill="#F1F1F1" fillOpacity="0.2" />
        <rect x="7" y="12" width="10" height="1.5" fill="white" />
        <rect x="7" y="15" width="10" height="1.5" fill="white" />
        <rect x="7" y="12" width="1.5" height="4.5" fill="white" />
        <rect x="11.25" y="12" width="1.5" height="4.5" fill="white" />
        <rect x="15.5" y="12" width="1.5" height="4.5" fill="white" />
    </svg>
);

export const AirtableIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M11.992 2.006L2.604 5.61a.472.472 0 0 0 0 .878l9.388 3.604a.945.945 0 0 0 .673 0l9.388-3.604a.472.472 0 0 0 0-.878l-9.388-3.604a.945.945 0 0 0-.673 0z" fill="#FFBF00" />
        <path d="M12.665 11.564V21.47a.473.473 0 0 0 .648.438l9.052-3.476a.945.945 0 0 0 .582-.872V7.654a.473.473 0 0 0-.648-.438l-9.052 3.476a.945.945 0 0 0-.582.872z" fill="#26B5F8" />
        <path d="M11.335 11.564V21.47a.473.473 0 0 1-.648.438L1.635 18.43a.945.945 0 0 1-.582-.872V7.654a.473.473 0 0 1 .648-.438l9.052 3.476a.945.945 0 0 1 .582.872z" fill="#ED3049" />
        <path d="M11.335 11.564V21.47a.473.473 0 0 1-.648.438L1.635 18.43a.945.945 0 0 1-.582-.872V7.654a.473.473 0 0 1 .648-.438l9.052 3.476a.945.945 0 0 1 .582.872z" fill="url(#airtable-gradient)" />
        <defs>
            <linearGradient id="airtable-gradient" x1="6.001" y1="7.088" x2="6.001" y2="21.908" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ED3049" stopOpacity="0" />
                <stop offset="1" stopColor="#ED3049" />
            </linearGradient>
        </defs>
    </svg>
);

export const NotionIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path fillRule="evenodd" clipRule="evenodd" d="M4.017 2.77l11.95-.872c1.47-.123 1.847-.04 2.769.658l3.817 2.677c.628.453.826.576.826 1.068v13.588c0 .862-.314 1.379-1.414 1.461l-13.89.823c-.823.041-1.217-.082-1.65-.617l-2.64-3.432c-.473-.618-.668-.988-.668-1.44V4.168c0-.576.314-1.316 1.9-1.398z" fill="white" />
        <path fillRule="evenodd" clipRule="evenodd" d="M15.967 1.898l-11.95.872C2.43 2.852 2.118 3.592 2.118 4.168v12.837c0 .452.195.822.668 1.44l2.64 3.432c.433.535.827.658 1.65.617l13.89-.823c1.1-.082 1.414-.6 1.414-1.461V6.622c0-.247-.032-.403-.196-.576l-.63-.492-3.817-2.677c-.922-.699-1.299-.781-2.769-.658l-.001-.321zm.157 2.195c.284-.021.352.004.422.055l2.166 1.569c.055.041.07.054.07.11v9.785c0 .13-.052.193-.168.202l-9.392.558c-.247.014-.362-.027-.485-.18L6.51 13.528c-.078-.101-.118-.18-.118-.286V5.41c0-.164.066-.278.24-.29l9.492-.687v-.34zm-1.03 1.925a.337.337 0 0 0-.366.285v7.425l-5.33.31V7.244a.337.337 0 0 0-.284-.366l-.936-.068c-.193-.014-.3.082-.3.273v7.784c0 .368.247.587.614.565l7.2-.427c.368-.02.54-.246.54-.613V6.452c0-.247-.134-.38-.38-.366l-.758-.068z" fill="black" />
    </svg>
);

export const WebhookIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#6366F1" />
    </svg>
);

export const HttpIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4.929 4.929a10 10 0 1 1 14.142 14.142A10 10 0 0 1 4.929 4.929z" stroke="#8B5CF6" strokeWidth="2" />
        <path d="M8 9v6M8 12h3M11 9v6M14 9l2 3-2 3" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const OpenAIIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="currentColor" />
    </svg>
);

export const GeminiIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 24A14.304 14.304 0 0 0 12 0a14.304 14.304 0 0 0 0 24z" fill="url(#gemini-gradient)" />
        <defs>
            <linearGradient id="gemini-gradient" x1="0" y1="12" x2="24" y2="12">
                <stop stopColor="#1A73E8" />
                <stop offset="0.5" stopColor="#6C92F4" />
                <stop offset="1" stopColor="#1A73E8" />
            </linearGradient>
        </defs>
        <path d="M12 4c2 2.5 4 5 4 8s-2 5.5-4 8c-2-2.5-4-5-4-8s2-5.5 4-8z" fill="white" fillOpacity="0.9" />
    </svg>
);

export const ClaudeIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" fill="#D97757" />
        <path d="M7 10.5C7 8.5 9.5 7 12 7s5 1.5 5 3.5c0 1.5-1.5 2.5-3 3v1c0 .5-.5 1-1 1h-2c-.5 0-1-.5-1-1v-1c-1.5-.5-3-1.5-3-3z" fill="white" />
        <circle cx="10" cy="10" r="1" fill="#D97757" />
        <circle cx="14" cy="10" r="1" fill="#D97757" />
    </svg>
);

export const TwilioIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" fill="#F22F46" />
        <circle cx="9" cy="9" r="1.5" fill="white" />
        <circle cx="15" cy="9" r="1.5" fill="white" />
        <circle cx="9" cy="15" r="1.5" fill="white" />
        <circle cx="15" cy="15" r="1.5" fill="white" />
    </svg>
);

export const TelnyxIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect width="24" height="24" rx="4" fill="#00C08B" />
        <path d="M6 7h12v2H13v9h-2V9H6V7z" fill="white" />
    </svg>
);

export const WhatsAppIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" fill="#25D366" />
        <path d="M17.6 14.82c-.27-.14-1.59-.78-1.84-.87-.25-.09-.43-.14-.61.14-.18.27-.7.87-.86 1.05-.16.18-.31.2-.58.07-.27-.14-1.14-.42-2.17-1.34-.8-.72-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.31.41-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.61-1.47-.84-2.01-.22-.52-.44-.45-.61-.46-.16-.01-.34-.01-.52-.01s-.48.07-.73.34c-.25.27-.95.93-.95 2.26s.97 2.62 1.11 2.8c.14.18 1.91 2.92 4.62 4.1.65.28 1.15.45 1.55.57.65.21 1.24.18 1.71.11.52-.08 1.59-.65 1.82-1.28.22-.63.22-1.17.16-1.28-.07-.12-.25-.18-.52-.32z" fill="white" />
    </svg>
);

export const CalcomIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="4" width="18" height="17" rx="2" fill="#292929" />
        <rect x="3" y="4" width="18" height="4" fill="#111111" />
        <circle cx="7" cy="6" r="1" fill="#292929" />
        <circle cx="17" cy="6" r="1" fill="#292929" />
        <path d="M8 13l2.5 2.5L16 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const ConditionIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" className={className}>
        <path d="M192,160a32,32,0,1,0,32,32A32,32,0,0,0,192,160Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,192,208ZM64,32A32,32,0,1,0,96,64,32,32,0,0,0,64,32Zm0,48A16,16,0,1,1,80,64,16,16,0,0,1,64,80Zm128,80a32,32,0,1,0,32,32A32,32,0,0,0,192,160Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,192,208ZM64,160a32,32,0,1,0,32,32A32,32,0,0,0,64,160Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,64,208ZM160,64a8,8,0,0,1,8-8h24a32,32,0,0,1,32,32v64a8,8,0,0,1-16,0V88a16,16,0,0,0-16-16H168A8,8,0,0,1,160,64Z" />
    </svg>
);

export const DelayIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" className={className}>
        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm61.66-61.66a8,8,0,0,1-11.32,11.32l-56-56V56a8,8,0,0,1,16,0v49.33Z" />
    </svg>
);

// export type LivekitToken = {
//   accessToken: string;
//   identity?: string;
// };

// export async function createLivekitToken(args: { metadata?: any; agentId?: string }): Promise<LivekitToken> {
//   const externalUrl = (import.meta.env.VITE_TOKEN_URL || (import.meta.env.TOKEN_URL as string | undefined)) as string | undefined;
//   const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api/v1/livekit/create-token`;
//   const res = await fetch(url, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(args),
//   });
//   if (!res.ok) {
//     throw new Error(`Failed to create token (${res.status})`);
//   }
//   const data = await res.json();

//   // Normalize common response shapes to { accessToken, identity? }
//   // Supported:
//   // - { success, result: { accessToken, identity } }
//   // - { accessToken, identity }
//   // - { token }
//   // - { jwt }   
//   // - { access_token }
//   // - string token
//   let accessToken: string | undefined;
//   let identity: string | undefined;

//   if (typeof data === 'string') {
//     accessToken = data;
//   } else if (data?.result?.accessToken) {
//     accessToken = data.result.accessToken;
//     identity = data.result.identity;
//   } else if (data?.accessToken) {
//     accessToken = data.accessToken;
//     identity = data.identity;
//   } else if (data?.token) {
//     accessToken = data.token;
//   } else if (data?.jwt) {
//     accessToken = data.jwt;
//   } else if (data?.access_token) {
//     accessToken = data.access_token;
//   }

//   if (!accessToken) {
//     // eslint-disable-next-line no-console
//     console.warn('Unrecognized token response shape:', data);
//     throw new Error('Token response missing access token');
//   }

//   return { accessToken, identity };
// }


// types
export type LivekitToken = {
  accessToken: string;
  identity?: string;
};

type CreateTokenArgs = {
  roomName: string;                     // REQUIRED: same room your web client will join
  identity?: string;                    // optional (backend can generate)
  metadata?: Record<string, any>;       // participant metadata (your worker parses this JSON)
  dispatch?: {                          // ask server to dispatch an agent into the room
    agentName?: string;                 // must match your worker's agent_name (default "ai")
    metadata?: Record<string, any>;     // passed to the agent (JSON.stringified server-side)
  };
  ensureDispatch?: boolean;             // fallback call to /dispatch if token-embedded dispatch isn't used
};

// helper
function normalizeAccessToken(data: any): { accessToken?: string; identity?: string } {
  if (typeof data === "string") return { accessToken: data };
  if (data?.result?.accessToken) return { accessToken: data.result.accessToken, identity: data.result.identity };
  if (data?.accessToken) return { accessToken: data.accessToken, identity: data.identity };
  if (data?.token) return { accessToken: data.token };
  if (data?.jwt) return { accessToken: data.jwt };
  if (data?.access_token) return { accessToken: data.access_token };
  return {};
}

export async function createLivekitToken(args: CreateTokenArgs): Promise<LivekitToken> {
  const base = (import.meta.env.VITE_BACKEND_URL as string) || "http://localhost:4000";
  const createUrl = `${base}/api/v1/livekit/create-token`;

  // Hint the backend to embed a dispatch in the token (RoomConfiguration.agents)
  // Your server should JSON.stringify any nested metadata it places into roomConfig/agents.
  const body = {
    roomName: args.roomName,
    identity: args.identity,
    metadata: args.metadata, // will be stringified by the server for participant metadata
    // optional: if server supports token-embedded dispatch
    roomConfig: args.dispatch
      ? {
        agents: [
          {
            agentName: args.dispatch.agentName ?? "ai",
            metadata: JSON.stringify(args.dispatch.metadata ?? {}),
          },
        ],
      }
      : undefined,
    // optional: some backends prefer a simple flag instead of full roomConfig
    dispatch: args.dispatch
      ? {
        agentName: args.dispatch.agentName ?? "ai",
        metadata: args.dispatch.metadata ?? {},
      }
      : undefined,
  };

  const res = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create token (${res.status})`);

  const data = await res.json();
  const { accessToken, identity } = normalizeAccessToken(data);
  if (!accessToken) {
    // eslint-disable-next-line no-console
    console.warn("Unrecognized token response shape:", data);
    throw new Error("Token response missing access token");
  }

  // Fallback: if backend did NOT embed the dispatch in the token, optionally hit a /dispatch endpoint.
  // Safe to leave enabled; backend can no-op if dispatch already exists.
  if (args.dispatch && args.ensureDispatch !== false) {
    try {
      await fetch(`${base}/api/v1/livekit/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: args.roomName,
          agentName: args.dispatch.agentName ?? "ai",
          metadata: args.dispatch.metadata ?? {},
        }),
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Dispatch fallback failed (ok if server embeds dispatch in token):", e);
    }
  }

  return { accessToken, identity };
}

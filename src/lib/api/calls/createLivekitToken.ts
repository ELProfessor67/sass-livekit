export type LivekitToken = {
  accessToken: string;
  identity?: string;
};

export async function createLivekitToken(args: { metadata?: any; agentId?: string }): Promise<LivekitToken> {
  const externalUrl = (import.meta.env.VITE_TOKEN_URL || (import.meta.env.TOKEN_URL as string | undefined)) as string | undefined;
  const url = externalUrl || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api/v1/livekit/create-token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`Failed to create token (${res.status})`);
  }
  const data = await res.json();

  // Normalize common response shapes to { accessToken, identity? }
  // Supported:
  // - { success, result: { accessToken, identity } }
  // - { accessToken, identity }
  // - { token }
  // - { jwt }
  // - { access_token }
  // - string token
  let accessToken: string | undefined;
  let identity: string | undefined;

  if (typeof data === 'string') {
    accessToken = data;
  } else if (data?.result?.accessToken) {
    accessToken = data.result.accessToken;
    identity = data.result.identity;
  } else if (data?.accessToken) {
    accessToken = data.accessToken;
    identity = data.identity;
  } else if (data?.token) {
    accessToken = data.token;
  } else if (data?.jwt) {
    accessToken = data.jwt;
  } else if (data?.access_token) {
    accessToken = data.access_token;
  }

  if (!accessToken) {
    // eslint-disable-next-line no-console
    console.warn('Unrecognized token response shape:', data);
    throw new Error('Token response missing access token');
  }

  return { accessToken, identity };
}



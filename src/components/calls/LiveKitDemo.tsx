import { useEffect, useMemo, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer, StartAudio } from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { createLivekitToken } from '@/lib/api/apiService';
import { useLocation } from 'react-router-dom';

export default function LiveKitDemo() {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [connecting, setConnecting] = useState(false);
  const location = useLocation();

  const assistantId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('assistantId');
  }, [location.search]);

  useEffect(() => {
    const url = (import.meta.env.VITE_LIVEKIT_URL || (import.meta.env.LIVEKIT_URL as string | undefined)) as string | undefined;
    if (url) setServerUrl(url);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const tokenPayload = await createLivekitToken({ metadata: { prompt: 'Hello', assistantId: assistantId || undefined } });
      if (tokenPayload?.accessToken) setToken(tokenPayload.accessToken);
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {!token && (
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? 'Connecting…' : 'Create token & connect'}
        </Button>
      )}
      {token && serverUrl && (
        <LiveKitRoom serverUrl={serverUrl} token={token} connect>
          <RoomAudioRenderer />
          <StartAudio label="Enable audio" />
          <div className="text-sm text-muted-foreground mt-2">
            Connected to LiveKit{assistantId ? ` with Assistant ${assistantId}` : ''}.
          </div>
        </LiveKitRoom>
      )}
    </div>
  );
}



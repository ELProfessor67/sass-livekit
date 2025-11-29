import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Shield, Link2, Loader2, CreditCard } from 'lucide-react';

const SLUG_INPUT_REGEX = /[^a-z0-9-]/g;
const MAIN_DOMAIN = import.meta.env.VITE_MAIN_DOMAIN || window.location.hostname;

export function WhitelabelSettings() {
  const [slug, setSlug] = useState('');
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [hasWhitelabel, setHasWhitelabel] = useState(false);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugStatusMessage, setSlugStatusMessage] = useState('');
  const [slugError, setSlugError] = useState('');
  const [isSlugUnique, setIsSlugUnique] = useState(false);
  
  // Stripe credentials
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [showStripeKeys, setShowStripeKeys] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // In development, force relative URL to use Vite proxy and preserve Host header
  const apiUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${apiUrl}/api/v1/whitelabel/website-settings`, {
          method: 'GET',
          headers
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            const settings = data.settings;
            if (settings.slug_name) {
              setHasWhitelabel(true);
              setExistingSlug(settings.slug_name);
              setSlug(settings.slug_name);
            }
            if (settings.website_name) {
              setBrandName(settings.website_name);
            }
            if (settings.logo) {
              setLogoUrl(settings.logo);
            }
            if (settings.stripe_publishable_key) {
              setStripePublishableKey(settings.stripe_publishable_key);
            }
            // Don't show secret key for security, but indicate if it's set
            if (settings.stripe_enabled) {
              setShowStripeKeys(true);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching whitelabel settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [apiUrl]);

  useEffect(() => {
    if (hasWhitelabel) return;
    if (!slug) {
      setSlugStatusMessage('');
      setSlugError('');
      setIsSlugUnique(false);
      return;
    }

    const handler = setTimeout(async () => {
      try {
        setIsCheckingSlug(true);
        const response = await fetch(`${apiUrl}/api/v1/whitelabel/check-slug-available`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug })
        });
        const data = await response.json();

        if (data.success) {
          setSlugStatusMessage(data.message || `${slug} is available`);
          setSlugError('');
          setIsSlugUnique(true);
        } else {
          setSlugStatusMessage('');
          setSlugError(data.message || `${slug} is not available`);
          setIsSlugUnique(false);
        }
      } catch (error) {
        console.error('Error checking slug availability:', error);
        setSlugError('Error checking slug availability');
        setSlugStatusMessage('');
        setIsSlugUnique(false);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [slug, hasWhitelabel, apiUrl]);

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No session token');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/whitelabel-logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('workspace-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('workspace-logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrlData.publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const ensureAuthenticated = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    return session.access_token;
  };

  const handleActivateWhitelabel = async () => {
    if (!slug) {
      toast.error('Please choose a slug for your domain.');
      return;
    }

    if (!brandName.trim()) {
      toast.error('Please enter a brand name.');
      return;
    }

    if (!isSlugUnique) {
      toast.error('Please choose an available slug.');
      return;
    }

    try {
      setIsSaving(true);
      const accessToken = await ensureAuthenticated();

      const response = await fetch(`${apiUrl}/api/v1/whitelabel/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          slug,
          website_name: brandName.trim(),
          logo: logoUrl || null,
          stripe_publishable_key: stripePublishableKey.trim() || null,
          stripe_secret_key: stripeSecretKey.trim() || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to activate whitelabel');
      }

      toast.success('Whitelabel activated! Redirecting you to your branded workspace.');
      await supabase.auth.signOut();
      const isLocal = MAIN_DOMAIN.includes('localhost');

      const redirectUrl = data.redirectUrl ||
        `${isLocal ? 'http' : 'https'}://${slug}.${MAIN_DOMAIN.replace(/^https?:\/\//, '')}`;

      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Error activating whitelabel:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate whitelabel');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBranding = async () => {
    if (!brandName.trim()) {
      toast.error('Please enter a brand name.');
      return;
    }

    try {
      setIsSaving(true);
      const accessToken = await ensureAuthenticated();

      const payload: Record<string, any> = {
        website_name: brandName.trim()
      };

      if (logoUrl) {
        payload.logo = logoUrl;
      }

      if (stripePublishableKey.trim()) {
        payload.stripe_publishable_key = stripePublishableKey.trim();
      }

      if (stripeSecretKey.trim()) {
        payload.stripe_secret_key = stripeSecretKey.trim();
      }

      const response = await fetch(`${apiUrl}/api/v1/whitelabel/website-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save branding settings');
      }

      toast.success('Branding updated successfully');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save branding settings');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSlugHelper = () => {
    if (hasWhitelabel && existingSlug) {
      const brandedDomain = `https://${existingSlug}.${MAIN_DOMAIN.replace(/^https?:\/\//, '')}`;
      return (
        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          <a href={brandedDomain} target="_blank" rel="noreferrer" className="text-primary underline">
            {brandedDomain}
          </a>
        </p>
      );
    }

    return (
      <div className="flex items-center gap-2 mt-2 min-h-[1.5rem]">
        {isCheckingSlug && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {slugError && <p className="text-xs text-destructive">{slugError}</p>}
        {!slugError && slugStatusMessage && (
          <p className="text-xs text-emerald-500">{slugStatusMessage}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extralight tracking-tight text-foreground">Whitelabel</h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Enable your own branded workspace with a custom domain and logo.
        </p>
      </div>

      <div className="settings-card">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <h3 className="settings-card-title">Brand Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Choose your slug, brand name, and logo for the customer-facing experience.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading whitelabel settings...</div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Whitelabel Slug</Label>
              <Input
                value={slug}
                onChange={(event) => {
                  const value = event.target.value.toLowerCase().replace(SLUG_INPUT_REGEX, '');
                  setSlug(value);
                  if (hasWhitelabel) {
                    setIsSlugUnique(true);
                  }
                }}
                disabled={hasWhitelabel || isSaving}
                placeholder="yourcompany"
              />

            </div>

            <div className="space-y-2">
              <Label>Brand Name</Label>
              <Input
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="Your Company Name"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Brand Logo</Label>
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Brand logo" className="w-full h-full object-cover" />
                    ) : (
                      <Shield className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo || isSaving}
                    className="w-full sm:w-auto"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    PNG, JPG or SVG. Max file size 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Stripe Credentials Section */}
            <div className="pt-6 border-t border-border/40">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <h4 className="font-medium text-foreground">Stripe Payment Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    Add your Stripe credentials to accept payments on your branded domain
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Stripe Publishable Key</Label>
                  <Input
                    value={stripePublishableKey}
                    onChange={(e) => setStripePublishableKey(e.target.value)}
                    placeholder="pk_test_... or pk_live_..."
                    disabled={isSaving}
                    type="text"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Stripe publishable key (starts with pk_test_ or pk_live_)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Stripe Secret Key</Label>
                  <Input
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    placeholder="sk_test_... or sk_live_..."
                    disabled={isSaving}
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Stripe secret key (starts with sk_test_ or sk_live_). This will be encrypted.
                  </p>
                </div>
              </div>
            </div>

            {hasWhitelabel && existingSlug ? (
              ""
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">What happens next?</p>
                <p className="mt-2">
                  After activation, you will be logged out and redirected to your branded workspace.
                  Use that domain moving forward to manage your account and invite customers.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={hasWhitelabel ? handleUpdateBranding : handleActivateWhitelabel}
                disabled={
                  isSaving ||
                  isUploadingLogo ||
                  (!hasWhitelabel && (!slug || !brandName.trim()))
                }
              >
                {isSaving
                  ? 'Saving...'
                  : hasWhitelabel
                    ? 'Save Branding Changes'
                    : 'Activate Whitelabel'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhitelabelSettings;

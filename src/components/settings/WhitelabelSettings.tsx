import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Shield, Link2, Loader2, CreditCard, Paintbrush } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugStatusMessage, setSlugStatusMessage] = useState('');
  const [slugError, setSlugError] = useState('');
  const [isSlugUnique, setIsSlugUnique] = useState(false);

  const [stripeAccountStatus, setStripeAccountStatus] = useState<{
    hasAccount: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
  } | null>(null);

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
          }
        }

        // Fetch Stripe account status for current admin (if authenticated)
        const statusHeaders: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          statusHeaders.Authorization = `Bearer ${session.access_token}`;
        }
        try {
          const statusResponse = await fetch(`${apiUrl}/api/v1/whitelabel/stripe/account-status`, {
            method: 'GET',
            headers: statusHeaders
          });
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.success) {
              setStripeAccountStatus({
                hasAccount: !!statusData.hasAccount,
                charges_enabled: !!statusData.charges_enabled,
                payouts_enabled: !!statusData.payouts_enabled
              });
            }
          }
        } catch (statusError) {
          console.error('Error fetching Stripe account status:', statusError);
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
          logo: logoUrl || null
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
        <h2 className="text-2xl font-light tracking-[0.2px] text-foreground">Whitelabel Configuration</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Enable your own branded workspace with a custom domain and logo
        </p>
      </div>

      <Card variant="glass" className="backdrop-blur-xl bg-white/[0.02] border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground">
            <Paintbrush className="w-5 h-5 text-primary" />
            Brand Configuration
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Choose your slug, brand name, and logo for the customer-facing experience
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading whitelabel settings...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Whitelabel Slug</Label>
                <div className="space-y-1">
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
                    className="h-9 backdrop-blur-sm"
                  />
                  {renderSlugHelper()}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Brand Name</Label>
                <Input
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  placeholder="Your Company Name"
                  disabled={isSaving}
                  className="h-9 backdrop-blur-sm"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium text-foreground">Brand Logo</Label>
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] backdrop-blur-sm flex items-center justify-center overflow-hidden hover:border-white/[0.2] transition-all duration-300 group">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Brand logo" className="w-full h-full object-cover" />
                      ) : (
                        <Paintbrush className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                      disabled={isUploadingLogo || isSaving}
                      className="w-full sm:w-auto backdrop-blur-sm bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-200"
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG or SVG. Max file size 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stripe Connect Section */}
              <div className="pt-6 border-t border-white/[0.08]">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-medium text-foreground">Stripe Connect Payouts</h4>
                    <p className="text-sm text-muted-foreground">
                      Connect a Stripe Express account to receive payouts for this whitelabel workspace
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSaving || isStripeLoading}
                      className="backdrop-blur-sm bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-200"
                      onClick={async () => {
                        try {
                          setIsStripeLoading(true);
                          const accessToken = await ensureAuthenticated();

                          // Ensure Stripe account exists
                          const createResp = await fetch(`${apiUrl}/api/v1/whitelabel/stripe/create-account`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${accessToken}`
                            }
                          });
                          const createData = await createResp.json();
                          if (!createResp.ok || !createData.success) {
                            throw new Error(createData.message || 'Failed to create Stripe account');
                          }

                          // Generate onboarding link
                          const linkResp = await fetch(`${apiUrl}/api/v1/whitelabel/stripe/account-link`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${accessToken}`
                            }
                          });
                          const linkData = await linkResp.json();
                          if (!linkResp.ok || !linkData.success) {
                            throw new Error(linkData.message || 'Failed to create Stripe onboarding link');
                          }

                          window.location.href = linkData.url;
                        } catch (error) {
                          console.error('Stripe Connect setup error:', error);
                          toast.error(error instanceof Error ? error.message : 'Failed to start Stripe onboarding');
                        } finally {
                          setIsStripeLoading(false);
                        }
                      }}
                    >
                      {isStripeLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Redirecting to Stripe...
                        </>
                      ) : (
                        'Set up Stripe payouts'
                      )}
                    </Button>
                    {stripeAccountStatus && (
                      <p className="text-xs text-muted-foreground">
                        Status:{' '}
                        {stripeAccountStatus.hasAccount
                          ? stripeAccountStatus.charges_enabled
                            ? 'Payments and payouts enabled'
                            : 'Account created - please finish onboarding in Stripe'
                          : 'Not connected yet'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {(!hasWhitelabel || !existingSlug) && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-sm transition-all hover:border-white/[0.16] hover:bg-white/[0.03]">
                  <p className="font-medium text-foreground">What happens next?</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    After activation, you will be logged out and redirected to your branded workspace.
                    Use that domain moving forward to manage your account and invite customers.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                <Button
                  onClick={hasWhitelabel ? handleUpdateBranding : handleActivateWhitelabel}
                  disabled={
                    isSaving ||
                    isUploadingLogo ||
                    (!hasWhitelabel && (!slug || !brandName.trim()))
                  }
                  className="px-8 backdrop-blur-sm bg-primary/90 hover:bg-primary transition-all duration-200 border border-primary/20"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : hasWhitelabel ? (
                    'Save Branding Changes'
                  ) : (
                    'Activate Whitelabel'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default WhitelabelSettings;

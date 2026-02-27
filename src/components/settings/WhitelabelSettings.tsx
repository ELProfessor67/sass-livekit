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
        <h2 className="text-3xl font-extralight tracking-tight text-foreground">
          White Label Configuration
        </h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Customize your white label branding and appearance
        </p>
      </div>

      <Card variant="glass" className="backdrop-blur-xl bg-white/[0.02] border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl font-medium text-foreground">
            <Paintbrush className="w-5 h-5 text-primary" />
            White Label Branding
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Customize your white label branding and appearance
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              <p className="text-sm font-light">Loading whitelabel configuration...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Brand Logo Section */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-foreground">White Label Icon</Label>
                <div className="flex flex-col sm:flex-row items-start gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] backdrop-blur-sm flex items-center justify-center overflow-hidden hover:border-white/[0.2] transition-all duration-300 group">
                      {logoUrl ? (
                        <img src={logoUrl} alt="White label icon" className="w-full h-full object-cover" />
                      ) : (
                        <Paintbrush className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
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
                      className="backdrop-blur-sm bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-200"
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Icon
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG, or SVG. Max 5MB. Square recommended (512x512px)
                    </p>
                  </div>
                </div>
              </div>

              {/* Brand Name Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">White Label Name</Label>
                <div className="space-y-1.5">
                  <Input
                    value={brandName}
                    onChange={(event) => setBrandName(event.target.value)}
                    placeholder="Your Company Name"
                    disabled={isSaving}
                    className="h-10 backdrop-blur-sm bg-white/[0.02] border-white/[0.08] focus:border-primary/50 transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will appear in your white-labeled interface
                  </p>
                </div>
              </div>

              {/* Slug / Domain Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  White Label Domain
                  <div className="cursor-help text-muted-foreground hover:text-foreground transition-colors">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                </Label>
                <div className="space-y-1.5">
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
                    className="h-10 backdrop-blur-sm bg-white/[0.02] border-white/[0.08] focus:border-primary/50 transition-colors"
                  />
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">
                      Your custom slug for the white label interface
                    </p>
                    {renderSlugHelper()}
                  </div>
                </div>
              </div>

              {/* Activation Status / Info Row */}
              {(!hasWhitelabel || !existingSlug) ? (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.01] p-5 backdrop-blur-sm transition-all hover:border-white/[0.12] group">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-base font-medium text-foreground">Activate White Label</p>
                      <p className="text-sm text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                        Enable white label branding for your workspace
                      </p>
                    </div>
                    <div className="w-12 h-6 rounded-full bg-white/[0.05] border border-white/[0.1] relative flex items-center px-1">
                      <div className="w-4 h-4 rounded-full bg-white/20" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-5 backdrop-blur-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-base font-medium text-foreground">White Label Active</p>
                    <p className="text-sm text-muted-foreground">
                      Your workspace is live at your custom domain
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </div>
                </div>
              )}

              {/* Stripe Connect Section */}
              <div className="pt-8 mt-8 border-t border-white/[0.08]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 rounded-lg bg-primary/10">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Stripe Connect Payouts</h4>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Connect a Stripe Express account to receive payouts for this whitelabel workspace.
                      </p>
                      {stripeAccountStatus && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${stripeAccountStatus.charges_enabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <p className="text-xs font-medium text-muted-foreground capitalize">
                            {stripeAccountStatus.hasAccount
                              ? stripeAccountStatus.charges_enabled
                                ? 'Payments and payouts enabled'
                                : 'Awaiting onboarding completion'
                              : 'Not connected'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSaving || isStripeLoading}
                    className="backdrop-blur-sm bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.2] transition-all"
                    onClick={async () => {
                      try {
                        setIsStripeLoading(true);
                        const accessToken = await ensureAuthenticated();
                        const createResp = await fetch(`${apiUrl}/api/v1/whitelabel/stripe/create-account`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                          }
                        });
                        const createData = await createResp.json();
                        if (!createResp.ok || !createData.success) throw new Error(createData.message || 'Failed to create Stripe account');
                        const linkResp = await fetch(`${apiUrl}/api/v1/whitelabel/stripe/account-link`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                          }
                        });
                        const linkData = await linkResp.json();
                        if (!linkResp.ok || !linkData.success) throw new Error(linkData.message || 'Failed to create Stripe onboarding link');
                        window.location.href = linkData.url;
                      } catch (error) {
                        console.error('Stripe Connect error:', error);
                        toast.error(error instanceof Error ? error.message : 'Failed to start Stripe onboarding');
                      } finally {
                        setIsStripeLoading(false);
                      }
                    }}
                  >
                    {isStripeLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Redirecting...
                      </>
                    ) : stripeAccountStatus?.hasAccount ? (
                      'Manage Stripe Account'
                    ) : (
                      'Set up Payouts'
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={hasWhitelabel ? handleUpdateBranding : handleActivateWhitelabel}
                  disabled={
                    isSaving ||
                    isUploadingLogo ||
                    (!hasWhitelabel && (!slug || !brandName.trim()))
                  }
                  className="px-10 h-11 backdrop-blur-sm bg-primary/90 hover:bg-primary transition-all duration-300 border border-primary/20 shadow-lg shadow-primary/10 font-medium"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving changes...
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

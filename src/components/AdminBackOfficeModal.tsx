import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Check,
  CreditCard,
  Eye,
  FileText,
  Globe,
  Layout,
  Link2,
  Lock,
  LogOut,
  Music2,
  RefreshCw,
  Save,
  Search,
  Shield,
  Star,
  Trash2,
  Users
} from 'lucide-react';
import { AdminAdSlot, AdminConfigState, AdminPageConfig, AdPlacementLocation, AdminUserRecord, PaymentRecord, RequestedArtist } from '../adminTypes';
import { COUNTRIES } from '../data/countries';
import {
  clearAdminActivity,
  fetchAdminActivity,
  fetchAdminConfig,
  fetchAdminPayments,
  fetchAdminUsers,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
  refundAdminPayment,
  refreshAdminArtistPack,
  saveAdminConfig,
  uploadBannerAsset
} from '../utils/adminApi';
import { fetchRequestedArtists } from '../utils/authApi';
import { baseArtistSlug, getArtistChallenges, getGenreChallenges, orderArtistsByFeaturedPriority, TOP_US_FEATURED_ARTIST_SLUGS } from '../utils/challengeCatalog';
import { createDefaultRouteConfig } from '../utils/runtimeConfig';
import { getSafeImageUrl } from '../utils/safeUrl';

type AdminTab = 'overview' | 'seo' | 'ads' | 'integrations' | 'packs' | 'monetization' | 'activity' | 'robots' | 'security';
type SeoTargetType = 'home' | 'country' | 'genre' | 'artist';

interface AdminBackOfficeModalProps {
  onClose: () => void;
  onConfigChanged?: (config: AdminConfigState) => void;
  onRequestedArtistsChanged?: (artists: RequestedArtist[]) => void;
}

const TABS: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'seo', label: 'SEO Pages', icon: Globe },
  { id: 'ads', label: 'Ads', icon: Layout },
  { id: 'integrations', label: 'Google', icon: Search },
  { id: 'packs', label: 'Artist Packs', icon: Music2 },
  { id: 'monetization', label: 'Monetization', icon: CreditCard },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'robots', label: 'Robots', icon: FileText },
  { id: 'security', label: 'Security', icon: Lock }
];

const FEATURED_ARTIST_LIMIT = 24;

const LOCATION_LABELS: Record<AdPlacementLocation, string> = {
  header: 'Top header',
  left_rail: 'Left rail',
  right_rail: 'Right rail',
  under_guess: 'Below guess',
  reveal_modal: 'Reveal modal',
  popup: 'Popup'
};

function buildCanonical(appUrl: string, page: AdminPageConfig): string {
  const cleanBase = appUrl.replace(/\/+$/, '');
  return `${cleanBase}${page.countryCode === 'GLOBAL' ? '/play' : `/play/${page.slug}`}`;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(timestamp));
}

function formatIsoDate(value?: string): string {
  if (!value) return 'Never';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Unknown';
  return formatDate(timestamp);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-bold uppercase tracking-wide text-white/55 mb-1">{children}</label>;
}

function getBannerSizeAdvice(location: AdPlacementLocation): string {
  if (location === 'left_rail' || location === 'right_rail') {
    return 'Best: 160x600 or 300x600 desktop rail. Keep key text centered for laptops.';
  }
  if (location === 'popup') {
    return 'Best: 1080x1080 square or 600x600. Mobile-safe center zone: 320x320.';
  }
  if (location === 'reveal_modal') {
    return 'Best: 300x250 rectangle. Also works on laptop and mobile dialogs.';
  }
  return 'Best: 320x100 mobile banner and 728x90 laptop banner. Use readable text at small size.';
}

export const AdminBackOfficeModal: React.FC<AdminBackOfficeModalProps> = ({
  onClose,
  onConfigChanged,
  onRequestedArtistsChanged
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [config, setConfig] = useState<AdminConfigState | null>(null);
  const [activityLogs, setActivityLogs] = useState<Awaited<ReturnType<typeof fetchAdminActivity>>>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [adminPayments, setAdminPayments] = useState<PaymentRecord[]>([]);
  const [requestedArtists, setRequestedArtists] = useState<RequestedArtist[]>([]);
  const [paymentMeta, setPaymentMeta] = useState({ databaseConfigured: false, stripeConfigured: false });
  const [selectedCountryCode, setSelectedCountryCode] = useState('GLOBAL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [seoTargetType, setSeoTargetType] = useState<SeoTargetType>('country');
  const [selectedGenreSlug, setSelectedGenreSlug] = useState('k-pop');
  const [selectedArtistSlug, setSelectedArtistSlug] = useState('');
  const [artistPackSearch, setArtistPackSearch] = useState('');
  const [refreshingArtistSlug, setRefreshingArtistSlug] = useState('');

  const genreChallenges = useMemo(() => getGenreChallenges(), []);
  const artistChallenges = useMemo(() => getArtistChallenges(), []);
  const artistChoices = useMemo(() => {
    const requestedReady = requestedArtists
      .filter((artist) => artist.status === 'ready' && artist.songsCount > 0)
      .map((artist) => ({
        slug: artist.slug,
        name: artist.name,
        songsCount: artist.songsCount,
        coverImage: artist.coverImage,
        source: 'requested' as const
      }));
    const requestedSlugs = new Set(requestedReady.map((artist) => artist.slug));
    const requestedBaseSlugs = new Set(requestedReady.map((artist) => baseArtistSlug(artist.slug)));
    const catalog = artistChallenges
      .filter((artist) => !requestedSlugs.has(artist.slug) && !requestedBaseSlugs.has(baseArtistSlug(artist.slug)))
      .map((artist) => ({
        ...artist,
        source: 'catalog' as const
      }));
    const seen = new Set<string>();
    return orderArtistsByFeaturedPriority([...requestedReady, ...catalog]).filter((artist) => {
      const key = baseArtistSlug(artist.slug);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [artistChallenges, requestedArtists]);
  const defaultFeaturedArtistSlugs = useMemo(
    () => [
      ...TOP_US_FEATURED_ARTIST_SLUGS.filter((slug) => artistChoices.some((artist) => baseArtistSlug(artist.slug) === slug)),
      ...artistChoices.map((artist) => artist.slug)
    ].filter((slug, index, all) => all.indexOf(slug) === index).slice(0, FEATURED_ARTIST_LIMIT),
    [artistChoices]
  );
  const activeFeaturedArtistSlugs = useMemo(() => {
    const configured = config?.featuredArtistSlugs || [];
    return configured.length > 0 ? configured : defaultFeaturedArtistSlugs;
  }, [config?.featuredArtistSlugs, defaultFeaturedArtistSlugs]);
  const requestedArtistByBaseSlug = useMemo(() => {
    const map = new Map<string, RequestedArtist>();
    requestedArtists.forEach((artist) => {
      map.set(baseArtistSlug(artist.slug), artist);
      map.set(artist.slug, artist);
    });
    return map;
  }, [requestedArtists]);
  const artistPackRows = useMemo(() => {
    const query = artistPackSearch.trim().toLowerCase();
    return artistChoices
      .map((artist) => {
        const requested = requestedArtistByBaseSlug.get(artist.slug) || requestedArtistByBaseSlug.get(baseArtistSlug(artist.slug));
        return {
          ...artist,
          requested,
          songsCount: requested?.songsCount || artist.songsCount || 0,
          coverImage: requested?.coverImage || artist.coverImage
        };
      })
      .filter((artist) => !query || artist.name.toLowerCase().includes(query))
      .slice(0, 80);
  }, [artistChoices, artistPackSearch, requestedArtistByBaseSlug]);

  useEffect(() => {
    if (!selectedArtistSlug && artistChoices[0]) {
      setSelectedArtistSlug(artistChoices[0].slug);
    }
  }, [artistChoices, selectedArtistSlug]);

  useEffect(() => {
    if (activeTab === 'monetization' && isAuthenticated) {
      void handleRefreshMonetization();
    }
  }, [activeTab, isAuthenticated]);

  const selectedRouteKey = useMemo(() => {
    if (seoTargetType === 'home') return 'system:home';
    if (seoTargetType === 'genre') return `genre:${selectedGenreSlug}`;
    if (seoTargetType === 'artist') return `artist:${selectedArtistSlug}`;
    return '';
  }, [selectedArtistSlug, selectedGenreSlug, seoTargetType]);

  const selectedPage = useMemo(() => {
    if (!config) return null;
    if (seoTargetType !== 'country') {
      return config.routeConfigs[selectedRouteKey] || createDefaultRouteConfig(selectedRouteKey, config.appUrl);
    }
    return config.pageConfigs[selectedCountryCode] || config.pageConfigs.GLOBAL;
  }, [config, selectedCountryCode, selectedRouteKey, seoTargetType]);

  const activeAdSlots = useMemo(
    () => config?.adSlots.filter((slot) => slot.enabled).length || 0,
    [config?.adSlots]
  );
  const totalRevenueCents = useMemo(
    () => adminPayments
      .filter((payment) => payment.status !== 'refunded' && !payment.refundedAt)
      .reduce((sum, payment) => sum + payment.amountCents, 0),
    [adminPayments]
  );

  const loadProtectedData = async () => {
    const [nextConfig, nextActivity, usersBody, paymentsBody, requestedBody] = await Promise.all([
      fetchAdminConfig(),
      fetchAdminActivity(),
      fetchAdminUsers().catch(() => ({ users: [], databaseConfigured: false })),
      fetchAdminPayments().catch(() => ({ payments: [], databaseConfigured: false, stripeConfigured: false })),
      fetchRequestedArtists().catch(() => [])
    ]);
    setConfig(nextConfig);
    setActivityLogs(nextActivity);
    setAdminUsers(usersBody.users);
    setAdminPayments(paymentsBody.payments);
    setRequestedArtists(requestedBody);
    onRequestedArtistsChanged?.(requestedBody);
    setPaymentMeta({
      databaseConfigured: usersBody.databaseConfigured && paymentsBody.databaseConfigured,
      stripeConfigured: paymentsBody.stripeConfigured
    });
    onConfigChanged?.(nextConfig);
  };

  useEffect(() => {
    let alive = true;

    getAdminSession()
      .then(async (session) => {
        if (!alive) return;
        setIsConfigured(session.configured);
        setIsAuthenticated(session.authenticated);
        if (session.authenticated) {
          await loadProtectedData();
        }
      })
      .catch((error) => {
        if (!alive) return;
        setAuthError(error instanceof Error ? error.message : 'Failed to check admin session');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      const session = await loginAdmin(username.trim(), password);
      setIsConfigured(session.configured);
      setIsAuthenticated(session.authenticated);
      await loadProtectedData();
      setPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setAuthError(null);

    try {
      const saved = await saveAdminConfig(config);
      setConfig(saved);
      onConfigChanged?.(saved);
      showToast('Changes saved');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch {}
    setIsAuthenticated(false);
    setConfig(null);
    setActivityLogs([]);
  };

  const handleRefreshActivity = async () => {
    try {
      setActivityLogs(await fetchAdminActivity());
      showToast('Activity refreshed');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to refresh activity');
    }
  };

  const handleClearActivity = async () => {
    try {
      await clearAdminActivity();
      setActivityLogs([]);
      showToast('Activity cleared');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to clear activity');
    }
  };

  const handleRefreshMonetization = async () => {
    try {
      const [usersBody, paymentsBody] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminPayments()
      ]);
      setAdminUsers(usersBody.users);
      setAdminPayments(paymentsBody.payments);
      setPaymentMeta({
        databaseConfigured: usersBody.databaseConfigured && paymentsBody.databaseConfigured,
        stripeConfigured: paymentsBody.stripeConfigured
      });
      showToast('Monetization refreshed');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to load monetization data');
    }
  };

  const handleRefundPayment = async (paymentId: string) => {
    try {
      await refundAdminPayment(paymentId);
      await handleRefreshMonetization();
      showToast('Refund requested');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Refund failed');
    }
  };

  const handleManualArtistPackRefresh = async (artist: { slug: string; name: string; requested?: RequestedArtist }) => {
    setRefreshingArtistSlug(artist.slug);
    setAuthError(null);
    try {
      const result = await refreshAdminArtistPack(artist.slug, artist.name, artist.requested?.spotifyArtistId);
      setRequestedArtists(result.artists);
      onRequestedArtistsChanged?.(result.artists);
      showToast(`${result.artist.name} pack updated manually`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Artist pack update failed');
    } finally {
      setRefreshingArtistSlug('');
    }
  };

  const updateConfig = (updater: (current: AdminConfigState) => AdminConfigState) => {
    setConfig((current) => (current ? updater(current) : current));
  };

  const updatePage = (updates: Partial<AdminPageConfig>) => {
    updateConfig((current) => {
      const isCountryTarget = seoTargetType === 'country';
      const routeKey = selectedRouteKey;
      const page = isCountryTarget
        ? current.pageConfigs[selectedCountryCode] || current.pageConfigs.GLOBAL
        : current.routeConfigs[routeKey] || createDefaultRouteConfig(routeKey, current.appUrl);
      const nextPage = {
        ...page,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      if (isCountryTarget && Object.prototype.hasOwnProperty.call(updates, 'slug')) {
        nextPage.slug = selectedCountryCode === 'GLOBAL'
          ? ''
          : String(updates.slug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        nextPage.canonicalUrl = buildCanonical(current.appUrl, nextPage);
      }

      if (!isCountryTarget) {
        nextPage.slug = page.slug;
        nextPage.canonicalUrl = page.canonicalUrl;
      }

      if (!isCountryTarget) {
        return {
          ...current,
          routeConfigs: {
            ...current.routeConfigs,
            [routeKey]: nextPage
          }
        };
      }

      return {
        ...current,
        pageConfigs: {
          ...current.pageConfigs,
          [selectedCountryCode]: nextPage
        }
      };
    });
  };

  const updateSlot = (slotId: string, updates: Partial<AdminAdSlot>) => {
    updateConfig((current) => ({
      ...current,
      adSlots: current.adSlots.map((slot) => (
        slot.id === slotId ? { ...slot, ...updates } : slot
      ))
    }));
  };

  const updateFeaturedArtists = (updater: (currentSlugs: string[]) => string[]) => {
    updateConfig((current) => ({
      ...current,
      featuredArtistSlugs: updater(
        current.featuredArtistSlugs?.length ? current.featuredArtistSlugs : defaultFeaturedArtistSlugs
      ).slice(0, FEATURED_ARTIST_LIMIT),
      updatedAt: new Date().toISOString()
    }));
  };

  const toggleFeaturedArtist = (slug: string) => {
    const baseSlug = baseArtistSlug(slug);
    updateFeaturedArtists((currentSlugs) => (
      currentSlugs.includes(slug) || currentSlugs.includes(baseSlug)
        ? currentSlugs.filter((item) => item !== slug && item !== baseSlug)
        : [...currentSlugs, slug]
    ));
  };

  const handleBannerUpload = async (slotId: string, file: File | null) => {
    if (!file || !config) return;
    if (!file.type.startsWith('image/')) {
      setAuthError('Banner upload must be an image file.');
      return;
    }
    if (file.size > 1_500_000) {
      setAuthError('Banner image must be under 1.5 MB.');
      return;
    }

    setSaving(true);
    setAuthError(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read banner file'));
        reader.readAsDataURL(file);
      });
      const url = await uploadBannerAsset(dataUrl);
      const nextConfig: AdminConfigState = {
        ...config,
        adSlots: config.adSlots.map((slot) => (
          slot.id === slotId
            ? { ...slot, bannerImageUrl: url, type: 'manual_banner', enabled: true }
            : slot
        )),
        updatedAt: new Date().toISOString()
      };
      setConfig(nextConfig);
      const saved = await saveAdminConfig(nextConfig);
      setConfig(saved);
      onConfigChanged?.(saved);
      showToast('Banner uploaded and saved');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Banner upload failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
        <div className="w-full max-w-sm bg-[#111714] border border-white/15 rounded-2xl p-6 text-center shadow-2xl">
          <RefreshCw className="w-6 h-6 text-[#00e676] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Checking admin session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
        <div className="relative w-full max-w-sm bg-[#111714] border border-white/20 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-[#00e676]/15 border border-[#00e676]/30 flex items-center justify-center text-[#00e676]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Back Office</h3>
              <p className="text-xs text-white/45">Server authenticated admin area</p>
            </div>
          </div>

          {!isConfigured && (
            <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-100">
              Set <code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD</code>, and a 32+ character
              <code> ADMIN_SESSION_SECRET</code> in the server environment.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <FieldLabel>Username</FieldLabel>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoFocus
                autoComplete="username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b100d] border border-white/15 text-white text-sm focus:outline-none focus:border-[#00e676]"
              />
            </div>

            <div>
              <FieldLabel>Password</FieldLabel>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b100d] border border-white/15 text-white text-sm focus:outline-none focus:border-[#00e676]"
              />
            </div>

            {authError && <p className="text-xs font-semibold text-red-400">{authError}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !isConfigured}
                className="flex-1 py-2.5 rounded-xl bg-[#00e676] disabled:bg-white/10 disabled:text-white/30 hover:bg-[#1fe682] text-black text-xs font-black transition-colors cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-[#101613] border border-white/20 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#141c17]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#00e676]/15 border border-[#00e676]/35 flex items-center justify-center text-[#00e676]">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                Song Guess Back Office
              </h2>
              <p className="text-xs text-white/45 truncate">
                SEO routes, Google integrations, ad placements, and player activity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {toast && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-[#00e676] font-bold">
                <Check className="w-3.5 h-3.5" /> {toast}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-3 rounded-xl bg-[#00e676] hover:bg-[#1fe682] disabled:opacity-60 text-black text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving' : 'Save'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/65 hover:text-white flex items-center justify-center cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/65 hover:text-white flex items-center justify-center cursor-pointer"
              title="Close"
            >
              x
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-[#0b100d] text-xs overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#00e676] text-black'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {authError && (
          <div className="mx-4 mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
            {authError}
          </div>
        )}

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-h-[72vh]">
          {activeTab === 'overview' && (
            <div className="space-y-4 text-left">
              <div className="rounded-2xl border border-white/10 bg-[#f7faf8] p-4 text-slate-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black">Overview</h3>
                    <p className="text-xs font-semibold text-slate-500">Weekly pass revenue, users, catalog, ads, and player activity.</p>
                  </div>
                  <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-black">
                    <span className="rounded-lg bg-white px-3 py-1.5 shadow-sm">Weekly</span>
                    <span className="px-3 py-1.5 text-slate-500">Monthly</span>
                    <span className="px-3 py-1.5 text-slate-500">Yearly</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-4 md:divide-x md:divide-y-0">
                  {[
                    ['Total revenue', `$${(totalRevenueCents / 100).toFixed(2)}`, '+ weekly passes'],
                    ['Active users', `${adminUsers.length}`, '+ accounts'],
                    ['Catalog routes', `${Object.keys(config.pageConfigs).length + Object.keys(config.routeConfigs).length}`, '+ SEO pages'],
                    ['Activity records', `${activityLogs.length}`, '+ sessions']
                  ].map(([label, value, delta]) => (
                    <div key={label} className="p-5">
                      <p className="text-xs font-bold text-slate-500">{label}</p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
                      <p className="mt-1 text-xs font-black text-emerald-600">{delta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                ['Public URL', config.appUrl, Globe],
                ['Country routes', `${Object.keys(config.pageConfigs).length}`, Link2],
                ['Active ads', `${activeAdSlots}`, Layout],
                ['Activity records', `${activityLogs.length}`, Activity]
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                  <Icon className="w-5 h-5 text-[#00e676] mb-3" />
                  <p className="text-[11px] uppercase tracking-wide text-white/40 font-bold">{label as string}</p>
                  <p className="text-sm font-black text-white mt-1 break-words">{value as string}</p>
                </div>
              ))}

              <div className="md:col-span-4 rounded-2xl border border-white/10 bg-[#111b16] p-4">
                <h3 className="text-sm font-black text-white mb-2">Security status</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Admin access is protected by server-side credentials, an HttpOnly signed session cookie,
                  and CSRF tokens for all write actions. Public visitors only receive sanitized SEO, ad,
                  and Google integration settings.
                </p>
              </div>
              </div>
            </div>
          )}

          {activeTab === 'seo' && selectedPage && (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 text-left">
              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-3 max-h-[56vh] overflow-y-auto space-y-3">
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#151d18] p-1">
                  {(['home', 'country', 'genre', 'artist'] as SeoTargetType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSeoTargetType(type)}
                      className={`rounded-lg px-2 py-1.5 text-[11px] font-black capitalize cursor-pointer ${
                        seoTargetType === type ? 'bg-[#00e676] text-black' : 'text-white/55 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {seoTargetType === 'home' && (
                  <div className="rounded-xl border border-[#00e676]/25 bg-[#00e676]/8 p-3">
                    <p className="text-xs font-black text-white">Home page SEO</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/45">
                      Controls the title, meta description, H1, intro text, and social image for the main domain.
                    </p>
                  </div>
                )}

                {seoTargetType === 'country' && COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => setSelectedCountryCode(country.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-bold cursor-pointer ${
                      selectedCountryCode === country.code
                        ? 'bg-[#00e676] text-black'
                        : 'text-white/65 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}

                {seoTargetType === 'genre' && genreChallenges.map((genre) => (
                  <button
                    key={genre.slug}
                    onClick={() => setSelectedGenreSlug(genre.slug)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-bold cursor-pointer ${
                      selectedGenreSlug === genre.slug
                        ? 'bg-[#00e676] text-black'
                        : 'text-white/65 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{genre.name}</span>
                    <span className="font-mono text-[10px] opacity-70">{genre.songsCount}</span>
                  </button>
                ))}

                {seoTargetType === 'artist' && (
                  <>
                    <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-yellow-200">
                            Featured artist menu
                          </p>
                          <p className="mt-1 text-[11px] text-white/45">
                            Star artists to show in the public top menu.
                          </p>
                        </div>
                        <span className="rounded-full bg-white/8 px-2 py-1 font-mono text-[10px] font-black text-white/60">
                          {activeFeaturedArtistSlugs.length}/{FEATURED_ARTIST_LIMIT}
                        </span>
                      </div>
                      <button
                        onClick={() => updateFeaturedArtists(() => defaultFeaturedArtistSlugs)}
                        className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black text-white/65 hover:bg-white/10 hover:text-white cursor-pointer"
                      >
                        Reset to top catalog artists
                      </button>
                    </div>

                    {artistChoices.map((artist) => {
                      const isFeatured =
                        activeFeaturedArtistSlugs.includes(artist.slug) ||
                        activeFeaturedArtistSlugs.includes(baseArtistSlug(artist.slug));
                      return (
                        <div
                          key={artist.slug}
                          className={`w-full flex items-center gap-1 rounded-xl ${
                            selectedArtistSlug === artist.slug ? 'bg-[#00e676]' : 'bg-transparent'
                          }`}
                        >
                          <button
                            onClick={() => setSelectedArtistSlug(artist.slug)}
                            className={`min-w-0 flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-bold cursor-pointer ${
                              selectedArtistSlug === artist.slug
                                ? 'text-black'
                                : 'text-white/65 hover:bg-white/8 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{artist.name}</span>
                            <span className="flex shrink-0 items-center gap-1">
                              {artist.source === 'requested' && (
                                <span className="rounded-full bg-black/20 px-1.5 py-0.5 font-mono text-[9px] uppercase opacity-80">
                                  requested
                                </span>
                              )}
                              <span className="font-mono text-[10px] opacity-70">{artist.songsCount}</span>
                            </span>
                          </button>
                          <button
                            onClick={() => toggleFeaturedArtist(artist.slug)}
                            disabled={!isFeatured && activeFeaturedArtistSlugs.length >= FEATURED_ARTIST_LIMIT}
                            className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border cursor-pointer ${
                              isFeatured
                                ? 'border-yellow-300 bg-yellow-300 text-black'
                                : 'border-white/10 bg-white/5 text-white/35 hover:text-yellow-200 hover:border-yellow-300/50 disabled:opacity-25 disabled:cursor-not-allowed'
                            }`}
                            title={isFeatured ? 'Remove from featured artists' : 'Add to featured artists'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFeatured ? 'fill-black' : ''}`} />
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Route slug</FieldLabel>
                    <input
                      value={selectedPage.slug}
                      disabled={seoTargetType !== 'country' || selectedCountryCode === 'GLOBAL'}
                      onChange={(event) => updatePage({ slug: event.target.value })}
                      placeholder={seoTargetType === 'country' ? 'country-name' : 'managed route'}
                      className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676] disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <FieldLabel>Canonical link</FieldLabel>
                    <input
                      value={seoTargetType === 'country' ? buildCanonical(config.appUrl, selectedPage) : selectedPage.canonicalUrl}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white/60 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Page title</FieldLabel>
                  <input
                    value={selectedPage.pageTitle}
                    onChange={(event) => updatePage({ pageTitle: event.target.value, socialTitle: event.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                  />
                </div>

                <div>
                  <FieldLabel>Meta description</FieldLabel>
                  <textarea
                    rows={3}
                    value={selectedPage.metaDescription}
                    onChange={(event) => updatePage({ metaDescription: event.target.value, socialDescription: event.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                  />
                </div>

                <div>
                  <FieldLabel>Keywords</FieldLabel>
                  <input
                    value={selectedPage.keywords}
                    onChange={(event) => updatePage({ keywords: event.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Page heading</FieldLabel>
                    <input
                      value={selectedPage.customHeading || ''}
                      onChange={(event) => updatePage({ customHeading: event.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                    />
                  </div>
                  <div>
                    <FieldLabel>Social image URL</FieldLabel>
                    <input
                      value={selectedPage.socialImageUrl || ''}
                      onChange={(event) => updatePage({ socialImageUrl: event.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Intro content</FieldLabel>
                  <textarea
                    rows={2}
                    value={selectedPage.customIntroText || ''}
                    onChange={(event) => updatePage({ customIntroText: event.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="max-w-3xl space-y-4 text-left">
              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                <FieldLabel>Public site URL for sharing and generated score cards</FieldLabel>
                <input
                  value={config.appUrl}
                  onChange={(event) => updateConfig((current) => ({ ...current, appUrl: event.target.value }))}
                  placeholder="https://your-domain.com"
                  className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-white">Microsoft Clarity</h3>
                    <p className="text-xs text-white/45">Loads Clarity for heatmaps, recordings, and UX diagnostics.</p>
                  </div>
                  <button
                    onClick={() => updateConfig((current) => ({
                      ...current,
                      integrations: {
                        ...current.integrations,
                        clarityEnabled: !current.integrations.clarityEnabled
                      }
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                      config.integrations.clarityEnabled ? 'bg-[#00e676] text-black' : 'bg-white/10 text-white/55'
                    }`}
                  >
                    {config.integrations.clarityEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <input
                  value={config.integrations.microsoftClarityProjectId}
                  onChange={(event) => updateConfig((current) => ({
                    ...current,
                    integrations: {
                      ...current.integrations,
                      microsoftClarityProjectId: event.target.value
                    }
                  }))}
                  placeholder="Clarity project ID"
                  className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-white">Google Analytics 4</h3>
                    <p className="text-xs text-white/45">Loads gtag.js and sends SPA page views.</p>
                  </div>
                  <button
                    onClick={() => updateConfig((current) => ({
                      ...current,
                      integrations: {
                        ...current.integrations,
                        analyticsEnabled: !current.integrations.analyticsEnabled
                      }
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                      config.integrations.analyticsEnabled ? 'bg-[#00e676] text-black' : 'bg-white/10 text-white/55'
                    }`}
                  >
                    {config.integrations.analyticsEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <input
                  value={config.integrations.googleAnalyticsMeasurementId}
                  onChange={(event) => updateConfig((current) => ({
                    ...current,
                    integrations: {
                      ...current.integrations,
                      googleAnalyticsMeasurementId: event.target.value
                    }
                  }))}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-white">Google AdSense</h3>
                    <p className="text-xs text-white/45">Manual banner slots can remain active when AdSense is disabled.</p>
                  </div>
                  <button
                    onClick={() => updateConfig((current) => ({
                      ...current,
                      integrations: {
                        ...current.integrations,
                        adsenseEnabled: !current.integrations.adsenseEnabled
                      }
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                      config.integrations.adsenseEnabled ? 'bg-[#00e676] text-black' : 'bg-white/10 text-white/55'
                    }`}
                  >
                    {config.integrations.adsenseEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <input
                  value={config.integrations.googleAdsenseClientId}
                  onChange={(event) => updateConfig((current) => ({
                    ...current,
                    integrations: {
                      ...current.integrations,
                      googleAdsenseClientId: event.target.value
                    }
                  }))}
                  placeholder="ca-pub-0000000000000000"
                  className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                <FieldLabel>Search Console verification token</FieldLabel>
                <input
                  value={config.integrations.searchConsoleVerification}
                  onChange={(event) => updateConfig((current) => ({
                    ...current,
                    integrations: {
                      ...current.integrations,
                      searchConsoleVerification: event.target.value
                    }
                  }))}
                  placeholder="google-site-verification token"
                  className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                />
              </div>
            </div>
          )}

          {activeTab === 'ads' && (
            <div className="space-y-3 text-left">
              {config.adSlots.map((slot) => (
                <div key={slot.id} className="rounded-2xl border border-white/10 bg-[#0b100d] p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-white">{slot.name}</h3>
                      <p className="text-xs text-white/45">{LOCATION_LABELS[slot.location]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={slot.type}
                        onChange={(event) => updateSlot(slot.id, { type: event.target.value as AdminAdSlot['type'] })}
                        className="px-3 py-1.5 rounded-lg bg-[#151d18] border border-white/10 text-white text-xs"
                      >
                        <option value="adsense">AdSense</option>
                        <option value="manual_banner">Manual banner</option>
                      </select>
                      <button
                        onClick={() => updateSlot(slot.id, { enabled: !slot.enabled })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                          slot.enabled ? 'bg-[#00e676] text-black' : 'bg-white/10 text-white/55'
                        }`}
                      >
                        {slot.enabled ? 'Active' : 'Off'}
                      </button>
                    </div>
                  </div>

                  {slot.type === 'adsense' ? (
                    <div>
                      <FieldLabel>AdSense slot ID</FieldLabel>
                      <input
                        value={slot.adsenseSlot || ''}
                        onChange={(event) => updateSlot(slot.id, { adsenseSlot: event.target.value })}
                        placeholder="1234567890"
                        className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[#00e676]/20 bg-[#00e676]/5 px-3 py-2 text-xs text-white/65">
                        {getBannerSizeAdvice(slot.location)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1fr] gap-3">
                        <div>
                          <FieldLabel>Image URL or upload</FieldLabel>
                          <input
                            value={slot.bannerImageUrl || ''}
                            onChange={(event) => updateSlot(slot.id, { bannerImageUrl: event.target.value })}
                            placeholder="https://... or /uploads/banner.png"
                            className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                          />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(event) => void handleBannerUpload(slot.id, event.target.files?.[0] || null)}
                            className="mt-2 block w-full text-[11px] text-white/50 file:mr-3 file:rounded-lg file:border-0 file:bg-[#00e676] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-black"
                          />
                        </div>
                        <div>
                          <FieldLabel>Click URL</FieldLabel>
                          <input
                            value={slot.bannerLinkUrl || ''}
                            onChange={(event) => updateSlot(slot.id, { bannerLinkUrl: event.target.value })}
                            placeholder="https://..."
                            className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                          />
                        </div>
                        <div>
                          <FieldLabel>Alt text</FieldLabel>
                          <input
                            value={slot.bannerAltText || ''}
                            onChange={(event) => updateSlot(slot.id, { bannerAltText: event.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#151d18] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00e676]"
                          />
                        </div>
                      </div>

                      {getSafeImageUrl(slot.bannerImageUrl) && (
                        <div className="rounded-xl border border-white/10 bg-[#151d18] p-2">
                          <img
                            src={getSafeImageUrl(slot.bannerImageUrl) || ''}
                            alt={slot.bannerAltText || 'Manual banner preview'}
                            className="max-h-32 w-full rounded-lg object-contain bg-black/30"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'packs' && (
            <div className="space-y-4 text-left">
              <div className="rounded-2xl border border-[#00e676]/20 bg-[#0d1a13] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-white">
                      <Music2 className="h-4 w-4 text-[#00e676]" />
                      Manual artist pack updates
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      Refresh an artist from Spotify when the pack has too few songs. Manual updates replace the stored pack and become the latest update date used across menus, archives, popups, artist pages, and sitemap.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/55">
                    {requestedArtists.filter((artist) => artist.status === 'ready').length} Spotify-built packs
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={artistPackSearch}
                  onChange={(event) => setArtistPackSearch(event.target.value)}
                  placeholder="Search artist packs..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b100d] pl-10 pr-3 text-sm text-white outline-none focus:border-[#00e676]"
                />
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {artistPackRows.map((artist) => {
                  const isRefreshing = refreshingArtistSlug === artist.slug;
                  const sourceLabel = artist.requested
                    ? artist.requested.lastRefreshType === 'manual'
                      ? 'Manual'
                      : artist.requested.lastRefreshType === 'automatic'
                      ? 'Automatic'
                      : 'Spotify'
                    : 'Catalog';
                  return (
                    <div key={artist.slug} className="rounded-2xl border border-white/10 bg-[#0b100d] p-3">
                      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                        <img
                          src={getSafeImageUrl(artist.coverImage) || ''}
                          alt=""
                          className="h-16 w-16 rounded-xl bg-black/30 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-black text-white">{artist.name}</h4>
                              <p className="mt-1 text-xs text-white/45">
                                {artist.songsCount} songs • {sourceLabel} update
                              </p>
                            </div>
                            <button
                              onClick={() => void handleManualArtistPackRefresh(artist)}
                              disabled={Boolean(refreshingArtistSlug)}
                              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#00e676] px-3 text-xs font-black text-black hover:bg-[#1fe682] disabled:cursor-wait disabled:opacity-50"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                              {isRefreshing ? 'Updating' : 'Update'}
                            </button>
                          </div>
                          <div className="mt-3 grid gap-2 text-[11px] text-white/55 sm:grid-cols-2">
                            <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                              <span className="block text-white/30">Last update</span>
                              <strong className="font-bold text-white/75">{formatIsoDate(artist.requested?.updatedAt || artist.requested?.createdAt)}</strong>
                            </div>
                            <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                              <span className="block text-white/30">Next automatic</span>
                              <strong className="font-bold text-white/75">{formatIsoDate(artist.requested?.nextRefreshAt)}</strong>
                            </div>
                          </div>
                          {artist.requested?.songs && artist.requested.songs.length > 0 && (
                            <p className="mt-2 truncate text-[11px] text-white/40">
                              {artist.requested.songs.slice(0, 4).map((song) => song.title).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {artistPackRows.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-8 text-center text-xs text-white/45">
                  No artist packs match that search.
                </div>
              )}
            </div>
          )}

          {activeTab === 'monetization' && (
            <div className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                  <Users className="w-5 h-5 text-[#00e676] mb-3" />
                  <p className="text-[11px] uppercase tracking-wide text-white/40 font-bold">Users</p>
                  <p className="text-xl font-black text-white mt-1">{adminUsers.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                  <CreditCard className="w-5 h-5 text-[#00e676] mb-3" />
                  <p className="text-[11px] uppercase tracking-wide text-white/40 font-bold">Payments</p>
                  <p className="text-xl font-black text-white mt-1">{adminPayments.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                  <Check className="w-5 h-5 text-[#00e676] mb-3" />
                  <p className="text-[11px] uppercase tracking-wide text-white/40 font-bold">Postgres</p>
                  <p className="text-sm font-black text-white mt-1">{paymentMeta.databaseConfigured ? 'Configured' : 'Missing'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                  <Lock className="w-5 h-5 text-[#00e676] mb-3" />
                  <p className="text-[11px] uppercase tracking-wide text-white/40 font-bold">Stripe</p>
                  <p className="text-sm font-black text-white mt-1">{paymentMeta.stripeConfigured ? 'Configured' : 'Missing keys'}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#00e676]/20 bg-[#0d1a13] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-white">Weekly access product</h3>
                    <p className="mt-1 text-xs text-white/55">
                      $3.99 one-time payment gives 7 days of unlimited play, full catalog access, and hidden ads.
                    </p>
                  </div>
                  <button
                    onClick={handleRefreshMonetization}
                    className="h-9 rounded-lg bg-[#00e676] px-3 text-xs font-black text-black hover:bg-[#1fe682]"
                  >
                    Refresh
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-white/60">
                  <code className="rounded-lg bg-black/25 p-2">DATABASE_URL={paymentMeta.databaseConfigured ? 'set' : 'missing'}</code>
                  <code className="rounded-lg bg-black/25 p-2">STRIPE_SECRET_KEY={paymentMeta.stripeConfigured ? 'set' : 'missing'}</code>
                  <code className="rounded-lg bg-black/25 p-2">STRIPE_WEBHOOK_SECRET=required for live grants</code>
                  <code className="rounded-lg bg-black/25 p-2">VITE_STRIPE_PUBLISHABLE_KEY=client reference</code>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                  <h3 className="text-sm font-black text-white mb-3">Users and access</h3>
                  {adminUsers.length === 0 ? (
                    <p className="rounded-xl bg-white/5 p-4 text-xs text-white/45">No users found, or Postgres is not configured.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {adminUsers.map((user) => (
                        <div key={user.id} className="rounded-xl border border-white/10 bg-[#121915] p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-black text-white">{user.email}</p>
                              <p className="text-white/45">{user.name || 'Player'} • {user.emailVerified ? 'verified' : 'unverified'}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-wide text-[#00e676]/80">
                                MailerSend: {user.mailerSendRegisteredAt ? `${user.mailerSendRegistrationSource || 'account'} sync` : 'not synced'}
                              </p>
                            </div>
                            <span className="rounded-full bg-white/5 px-2 py-1 font-mono text-[10px] text-white/55">
                              {user.accessUntil ? `until ${new Date(user.accessUntil).toLocaleDateString()}` : 'free'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                  <h3 className="text-sm font-black text-white mb-3">Payments and refunds</h3>
                  {adminPayments.length === 0 ? (
                    <p className="rounded-xl bg-white/5 p-4 text-xs text-white/45">No payments recorded yet.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {adminPayments.map((payment) => (
                        <div key={payment.id} className="rounded-xl border border-white/10 bg-[#121915] p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-black text-white">{payment.email}</p>
                              <p className="font-mono text-white/45">
                                ${(payment.amountCents / 100).toFixed(2)} {payment.currency.toUpperCase()} • {payment.status}
                              </p>
                            </div>
                            <button
                              onClick={() => void handleRefundPayment(payment.id)}
                              disabled={Boolean(payment.refundedAt) || !paymentMeta.stripeConfigured}
                              className="rounded-lg border border-red-400/25 bg-red-400/10 px-2.5 py-1.5 text-[11px] font-black text-red-200 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              {payment.refundedAt ? 'Refunded' : 'Refund'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white">Player activity</h3>
                  <p className="text-xs text-white/45">Game completions recorded by the server.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefreshActivity}
                    className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                  <button
                    onClick={handleClearActivity}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              {activityLogs.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-8 text-center text-xs text-white/45">
                  No server activity has been recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {activityLogs.map((log) => {
                    const country = COUNTRIES.find((item) => item.code === log.countryCode);
                    return (
                      <div key={log.id} className="rounded-xl border border-white/10 bg-[#0b100d] p-3 grid grid-cols-1 md:grid-cols-[1fr_120px_160px] gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-white font-bold">
                            <span>{country?.flag || '🌍'}</span>
                            <span>{log.nickname || 'Anonymous'}</span>
                            <span className="text-white/35 font-mono">{log.mode}</span>
                          </div>
                          <p className="text-white/45 truncate">{log.collectionTitle || 'Daily quiz'} • {log.path || '/'}</p>
                        </div>
                        <div className="text-[#00e676] font-mono font-black">
                          {log.points} pts
                          <span className="block text-white/45 font-normal">{log.correctCount}/{log.totalRounds} correct</span>
                        </div>
                        <div className="text-white/45 md:text-right">
                          {formatDate(log.timestamp)}
                          <span className="block">{log.durationSeconds}s</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'robots' && (
            <div className="max-w-3xl space-y-4 text-left">
              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00e676]" />
                  robots.txt
                </h3>
                <p className="text-xs text-white/45 mt-1">
                  Leave empty to use the automatic default with the generated sitemap URL.
                </p>
              </div>

              <textarea
                rows={14}
                value={config.robotsTxt || ''}
                onChange={(event) => updateConfig((current) => ({
                  ...current,
                  robotsTxt: event.target.value
                }))}
                placeholder={`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${config.appUrl.replace(/\/+$/, '')}/sitemap.xml`}
                className="w-full rounded-2xl bg-[#0b100d] border border-white/10 p-4 font-mono text-xs text-white focus:outline-none focus:border-[#00e676]"
              />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-3xl space-y-4 text-left">
              <div className="rounded-2xl border border-[#00e676]/25 bg-[#0d1a13] p-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00e676]" />
                  Server authentication enabled
                </h3>
                <p className="text-xs text-white/60 mt-2 leading-relaxed">
                  Admin credentials are read from environment variables and are never stored in browser
                  localStorage. Change <code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD</code>,
                  <code> ADMIN_SESSION_SECRET</code>, and <code>ADMIN_ACCESS_PATH</code> on the server,
                  then restart the app.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-white/70">
                  <Check className="w-4 h-4 text-[#00e676]" />
                  HttpOnly signed session cookie
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Check className="w-4 h-4 text-[#00e676]" />
                  CSRF token required for writes
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Check className="w-4 h-4 text-[#00e676]" />
                  Server-side input sanitization
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Eye className="w-4 h-4 text-[#00e676]" />
                  Hidden access route from env
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3.5 border-t border-white/10 bg-[#0b100d] flex items-center justify-between text-xs text-white/45">
          <span>Config v{config.version} • {config.appUrl}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

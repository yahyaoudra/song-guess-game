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
import { AdminAdSlot, AdminConfigState, AdminEmailEvent, AdminFeatureAnalytics, AdminPageConfig, AdminUserProfile, AdminUserSegments, AdPlacementLocation, AdminUserRecord, PaymentRecord, RequestedArtist } from '../adminTypes';
import { COUNTRIES } from '../data/countries';
import {
  clearAdminActivity,
  fetchAdminActivity,
  fetchAdminConfig,
  fetchAdminEmailEvents,
  fetchAdminFeatureAnalytics,
  fetchAdminUserProfile,
  fetchAdminUserSegments,
  fetchAdminPayments,
  fetchAdminUsers,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
  refundAdminPayment,
  refreshAdminArtistPack,
  retryAdminEmail,
  saveAdminConfig,
  executeQueuedArtistRequest,
  uploadBannerAsset
} from '../utils/adminApi';
import { fetchRequestedArtists } from '../utils/authApi';
import { baseArtistSlug, getArtistChallenges, getGenreChallenges, orderArtistsByFeaturedPriority, TOP_US_FEATURED_ARTIST_SLUGS } from '../utils/challengeCatalog';
import { createDefaultRouteConfig } from '../utils/runtimeConfig';
import { getSafeImageUrl } from '../utils/safeUrl';

type AdminTab = 'overview' | 'seo' | 'ads' | 'integrations' | 'packs' | 'monetization' | 'activity' | 'robots' | 'security';
type SeoTargetType = 'home' | 'country' | 'genre' | 'artist';
type ArtistPackSort = 'name-asc' | 'name-desc' | 'songs-desc' | 'songs-asc' | 'updated-desc' | 'updated-asc' | 'played-desc';
type ArtistPackStatusFilter = 'all' | 'ready' | 'queued' | 'pending' | 'needs-update';
type ArtistPackSourceFilter = 'all' | 'spotify' | 'catalog';

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
  const [adminUserTotal, setAdminUserTotal] = useState(0);
  const [adminPayments, setAdminPayments] = useState<PaymentRecord[]>([]);
  const [adminEmailEvents, setAdminEmailEvents] = useState<AdminEmailEvent[]>([]);
  const [adminSegments, setAdminSegments] = useState<AdminUserSegments | null>(null);
  const [adminFeatureAnalytics, setAdminFeatureAnalytics] = useState<AdminFeatureAnalytics | null>(null);
  const [selectedAdminUserProfile, setSelectedAdminUserProfile] = useState<AdminUserProfile | null>(null);
  const [loadingUserProfileId, setLoadingUserProfileId] = useState('');
  const [retryingEmailId, setRetryingEmailId] = useState('');
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
  const [artistPackSort, setArtistPackSort] = useState<ArtistPackSort>('updated-desc');
  const [artistPackStatusFilter, setArtistPackStatusFilter] = useState<ArtistPackStatusFilter>('all');
  const [artistPackSourceFilter, setArtistPackSourceFilter] = useState<ArtistPackSourceFilter>('all');
  const [artistPackPage, setArtistPackPage] = useState(1);
  const [artistPackPageSize, setArtistPackPageSize] = useState(24);
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
    const playedCounts = new Map<string, number>();
    activityLogs.forEach((log) => {
      const source = `${log.collectionTitle || ''} ${log.path || ''}`.toLowerCase();
      artistChallenges.forEach((artist) => {
        const base = baseArtistSlug(artist.slug);
        if (source.includes(base) || source.includes(artist.name.toLowerCase())) {
          playedCounts.set(base, (playedCounts.get(base) || 0) + 1);
        }
      });
      requestedArtists.forEach((artist) => {
        const base = baseArtistSlug(artist.slug);
        if (source.includes(base) || source.includes(artist.name.toLowerCase())) {
          playedCounts.set(base, (playedCounts.get(base) || 0) + 1);
        }
      });
    });
    const requestedRows = requestedArtists.map((artist) => ({
      slug: artist.slug,
      name: artist.name,
      songsCount: artist.songsCount || artist.songs?.length || 0,
      coverImage: artist.coverImage || artist.songs?.[0]?.artworkUrl || '',
      requested: artist,
      source: 'spotify' as const,
      status: artist.status || 'pending',
      updatedAt: artist.updatedAt || artist.createdAt || '',
      nextRefreshAt: artist.nextRefreshAt || '',
      playedCount: playedCounts.get(baseArtistSlug(artist.slug)) || 0,
      sampleText: artist.songs?.slice(0, 4).map((song) => song.title).join(' • ') || ''
    }));
    const requestedBaseSlugs = new Set(requestedRows.map((artist) => baseArtistSlug(artist.slug)));
    const catalogRows = artistChallenges
      .filter((artist) => !requestedBaseSlugs.has(baseArtistSlug(artist.slug)))
      .map((artist) => ({
        slug: artist.slug,
        name: artist.name,
        songsCount: artist.songsCount || artist.songIds.length || 0,
        coverImage: artist.coverImage,
        requested: undefined as RequestedArtist | undefined,
        source: 'catalog' as const,
        status: 'catalog',
        updatedAt: '',
        nextRefreshAt: '',
        playedCount: playedCounts.get(baseArtistSlug(artist.slug)) || 0,
        sampleText: ''
      }));
    return [...requestedRows, ...catalogRows]
      .filter((artist) => {
        const sourceMatches = artistPackSourceFilter === 'all'
          || (artistPackSourceFilter === 'spotify' && artist.source === 'spotify')
          || (artistPackSourceFilter === 'catalog' && artist.source === 'catalog');
        const statusMatches = artistPackStatusFilter === 'all'
          || (artistPackStatusFilter === 'needs-update' ? artist.songsCount < 10 : artist.status === artistPackStatusFilter);
        const queryMatches = !query
          || artist.name.toLowerCase().includes(query)
          || artist.slug.toLowerCase().includes(query)
          || artist.sampleText.toLowerCase().includes(query)
          || artist.requested?.spotifyArtistId?.toLowerCase().includes(query);
        return sourceMatches && statusMatches && queryMatches;
      })
      .sort((left, right) => {
        if (artistPackSort === 'name-asc') return left.name.localeCompare(right.name);
        if (artistPackSort === 'name-desc') return right.name.localeCompare(left.name);
        if (artistPackSort === 'songs-desc') return right.songsCount - left.songsCount || left.name.localeCompare(right.name);
        if (artistPackSort === 'songs-asc') return left.songsCount - right.songsCount || left.name.localeCompare(right.name);
        if (artistPackSort === 'played-desc') return right.playedCount - left.playedCount || left.name.localeCompare(right.name);
        const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
        const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
        return artistPackSort === 'updated-asc'
          ? leftTime - rightTime || left.name.localeCompare(right.name)
          : rightTime - leftTime || left.name.localeCompare(right.name);
      });
  }, [activityLogs, artistChallenges, artistPackSearch, artistPackSort, artistPackSourceFilter, artistPackStatusFilter, requestedArtists]);

  const artistPackTotalPages = Math.max(1, Math.ceil(artistPackRows.length / artistPackPageSize));
  const safeArtistPackPage = Math.min(artistPackPage, artistPackTotalPages);
  const paginatedArtistPackRows = useMemo(() => {
    const start = (safeArtistPackPage - 1) * artistPackPageSize;
    return artistPackRows.slice(start, start + artistPackPageSize);
  }, [artistPackPageSize, artistPackRows, safeArtistPackPage]);

  useEffect(() => {
    setArtistPackPage(1);
  }, [artistPackSearch, artistPackSort, artistPackSourceFilter, artistPackStatusFilter, artistPackPageSize]);

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
    const [nextConfig, nextActivity, usersBody, paymentsBody, requestedBody, segmentsBody, emailEvents, featureAnalytics] = await Promise.all([
      fetchAdminConfig(),
      fetchAdminActivity(),
      fetchAdminUsers().catch(() => ({ users: [], totalUsers: 0, databaseConfigured: false })),
      fetchAdminPayments().catch(() => ({ payments: [], databaseConfigured: false, stripeConfigured: false })),
      fetchRequestedArtists().catch(() => []),
      fetchAdminUserSegments().catch(() => null),
      fetchAdminEmailEvents().catch(() => []),
      fetchAdminFeatureAnalytics().catch(() => null)
    ]);
    setConfig(nextConfig);
    setActivityLogs(nextActivity);
    setAdminUsers(usersBody.users);
    setAdminUserTotal(usersBody.totalUsers || usersBody.users.length);
    setAdminPayments(paymentsBody.payments);
    setAdminSegments(segmentsBody);
    setAdminEmailEvents(emailEvents);
    setAdminFeatureAnalytics(featureAnalytics);
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
      const [usersBody, paymentsBody, segmentsBody, emailEvents, featureAnalytics] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminPayments(),
        fetchAdminUserSegments(),
        fetchAdminEmailEvents(),
        fetchAdminFeatureAnalytics()
      ]);
      setAdminUsers(usersBody.users);
      setAdminUserTotal(usersBody.totalUsers || usersBody.users.length);
      setAdminPayments(paymentsBody.payments);
      setAdminSegments(segmentsBody);
      setAdminEmailEvents(emailEvents);
      setAdminFeatureAnalytics(featureAnalytics);
      setPaymentMeta({
        databaseConfigured: usersBody.databaseConfigured && paymentsBody.databaseConfigured,
        stripeConfigured: paymentsBody.stripeConfigured
      });
      showToast('Monetization refreshed');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to load monetization data');
    }
  };

  const handleOpenUserProfile = async (userId: string) => {
    setLoadingUserProfileId(userId);
    setAuthError(null);
    try {
      setSelectedAdminUserProfile(await fetchAdminUserProfile(userId));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not load user profile');
    } finally {
      setLoadingUserProfileId('');
    }
  };

  const handleRetryEmail = async (emailId: string) => {
    setRetryingEmailId(emailId);
    setAuthError(null);
    try {
      await retryAdminEmail(emailId);
      setAdminEmailEvents(await fetchAdminEmailEvents());
      if (selectedAdminUserProfile) {
        setSelectedAdminUserProfile(await fetchAdminUserProfile(selectedAdminUserProfile.user.id));
      }
      showToast('Email retry sent');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Email retry failed');
    } finally {
      setRetryingEmailId('');
    }
  };

  const handleExecuteQueuedArtist = async (slug: string) => {
    setRefreshingArtistSlug(slug);
    setAuthError(null);
    try {
      const result = await executeQueuedArtistRequest(slug);
      setRequestedArtists(result.artists);
      onRequestedArtistsChanged?.(result.artists);
      if (selectedAdminUserProfile) {
        setSelectedAdminUserProfile(await fetchAdminUserProfile(selectedAdminUserProfile.user.id));
      }
      showToast(`${result.artist.name} request executed`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Queued artist execution failed');
    } finally {
      setRefreshingArtistSlug('');
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
                    ['Active users', `${adminUserTotal}`, '+ accounts'],
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
                    {artistPackRows.length} shown • {requestedArtists.length + artistChallenges.length} total sources
                  </div>
                </div>
              </div>

              <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_160px_150px_180px_110px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    value={artistPackSearch}
                    onChange={(event) => setArtistPackSearch(event.target.value)}
                    placeholder="Search name, song, slug, Spotify ID..."
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#0b100d] pl-10 pr-3 text-sm text-white outline-none focus:border-[#00e676]"
                  />
                </div>
                <select
                  value={artistPackStatusFilter}
                  onChange={(event) => setArtistPackStatusFilter(event.target.value as ArtistPackStatusFilter)}
                  className="h-11 rounded-xl border border-white/10 bg-[#0b100d] px-3 text-xs font-bold text-white outline-none focus:border-[#00e676]"
                >
                  <option value="all">All statuses</option>
                  <option value="ready">Ready</option>
                  <option value="queued">Queued</option>
                  <option value="pending">Pending</option>
                  <option value="needs-update">Needs update</option>
                </select>
                <select
                  value={artistPackSourceFilter}
                  onChange={(event) => setArtistPackSourceFilter(event.target.value as ArtistPackSourceFilter)}
                  className="h-11 rounded-xl border border-white/10 bg-[#0b100d] px-3 text-xs font-bold text-white outline-none focus:border-[#00e676]"
                >
                  <option value="all">All sources</option>
                  <option value="spotify">Spotify built</option>
                  <option value="catalog">Catalog only</option>
                </select>
                <select
                  value={artistPackSort}
                  onChange={(event) => setArtistPackSort(event.target.value as ArtistPackSort)}
                  className="h-11 rounded-xl border border-white/10 bg-[#0b100d] px-3 text-xs font-bold text-white outline-none focus:border-[#00e676]"
                >
                  <option value="updated-desc">Newest update</option>
                  <option value="updated-asc">Oldest update</option>
                  <option value="songs-desc">Most songs</option>
                  <option value="played-desc">Most played</option>
                  <option value="songs-asc">Fewest songs</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                </select>
                <select
                  value={artistPackPageSize}
                  onChange={(event) => setArtistPackPageSize(Number(event.target.value) || 24)}
                  className="h-11 rounded-xl border border-white/10 bg-[#0b100d] px-3 text-xs font-bold text-white outline-none focus:border-[#00e676]"
                >
                  <option value={12}>12/page</option>
                  <option value={24}>24/page</option>
                  <option value={48}>48/page</option>
                  <option value={96}>96/page</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {[
                  ['All', requestedArtists.length + artistChallenges.length],
                  ['Spotify built', requestedArtists.filter((artist) => artist.status === 'ready').length],
                  ['Queued', requestedArtists.filter((artist) => artist.status === 'queued').length],
                  ['Pending', requestedArtists.filter((artist) => artist.status === 'pending').length],
                  ['Needs update', artistPackRows.filter((artist) => artist.songsCount < 10).length]
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-white/10 bg-[#0b100d] p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-white/35">{label}</p>
                    <p className="mt-1 font-mono text-lg font-black text-[#00e676]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {paginatedArtistPackRows.map((artist) => {
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
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h4 className="truncate text-sm font-black text-white">{artist.name}</h4>
                                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase text-white/45">
                                  {artist.status}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                                  artist.source === 'spotify' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-white/5 text-white/45'
                                }`}>
                                  {artist.source === 'spotify' ? 'Spotify' : 'Catalog'}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-white/45">{artist.songsCount} songs • {artist.playedCount} plays • {sourceLabel} update</p>
                              <p className="mt-1 truncate font-mono text-[10px] text-white/30">{artist.slug}</p>
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
                          {artist.requested?.albumPacks && artist.requested.albumPacks.length > 0 && (
                            <div className="mt-2 flex gap-1">
                              {artist.requested.albumPacks.slice(0, 5).map((pack) => (
                                <span key={pack.id} title={`${pack.title} • ${pack.songsCount} songs`} className="h-7 w-7 overflow-hidden rounded-md bg-black/30">
                                  {getSafeImageUrl(pack.coverImage) && <img src={getSafeImageUrl(pack.coverImage) || ''} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
                                </span>
                              ))}
                            </div>
                          )}
                          {artist.sampleText && (
                            <p className="mt-2 truncate text-[11px] text-white/40">
                              {artist.sampleText}
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

              {artistPackRows.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0b100d] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-white/45">
                    Showing {(safeArtistPackPage - 1) * artistPackPageSize + 1}-{Math.min(safeArtistPackPage * artistPackPageSize, artistPackRows.length)} of {artistPackRows.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setArtistPackPage((page) => Math.max(1, page - 1))}
                      disabled={safeArtistPackPage <= 1}
                      className="h-9 rounded-lg border border-white/10 px-3 text-xs font-black text-white/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Previous
                    </button>
                    <span className="rounded-lg bg-white/5 px-3 py-2 font-mono text-xs text-white/70">
                      Page {safeArtistPackPage} / {artistPackTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setArtistPackPage((page) => Math.min(artistPackTotalPages, page + 1))}
                      disabled={safeArtistPackPage >= artistPackTotalPages}
                      className="h-9 rounded-lg bg-[#00e676] px-3 text-xs font-black text-black hover:bg-[#1fe682] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Next
                    </button>
                  </div>
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
                  <p className="text-xl font-black text-white mt-1">{adminUserTotal}</p>
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

              {adminSegments && (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                  {[
                    ['Purchasers', adminSegments.purchasers],
                    ['Active unlimited', adminSegments.activeUnlimited],
                    ['Free accounts', adminSegments.freeAccounts],
                    ['Top players', adminSegments.topPlayers],
                    ['Returning', adminSegments.returningPlayers],
                    ['Queued requests', adminSegments.queuedRequesters],
                    ['Unverified', adminSegments.unverified]
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-white/10 bg-[#0b100d] p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-white/35">{label}</p>
                      <p className="mt-1 text-lg font-black text-[#00e676]">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {adminFeatureAnalytics && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.15fr]">
                  <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-white">Feature usage</h3>
                        <p className="mt-1 text-[11px] text-white/45">Most used actions and who used them recently.</p>
                      </div>
                      <span className="rounded-full bg-[#00e676]/10 px-3 py-1 text-[11px] font-black text-[#00e676]">
                        {adminFeatureAnalytics.features.reduce((sum, item) => sum + Number(item.count || 0), 0)} events
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {adminFeatureAnalytics.features.slice(0, 8).map((feature) => (
                        <div key={feature.feature} className="rounded-xl border border-white/10 bg-[#121915] p-3">
                          <p className="truncate text-xs font-black text-white">{feature.feature.replace(/_/g, ' ')}</p>
                          <p className="mt-1 font-mono text-lg font-black text-[#00e676]">{feature.count}</p>
                          <p className="text-[10px] text-white/40">{feature.uniqueUsers} users • {feature.lastUsedAt ? formatIsoDate(feature.lastUsedAt) : 'no date'}</p>
                        </div>
                      ))}
                      {adminFeatureAnalytics.features.length === 0 && (
                        <p className="rounded-xl bg-white/5 p-4 text-xs text-white/45 sm:col-span-2">No feature events recorded yet.</p>
                      )}
                    </div>
                    <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                      {adminFeatureAnalytics.recentEvents.slice(0, 20).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => event.userId && void handleOpenUserProfile(event.userId)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left text-xs hover:border-[#00e676]/35"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-black text-white">{event.userName || event.email || 'Guest'}</span>
                            <span className="shrink-0 text-[10px] text-white/35">{formatIsoDate(event.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-[#00e676]/80">{event.feature.replace(/_/g, ' ')} • {event.status}</p>
                          {event.detail && <p className="mt-1 truncate text-white/45">{event.detail}</p>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-white">Online rooms</h3>
                        <p className="mt-1 text-[11px] text-white/45">Created rooms, live active count, and pass history.</p>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="rounded-full bg-[#00e676]/10 px-2.5 py-1 text-[10px] font-black text-[#00e676]">Live {adminFeatureAnalytics.roomStats.activeNow}</span>
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black text-white/50">Total {adminFeatureAnalytics.roomStats.totalCreated}</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        ['Active recent', adminFeatureAnalytics.roomStats.activePersisted],
                        ['Finished', adminFeatureAnalytics.roomStats.finished],
                        ['History rows', adminFeatureAnalytics.rooms.length]
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-xl bg-white/[0.04] p-3">
                          <p className="text-[10px] font-black uppercase tracking-wide text-white/35">{label}</p>
                          <p className="mt-1 font-mono text-lg font-black text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                      {adminFeatureAnalytics.rooms.map((room) => (
                        <div key={room.code} className="rounded-xl border border-white/10 bg-[#121915] p-3 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono font-black text-[#00e676]">{room.code}</p>
                              <p className="truncate text-white/65">{room.challengeTitle || 'No pack selected'}</p>
                              <p className="mt-1 text-white/40">{room.hostName || room.hostEmail || 'Host'} • {room.playerCount}/10 players</p>
                            </div>
                            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-white/50">{room.status}</span>
                          </div>
                          <p className="mt-2 text-[10px] text-white/35">
                            {room.turnsPerPlayer} songs each • {room.countdownSeconds}s • {room.hostHasUnlimited ? 'unlimited host' : 'free host'} • {formatIsoDate(room.updatedAt)}
                          </p>
                        </div>
                      ))}
                      {adminFeatureAnalytics.rooms.length === 0 && (
                        <p className="rounded-xl bg-white/5 p-4 text-xs text-white/45">No room history recorded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                  <h3 className="text-sm font-black text-white mb-1">Users and access</h3>
                  <p className="mb-3 text-[11px] font-semibold text-white/45">
                    Showing latest {adminUsers.length} of {adminUserTotal} accounts.
                  </p>
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
                          <button
                            type="button"
                            onClick={() => void handleOpenUserProfile(user.id)}
                            disabled={loadingUserProfileId === user.id}
                            className="mt-2 rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 px-2.5 py-1.5 text-[11px] font-black text-[#00e676] hover:bg-[#00e676]/20 disabled:cursor-wait disabled:opacity-50"
                          >
                            {loadingUserProfileId === user.id ? 'Loading profile' : 'View profile'}
                          </button>
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
                              {payment.failureReason && (
                                <p className="mt-1 text-[11px] leading-4 text-red-200">{payment.failureReason}</p>
                              )}
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

              <div className="rounded-2xl border border-white/10 bg-[#0b100d] p-4">
                <h3 className="text-sm font-black text-white mb-1">MailerSend email log</h3>
                <p className="mb-3 text-[11px] text-white/45">Latest transactional emails with delivery attempts, failures, previews, and retry actions.</p>
                {adminEmailEvents.length === 0 ? (
                  <p className="rounded-xl bg-white/5 p-4 text-xs text-white/45">No email attempts have been logged yet.</p>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {adminEmailEvents.slice(0, 80).map((email) => (
                      <div key={email.id} className="rounded-xl border border-white/10 bg-[#121915] p-3 text-xs">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-black text-white">{email.subject}</p>
                            <p className="text-white/45">{email.email} • {email.category} • {formatIsoDate(email.sentAt || email.createdAt)}</p>
                            {email.error && <p className="mt-1 text-red-200">{email.error}</p>}
                            {email.textBody && <details className="mt-2 text-white/55"><summary className="cursor-pointer font-bold text-[#00e676]">Preview</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/25 p-2">{email.textBody}</pre></details>}
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRetryEmail(email.id)}
                            disabled={retryingEmailId === email.id}
                            className="h-8 rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 px-3 text-[11px] font-black text-[#00e676] hover:bg-[#00e676]/20 disabled:cursor-wait disabled:opacity-50"
                          >
                            {retryingEmailId === email.id ? 'Retrying' : 'Retry'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedAdminUserProfile && (
                <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
                  <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#00e676]/25 bg-[#0d1a13] p-4 shadow-2xl">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white">{selectedAdminUserProfile.user.name || 'Player profile'}</h3>
                        <p className="text-xs text-white/55">{selectedAdminUserProfile.user.email}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedAdminUserProfile.segments.map((segment) => (
                            <span key={segment} className="rounded-full bg-[#00e676]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#00e676]">{segment}</span>
                          ))}
                          {selectedAdminUserProfile.segments.length === 0 && (
                            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white/40">No segment yet</span>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedAdminUserProfile(null)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-white/60 hover:text-white">
                        Close profile
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <h4 className="text-xs font-black uppercase tracking-wide text-white/45">Journey</h4>
                        <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                          {selectedAdminUserProfile.journey.length === 0 ? (
                            <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/40">No journey events recorded for this player yet.</p>
                          ) : selectedAdminUserProfile.journey.map((event) => (
                            <div key={event.id} className="rounded-lg bg-white/[0.04] p-2 text-[11px]">
                              <p className="font-black text-white">{event.eventType} · {event.status}</p>
                              <p className="text-white/45">{formatIsoDate(event.createdAt)}</p>
                              {event.detail && <p className="mt-1 text-white/60">{event.detail}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <h4 className="text-xs font-black uppercase tracking-wide text-white/45">Queued artist requests</h4>
                        <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                          {selectedAdminUserProfile.queuedRequests.length === 0 ? <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/40">No queued requests.</p> : selectedAdminUserProfile.queuedRequests.map((request) => (
                            <div key={request.id} className="rounded-lg bg-white/[0.04] p-2 text-[11px]">
                              <div className="flex items-center gap-2">
                                {getSafeImageUrl(request.artistImageUrl) && <img src={getSafeImageUrl(request.artistImageUrl) || ''} alt="" className="h-8 w-8 rounded-md object-cover" referrerPolicy="no-referrer" />}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-black text-white">{request.artistName}</p>
                                  <p className="text-white/45">{request.status} • {formatIsoDate(request.createdAt)}</p>
                                </div>
                              </div>
                              {request.status === 'queued' && (
                                <button
                                  type="button"
                                  onClick={() => void handleExecuteQueuedArtist(request.artistSlug)}
                                  disabled={refreshingArtistSlug === request.artistSlug}
                                  className="mt-2 rounded-lg bg-[#00e676] px-2.5 py-1.5 text-[11px] font-black text-black disabled:cursor-wait disabled:opacity-50"
                                >
                                  {refreshingArtistSlug === request.artistSlug ? 'Executing' : 'Execute now'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <h4 className="text-xs font-black uppercase tracking-wide text-white/45">Emails</h4>
                        <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                          {selectedAdminUserProfile.emails.length === 0 ? (
                            <p className="rounded-lg bg-white/[0.04] p-3 text-xs text-white/40">No email attempts recorded for this player yet.</p>
                          ) : selectedAdminUserProfile.emails.map((email) => (
                            <div key={email.id} className="rounded-lg bg-white/[0.04] p-2 text-[11px]">
                              <p className="font-black text-white">{email.subject}</p>
                              <p className="text-white/45">{email.status} • {email.category} • {formatIsoDate(email.sentAt || email.createdAt)}</p>
                              {email.error && <p className="mt-1 text-red-200">{email.error}</p>}
                              <button type="button" onClick={() => void handleRetryEmail(email.id)} className="mt-2 rounded-md border border-[#00e676]/25 px-2 py-1 text-[10px] font-black text-[#00e676]">Retry</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

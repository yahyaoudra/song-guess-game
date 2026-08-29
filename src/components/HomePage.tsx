import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Check, Globe2, Headphones, Mic2, Play, Sparkles, Tags, Trophy, Users } from 'lucide-react';
import { PublicRuntimeConfig, RequestedArtist } from '../adminTypes';
import { COUNTRIES } from '../data/countries';
import { getArtistChallenges, getGenreChallenges } from '../utils/challengeCatalog';
import { getArtistPath, getCountryPath, getGenrePath } from '../utils/runtimeConfig';

interface HomePageProps {
  publicConfig: PublicRuntimeConfig;
  requestedArtists: RequestedArtist[];
  onNavigate: (path: string) => void;
}

const comparisonRows = [
  ['Unlimited Heardle', 'Daily-only or limited modes', 'Available*'],
  ['Artist challenges', 'Small fixed song pools', 'Spotify-built packs by exact artist'],
  ['Genre and era games', 'Few broad playlists', 'K-Pop, Bollywood, rap, country, 80s, 90s, 2000s, and more'],
  ['Multiplayer options', 'Mostly solo play', 'Friend-code rooms plus same-device party mode'],
  ['Works anywhere', 'Often desktop-first', 'Responsive play on phone, tablet, and desktop'],
  ['Shareable score cards', 'Text-only results', 'Downloadable visual performance cards']
];

const tips = [
  'Start with the artist voice, then narrow by era.',
  'Use skips when the intro is too quiet instead of guessing blindly.',
  'Switch title mode when a song has romanized or native titles.',
  'Use genre packs to train before trying artist discographies.',
  'Play with headphones for tiny 0.5s and 1s snippets.'
];

const faqs = [
  ['Is Song Guess Game the same as Heardle?', 'It is a Heardle-style song guessing game with broader artist, genre, country, multiplayer, and unlimited-pass features.'],
  ['Can I play more than once a day?', 'Free play is limited, while the 7-day unlimited pass unlocks more plays, all categories, and no ads.'],
  ['Can I request an artist?', 'Yes. Search an artist, choose the exact Spotify profile, and Song Guess builds the pack before adding it.'],
  ['Does it work on mobile?', 'Yes. The game, account controls, packs, and score sharing are built for mobile and desktop.']
];

export const HomePage: React.FC<HomePageProps> = ({ publicConfig, requestedArtists, onNavigate }) => {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const artists = useMemo(() => {
    const requested = requestedArtists
      .filter((artist) => artist.status === 'ready' && artist.songsCount > 0)
      .map((artist) => ({
        name: artist.name,
        slug: artist.slug,
        coverImage: artist.coverImage,
        songsCount: artist.songsCount
      }));
    const staticArtists = getArtistChallenges().map((artist) => ({
      name: artist.name,
      slug: artist.slug,
      coverImage: artist.coverImage,
      songsCount: artist.songsCount
    }));
    const bySlug = new Map([...requested, ...staticArtists].map((artist) => [artist.slug, artist]));
    return Array.from(bySlug.values()).slice(0, 24);
  }, [requestedArtists]);

  const topArtists = artists.slice(0, 12);
  const carouselArtists = [...artists.slice(0, 12), ...artists.slice(0, 12)];
  const featuredCountries = COUNTRIES.slice(0, 12);
  const featuredGenres = getGenreChallenges().slice(0, 12);

  useEffect(() => {
    if (!heroRef.current) return;
    const context = gsap.context(() => {
      gsap.from('[data-home-reveal]', {
        opacity: 0,
        y: 26,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power3.out'
      });
    }, heroRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    const track = carouselRef.current;
    if (!track || carouselArtists.length === 0) return;
    tweenRef.current?.kill();
    tweenRef.current = gsap.to(track, {
      xPercent: -50,
      duration: 34,
      ease: 'none',
      repeat: -1
    });
    return () => tweenRef.current?.kill();
  }, [carouselArtists.length]);

  const pauseCarousel = () => tweenRef.current?.pause();
  const resumeCarousel = () => tweenRef.current?.resume();

  return (
    <main ref={heroRef} className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 pb-20 pt-8 text-white sm:px-8">
      <section className="grid min-h-[78vh] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <div>
          <div data-home-reveal className="inline-flex items-center gap-2 rounded-full border border-[#00e676]/25 bg-[#00e676]/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#9cffc7]">
            <Sparkles className="h-4 w-4" />
            Music guessing for every scene
          </div>
          <h1 data-home-reveal className="mt-5 max-w-4xl text-5xl font-black leading-[0.92] tracking-tight sm:text-7xl">
            Song Guess Game
          </h1>
          <p data-home-reveal className="mt-5 max-w-2xl text-lg leading-8 text-white/65">
            Guess songs from tiny snippets, play by artist, genre, country, or era, and challenge friends with visual score cards.
          </p>
          <div data-home-reveal className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => onNavigate('/play')}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-[#00e676] px-7 text-base font-black text-black shadow-[0_18px_50px_rgba(0,230,118,0.22)] hover:bg-[#29f28d]"
            >
              <Play className="h-5 w-5 fill-black" />
              Play Now
            </button>
            <button
              onClick={() => onNavigate('/artist')}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.055] px-7 text-base font-black text-white hover:bg-white/10"
            >
              Play by Artist
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          <div data-home-reveal className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ['1', 'Listen'],
              ['2', 'Guess'],
              ['3', 'Win and share']
            ].map(([step, label]) => (
              <div key={step} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs font-black text-[#00e676]">STEP {step}</div>
                <div className="mt-1 text-sm font-black text-white">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          data-home-reveal
          className="relative overflow-hidden py-10 [perspective:1100px]"
          onMouseEnter={pauseCarousel}
          onMouseLeave={resumeCarousel}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#080c0a] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#080c0a] to-transparent" />
          <div ref={carouselRef} className="flex w-max gap-5 will-change-transform">
            {carouselArtists.map((artist, index) => (
              <a
                key={`${artist.slug}-${index}`}
                href={getArtistPath(artist.slug)}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(getArtistPath(artist.slug));
                }}
                className={`group relative h-[360px] w-[250px] shrink-0 overflow-hidden rounded-lg border border-white/12 bg-[#111814] shadow-2xl transition-transform hover:-translate-y-2 ${
                  index % 3 === 1 ? 'scale-105' : 'scale-95 opacity-85'
                }`}
              >
                <img src={artist.coverImage} alt={artist.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="inline-flex rounded-full bg-[#00e676] px-2 py-1 text-[10px] font-black uppercase text-black">
                    {artist.songsCount} songs
                  </div>
                  <h2 className="mt-3 text-2xl font-black text-white">{artist.name}</h2>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#00e676]">
                    Play artist challenge
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#101713] p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['Artist packs', 'Taylor Swift, Drake, Avicii, 7ari, Mocci, and more', Mic2],
            ['Genre and era runs', 'K-Pop, Bollywood, rap, country, 80s, 90s, 2000s', Tags],
            ['Multiplayer ready', 'Friend codes and same-device party play', Users]
          ].map(([title, body, Icon]) => (
            <div key={String(title)} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <Icon className="h-6 w-6 text-[#00e676]" />
              <h2 className="mt-4 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#00e676]">Featured</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Top Artist Challenges</h2>
          </div>
          <button onClick={() => onNavigate('/artist')} className="rounded-lg border border-white/12 px-4 py-2 text-sm font-black text-white/75 hover:bg-white/10">
            See artists
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topArtists.map((artist) => (
            <a key={artist.slug} href={getArtistPath(artist.slug)} onClick={(event) => { event.preventDefault(); onNavigate(getArtistPath(artist.slug)); }} className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] hover:border-[#00e676]/55">
              <img src={artist.coverImage} alt={artist.name} className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
              <div className="p-4">
                <h3 className="truncate text-lg font-black">{artist.name}</h3>
                <p className="mt-1 text-xs text-white/45">{artist.songsCount} song pack</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <BrowseBlock title="Countries" cta="See countries" onClick={() => onNavigate('/play/country')}>
          {featuredCountries.map((country) => (
            <a key={country.code} href={getCountryPath(country.code, publicConfig)} onClick={(event) => { event.preventDefault(); onNavigate(getCountryPath(country.code, publicConfig)); }} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 hover:border-[#00e676]/45">
              <span className="text-2xl">{country.flag}</span>
              <span className="min-w-0 truncate text-sm font-black">{country.name}</span>
            </a>
          ))}
        </BrowseBlock>
        <BrowseBlock title="Genres" cta="See genres" onClick={() => onNavigate('/play/genre')}>
          {featuredGenres.map((genre) => (
            <a key={genre.slug} href={getGenrePath(genre.slug)} onClick={(event) => { event.preventDefault(); onNavigate(getGenrePath(genre.slug)); }} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 hover:border-[#00e676]/45">
              <div className="truncate text-sm font-black">{genre.name}</div>
              <div className="mt-1 text-xs text-white/45">{genre.songsCount} songs</div>
            </a>
          ))}
        </BrowseBlock>
      </section>

      <section className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#00e676]">How to play</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">From 0.5 seconds to bragging rights</h2>
          <div className="mt-6 space-y-4">
            {[
              ['Choose', 'Pick global Daily 5, a country, an artist, a genre, or a playlist pack.'],
              ['Listen', 'Start with a tiny snippet. Skip or miss and the clip gets longer.'],
              ['Guess', 'Type the title or artist, score points, and share the generated result card.']
            ].map(([title, body], index) => (
              <div key={title} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#00e676] text-sm font-black text-black">{index + 1}</div>
                <div className="border-b border-white/10 pb-4">
                  <h3 className="font-black">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/55">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#0d1511] p-4 shadow-2xl">
          <div className="rounded-lg border border-[#00e676]/25 bg-[#07100b] p-5">
            <div className="flex items-center justify-between text-xs font-black text-white/55">
              <span>ROUND 1 / 5</span>
              <span className="text-[#00e676]">800 PTS</span>
            </div>
            <div className="mt-10 flex flex-col items-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#00e676] text-black shadow-[0_0_55px_rgba(0,230,118,0.35)]">
                <Headphones className="h-12 w-12" />
              </div>
              <div className="mt-6 h-12 w-full rounded-lg border border-[#00e676]/35 bg-black/35" />
              <div className="mt-4 grid w-full grid-cols-[1fr_auto] gap-3">
                <div className="h-11 rounded-lg border border-white/10 bg-white/5" />
                <div className="h-11 w-24 rounded-lg bg-white/10" />
              </div>
              <div className="mt-5 h-24 w-full rounded-lg border border-white/10 bg-white/[0.04]" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#00e676]">Why Song Guess Game</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">Built beyond one daily song</h2>
          <div className="mt-6 overflow-hidden rounded-lg border border-white/10">
            <div className="grid gap-0 border-b border-white/10 bg-white/[0.06] md:grid-cols-[0.8fr_1fr_1fr]">
              <div className="p-4 text-xs font-black uppercase tracking-wide text-white/45">Feature</div>
              <div className="p-4 text-xs font-black uppercase tracking-wide text-white">The other</div>
              <div className="flex items-center gap-2 p-4 text-xs font-black uppercase tracking-wide text-white">
                <img src="/favicon.png" alt="" className="h-6 w-6 rounded-md" />
                Song Guess Game
              </div>
            </div>
            {comparisonRows.map(([feature, others, us]) => (
              <div key={feature} className="grid gap-0 border-b border-white/10 last:border-b-0 md:grid-cols-[0.8fr_1fr_1fr]">
                <div className="bg-white/[0.03] p-4 text-sm font-black">{feature}</div>
                <div className="p-4 text-sm text-white/45">{others}</div>
                <div className="flex gap-2 p-4 text-sm font-bold text-white">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00e676]" />
                  {us}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <Trophy className="h-7 w-7 text-yellow-300" />
          <h2 className="mt-4 text-2xl font-black">Best tips for playing</h2>
          <div className="mt-5 space-y-3">
            {tips.map((tip) => (
              <div key={tip} className="flex gap-3 text-sm leading-6 text-white/65">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[#00e676]" />
                {tip}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {faqs.map(([question, answer]) => (
          <details key={question} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <summary className="cursor-pointer text-base font-black">{question}</summary>
            <p className="mt-3 text-sm leading-6 text-white/55">{answer}</p>
          </details>
        ))}
      </section>
    </main>
  );
};

const BrowseBlock: React.FC<{ title: string; cta: string; onClick: () => void; children: React.ReactNode }> = ({
  title,
  cta,
  onClick,
  children
}) => (
  <section>
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-[#00e676]">Play by</p>
        <h2 className="mt-2 text-3xl font-black">{title}</h2>
      </div>
      <button onClick={onClick} className="rounded-lg border border-white/12 px-4 py-2 text-sm font-black text-white/75 hover:bg-white/10">
        {cta}
      </button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{children}</div>
  </section>
);

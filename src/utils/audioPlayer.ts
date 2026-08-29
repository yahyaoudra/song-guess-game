// Audio Engine for Moroccan Songspot - High-Fidelity Preview & Web Audio Synthesizer fallback

class MoroccanAudioEngine {
  private audio: HTMLAudioElement | null = null;
  private stopTimeout: number | null = null;
  private isPlaying = false;
  private isLoading = false;
  private playbackToken = 0;
  private currentMaxSec = 0;
  private onPlayStateChange: ((isPlaying: boolean, currentSec: number, maxSec: number, isLoading: boolean) => void) | null = null;
  private animFrameId: number | null = null;
  private volume = 0.85;
  private currentUrl = '';
  private currentOffset = 0;
  private synthCtx: AudioContext | null = null;
  private activeSynthNodes: { stop: () => void }[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    try {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      // DO NOT set crossOrigin = 'anonymous' to avoid Apple CDN CORS restrictions

      this.audio.addEventListener('ended', () => {
        this.stop();
      });

      this.audio.addEventListener('error', (e) => {
        this.isLoading = false;
        this.notifyState(0, this.currentMaxSec);
        console.debug('Audio stream notice', e);
      });
    } catch (err) {
      console.warn('Audio element initialization warning:', err);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setListener(cb: (isPlaying: boolean, currentSec: number, maxSec: number, isLoading: boolean) => void) {
    this.onPlayStateChange = cb;
  }

  private getEffectiveUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    // If it's already a relative /api URL, use it directly
    if (rawUrl.startsWith('/')) return rawUrl;
    // Route via server proxy to guarantee CORS and range-streaming support
    return `/api/audio-stream?url=${encodeURIComponent(rawUrl)}`;
  }

  /**
   * Pre-loads the song audio into the element so it's buffered and ready for instant playback
   */
  public prepare(previewUrl: string, startOffsetSec = 0) {
    if (!this.audio || !previewUrl) return;
    const targetUrl = this.getEffectiveUrl(previewUrl);

    if (this.currentUrl !== targetUrl) {
      this.currentUrl = targetUrl;
      this.currentOffset = startOffsetSec;
      try {
        this.audio.src = targetUrl;
        this.audio.volume = this.volume;
        this.audio.load();

        const onMeta = () => {
          if (this.audio && startOffsetSec > 0 && this.audio.duration && startOffsetSec < this.audio.duration) {
            try {
              this.audio.currentTime = startOffsetSec;
            } catch (_) {}
          }
          this.audio?.removeEventListener('loadedmetadata', onMeta);
        };
        this.audio.addEventListener('loadedmetadata', onMeta);
      } catch (err) {
        console.debug('Preload notice', err);
      }
    }
  }

  /**
   * Play snippet strictly within user click gesture context
   */
  public async playSnippet(
    previewUrl: string,
    durationSec: number,
    startOffsetSec = 0,
    songMeta?: { title: string; artist: string; spotifyTrackId?: string }
  ): Promise<void> {
    if (!this.audio) {
      this.initAudioElement();
    }
    if (!this.audio) return;

    this.stop();
    const token = ++this.playbackToken;
    this.isPlaying = true;
    this.isLoading = true;
    this.currentMaxSec = durationSec;
    this.notifyState(0, durationSec);

    // Resolve URL: proxy, dynamic endpoint by track ID or title/artist, or direct
    let targetUrl = this.getEffectiveUrl(previewUrl);
    if (!targetUrl && songMeta?.spotifyTrackId) {
      targetUrl = `/api/music/preview?spotifyTrackId=${encodeURIComponent(songMeta.spotifyTrackId)}&title=${encodeURIComponent(songMeta.title)}&artist=${encodeURIComponent(songMeta.artist)}`;
    } else if (!targetUrl && songMeta?.title && songMeta?.artist) {
      targetUrl = `/api/music/preview?title=${encodeURIComponent(songMeta.title)}&artist=${encodeURIComponent(songMeta.artist)}`;
    }

    if (!targetUrl && previewUrl) {
      targetUrl = previewUrl;
    }

    if (targetUrl) {
      if (this.audio.src !== targetUrl && !this.audio.src.endsWith(encodeURIComponent(previewUrl))) {
        this.audio.src = targetUrl;
        this.audio.load();
      }

      this.audio.volume = this.volume;

      try {
        if (startOffsetSec > 0 && this.audio.duration && startOffsetSec < this.audio.duration) {
          this.audio.currentTime = startOffsetSec;
        } else if (startOffsetSec > 0) {
          this.audio.currentTime = startOffsetSec;
        }
      } catch (_) {
        // Safe seek fallback
      }

      const beginSnippetTimer = () => {
        if (token !== this.playbackToken || !this.isPlaying) return;
        if (this.animFrameId !== null || this.stopTimeout !== null) return;

        this.isLoading = false;
        this.notifyState(0, durationSec);

        const startTime = performance.now();
        const targetDurationMs = durationSec * 1000;

        const updateSnippet = () => {
          if (token !== this.playbackToken || !this.isPlaying) return;
          const elapsedSec = (performance.now() - startTime) / 1000;

          if (elapsedSec >= durationSec) {
            this.stop();
            this.notifyState(durationSec, durationSec);
            return;
          }

          this.notifyState(elapsedSec, durationSec);
          this.animFrameId = requestAnimationFrame(updateSnippet);
        };

        this.animFrameId = requestAnimationFrame(updateSnippet);

        this.stopTimeout = window.setTimeout(() => {
          if (token === this.playbackToken) {
            this.stop();
          }
        }, targetDurationMs);
      };

      const startFallback = () => {
        if (token !== this.playbackToken || !this.isPlaying) return;
        this.playSynthClueFallback(durationSec);
        beginSnippetTimer();
      };

      const beginWhenAudible = () => {
        if (token !== this.playbackToken || !this.audio || !this.isPlaying) return;
        if (this.audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          beginSnippetTimer();
          return;
        }

        let fallbackTimer: number | null = null;
        const cleanup = () => {
          if (!this.audio) return;
          this.audio.removeEventListener('playing', handleReady);
          this.audio.removeEventListener('canplay', handleReady);
          if (fallbackTimer !== null) {
            window.clearTimeout(fallbackTimer);
            fallbackTimer = null;
          }
        };
        const handleReady = () => {
          cleanup();
          beginSnippetTimer();
        };

        this.audio.addEventListener('playing', handleReady, { once: true });
        this.audio.addEventListener('canplay', handleReady, { once: true });
        fallbackTimer = window.setTimeout(handleReady, 1200);
      };

      // Synchronously call play() in user click stack
      try {
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
          playPromise.then(beginWhenAudible).catch(async (err) => {
            if (token !== this.playbackToken || !this.audio || !this.isPlaying) return;
            console.debug('Audio play failed on proxy, attempting direct URL fallback:', err);
            // Fallback: Try dynamic music preview server endpoint, then direct preview URL
            if (songMeta?.title && this.audio && this.isPlaying) {
              try {
                const dynamicEndpoint = `/api/music/preview?title=${encodeURIComponent(songMeta.title)}&artist=${encodeURIComponent(songMeta.artist)}`;
                this.audio.src = dynamicEndpoint;
                this.audio.volume = this.volume;
                await this.audio.play();
                beginWhenAudible();
                return;
              } catch (_) {
                // Next fallback
              }
            }

            if (previewUrl && this.audio && this.isPlaying) {
              try {
                this.audio.src = previewUrl;
                this.audio.volume = this.volume;
                await this.audio.play();
                beginWhenAudible();
              } catch (fallbackErr) {
                console.debug('Direct preview also blocked, triggering melodic preview tone:', fallbackErr);
                startFallback();
              }
            } else if (this.isPlaying) {
              startFallback();
            }
          });
        } else {
          beginWhenAudible();
        }
      } catch (e) {
        console.debug('Synchronous play exception, using fallback', e);
        startFallback();
      }
    } else {
      const beginSnippetTimer = () => {
        if (token !== this.playbackToken || !this.isPlaying) return;
        this.isLoading = false;
        this.notifyState(0, durationSec);
        const startTime = performance.now();
        const updateSnippet = () => {
          if (token !== this.playbackToken || !this.isPlaying) return;
          const elapsedSec = (performance.now() - startTime) / 1000;
          if (elapsedSec >= durationSec) {
            this.stop();
            this.notifyState(durationSec, durationSec);
            return;
          }
          this.notifyState(elapsedSec, durationSec);
          this.animFrameId = requestAnimationFrame(updateSnippet);
        };
        this.animFrameId = requestAnimationFrame(updateSnippet);
        this.stopTimeout = window.setTimeout(() => {
          if (token === this.playbackToken) this.stop();
        }, durationSec * 1000);
      };
      this.playSynthClueFallback(durationSec);
      beginSnippetTimer();
    }
  }

  /**
   * Play full 30s preview for song reveal
   */
  public async playFullPreview(
    previewUrl: string,
    startOffsetSec = 0,
    songMeta?: { title: string; artist: string; spotifyTrackId?: string }
  ): Promise<void> {
    if (!this.audio) {
      this.initAudioElement();
    }
    if (!this.audio) return;

    this.stop();
    this.isPlaying = true;
    this.isLoading = false;
    this.currentMaxSec = 30;

    let targetUrl = this.getEffectiveUrl(previewUrl);
    if (!targetUrl && songMeta?.title && songMeta?.artist) {
      targetUrl = `/api/music/preview?title=${encodeURIComponent(songMeta.title)}&artist=${encodeURIComponent(songMeta.artist)}`;
    } else if (!targetUrl && previewUrl) {
      targetUrl = previewUrl;
    }

    if (targetUrl) {
      if (this.audio.src !== targetUrl) {
        this.audio.src = targetUrl;
        this.audio.load();
      }

      this.audio.volume = this.volume;

      try {
        if (startOffsetSec > 0 && this.audio.duration && startOffsetSec < this.audio.duration) {
          this.audio.currentTime = startOffsetSec;
        } else if (startOffsetSec > 0) {
          this.audio.currentTime = startOffsetSec;
        }
      } catch (_) {}

      try {
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(async () => {
            if (previewUrl && this.audio && this.isPlaying) {
              try {
                this.audio.src = previewUrl;
                await this.audio.play();
              } catch (_) {
                if (this.isPlaying) this.playSynthClueFallback(30);
              }
            } else if (this.isPlaying) {
              this.playSynthClueFallback(30);
            }
          });
        }
      } catch (e) {
        this.playSynthClueFallback(30);
      }
    } else {
      this.playSynthClueFallback(30);
    }

    const updateFull = () => {
      if (!this.isPlaying || !this.audio) return;
      const currentPos = Math.max(0, this.audio.currentTime - startOffsetSec);
      this.notifyState(currentPos, 30);
      this.animFrameId = requestAnimationFrame(updateFull);
    };
    this.animFrameId = requestAnimationFrame(updateFull);
  }

  public stop() {
    this.playbackToken += 1;
    this.isPlaying = false;
    this.isLoading = false;
    this.currentMaxSec = 0;
    if (this.stopTimeout !== null) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audio) {
      try {
        this.audio.pause();
      } catch (_) {}
    }
    this.stopSynthNodes();
    this.notifyState(0, 0);
  }

  public toggle(
    previewUrl: string,
    durationSec: number,
    startOffsetSec = 0,
    songMeta?: { title: string; artist: string; spotifyTrackId?: string }
  ) {
    if (this.isPlaying || this.isLoading) {
      this.stop();
    } else {
      this.playSnippet(previewUrl, durationSec, startOffsetSec, songMeta);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public seek(targetSec: number) {
    if (!this.audio) return;
    try {
      const maxDur = this.audio.duration && !isNaN(this.audio.duration) ? this.audio.duration : 30;
      this.audio.currentTime = Math.max(0, Math.min(maxDur, targetSec));
      if (!this.isPlaying) {
        this.audio.play().catch(() => {});
        this.isPlaying = true;
      }
    } catch (_) {}
  }

  private notifyState(currentSec: number, maxSec: number) {
    if (maxSec > 0) {
      this.currentMaxSec = maxSec;
    }
    if (this.onPlayStateChange) {
      this.onPlayStateChange(this.isPlaying, currentSec, maxSec || this.currentMaxSec, this.isLoading);
    }
  }

  // --- PROCEDURAL SYNTH SOUNDS & SFX ---
  private playSynthClueFallback(durationSec: number) {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.synthCtx || this.synthCtx.state === 'closed') {
        this.synthCtx = new AudioCtx();
      }
      const ctx = this.synthCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Moroccan Maqam Bayati / Hijaz melodic motif
      const notes = [
        { f: 293.66, t: 0.0, d: 0.35 }, // D4
        { f: 311.13, t: 0.35, d: 0.35 }, // Eb4 (Hijaz)
        { f: 369.99, t: 0.7, d: 0.4 },  // F#4
        { f: 392.00, t: 1.1, d: 0.4 },  // G4
        { f: 440.00, t: 1.5, d: 0.5 },  // A4
        { f: 392.00, t: 2.0, d: 0.4 },  // G4
        { f: 369.99, t: 2.4, d: 0.4 },  // F#4
        { f: 311.13, t: 2.8, d: 0.4 },  // Eb4
        { f: 293.66, t: 3.2, d: 0.8 }   // D4
      ];

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.15 * this.volume, now);
      masterGain.connect(ctx.destination);

      notes.forEach((n) => {
        if (n.t >= durationSec) return;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        noteGain.gain.setValueAtTime(0.001, now + n.t);
        noteGain.gain.exponentialRampToValueAtTime(0.12, now + n.t + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + n.t + Math.min(n.d, durationSec - n.t));

        // Lowpass filter for warm lute/oud quality
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now + n.t);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
        this.activeSynthNodes.push({ stop: () => { try { osc.stop(); } catch(_) {} } });
      });
    } catch (e) {
      console.debug('Synth fallback failed', e);
    }
  }

  private stopSynthNodes() {
    this.activeSynthNodes.forEach(n => n.stop());
    this.activeSynthNodes = [];
  }

  public playSfx(type: 'correct' | 'wrong' | 'skip' | 'click' | 'victory') {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.synthCtx || this.synthCtx.state === 'closed') {
        this.synthCtx = new AudioCtx();
      }
      const ctx = this.synthCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12 * this.volume, now);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        // Uplifting major chord arpeggio
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          osc.connect(gain);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.3);
        });
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      } else if (type === 'wrong') {
        // Low buzzer tone
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.25);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      } else if (type === 'skip') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.15);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      } else if (type === 'victory') {
        [440, 554.37, 659.25, 880, 1108.73].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          osc.connect(gain);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.5);
        });
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      }
    } catch (_) {}
  }
}

export const audioEngine = new MoroccanAudioEngine();

/**
 * AudioManager.ts — Ambient music playback via HTML5 Audio.
 *
 * Fetches playlist from /playlist, shuffles tracks, auto-advances on end.
 * Volume persisted to localStorage.
 */

interface Track {
  name: string;
  url: string;
}

const VOLUME_KEY = 'octopus-village-volume';
const DEFAULT_VOLUME = 0.3;

export class AudioManager {
  private tracks: Track[] = [];
  private currentIndex = 0;
  private audio: HTMLAudioElement;
  private _muted = false;

  /** Fires when track changes. */
  onTrackChange: ((track: Track | null) => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.volume = this.loadVolume();
    this.audio.addEventListener('ended', () => this.next());
  }

  async init(): Promise<void> {
    try {
      const res = await fetch('/playlist');
      if (!res.ok) return;
      this.tracks = await res.json();
      if (this.tracks.length > 0) {
        this.shuffle();
        this.play();
      }
    } catch {
      // Playlist unavailable — no audio
    }
  }

  get currentTrack(): Track | null {
    return this.tracks[this.currentIndex] ?? null;
  }

  get volume(): number {
    return this.audio.volume;
  }

  set volume(v: number) {
    this.audio.volume = Math.max(0, Math.min(1, v));
    this.saveVolume(this.audio.volume);
  }

  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): void {
    this._muted = !this._muted;
    this.audio.muted = this._muted;
  }

  next(): void {
    if (this.tracks.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
    this.play();
  }

  private play(): void {
    const track = this.currentTrack;
    if (!track) return;
    this.audio.src = track.url;
    this.audio.play().catch(() => {
      // Autoplay blocked — user must interact first
    });
    this.onTrackChange?.(track);
  }

  private shuffle(): void {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  private loadVolume(): number {
    try {
      const v = localStorage.getItem(VOLUME_KEY);
      return v !== null ? parseFloat(v) : DEFAULT_VOLUME;
    } catch {
      return DEFAULT_VOLUME;
    }
  }

  private saveVolume(v: number): void {
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      // silently fail
    }
  }

  destroy(): void {
    this.audio.pause();
    this.audio.src = '';
  }
}

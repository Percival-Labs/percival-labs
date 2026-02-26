/**
 * AudioControls.ts — DOM overlay for audio playback controls.
 *
 * Small fixed panel (bottom-right): track name, volume slider, mute button.
 * Rendered as DOM rather than Phaser for easier input handling.
 */

import { AudioManager } from '../systems/AudioManager';

export class AudioControls {
  private container: HTMLDivElement;
  private trackLabel: HTMLSpanElement;
  private volumeSlider: HTMLInputElement;
  private muteBtn: HTMLButtonElement;
  private audioManager: AudioManager;

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;

    // Container
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed',
      bottom: '12px',
      right: '12px',
      background: 'rgba(22, 22, 30, 0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#94a3b8',
      zIndex: '10000',
      userSelect: 'none',
    });

    // Track name
    this.trackLabel = document.createElement('span');
    this.trackLabel.style.maxWidth = '140px';
    this.trackLabel.style.overflow = 'hidden';
    this.trackLabel.style.textOverflow = 'ellipsis';
    this.trackLabel.style.whiteSpace = 'nowrap';
    this.trackLabel.textContent = '...';
    this.container.appendChild(this.trackLabel);

    // Volume slider
    this.volumeSlider = document.createElement('input');
    this.volumeSlider.type = 'range';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '100';
    this.volumeSlider.value = String(Math.round(audioManager.volume * 100));
    Object.assign(this.volumeSlider.style, {
      width: '60px',
      height: '4px',
      accentColor: '#5eead4',
      cursor: 'pointer',
    });
    this.volumeSlider.addEventListener('input', () => {
      this.audioManager.volume = parseInt(this.volumeSlider.value) / 100;
    });
    this.container.appendChild(this.volumeSlider);

    // Mute button
    this.muteBtn = document.createElement('button');
    Object.assign(this.muteBtn.style, {
      background: 'none',
      border: 'none',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '12px',
      padding: '0 2px',
    });
    this.muteBtn.textContent = '\u{1F50A}';
    this.muteBtn.addEventListener('click', () => {
      this.audioManager.toggleMute();
      this.muteBtn.textContent = this.audioManager.muted ? '\u{1F507}' : '\u{1F50A}';
    });
    this.container.appendChild(this.muteBtn);

    // Skip button
    const skipBtn = document.createElement('button');
    Object.assign(skipBtn.style, {
      background: 'none',
      border: 'none',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '10px',
      padding: '0 2px',
    });
    skipBtn.textContent = '\u{23ED}';
    skipBtn.addEventListener('click', () => this.audioManager.next());
    this.container.appendChild(skipBtn);

    // Listen for track changes
    this.audioManager.onTrackChange = (track) => {
      this.trackLabel.textContent = track?.name ?? '...';
    };

    document.body.appendChild(this.container);
  }

  destroy(): void {
    this.container.remove();
  }
}

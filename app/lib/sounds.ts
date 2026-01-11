'use client';

/**
 * Sound Effects Utility
 * Uses Web Audio API to generate sounds programmatically
 * No external audio files needed!
 */

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundEnabled', String(enabled));
    }
  }

  isEnabled(): boolean {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('soundEnabled');
      if (stored !== null) {
        this.enabled = stored === 'true';
      }
    }
    return this.enabled;
  }

  // Success sound - pleasant ascending chime
  playSuccess() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Create oscillators for a pleasant chord
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
      
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + i * 0.05);
        osc.stop(now + 0.6);
      });
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // Cha-ching! Money sound for escrow creation
  playChaChingSound() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // First "cha" - high metallic hit
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(2000, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second "ching" - bell-like ring
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1800, now + 0.15);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.25, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);

      // Add shimmer overtone
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(3600, now + 0.15);
      gain3.gain.setValueAtTime(0, now);
      gain3.gain.setValueAtTime(0.1, now + 0.15);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.15);
      osc3.stop(now + 0.6);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // Warning sound - gentle two-tone alert
  playWarning() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(380, now + 0.15);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.setValueAtTime(0.15, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // Error sound - descending tone
  playError() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // Click/tap sound - subtle feedback
  playClick() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // Copy sound - quick blip
  playCopy() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1200, now + 0.03);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // Notification sound - attention grab
  playNotification() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      [0, 0.12].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i === 0 ? 880 : 1100, now + delay);
        
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.15);
      });
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }
}

// Singleton instance
export const soundManager = new SoundManager();

// Convenience exports
export const playSuccess = () => soundManager.playSuccess();
export const playChaChingSound = () => soundManager.playChaChingSound();
export const playWarning = () => soundManager.playWarning();
export const playError = () => soundManager.playError();
export const playClick = () => soundManager.playClick();
export const playCopy = () => soundManager.playCopy();
export const playNotification = () => soundManager.playNotification();
export const setSoundEnabled = (enabled: boolean) => soundManager.setEnabled(enabled);
export const isSoundEnabled = () => soundManager.isEnabled();

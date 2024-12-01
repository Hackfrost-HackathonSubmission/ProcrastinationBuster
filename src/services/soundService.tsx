// src/services/soundService.tsx
"use client";

type SoundName = "timerComplete" | "breakComplete" | "buttonClick";

export class SoundService {
  private static sounds: { [key in SoundName]?: HTMLAudioElement } = {};
  private static volume: number = 0.5;
  private static initialized: boolean = false;

  static async init() {
    if (this.initialized) return;

    try {
      // Import audio files
      const soundFiles = {
        timerComplete: await import("/public/sounds/timer-complete.mp3"),
        breakComplete: await import("/public/sounds/break-complete.mp3"),
        buttonClick: await import("/public/sounds/button-click.mp3"),
      };

      // Create Audio elements with the imported files
      this.sounds = {
        timerComplete: new Audio(soundFiles.timerComplete.default),
        breakComplete: new Audio(soundFiles.breakComplete.default),
        buttonClick: new Audio(soundFiles.buttonClick.default),
      };

      // Set initial volume and load sounds
      Object.values(this.sounds).forEach((sound) => {
        if (sound) {
          sound.volume = this.volume;
          sound.load();
        }
      });

      this.initialized = true;
      console.log("Sound service initialized with:", this.sounds);
    } catch (error) {
      console.error("Failed to initialize sound service:", error);
    }
  }

  static setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach((sound) => {
      if (sound) {
        sound.volume = this.volume;
      }
    });
  }

  static async play(soundName: SoundName) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const sound = this.sounds[soundName];
      if (!sound) {
        throw new Error(`Sound not found: ${soundName}`);
      }

      // Reset and play the sound
      sound.currentTime = 0;
      await sound.play();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  // Add the preloadSounds method
  static async preloadSounds(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    try {
      await Promise.all(
        Object.values(this.sounds).map((sound) => {
          if (sound) {
            return new Promise<void>((resolve, reject) => {
              sound.addEventListener("canplaythrough", () => resolve(), {
                once: true,
              });
              sound.addEventListener("error", (e) => reject(e), { once: true });
              sound.load();
            });
          }
          return Promise.resolve();
        })
      );
      console.log("All sounds preloaded successfully");
    } catch (error) {
      console.error("Error preloading sounds:", error);
    }
  }
}

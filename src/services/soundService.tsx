// src/services/soundService.tsx
"use client";

type SoundName = "timerComplete" | "breakComplete" | "buttonClick";

export class SoundService {
  private static sounds: { [key in SoundName]?: HTMLAudioElement } = {};
  private static volume: number = 0.5;
  private static initialized: boolean = false;

  static init() {
    if (this.initialized) return;

    try {
      this.sounds = {
        timerComplete: this.createAudio("/sounds/timer-complete.mp3"),
        breakComplete: this.createAudio("/sounds/break-complete.mp3"),
        buttonClick: this.createAudio("/sounds/button-click.mp3"),
      };

      // Set initial volume for all sounds
      Object.values(this.sounds).forEach((sound) => {
        if (sound) {
          sound.volume = this.volume;
        }
      });

      this.initialized = true;
      console.log("Sound service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize sound service:", error);
    }
  }

  private static createAudio(src: string): HTMLAudioElement {
    const audio = new Audio(src);

    audio.addEventListener("error", (e) => {
      console.error(`Error loading audio file ${src}:`, e);
    });

    audio.addEventListener("canplaythrough", () => {
      console.log(`Audio file loaded successfully: ${src}`);
    });

    return audio;
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
    try {
      const sound = this.sounds[soundName];
      if (!sound) {
        console.error(`Sound ${soundName} not found`);
        return;
      }

      if (sound.readyState < 4) {
        console.log(`Sound ${soundName} not fully loaded, waiting...`);
        await new Promise((resolve) => {
          sound.addEventListener("canplaythrough", resolve, { once: true });
        });
      }

      sound.currentTime = 0;
      await sound.play();
    } catch (error) {
      console.error(`Error playing sound ${soundName}:`, error);
    }
  }
}

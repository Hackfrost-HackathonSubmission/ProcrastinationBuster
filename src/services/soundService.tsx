"use client";

type SoundName = "timerComplete" | "breakComplete" | "buttonClick";

export class SoundService {
  private static sounds: { [key in SoundName]?: HTMLAudioElement } = {};
  private static volume: number = 0.5;

  static init() {
    try {
      // Create Audio elements with direct paths to sound files
      this.sounds = {
        timerComplete: new Audio("/sounds/timer-complete.mp3"),
        breakComplete: new Audio("/sounds/break-complete.mp3"),
        buttonClick: new Audio("/sounds/button-click.mp3"),
      };

      // Set initial volume for all sounds
      Object.values(this.sounds).forEach((sound) => {
        if (sound) {
          sound.volume = this.volume;
          // Preload the sounds
          sound.load();
        }
      });
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
    try {
      const sound = this.sounds[soundName];
      if (sound) {
        sound.currentTime = 0;
        await sound.play();
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  static isSoundEnabled(): boolean {
    return this.volume > 0;
  }

  static mute() {
    this.setVolume(0);
  }

  static unmute() {
    this.setVolume(0.5);
  }
}

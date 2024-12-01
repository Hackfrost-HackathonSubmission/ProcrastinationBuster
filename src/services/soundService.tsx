"use client";

export class SoundService {
  private static sounds: { [key: string]: HTMLAudioElement } = {};
  private static volume: number = 0.5;

  static init() {
    this.sounds = {
      timerComplete: new Audio("/sounds/timer-complete.mp3"),
      breakComplete: new Audio("/sounds/break-complete.mp3"),
      buttonClick: new Audio("/sounds/button-click.mp3"),
    };

    // Set initial volume for all sounds
    Object.values(this.sounds).forEach((sound) => {
      sound.volume = this.volume;
    });
  }

  static setVolume(volume: number) {
    this.volume = volume;
    Object.values(this.sounds).forEach((sound) => {
      sound.volume = volume;
    });
  }

  static async play(
    soundName: "timerComplete" | "breakComplete" | "buttonClick"
  ) {
    try {
      const sound = this.sounds[soundName];
      if (sound) {
        sound.currentTime = 0; // Reset to start
        await sound.play();
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }
}

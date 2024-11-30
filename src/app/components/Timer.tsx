"use client";

import { useState, useEffect } from "react";
import { Settings, StorageKey } from "@/types";

interface TimerProps {
  settings: Settings;
  onUpdateSettings: <K extends StorageKey>(
    key: K,
    value: Settings[K]
  ) => Promise<void>;
}

export default function Timer({ settings, onUpdateSettings }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }

    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const startTimer = async () => {
    const duration = settings.focusMode
      ? settings.focusTimer
      : settings.breakTimer;
    setTimeLeft(duration * 60);
    setIsRunning(true);

    await onUpdateSettings("currentSession", {
      startTime: Date.now(),
      duration: duration * 60,
      type: settings.focusMode ? "focus" : "break",
    });
  };

  const stopTimer = async () => {
    setIsRunning(false);
    await onUpdateSettings("currentSession", null);
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);

    if (settings.currentSession?.type === "focus") {
      const session = {
        startTime: settings.currentSession.startTime,
        duration: settings.currentSession.duration,
        completionRate: 100,
        distractions: settings.stats.distractions,
      };

      await onUpdateSettings("stats", {
        ...settings.stats,
        focusSessions: [...settings.stats.focusSessions, session],
        dailyFocusTime: settings.stats.dailyFocusTime + settings.focusTimer,
      });
    }

    await onUpdateSettings("currentSession", null);

    // Show notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "/icon.png",
      title: `${
        settings.currentSession?.type === "focus" ? "Focus" : "Break"
      } Session Complete!`,
      message:
        settings.currentSession?.type === "focus"
          ? "Great job! Take a break."
          : "Break time is over. Ready to focus?",
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="text-center">
      <div className="text-4xl font-bold mb-4 dark:text-white">
        {formatTime(timeLeft)}
      </div>
      <div className="space-x-2">
        {!isRunning ? (
          <button
            onClick={startTimer}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            Start {settings.focusMode ? "Focus" : "Break"}
          </button>
        ) : (
          <button
            onClick={stopTimer}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

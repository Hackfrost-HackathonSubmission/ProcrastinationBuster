"use client";

import { useState, useEffect, useCallback } from "react";

interface TimerSettings {
  focusDuration: number;
  breakDuration: number;
  isActive: boolean;
}

export default function PomodoroTimer() {
  const [settings, setSettings] = useState<TimerSettings>({
    focusDuration: 25,
    breakDuration: 5,
    isActive: false,
  });
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [isBreak, setIsBreak] = useState(false);

  const handleTimerComplete = useCallback(() => {
    if (!isBreak) {
      setTimeLeft(settings.breakDuration * 60);
      setIsBreak(true);
    } else {
      setTimeLeft(settings.focusDuration * 60);
      setIsBreak(false);
      setSettings((prev) => ({ ...prev, isActive: false }));
    }
  }, [isBreak, settings.breakDuration, settings.focusDuration]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (settings.isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [settings.isActive, timeLeft, handleTimerComplete]);

  // Reset timeLeft when break/focus durations change
  useEffect(() => {
    setTimeLeft(
      isBreak ? settings.breakDuration * 60 : settings.focusDuration * 60
    );
  }, [isBreak, settings.breakDuration, settings.focusDuration]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const toggleTimer = () => {
    setSettings((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4">
          {isBreak ? "Break Time" : "Focus Time"}
        </h1>
        <div className="text-6xl font-mono mb-8">{formatTime(timeLeft)}</div>
        <button
          onClick={toggleTimer}
          className={`px-6 py-2 rounded-lg text-white font-medium ${
            settings.isActive
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {settings.isActive ? "Stop" : "Start"}
        </button>
      </div>
    </div>
  );
}

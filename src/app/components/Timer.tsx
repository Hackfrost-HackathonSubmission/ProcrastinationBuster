"use client";

import React, { useState, useEffect } from "react";
import { Settings } from "@/types";
import { browserAPI } from "@/utils/browserAPI";

interface TimerProps {
  settings: Settings;
  onUpdateSettings: <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => Promise<void>;
}

interface TimerState {
  isRunning: boolean;
  remainingTime: number;
  totalDuration: number;
}

export default function Timer({ settings, onUpdateSettings }: TimerProps) {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    remainingTime: 0,
    totalDuration: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (timerState.isRunning && timerState.remainingTime > 0) {
        setTimerState((prev) => ({
          ...prev,
          remainingTime: prev.remainingTime - 1,
        }));
      } else if (timerState.isRunning && timerState.remainingTime === 0) {
        endTimer();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.remainingTime]);

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const startFocusSession = async () => {
    const minutes = settings.focusTimer;
    await browserAPI.runtime.sendMessage({
      action: "startTimer",
      minutes,
      isBreak: false,
    });

    setTimerState({
      isRunning: true,
      remainingTime: minutes * 60,
      totalDuration: minutes * 60,
    });

    if (!settings.focusMode) {
      await onUpdateSettings("focusMode", true);
    }
  };

  const startBreakSession = async () => {
    const minutes = settings.breakTimer;
    await browserAPI.runtime.sendMessage({
      action: "startTimer",
      minutes,
      isBreak: true,
    });

    setTimerState({
      isRunning: true,
      remainingTime: minutes * 60,
      totalDuration: minutes * 60,
    });

    if (settings.focusMode) {
      await onUpdateSettings("focusMode", false);
    }
  };

  const pauseTimer = async () => {
    await browserAPI.runtime.sendMessage({
      action: "pauseTimer",
    });

    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
    }));
  };

  const resumeTimer = async () => {
    await browserAPI.runtime.sendMessage({
      action: "resumeTimer",
    });

    setTimerState((prev) => ({
      ...prev,
      isRunning: true,
    }));
  };

  const endTimer = async () => {
    await browserAPI.runtime.sendMessage({
      action: "endTimer",
    });

    setTimerState({
      isRunning: false,
      remainingTime: 0,
      totalDuration: 0,
    });
  };

  const getProgressPercentage = (): number => {
    if (timerState.totalDuration === 0) return 0;
    return Math.min(
      ((timerState.totalDuration - timerState.remainingTime) /
        timerState.totalDuration) *
        100,
      100
    );
  };

  // Rest of your Timer component JSX remains the same
  return (
    <div className="space-y-4">
      <div className="relative pt-4">
        <div className="flex justify-center items-center">
          <div className="text-3xl font-mono dark:text-white">
            {formatTime(timerState.remainingTime)}
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-1000"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {!timerState.isRunning && timerState.remainingTime === 0 && (
          <>
            <button
              onClick={startFocusSession}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Start Focus ({settings.focusTimer}m)
            </button>
            <button
              onClick={startBreakSession}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Start Break ({settings.breakTimer}m)
            </button>
          </>
        )}
        {timerState.isRunning && (
          <button
            onClick={pauseTimer}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Pause
          </button>
        )}
        {!timerState.isRunning && timerState.remainingTime > 0 && (
          <button
            onClick={resumeTimer}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Resume
          </button>
        )}
        {timerState.remainingTime > 0 && (
          <button
            onClick={endTimer}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            End
          </button>
        )}
      </div>
    </div>
  );
}

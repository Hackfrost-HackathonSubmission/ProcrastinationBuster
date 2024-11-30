// src/components/Timer.tsx
import React, { useEffect, useState } from "react";
import { Settings, StorageKey } from "@/types";

interface TimerProps {
  settings: Settings;
  onUpdateSettings: <K extends StorageKey>(
    key: K,
    value: Settings[K]
  ) => Promise<void>;
}

interface TimerState {
  isRunning: boolean;
  remainingTime: number;
  totalDuration: number;
}

const Timer: React.FC<TimerProps> = ({ settings, onUpdateSettings }) => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    remainingTime: 0,
    totalDuration: 0,
  });

  useEffect(() => {
    // Check timer state when component mounts
    chrome.runtime.sendMessage({ action: "getTimeRemaining" }, (response) => {
      if (response.remainingTime > 0) {
        setTimerState((prev) => ({
          ...prev,
          isRunning: true,
          remainingTime: Math.round(response.remainingTime),
          totalDuration: Math.round(
            response.totalDuration || response.remainingTime
          ),
        }));
      }
    });

    // Set up interval to update timer display
    const intervalId = setInterval(() => {
      chrome.runtime.sendMessage({ action: "getTimeRemaining" }, (response) => {
        if (response.remainingTime >= 0) {
          setTimerState((prev) => ({
            ...prev,
            remainingTime: Math.round(response.remainingTime),
            isRunning: response.isRunning,
          }));
        }
      });
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const formatTime = (seconds: number): string => {
    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const startFocusSession = async () => {
    const minutes = settings.focusTimer;
    chrome.runtime.sendMessage(
      {
        action: "startTimer",
        minutes,
        isBreak: false,
      },
      () => {
        setTimerState({
          isRunning: true,
          remainingTime: minutes * 60,
          totalDuration: minutes * 60,
        });

        // Enable focus mode when starting a focus session
        if (!settings.focusMode) {
          onUpdateSettings("focusMode", true);
        }
      }
    );
  };

  const startBreakSession = async () => {
    const minutes = settings.breakTimer;
    chrome.runtime.sendMessage(
      {
        action: "startTimer",
        minutes,
        isBreak: true,
      },
      () => {
        setTimerState({
          isRunning: true,
          remainingTime: minutes * 60,
          totalDuration: minutes * 60,
        });

        // Disable focus mode during break
        if (settings.focusMode) {
          onUpdateSettings("focusMode", false);
        }
      }
    );
  };

  const pauseTimer = () => {
    chrome.runtime.sendMessage(
      {
        action: "pauseTimer",
      },
      () => {
        setTimerState((prev) => ({
          ...prev,
          isRunning: false,
        }));
      }
    );
  };

  const resumeTimer = () => {
    chrome.runtime.sendMessage(
      {
        action: "resumeTimer",
      },
      () => {
        setTimerState((prev) => ({
          ...prev,
          isRunning: true,
        }));
      }
    );
  };

  const endTimer = () => {
    chrome.runtime.sendMessage(
      {
        action: "endTimer",
      },
      () => {
        setTimerState({
          isRunning: false,
          remainingTime: 0,
          totalDuration: 0,
        });
      }
    );
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

  return (
    <div className="space-y-4">
      {/* Timer Display */}
      <div className="relative pt-4">
        <div className="flex justify-center items-center">
          <div className="text-3xl font-mono dark:text-white">
            {formatTime(timerState.remainingTime)}
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-1000"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Timer Controls */}
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
          <>
            <button
              onClick={pauseTimer}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Pause
            </button>
            <button
              onClick={endTimer}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              End
            </button>
          </>
        )}

        {!timerState.isRunning && timerState.remainingTime > 0 && (
          <button
            onClick={resumeTimer}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Resume
          </button>
        )}
      </div>
    </div>
  );
};

export default Timer;

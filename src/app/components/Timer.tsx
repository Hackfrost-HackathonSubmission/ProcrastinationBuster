"use client";

import React, { useState, useEffect, useCallback } from "react";
import CircularProgress from "./CircularProgress";
import Settings from "./Settings";
import { NotificationService } from "@/services/notificationService";
import { SoundService } from "@/services/soundService";

interface TimerSettings {
  focusDuration: number;
  breakDuration: number;
  volume: number;
}

interface TimerState {
  timeLeft: number;
  isActive: boolean;
  isBreak: boolean;
  settings: TimerSettings;
}

interface TimerProps {
  initialMinutes: number;
  timerState: TimerState;
  setTimerState: React.Dispatch<React.SetStateAction<TimerState>>;
}

const Timer: React.FC<TimerProps> = ({ timerState, setTimerState }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const { timeLeft, isActive, isBreak, settings } = timerState;

  const totalTime = isBreak
    ? settings.breakDuration * 60
    : settings.focusDuration * 60;

  useEffect(() => {
    SoundService.init();
    SoundService.preloadSounds().catch(console.error);
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      const permitted = await NotificationService.requestPermission();
      setNotificationsEnabled(permitted);
    };
    setupNotifications();
  }, []);

  const handleTimerComplete = useCallback(async () => {
    if (isBreak) {
      await SoundService.play("breakComplete");
      if (notificationsEnabled) {
        await NotificationService.showNotification({
          title: "Break Complete!",
          message: "Time to get back to work. Start your focus session.",
        });
      }
      setTimerState((prev) => ({
        ...prev,
        isActive: false,
        isBreak: false,
        timeLeft: settings.focusDuration * 60,
      }));
    } else {
      await SoundService.play("timerComplete");
      if (notificationsEnabled) {
        await NotificationService.showNotification({
          title: "Focus Session Complete!",
          message: `Great work! Take a ${settings.breakDuration}-minute break.`,
        });
      }
      setTimerState((prev) => ({
        ...prev,
        isActive: false,
        isBreak: true,
        timeLeft: settings.breakDuration * 60,
      }));
    }
  }, [
    isBreak,
    notificationsEnabled,
    settings.breakDuration,
    settings.focusDuration,
    setTimerState,
  ]);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (data) {
          setTimerState((prevState) => ({
            ...prevState,
            settings: {
              focusDuration: data.focusDuration,
              breakDuration: data.breakDuration,
              volume: data.volume || 0.5,
            },
            timeLeft: !isBreak ? data.focusDuration * 60 : prevState.timeLeft,
          }));
          SoundService.setVolume(data.volume || 0.5);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, [isBreak, setTimerState]);

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimerState((prevState) => {
          if (prevState.timeLeft <= 1) {
            handleTimerComplete();
            return {
              ...prevState,
              timeLeft: 0,
              isActive: false,
            };
          }
          return {
            ...prevState,
            timeLeft: prevState.timeLeft - 1,
          };
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, handleTimerComplete, setTimerState]);
  const toggleTimer = () => {
    setTimerState((prevState) => ({
      ...prevState,
      isActive: !prevState.isActive,
    }));
    SoundService.play("buttonClick");
  };

  const resetTimer = () => {
    setTimerState((prevState) => ({
      ...prevState,
      isActive: false,
      isBreak: false,
      timeLeft: settings.focusDuration * 60,
    }));
    SoundService.play("buttonClick");
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className="flex flex-col items-center space-y-6">
      {!notificationsEnabled && (
        <div className="text-yellow-400 text-sm mt-2">
          Enable notifications for timer alerts
          <button
            onClick={() => NotificationService.requestPermission()}
            className="ml-2 underline hover:text-yellow-300"
          >
            Enable
          </button>
        </div>
      )}
      <CircularProgress
        progress={progress}
        size={300}
        strokeWidth={20}
        color={
          isBreak
            ? "stroke-yellow-400"
            : isActive
            ? "stroke-emerald-400"
            : "stroke-purple-500"
        }
        backgroundColor="stroke-gray-700"
        className="transition-all duration-300"
      >
        <div className="flex flex-col items-center">
          <div className="text-5xl font-bold mb-2 text-gray-100">
            {formatTime(timeLeft)}
          </div>
          <div className="text-gray-400">
            {isBreak
              ? "Break Time"
              : isActive
              ? "Focus Time"
              : "Ready to Focus?"}
          </div>
        </div>
      </CircularProgress>

      <div className="flex space-x-4">
        <button
          onClick={toggleTimer}
          className={`px-6 py-2 rounded-lg text-white font-medium transition-colors
             ${
               isActive
                 ? "bg-red-500 hover:bg-red-600"
                 : "bg-emerald-500 hover:bg-emerald-600"
             } shadow-lg shadow-emerald-500/20`}
        >
          {isActive ? "Pause" : "Start"}
        </button>
        <button
          onClick={resetTimer}
          className="px-6 py-2 rounded-lg text-gray-300 font-medium border border-gray-700
                    hover:bg-gray-700 transition-colors shadow-lg"
        >
          Reset
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="px-6 py-2 rounded-lg text-gray-300 font-medium border border-gray-700
                    hover:bg-gray-700 transition-colors shadow-lg"
        >
          Settings
        </button>
      </div>

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          initialSettings={settings}
          onSave={async (newSettings: TimerSettings) => {
            setTimerState((prevState) => ({
              ...prevState,
              settings: newSettings,
              timeLeft: !isBreak
                ? newSettings.focusDuration * 60
                : prevState.timeLeft,
              isActive: false,
            }));
            setShowSettings(false);
            SoundService.setVolume(newSettings.volume);
          }}
        />
      )}
    </div>
  );
};

export default Timer;

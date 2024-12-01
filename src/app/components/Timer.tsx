"use client";

import React, { useState, useEffect } from "react";
import CircularProgress from "./CircularProgress";
import Settings from "./Settings";
import { NotificationService } from "@/services/notificationService";
import { SoundService } from "@/services/soundService";

interface TimerProps {
  initialMinutes?: number;
}

const Timer: React.FC<TimerProps> = ({ initialMinutes = 25 }) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [settings, setSettings] = useState({
    focusDuration: initialMinutes,
    breakDuration: 5,
    volume: 0.5,
  });

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

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (data) {
          setSettings({
            focusDuration: data.focusDuration,
            breakDuration: data.breakDuration,
            volume: data.volume || 0.5,
          });
          if (!isBreak) {
            setTimeLeft(data.focusDuration * 60);
          }
          SoundService.setVolume(data.volume || 0.5);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  // Load saved timer state
  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch("/api/timer");
        const data = await response.json();
        if (data && Date.now() - new Date(data.lastUpdate).getTime() < 300000) {
          setTimeLeft(data.timeLeft);
          setIsActive(data.isActive);
          setIsBreak(data.isBreak);
        }
      } catch (error) {
        console.error("Failed to load timer state:", error);
      }
    };
    loadState();
  }, []);

  // Save timer state
  const saveState = async () => {
    try {
      await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeLeft,
          isActive,
          isBreak,
          focusDuration: settings.focusDuration,
          breakDuration: settings.breakDuration,
          volume: settings.volume,
        }),
      });
    } catch (error) {
      console.error("Failed to save timer state:", error);
    }
  };

  // Save state periodically and on important changes
  useEffect(() => {
    const interval = setInterval(saveState, 60000); // Save every minute

    // Save state when timer is paused or completed
    if (!isActive) {
      saveState();
    }

    return () => clearInterval(interval);
  }, [timeLeft, isActive, isBreak]);

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setIsActive(false);
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
    SoundService.play("buttonClick");
    if (!isActive) {
      saveState();
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(settings.focusDuration * 60);
    SoundService.play("buttonClick");
    saveState();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  const handleTimerComplete = async () => {
    setIsActive(false);

    if (isBreak) {
      await SoundService.play("breakComplete");
      if (notificationsEnabled) {
        await NotificationService.showNotification({
          title: "Break Complete!",
          message: "Time to get back to work. Start your focus session.",
        });
      }
      setIsBreak(false);
      setTimeLeft(settings.focusDuration * 60);
    } else {
      await SoundService.play("timerComplete");
      if (notificationsEnabled) {
        await NotificationService.showNotification({
          title: "Focus Session Complete!",
          message: `Great work! Take a ${settings.breakDuration}-minute break.`,
        });
      }
      setIsBreak(true);
      setTimeLeft(settings.breakDuration * 60);
    }
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
          onSave={async (newSettings) => {
            setSettings(newSettings);
            setShowSettings(false);
            if (!isBreak) {
              setTimeLeft(newSettings.focusDuration * 60);
            }
            setIsActive(false);
          }}
        />
      )}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          initialSettings={settings} // Now includes volume
          onSave={async (newSettings) => {
            setSettings(newSettings);
            setShowSettings(false);
            if (!isBreak) {
              setTimeLeft(newSettings.focusDuration * 60);
            }
            setIsActive(false);
            // Update sound volume when settings are saved
            SoundService.setVolume(newSettings.volume);
          }}
        />
      )}
    </div>
  );
};

export default Timer;

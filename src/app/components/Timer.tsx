"use client";

import React, { useState, useEffect } from "react";
import CircularProgress from "./CircularProgress";
import Settings from "./Settings";

interface TimerProps {
  initialMinutes?: number;
}

const Timer: React.FC<TimerProps> = ({ initialMinutes = 25 }) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    focusDuration: initialMinutes,
    breakDuration: 5,
  });

  // Calculate total time based on current mode
  const totalTime = isBreak
    ? settings.breakDuration * 60
    : settings.focusDuration * 60;

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (data) {
          setSettings(data);
          if (!isBreak) {
            setTimeLeft(data.focusDuration * 60);
          }
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

  // Handle timer completion
  const handleTimerComplete = () => {
    setIsActive(false);
    if (isBreak) {
      // Break is over, start focus time
      setIsBreak(false);
      setTimeLeft(settings.focusDuration * 60);
    } else {
      // Focus time is over, start break
      setIsBreak(true);
      setTimeLeft(settings.breakDuration * 60);
    }
    // Play notification sound or show notification here
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(settings.focusDuration * 60);
    saveState();
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
    </div>
  );
};

export default Timer;

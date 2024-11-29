"use client";

import { useState, useEffect } from "react";
import { useCallback } from "react";

interface TimerStats {
  dailyFocusTime: number;
  weeklyFocusTime: number;
  distractions: number;
  lastUpdate: string;
}

export default function Timer() {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [focusLength, setFocusLength] = useState(25);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [stats, setStats] = useState<TimerStats>({
    dailyFocusTime: 0,
    weeklyFocusTime: 0,
    distractions: 0,
    lastUpdate: new Date().toISOString(),
  });

  useEffect(() => {
    // Load stats and current session
    chrome.storage?.sync?.get(["currentSession", "stats"], (data) => {
      if (data.stats) {
        setStats(data.stats);
      }

      if (data.currentSession) {
        const elapsed = Math.floor(
          (Date.now() - data.currentSession.startTime) / 1000
        );
        const remaining = data.currentSession.duration * 60 - elapsed;

        if (remaining > 0) {
          setTimeLeft(remaining);
          setIsActive(true);
        }
      }
    });
  }, []);

  const updateStats = useCallback(() => {
    if (mode === "focus") {
      const newStats = {
        ...stats,
        dailyFocusTime: stats.dailyFocusTime + focusLength,
        weeklyFocusTime: stats.weeklyFocusTime + focusLength,
        lastUpdate: new Date().toISOString(),
      };
      setStats(newStats);
      chrome.storage?.sync?.set({ stats: newStats });
    }
  }, [stats, focusLength, mode]);

  const startTimer = () => {
    const startTime = Date.now();
    chrome.storage?.sync?.set({
      currentSession: {
        startTime,
        duration: focusLength,
      },
    });

    chrome.runtime?.sendMessage({
      action: "startTimer",
      minutes: focusLength,
      mode: mode,
    });

    setIsActive(true);
    setTimeLeft(focusLength * 60);
  };

  const startBreak = () => {
    setMode("break");
    setFocusLength(5); // 5 minute break
    startTimer();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="text-center p-4">
      <div className="mb-4">
        <span className="text-sm font-medium text-gray-500">
          {mode === "focus" ? "Focus Session" : "Break Time"}
        </span>
        <div className="text-4xl font-bold">{formatTime(timeLeft)}</div>
      </div>

      <div className="flex gap-4 justify-center mb-4">
        {mode === "focus" && (
          <>
            <button
              onClick={() => setFocusLength(25)}
              className={`px-3 py-1 rounded ${
                focusLength === 25 ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              25m
            </button>
            <button
              onClick={() => setFocusLength(45)}
              className={`px-3 py-1 rounded ${
                focusLength === 45 ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              45m
            </button>
          </>
        )}
      </div>

      <button
        onClick={mode === "focus" ? startTimer : startBreak}
        disabled={isActive}
        className={`px-6 py-2 rounded-lg ${
          isActive
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        {isActive
          ? `${mode === "focus" ? "Focus" : "Break"} Session Active`
          : `Start ${mode === "focus" ? "Focus" : "Break"} Session`}
      </button>

      {/* Stats Section */}
      <div className="mt-8 text-left">
        <h3 className="text-lg font-semibold mb-2">Today's Progress</h3>
        <div className="space-y-2">
          <p>Focus Time: {Math.round(stats.dailyFocusTime)} minutes</p>
          <p>Weekly Focus: {Math.round(stats.weeklyFocusTime)} minutes</p>
          <p>Distractions Blocked: {stats.distractions}</p>
        </div>
      </div>
    </div>
  );
}

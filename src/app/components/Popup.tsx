"use client";

import { useState, useEffect } from "react";
import BlockedSites from "./BlockedSites";
import Timer from "./Timer";
import { Settings, StorageKey } from "@/types";

const DEFAULT_SETTINGS: Settings = {
  isEnabled: true,
  focusMode: false,
  focusTimer: 25,
  breakTimer: 5,
  currentSession: null,
  blockedSites: [],
  stats: {
    dailyFocusTime: 0,
    distractions: 0,
    lastUpdate: new Date().toISOString(),
    focusSessions: [],
    streak: {
      current: 0,
      best: 0,
      lastDate: new Date().toISOString(),
    },
  },
};

export default function Popup() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { isEnabled, focusMode, focusTimer } = settings;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const result = await chrome.storage.sync.get(null);
        // Merge with default settings to ensure all properties exist
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...result,
          stats: {
            ...DEFAULT_SETTINGS.stats,
            ...(result?.stats || {}),
            streak: {
              ...DEFAULT_SETTINGS.stats.streak,
              ...(result?.stats?.streak || {}),
            },
          },
        };
        setSettings(mergedSettings);
      } catch (error) {
        console.error("Failed to load settings:", error);
        // If loading fails, keep using default settings
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async <K extends StorageKey>(
    key: K,
    value: Settings[K]
  ): Promise<void> => {
    try {
      await chrome.storage.sync.set({ [key]: value });
      setSettings((currentSettings) => ({
        ...currentSettings,
        [key]: value,
      }));
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg flex items-center justify-center">
        <div className="text-center dark:text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-80 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold dark:text-white">
          ProcrastinationBuster
        </h1>
        <button
          className={`${
            isEnabled ? "bg-green-500" : "bg-red-500"
          } px-3 py-1 rounded-full text-white text-sm transition-colors duration-200`}
          onClick={() => updateSettings("isEnabled", !isEnabled)}
          aria-label={isEnabled ? "Disable extension" : "Enable extension"}
        >
          {isEnabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      {/* Main Settings Section */}
      <div className="space-y-4">
        {/* Focus Mode Toggle */}
        <div className="flex items-center justify-between">
          <span className="dark:text-white">Focus Mode</span>
          <button
            className={`${
              focusMode ? "bg-blue-500" : "bg-gray-300"
            } px-3 py-1 rounded-full text-white text-sm transition-colors duration-200`}
            onClick={() => updateSettings("focusMode", !focusMode)}
            aria-label={
              focusMode ? "Turn off focus mode" : "Turn on focus mode"
            }
          >
            {focusMode ? "On" : "Off"}
          </button>
        </div>

        {/* Timer Controls */}
        <div>
          <label
            htmlFor="focusTimer"
            className="block text-sm mb-1 dark:text-white"
          >
            Focus Timer (minutes)
          </label>
          <input
            id="focusTimer"
            type="number"
            value={focusTimer}
            onChange={(e) => {
              const value = Math.min(Math.max(Number(e.target.value), 1), 60);
              updateSettings("focusTimer", value);
            }}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
            min="1"
            max="60"
          />
        </div>

        {/* Timer Component */}
        <Timer settings={settings} onUpdateSettings={updateSettings} />

        {/* Stats Display */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h2 className="text-sm font-semibold mb-2 dark:text-white">
            Today&apos;s Stats
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="dark:text-gray-200">
              <span>Focus Time: </span>
              <span className="font-medium">
                {Math.round(settings.stats.dailyFocusTime / 60)} min
              </span>
            </div>
            <div className="dark:text-gray-200">
              <span>Distractions: </span>
              <span className="font-medium">{settings.stats.distractions}</span>
            </div>
            <div className="dark:text-gray-200">
              <span>Streak: </span>
              <span className="font-medium">
                {settings.stats.streak.current} days
              </span>
            </div>
          </div>
        </div>

        {/* Blocked Sites Component */}
        <BlockedSites
          sites={settings.blockedSites}
          onUpdateSites={(sites) => updateSettings("blockedSites", sites)}
        />
      </div>
    </div>
  );
}

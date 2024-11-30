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
  const { isEnabled, focusMode, focusTimer } = settings;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = (await chrome.storage.sync.get(null)) as Settings;
        setSettings((prev) => ({
          ...DEFAULT_SETTINGS,
          ...result,
        }));
      } catch (error) {
        console.error("Failed to load settings:", error);
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
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
    }
  };

  return (
    <div className="w-80 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold dark:text-white">
          ProcrastinationBuster
        </h1>
        <button
          className={`${
            isEnabled ? "bg-green-500" : "bg-red-500"
          } px-3 py-1 rounded-full text-white text-sm transition-colors duration-200`}
          onClick={() => updateSettings("isEnabled", !isEnabled)}
        >
          {isEnabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="dark:text-white">Focus Mode</span>
          <button
            className={`${
              focusMode ? "bg-blue-500" : "bg-gray-300"
            } px-3 py-1 rounded-full text-white text-sm transition-colors duration-200`}
            onClick={() => updateSettings("focusMode", !focusMode)}
          >
            {focusMode ? "On" : "Off"}
          </button>
        </div>

        <div>
          <label className="block text-sm mb-1 dark:text-white">
            Focus Timer (minutes)
          </label>
          <input
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

        <Timer settings={settings} onUpdateSettings={updateSettings} />
        <BlockedSites
          sites={settings.blockedSites}
          onUpdateSites={(sites) => updateSettings("blockedSites", sites)}
        />
      </div>
    </div>
  );
}

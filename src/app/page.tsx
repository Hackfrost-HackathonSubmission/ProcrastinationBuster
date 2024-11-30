"use client";

import React, { useState, useEffect } from "react";
import Timer from "./components/Timer";
import BlockedSites from "./components/BlockedSites";
import { Settings } from "@/types";

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

const Page = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        try {
          const result = (await chrome.storage.sync.get(null)) as Settings;
          setSettings({
            ...DEFAULT_SETTINGS,
            ...result,
          });
        } catch (error) {
          console.error("Failed to load settings:", error);
        }
      } else {
        console.error("Chrome storage API is not available.");
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ): Promise<void> => {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      try {
        await chrome.storage.sync.set({ [key]: value });
        setSettings((currentSettings) => ({
          ...currentSettings,
          [key]: value,
        }));
      } catch (error) {
        console.error(`Failed to update ${key}:`, error);
      }
    } else {
      console.error("Chrome storage API is not available.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 dark:text-white">
          ProcrastinationBuster
        </h1>
        <div className="space-y-6">
          <Timer settings={settings} onUpdateSettings={updateSettings} />
          <BlockedSites
            sites={settings.blockedSites}
            onUpdateSites={(sites) => updateSettings("blockedSites", sites)}
          />
        </div>
      </div>
    </div>
  );
};

export default Page;

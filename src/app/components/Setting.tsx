"use client";

import { useState, useEffect } from "react";

interface Settings {
  isEnabled: boolean;
  defaultFocusTime: number;
  blockedSites: string[];
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({
    isEnabled: true,
    defaultFocusTime: 25,
    blockedSites: [],
  });
  const [newSite, setNewSite] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load settings from chrome storage
    chrome.storage?.sync?.get(["settings"], (data) => {
      if (data.settings) {
        setSettings(data.settings);
      }
      setIsLoading(false);
    });
  }, []);

  const saveSettings = (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    chrome.storage?.sync?.set({ settings: updatedSettings });
  };

  const addBlockedSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.trim()) return;

    try {
      // Attempt to create URL to validate format
      new URL(newSite.startsWith("http") ? newSite : `https://${newSite}`);

      const updatedSites = [...settings.blockedSites, newSite.toLowerCase()];
      saveSettings({ blockedSites: updatedSites });
      setNewSite("");
    } catch (err) {
      alert("Please enter a valid website URL");
    }
  };

  const removeBlockedSite = (site: string) => {
    const updatedSites = settings.blockedSites.filter((s) => s !== site);
    saveSettings({ blockedSites: updatedSites });
  };

  if (isLoading) {
    return <div className="p-4">Loading settings...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      {/* Extension Toggle */}
      <div className="mb-6">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.isEnabled}
            onChange={(e) => saveSettings({ isEnabled: e.target.checked })}
            className="form-checkbox h-5 w-5 text-blue-500"
          />
          <span>Enable ProcrastinationBuster</span>
        </label>
      </div>

      {/* Default Focus Time */}
      <div className="mb-6">
        <label className="block mb-2">Default Focus Time (minutes)</label>
        <select
          value={settings.defaultFocusTime}
          onChange={(e) =>
            saveSettings({ defaultFocusTime: Number(e.target.value) })
          }
          className="block w-full p-2 border rounded-md"
        >
          <option value={25}>25 minutes (Pomodoro)</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
      </div>

      {/* Blocked Sites Management */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Blocked Sites</h3>

        <form onSubmit={addBlockedSite} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              placeholder="Enter website URL (e.g., facebook.com)"
              className="flex-1 p-2 border rounded-md"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Add Site
            </button>
          </div>
        </form>

        {/* Blocked Sites List */}
        <div className="space-y-2">
          {settings.blockedSites.length === 0 ? (
            <p className="text-gray-500 italic">No sites blocked yet</p>
          ) : (
            settings.blockedSites.map((site) => (
              <div
                key={site}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
              >
                <span>{site}</span>
                <button
                  onClick={() => removeBlockedSite(site)}
                  className="text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reset Settings */}
      <div className="mt-8 pt-4 border-t">
        <button
          onClick={() => {
            if (confirm("Are you sure you want to reset all settings?")) {
              saveSettings({
                isEnabled: true,
                defaultFocusTime: 25,
                blockedSites: [],
              });
            }
          }}
          className="px-4 py-2 text-red-500 border border-red-500 rounded-md hover:bg-red-50 transition-colors"
        >
          Reset All Settings
        </button>
      </div>
    </div>
  );
}

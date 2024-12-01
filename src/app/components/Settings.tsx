// src/components/Settings.tsx
"use client";

import React, { useState } from "react";

interface SettingsProps {
  onClose: () => void;
  initialSettings: {
    focusDuration: number;
    breakDuration: number;
  };
}

const Settings: React.FC<SettingsProps> = ({ onClose, initialSettings }) => {
  const [settings, setSettings] = useState(initialSettings);

  const handleSave = async () => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      onClose();
      window.location.reload(); // Refresh to apply new settings
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl text-gray-100 mb-4">Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">
              Focus Duration (minutes)
            </label>
            <input
              type="number"
              value={settings.focusDuration}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  focusDuration: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">
              Break Duration (minutes)
            </label>
            <input
              type="number"
              value={settings.breakDuration}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  breakDuration: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded"
            />
          </div>
          <div className="flex space-x-4 mt-6">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

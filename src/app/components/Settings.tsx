"use client";

import React, { useState } from "react";

interface SettingsProps {
  onClose: () => void;
  onSave: (settings: { focusDuration: number; breakDuration: number }) => void;
  initialSettings: {
    focusDuration: number;
    breakDuration: number;
  };
}

const Settings: React.FC<SettingsProps> = ({
  onClose,
  onSave,
  initialSettings,
}) => {
  const [settings, setSettings] = useState(initialSettings);

  const handleSave = async () => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      onSave(settings);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">
          Timer Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">
              Focus Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={settings.focusDuration}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  focusDuration: Math.max(
                    1,
                    Math.min(120, parseInt(e.target.value) || 1)
                  ),
                })
              }
              className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded 
                       focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">
              Break Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.breakDuration}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  breakDuration: Math.max(
                    1,
                    Math.min(30, parseInt(e.target.value) || 1)
                  ),
                })
              }
              className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded 
                       focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-gray-100 
                     transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg 
                     hover:bg-purple-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

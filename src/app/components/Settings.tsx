"use client";

import React, { useState, useEffect } from "react";
import { SoundService } from "@/services/soundService";

interface SettingsProps {
  settings: {
    focusDuration: number;
    breakDuration: number;
    volume: number;
  };
  onSettingsChange: (newSettings: {
    focusDuration: number;
    breakDuration: number;
    volume: number;
  }) => void;
  disabled: boolean;
}

const Settings: React.FC<SettingsProps> = ({
  settings: initialSettings,
  onSettingsChange,
  disabled,
}) => {
  const [localSettings, setLocalSettings] = useState(initialSettings);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(initialSettings);
  }, [initialSettings]);

  const handleVolumeChange = (value: number) => {
    const newVolume = value / 100;
    setLocalSettings((prev) => ({ ...prev, volume: newVolume }));
    SoundService.setVolume(newVolume);
    SoundService.play("buttonClick");
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-gray-300 mb-2">
          Focus Duration (minutes)
        </label>
        <input
          type="number"
          min="1"
          max="120"
          value={localSettings.focusDuration}
          onChange={(e) =>
            setLocalSettings((prev) => ({
              ...prev,
              focusDuration: Math.max(
                1,
                Math.min(120, parseInt(e.target.value) || 1)
              ),
            }))
          }
          disabled={disabled}
          className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded 
                   focus:outline-none focus:ring-2 focus:ring-purple-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
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
          value={localSettings.breakDuration}
          onChange={(e) =>
            setLocalSettings((prev) => ({
              ...prev,
              breakDuration: Math.max(
                1,
                Math.min(30, parseInt(e.target.value) || 1)
              ),
            }))
          }
          disabled={disabled}
          className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded 
                   focus:outline-none focus:ring-2 focus:ring-purple-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-gray-300 mb-2">Sound Volume</label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="100"
            value={localSettings.volume * 100}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-gray-300 w-12">
            {Math.round(localSettings.volume * 100)}%
          </span>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={handleSave}
          disabled={disabled}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg 
                   hover:bg-purple-600 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings;

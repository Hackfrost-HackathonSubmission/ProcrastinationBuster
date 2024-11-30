"use client";

import { useState, useEffect } from "react";
import BlockedSites from "./BlockedSites";
import Timer from "./Timer";

export default function Popup() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [timer, setTimer] = useState(25);

  // Load settings from storage when popup opens
  useEffect(() => {
    chrome.storage?.sync?.get(
      ["isEnabled", "focusMode", "focusTimer"],
      (data) => {
        if (data.isEnabled !== undefined) setIsEnabled(data.isEnabled);
        if (data.focusMode !== undefined) setFocusMode(data.focusMode);
        if (data.focusTimer !== undefined) setTimer(data.focusTimer);
      }
    );
  }, []);

  // Save settings to storage when they change
  const updateSettings = (updates: { [key: string]: any }) => {
    chrome.storage?.sync?.set(updates);
  };

  return (
    <div className="w-80 p-4 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">ProcrastinationBuster</h1>
        <button
          className={`${
            isEnabled ? "bg-green-500" : "bg-red-500"
          } px-3 py-1 rounded-full text-white text-sm`}
          onClick={() => {
            setIsEnabled(!isEnabled);
            updateSettings({ isEnabled: !isEnabled });
          }}
        >
          {isEnabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Focus Mode</span>
          <button
            className={`${
              focusMode ? "bg-blue-500" : "bg-gray-300"
            } px-3 py-1 rounded-full text-white text-sm`}
            onClick={() => {
              setFocusMode(!focusMode);
              updateSettings({ focusMode: !focusMode });
            }}
          >
            {focusMode ? "On" : "Off"}
          </button>
        </div>

        <div>
          <label className="block text-sm mb-1">Focus Timer (minutes)</label>
          <input
            type="number"
            value={timer}
            onChange={(e) => {
              const value = Number(e.target.value);
              setTimer(value);
              updateSettings({ focusTimer: value });
            }}
            className="w-full px-3 py-2 border rounded-lg"
            min="1"
            max="60"
          />
        </div>

        <Timer />
        <BlockedSites />
      </div>
    </div>
  );
}

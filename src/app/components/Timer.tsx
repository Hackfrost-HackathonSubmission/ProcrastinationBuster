"use client";

import { useState, useEffect } from "react";

export default function Timer() {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [focusLength, setFocusLength] = useState(25);

  useEffect(() => {
    // Load current session if exists
    chrome.storage?.sync?.get(["currentSession"], (data) => {
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

  const startTimer = () => {
    chrome.runtime?.sendMessage({ action: "startTimer", minutes: focusLength });
    setIsActive(true);
    setTimeLeft(focusLength * 60);
  };

  return (
    <div className="text-center p-4">
      <div className="text-4xl font-bold mb-4">
        {Math.floor(timeLeft / 60)}:
        {(timeLeft % 60).toString().padStart(2, "0")}
      </div>

      <div className="flex gap-4 justify-center mb-4">
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
      </div>

      <button
        onClick={startTimer}
        disabled={isActive}
        className={`px-6 py-2 rounded-lg ${
          isActive
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        {isActive ? "Focus Session Active" : "Start Focus Session"}
      </button>
    </div>
  );
}

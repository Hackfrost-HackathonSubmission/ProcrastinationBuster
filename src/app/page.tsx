// src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Timer from "./components/Timer";
import { BlockedSites } from "./components/BlockedSites";
import { BlockedPage } from "@/app/components/BlockedPage";
import { BlockService } from "@/services/blockService";

const Page = () => {
  const [activeTab, setActiveTab] = useState<"timer" | "blocked">("timer");
  const [isBlocked, setIsBlocked] = useState(false);
  const [timerState, setTimerState] = useState({
    timeLeft: 25 * 60,
    isActive: false,
    isBreak: false,
    settings: {
      focusDuration: 25,
      breakDuration: 5,
      volume: 0.5,
    },
  });

  useEffect(() => {
    // Check if current site is blocked
    const checkBlocked = () => {
      if (
        BlockService.isCurrentSiteBlocked() &&
        timerState.isActive &&
        !timerState.isBreak
      ) {
        setIsBlocked(true);
      }
    };

    checkBlocked();
    // Check every second while timer is running
    const interval = setInterval(checkBlocked, 1000);
    return () => clearInterval(interval);
  }, [timerState.isActive, timerState.isBreak]);

  // Prevent access to blocked sites tab while timer is active
  const handleTabChange = (tab: "timer" | "blocked") => {
    if (tab === "blocked" && timerState.isActive && !timerState.isBreak) {
      return; // Don't allow switching to blocked sites during focus time
    }
    setActiveTab(tab);
  };

  if (isBlocked) {
    return <BlockedPage onGoBack={() => setIsBlocked(false)} />;
  }

  return (
    <main className="min-h-screen bg-gray-900">
      <div className="flex justify-center pt-6 space-x-4">
        <button
          onClick={() => handleTabChange("timer")}
          className={`px-6 py-2 rounded-t-lg transition-colors ${
            activeTab === "timer"
              ? "bg-gray-800 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-750"
          }`}
        >
          Timer
        </button>
        <button
          onClick={() => handleTabChange("blocked")}
          className={`px-6 py-2 rounded-t-lg transition-colors ${
            activeTab === "blocked"
              ? "bg-gray-800 text-white"
              : `${
                  timerState.isActive && !timerState.isBreak
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-750"
                }`
          }`}
          disabled={timerState.isActive && !timerState.isBreak}
        >
          Blocked Sites
        </button>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl shadow-purple-500/5">
          {activeTab === "timer" ? (
            <div className="p-8">
              <Timer
                initialMinutes={25}
                timerState={timerState}
                setTimerState={setTimerState}
              />
            </div>
          ) : (
            <BlockedSites />
          )}
        </div>
      </div>
    </main>
  );
};

export default Page;

// src/app/page.tsx
"use client";

import React, { useState } from "react";
import Timer from "./components/Timer";
import { FocusTasks } from "./components/FocusTask";

const Page = () => {
  const [activeTab, setActiveTab] = useState<"timer" | "tasks">("timer");
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

  return (
    <main className="min-h-screen bg-gray-900">
      <div className="flex justify-center pt-6 space-x-4">
        <button
          onClick={() => setActiveTab("timer")}
          className={`px-6 py-2 rounded-t-lg transition-colors ${
            activeTab === "timer"
              ? "bg-gray-800 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-750"
          }`}
        >
          Timer
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-6 py-2 rounded-t-lg transition-colors ${
            activeTab === "tasks"
              ? "bg-gray-800 text-white"
              : `${
                  timerState.isActive && !timerState.isBreak
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-750"
                }`
          }`}
          disabled={timerState.isActive && !timerState.isBreak}
        >
          Focus Tasks
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
            <FocusTasks />
          )}
        </div>
      </div>
    </main>
  );
};

export default Page;

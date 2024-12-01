// src/app/page.tsx
"use client";

import React, { useState } from "react";
import Timer from "./components/Timer";
import { FocusTasks } from "./components/FocusTask";
import Settings from "./components/Settings";

// Define the FocusTask interface
interface FocusTask {
  id: string;
  title: string;
  duration: number;
  isCompleted: boolean;
  createdAt: Date;
  timeSpent?: number;
}

const Page = () => {
  // State management for active tab and current task
  const [activeTab, setActiveTab] = useState<"timer" | "tasks">("timer");
  const [currentTask, setCurrentTask] = useState<FocusTask | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Timer state management
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

  // Handle task selection
  const handleTaskSelect = (task: FocusTask) => {
    setCurrentTask(task);
    setTimerState((prev) => ({
      ...prev,
      timeLeft: task.duration * 60,
      settings: {
        ...prev.settings,
        focusDuration: task.duration,
      },
    }));
    setActiveTab("timer");
  };

  // Handle task completion
  const handleTaskComplete = (taskId: string, timeSpent: number) => {
    setCurrentTask(undefined);
  };

  // Handle settings update
  const handleSettingsUpdate = (newSettings: typeof timerState.settings) => {
    setTimerState((prev) => ({
      ...prev,
      settings: newSettings,
      timeLeft: newSettings.focusDuration * 60,
    }));
    setIsSettingsOpen(false);
  };

  return (
    <main className="min-h-screen bg-gray-900">
      {/* Tab Navigation */}
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

      {/* Main Content Area */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl shadow-purple-500/5">
          {activeTab === "timer" ? (
            <div className="p-8">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={timerState.isActive}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
              <Timer
                initialMinutes={25}
                timerState={timerState}
                setTimerState={setTimerState}
                currentTask={currentTask}
                onTaskComplete={handleTaskComplete}
              />
            </div>
          ) : (
            <FocusTasks
              onTaskSelect={handleTaskSelect}
              activeTaskId={currentTask?.id}
            />
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <Settings
              settings={timerState.settings}
              onSettingsChange={handleSettingsUpdate}
              disabled={timerState.isActive}
            />
          </div>
        </div>
      )}
    </main>
  );
};

export default Page;

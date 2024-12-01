// src/app/components/Timer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import CircularProgress from "./CircularProgress";
import { FocusTask, TimerState } from "@/types";

interface TimerProps {
  initialMinutes: number;
  timerState: TimerState;
  setTimerState: (state: TimerState) => void;
  currentTask?: FocusTask;
  onTaskComplete?: (taskId: string, timeSpent: number) => void;
}

const Timer: React.FC<TimerProps> = ({
  initialMinutes,
  timerState,
  setTimerState,
  currentTask,
  onTaskComplete,
}) => {
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerState.isActive && timerState.timeLeft > 0) {
      interval = setInterval(() => {
        setTimerState({
          ...timerState,
          timeLeft: timerState.timeLeft - 1,
        });
      }, 1000);
    } else if (timerState.timeLeft === 0) {
      if (audioRef.current) {
        audioRef.current.play();
      }

      if (!timerState.isBreak && currentTask) {
        onTaskComplete?.(
          currentTask.id,
          timerState.settings.focusDuration * 60
        );
      }

      setTimerState({
        ...timerState,
        isActive: false,
        isBreak: !timerState.isBreak,
        timeLeft: !timerState.isBreak
          ? timerState.settings.breakDuration * 60
          : timerState.settings.focusDuration * 60,
      });
    }

    return () => clearInterval(interval);
  }, [timerState, setTimerState]);

  const toggleTimer = () => {
    setTimerState({
      ...timerState,
      isActive: !timerState.isActive,
    });
  };

  const resetTimer = () => {
    setTimerState({
      ...timerState,
      isActive: false,
      timeLeft: timerState.settings.focusDuration * 60,
      isBreak: false,
    });
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const progress =
    ((timerState.settings.focusDuration * 60 - timerState.timeLeft) /
      (timerState.settings.focusDuration * 60)) *
    100;

  return (
    <div className="text-center">
      <audio ref={audioRef} src="/notification.mp3" />

      <div className="flex justify-center mb-8">
        <CircularProgress
          progress={progress}
          size={300}
          strokeWidth={20}
          color={timerState.isBreak ? "stroke-green-500" : "stroke-purple-500"}
        >
          <div className="text-4xl font-bold text-white">
            {formatTime(timerState.timeLeft)}
          </div>
          <div className="text-gray-400 mt-2">
            {timerState.isBreak ? "Break Time" : "Focus Time"}
          </div>
        </CircularProgress>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleTimer}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          {timerState.isActive ? "Pause" : "Start"}
        </button>
        <button
          onClick={resetTimer}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>
      </div>

      {currentTask && timerState.isActive && !timerState.isBreak && (
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-purple-400 text-sm uppercase">
            Current Focus Task
          </p>
          <h3 className="text-white text-lg font-semibold mt-1">
            {currentTask.title}
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Duration: {currentTask.duration} minutes
          </p>
        </div>
      )}

      <div className="mt-6">
        <label className="text-gray-400 text-sm block mb-2">
          Notification Volume: {Math.round(volume * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full max-w-xs"
        />
      </div>
    </div>
  );
};

export default Timer;

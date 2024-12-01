// src/app/components/Timer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { KestraService } from "@/services/kestraService";
import { SoundService } from "@/services/soundService";
import CircularProgress from "./CircularProgress";
import { TimerSession, TimerState, FocusTask } from "@/types/timer";

interface TimerProps {
  initialMinutes?: number;
  timerState: TimerState;
  setTimerState: (state: TimerState) => void;
  currentTask?: FocusTask;
  onTaskComplete?: (taskId: string, timeSpent: number) => void;
}

const Timer: React.FC<TimerProps> = ({
  initialMinutes = 25,
  timerState,
  setTimerState,
  currentTask,
  onTaskComplete,
}) => {
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const kestraService = KestraService.getInstance();

  // Initialize sound service
  useEffect(() => {
    SoundService.init();
    SoundService.setVolume(timerState.settings.volume);
  }, [timerState.settings.volume]);

  const logFocusSession = async (completed: boolean) => {
    if (currentTask && sessionStartTime) {
      try {
        const endTime = new Date();
        const actualDuration = Math.floor(
          (endTime.getTime() - sessionStartTime.getTime()) / 60000
        );

        const session: TimerSession = {
          userId: "tiwariParth",
          taskTitle: currentTask.title,
          duration: timerState.settings.focusDuration,
          actualDuration,
          startTime: sessionStartTime,
          endTime,
          completed,
        };

        await kestraService.logTimerSession(session);
      } catch (error) {
        console.error("Failed to log timer session:", error);
      }
    }
  };
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerState.isActive) {
      if (timerState.timeLeft > 0) {
        // Start time tracking
        if (!timerState.isBreak && !sessionStartTime) {
          setSessionStartTime(new Date());
        } else if (timerState.isBreak && !breakStartTime) {
          setBreakStartTime(new Date());
        }

        interval = setInterval(() => {
          setTimerState({
            ...timerState,
            timeLeft: timerState.timeLeft - 1,
          });
        }, 1000);
      } else {
        // Timer completed
        if (!timerState.isBreak) {
          SoundService.play("timerComplete");
          if (currentTask) {
            onTaskComplete?.(
              currentTask.id,
              timerState.settings.focusDuration * 60
            );
            logFocusSession(true);
          }
          setSessionStartTime(null);
        } else {
          SoundService.play("breakComplete");
          setBreakStartTime(null);
        }

        // Switch between focus and break
        setTimerState({
          ...timerState,
          isActive: false,
          isBreak: !timerState.isBreak,
          timeLeft: !timerState.isBreak
            ? timerState.settings.breakDuration * 60
            : timerState.settings.focusDuration * 60,
        });
      }
    }

    return () => clearInterval(interval);
  }, [
    timerState,
    setTimerState,
    currentTask,
    onTaskComplete,
    sessionStartTime,
    breakStartTime,
  ]);

  const toggleTimer = () => {
    SoundService.play("buttonClick");
    if (
      !timerState.isActive &&
      timerState.timeLeft === timerState.settings.focusDuration * 60
    ) {
      setSessionStartTime(new Date());
    }
    setTimerState({
      ...timerState,
      isActive: !timerState.isActive,
    });
  };

  const resetTimer = () => {
    SoundService.play("buttonClick");
    setSessionStartTime(null);
    if (!timerState.isBreak && timerState.isActive) {
      logFocusSession(false);
    }
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
    ((timerState.isBreak
      ? timerState.settings.breakDuration * 60 - timerState.timeLeft
      : timerState.settings.focusDuration * 60 - timerState.timeLeft) /
      (timerState.isBreak
        ? timerState.settings.breakDuration * 60
        : timerState.settings.focusDuration * 60)) *
    100;

  return (
    <div className="text-center">
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
        <div className="mt-4 text-gray-400">
          Currently focusing on: {currentTask.title}
        </div>
      )}
    </div>
  );
};

export default Timer;

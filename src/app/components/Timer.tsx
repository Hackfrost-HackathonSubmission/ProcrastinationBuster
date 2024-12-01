"use client";
import React, { useState, useEffect } from "react";
import CircularProgress from "./CircularProgress";

interface TimerProps {
  initialMinutes?: number;
  onComplete?: () => void;
}

const Timer: React.FC<TimerProps> = ({ initialMinutes = 25, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const totalTime = initialMinutes * 60;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setIsActive(false);
            onComplete?.();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialMinutes * 60);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className="flex flex-col items-center space-y-6">
      <CircularProgress
        progress={progress}
        size={300}
        strokeWidth={20}
        color={isActive ? "stroke-green-500" : "stroke-blue-600"}
        className="transition-all duration-300"
      >
        <div className="flex flex-col items-center">
          <div className="text-5xl font-bold mb-2">{formatTime(timeLeft)}</div>
          <div className="text-gray-500">
            {isActive ? "Focus Time" : "Ready to Focus?"}
          </div>
        </div>
      </CircularProgress>

      <div className="flex space-x-4">
        <button
          onClick={toggleTimer}
          className={`px-6 py-2 rounded-lg text-white font-medium transition-colors
            ${
              isActive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            }`}
        >
          {isActive ? "Pause" : "Start"}
        </button>
        <button
          onClick={resetTimer}
          className="px-6 py-2 rounded-lg text-gray-700 font-medium border border-gray-300
                   hover:bg-gray-100 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Timer;

"use client";
import React from "react";

interface CircularProgressProps {
  progress: number; // Progress value (0-100)
  size?: number; // Size of the circle in pixels
  strokeWidth?: number; // Width of the progress stroke
  className?: string; // Additional CSS classes
  children?: React.ReactNode; // Optional child elements to render in the center
  color?: string; // Color of the progress bar
  backgroundColor?: string; // Color of the background circle
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 200,
  strokeWidth = 15,
  className = "",
  children,
  color = "stroke-blue-600",
  backgroundColor = "stroke-gray-200",
}) => {
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          className={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={`${color} transition-all duration-500 ease-in-out`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default CircularProgress;

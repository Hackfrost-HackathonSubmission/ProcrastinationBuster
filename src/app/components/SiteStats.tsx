"use client";

import React from "react";
import { SiteVisit } from "@/types";

interface SiteStatsProps {
  siteStats: SiteVisit[];
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const getDomainFromUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain;
  } catch {
    return url;
  }
};

export default function SiteStats({ siteStats }: SiteStatsProps) {
  const topSites = [...siteStats]
    .sort((a, b) => b.timeSpent - a.timeSpent)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold dark:text-white">Top Sites Today</h3>
      <div className="space-y-2">
        {topSites.map((site, index) => (
          <div
            key={site.domain}
            className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium dark:text-white">
                {index + 1}.
              </span>
              <span className="text-sm dark:text-white">{site.domain}</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatTime(site.timeSpent)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
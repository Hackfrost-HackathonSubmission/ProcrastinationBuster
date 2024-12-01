"use client";

import React, { useState, useEffect } from "react";
import Timer from "./components/Timer";
import { BlockedSites } from "./components/BlockedSites";
import { BlockedPage } from "@/app/components/BlockedPage";
import { BlockService } from "@/services/blockService";

const Page = () => {
  const [activeTab, setActiveTab] = useState<"timer" | "blocked">("timer");
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    // Check if current site is blocked
    const checkBlocked = () => {
      if (BlockService.isCurrentSiteBlocked()) {
        setIsBlocked(true);
      }
    };

    checkBlocked();
    // Check every second while timer is running
    const interval = setInterval(checkBlocked, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isBlocked) {
    return <BlockedPage />;
  }

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
          onClick={() => setActiveTab("blocked")}
          className={`px-6 py-2 rounded-t-lg transition-colors ${
            activeTab === "blocked"
              ? "bg-gray-800 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-750"
          }`}
        >
          Blocked Sites
        </button>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl shadow-purple-500/5">
          {activeTab === "timer" ? (
            <div className="p-8">
              <Timer initialMinutes={25} />
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

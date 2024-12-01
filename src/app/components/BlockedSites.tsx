// src/app/components/BlockedSites.tsx
"use client";

import React, { useState, useEffect } from "react";
import { BlockService } from "@/services/blockService";

export const BlockedSites: React.FC = () => {
  const [sites, setSites] = useState(BlockService.getBlockedSites());
  const [newSite, setNewSite] = useState("");

  useEffect(() => {
    setSites(BlockService.getBlockedSites());
  }, []);

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite) return;

    BlockService.addBlockedSite(newSite);
    setSites(BlockService.getBlockedSites());
    setNewSite("");
  };

  const handleToggleSite = (url: string) => {
    BlockService.toggleBlockedSite(url);
    setSites(BlockService.getBlockedSites());
  };

  const handleRemoveSite = (url: string) => {
    BlockService.removeBlockedSite(url);
    setSites(BlockService.getBlockedSites());
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-white">Blocked Sites</h2>

      {/* Add new site form */}
      <form onSubmit={handleAddSite} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            placeholder="Enter website URL (e.g., facebook.com)"
            className="flex-1 p-2 bg-gray-700 text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Add Site
          </button>
        </div>
      </form>

      {/* List of blocked sites */}
      <div className="space-y-2">
        {sites.length === 0 ? (
          <p className="text-gray-400 text-center py-4">
            No sites blocked yet. Add some above!
          </p>
        ) : (
          sites.map((site) => (
            <div
              key={site.url}
              className="flex items-center justify-between p-2 bg-gray-700 border border-gray-600 rounded"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={site.isActive}
                  onChange={() => handleToggleSite(site.url)}
                  className="w-4 h-4 rounded border-gray-500 text-purple-600 focus:ring-purple-500 bg-gray-600"
                />
                <span
                  className={`${
                    site.isActive ? "text-white" : "text-gray-400"
                  }`}
                >
                  {site.url}
                </span>
              </div>
              <button
                onClick={() => handleRemoveSite(site.url)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

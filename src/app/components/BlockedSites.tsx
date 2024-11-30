"use client";

import React,{ useState } from "react";

interface BlockedSitesProps {
  sites: string[];
  onUpdateSites: (sites: string[]) => Promise<void>;
}

export default function BlockedSites({
  sites,
  onUpdateSites,
}: BlockedSitesProps) {
  const [newSite, setNewSite] = useState<string>("");

  const handleAddSite = async () => {
    if (!newSite) return;

    try {
      const hostname = new URL(
        newSite.startsWith("http") ? newSite : `https://${newSite}`
      ).hostname;

      if (!sites.includes(hostname)) {
        await onUpdateSites([...sites, hostname]);
      }
      setNewSite("");
    } catch (error) {
      console.error("Invalid URL:", error);
    }
  };

  const handleRemoveSite = async (site: string) => {
    await onUpdateSites(sites.filter((s) => s !== site));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2 dark:text-white">
        Blocked Sites
      </h2>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newSite}
          onChange={(e) => setNewSite(e.target.value)}
          placeholder="Enter website URL"
          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
        <button
          onClick={handleAddSite}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {sites.map((site) => (
          <li
            key={site}
            className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
          >
            <span className="dark:text-white">{site}</span>
            <button
              onClick={() => handleRemoveSite(site)}
              className="text-red-500 hover:text-red-600"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

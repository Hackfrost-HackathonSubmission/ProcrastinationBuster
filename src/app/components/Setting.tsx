"use client";

import { useState } from "react";

export default function Settings() {
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [newSite, setNewSite] = useState("");

  const addSite = () => {
    if (newSite && !blockedSites.includes(newSite)) {
      setBlockedSites([...blockedSites, newSite]);
      setNewSite("");
    }
  };

  const removeSite = (site: string) => {
    setBlockedSites(blockedSites.filter((s) => s !== site));
  };

  return (
    <div className="mt-4 p-4 border-t">
      <h2 className="text-lg font-semibold mb-3">Blocked Sites</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newSite}
          onChange={(e) => setNewSite(e.target.value)}
          placeholder="Enter website URL"
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <button
          onClick={addSite}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {blockedSites.map((site, index) => (
          <li
            key={index}
            className="flex justify-between items-center bg-gray-50 p-2 rounded"
          >
            {site}
            <button
              onClick={() => removeSite(site)}
              className="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

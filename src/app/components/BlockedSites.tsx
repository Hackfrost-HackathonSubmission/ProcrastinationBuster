"use client";

import { useState, useEffect } from "react";

export default function BlockedSites() {
  const [sites, setSites] = useState<string[]>([]);
  const [newSite, setNewSite] = useState("");

  useEffect(() => {
    chrome.storage?.sync?.get(["blockedSites"], (data) => {
      if (data.blockedSites) {
        setSites(data.blockedSites);
      }
    });
  }, []);

  const addSite = () => {
    if (!newSite) return;

    try {
      const hostname = new URL(
        newSite.startsWith("http") ? newSite : `https://${newSite}`
      ).hostname;

      const updatedSites = [...sites, hostname];
      setSites(updatedSites);
      chrome.storage?.sync?.set({ blockedSites: updatedSites });
      setNewSite("");
    } catch (e) {
      alert("Please enter a valid website URL or domain");
      console.log(e);
    }
  };

  const removeSite = (site: string) => {
    const updatedSites = sites.filter((s) => s !== site);
    setSites(updatedSites);
    chrome.storage?.sync?.set({ blockedSites: updatedSites });
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Blocked Sites</h3>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newSite}
          onChange={(e) => setNewSite(e.target.value)}
          placeholder="Enter website (e.g., facebook.com)"
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={addSite}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add
        </button>
      </div>

      <ul className="space-y-2">
        {sites.map((site, index) => (
          <li
            key={index}
            className="flex justify-between items-center bg-gray-50 p-3 rounded"
          >
            <span>{site}</span>
            <button
              onClick={() => removeSite(site)}
              className="text-red-500 hover:text-red-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// src/components/BlockedSites.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { BlockService } from '@/services/blockService';

export const BlockedSites: React.FC = () => {
  const [sites, setSites] = useState(BlockService.getBlockedSites());
  const [newSite, setNewSite] = useState('');
  
  useEffect(() => {
    // Update sites when component mounts
    setSites(BlockService.getBlockedSites());
  }, []);

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite) return;

    BlockService.addBlockedSite(newSite);
    setSites(BlockService.getBlockedSites());
    setNewSite('');
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
      <h2 className="text-xl font-bold mb-4">Blocked Sites</h2>
      
      {/* Add new site form */}
      <form onSubmit={handleAddSite} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            placeholder="Enter website URL (e.g., facebook.com or *.facebook.com)"
            className="flex-1 p-2 border rounded"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Site
          </button>
        </div>
      </form>

      {/* List of blocked sites */}
      <div className="space-y-2">
        {sites.map((site) => (
          <div
            key={site.url}
            className="flex items-center justify-between p-2 border rounded"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={site.isActive}
                onChange={() => handleToggleSite(site.url)}
                className="w-4 h-4"
              />
              <span className={site.isActive ? 'font-medium' : 'text-gray-500'}>
                {site.url}
              </span>
            </div>
            <button
              onClick={() => handleRemoveSite(site.url)}
              className="text-red-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
"use client";

import React, { useState } from "react";

const Popup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopup = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded"
        onClick={togglePopup}
      >
        Open Popup
      </button>
      {isOpen && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-5 bg-white border border-gray-300 shadow-lg z-50">
          <h2 className="text-lg font-bold">Procrastination Buster</h2>
          <p className="mt-2">This is your popup content.</p>
          <button
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
            onClick={togglePopup}
          >
            Close Popup
          </button>
        </div>
      )}
    </div>
  );
};

export default Popup;

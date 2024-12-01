import React from "react";

interface BlockedPageProps {
  onGoBack: () => void;
}

export const BlockedPage: React.FC<BlockedPageProps> = ({ onGoBack }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center p-8 bg-gray-800 rounded-xl shadow-2xl shadow-purple-500/5">
        <h1 className="text-4xl font-bold text-white mb-4">
          Focus Mode Active
        </h1>
        <div className="text-gray-300 mb-6">
          <p className="mb-4">
            This site has been blocked to help you stay focused.
          </p>
          <p className="text-xl">Time to get back to work! 💪</p>
        </div>
        <button
          onClick={onGoBack}
          className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

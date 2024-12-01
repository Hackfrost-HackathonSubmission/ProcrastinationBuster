"use client";
export const BlockedPage: React.FC = () => {
  return (
    <div className="w-full p-8 text-center">
      <div className="bg-gray-800 rounded-xl p-8 shadow-purple-500/5">
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
          onClick={() => window.history.back()}
          className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

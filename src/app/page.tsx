import React from "react";
import Timer from "./components/Timer";
import BlockedSites from "./components/BlockedSites";

const Page = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          ProcrastinationBuster
        </h1>
        <Timer />
        <BlockedSites />
      </div>
    </div>
  );
};

export default Page;

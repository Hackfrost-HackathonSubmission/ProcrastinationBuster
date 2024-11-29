import React from "react";
import Popup from "./components/Popup";

const Page = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <h1 className="text-2xl font-bold text-center mb-6">
          Welcome to Procrastination Buster
        </h1>
        <Popup />
      </div>
    </div>
  );
};

export default Page;

import React from "react";
import Timer from "./components/Timer";

const page = () => {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="p-8 bg-gray-800 rounded-xl shadow-2xl shadow-purple-500/5">
        <Timer initialMinutes={25} />
      </div>
    </main>
  );
};

export default page;

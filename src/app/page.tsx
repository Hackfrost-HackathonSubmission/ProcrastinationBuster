import React from "react";
import Timer from "./components/Timer";

const page = () => {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 bg-white rounded-xl shadow-lg">
        <Timer initialMinutes={25} />
      </div>
    </main>
  );
};

export default page;

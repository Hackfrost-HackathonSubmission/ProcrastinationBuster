// src/app/blocked/page.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BlockedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Site Blocked</h1>
        <p className="text-gray-600 mb-4">
          This site is blocked during your focus session.
        </p>
        <div className="text-2xl font-bold text-blue-500 mb-4">
          Stay focused on your work!
        </div>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
        >
          Return to Timer
        </button>
      </div>
    </div>
  );
}
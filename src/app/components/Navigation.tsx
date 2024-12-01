// src/components/Navigation.tsx (or similar)
import Link from "next/link";

export const Navigation = () => {
  return (
    <nav className="p-4 bg-white shadow">
      <div className="container mx-auto flex gap-4">
        <Link href="/" className="hover:text-blue-500">
          Timer
        </Link>
        <Link href="/blocked" className="hover:text-blue-500">
          Blocked Sites
        </Link>
      </div>
    </nav>
  );
};

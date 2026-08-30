import React from 'react';
import { Link } from 'react-router-dom';

export function DirectoryLink({ children }: { children: React.ReactNode }) {
  return (
    <Link to="/professionals" className="font-bold text-blue-700 underline hover:text-blue-900">
      {children}
    </Link>
  );
}

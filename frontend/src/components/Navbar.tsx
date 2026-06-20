import React from 'react';
import Link from 'next/link';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-white shadow-sm border-b">
      {/* Left side: Logo */}
      <div className="flex items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Vetify
        </Link>
      </div>

      {/* Right side: Navigation Links and CTA */}
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium">
            Home
          </Link>
          <Link href="/blogs" className="text-gray-600 hover:text-blue-600 font-medium">
            Blogs
          </Link>
          <Link href="/map" className="text-gray-600 hover:text-blue-600 font-medium">
            Map
          </Link>
          <Link href="/services" className="text-gray-600 hover:text-blue-600 font-medium">
            Services
          </Link>
        </div>

        <Link
          href="/book"
          className="bg-blue-600 text-white px-5 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors"
        >
          Book an appointment
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;

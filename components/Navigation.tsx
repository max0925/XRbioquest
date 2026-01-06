"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/" },
    { name: "AI XR Creator", href: "/environment-design" },
    { name: "Library", href: "/library" },
    { name: "Market", href: "/market" },
    { name: "Pricing", href: "/pricing" },
    { name: "Workshop", href: "/workshop" },
    { name: "Community", href: "/community" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-100 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* ✅ Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/bio.png"
            alt="BioQuest Logo"
            className="w-10 h-10 rounded-full object-contain"
          />
          <span className="text-lg font-extrabold text-gray-900 tracking-tight">
            BIOQUEST
          </span>
        </div>

        {/* ✅ 导航菜单 */}
        <div className="flex items-center gap-6 text-[15px] font-medium text-gray-700">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative transition-colors ${
                  active
                    ? "text-green-600 font-semibold"
                    : "hover:text-green-500"
                }`}
              >
                {item.name}
                {active && (
                  <motion.div
                    layoutId="underline"
                    className="absolute left-0 right-0 -bottom-1 h-[2px] bg-green-600 rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* ✅ Auth Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-1.5 text-gray-700 text-sm font-medium hover:text-gray-900 transition"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-full font-medium hover:bg-green-700 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}

import "./globals.css";
import Navigation from "../components/Navigation";
import { ReactNode } from "react";

export const metadata = {
  title: "BioQuest",
  description: "AI + XR immersive learning platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F8F9FB] text-gray-800 min-h-screen flex flex-col">
        {/* ✅ 顶部导航栏：固定并带轻微阴影 */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
          <Navigation />
        </header>

        {/* ✅ 主体部分：自动占满剩余高度 */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </body>
    </html>
  );
}

"use client";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center text-center pt-32 pb-24 px-6 bg-white overflow-hidden">
      {/* 光晕集中在标题背后 */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-green-300/25 blur-[100px] rounded-full"></div>

      {/* 主标题 */}
      <h1 className="text-[3rem] md:text-[5rem] font-extrabold leading-[1.1] tracking-tight text-gray-900 max-w-5xl mb-5 relative z-10">
        From <span className="text-black">Abstract Concepts</span>
        <br />
        <span className="text-green-600">to Living Worlds.</span>
      </h1>

      {/* 副标题 */}
      <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10 relative z-10">
        Design immersive 3D lessons effortlessly — no tech skills required.
      </p>

      {/* 按钮区 */}
      <div className="flex flex-wrap justify-center gap-6 mb-16 relative z-10">
        <Link
          href="/create-lesson"
          className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-md hover:bg-green-700 hover:scale-105 transition-all duration-300"
        >
          Create Your AI-Powered VR/AR Lesson
        </Link>

        <Link
          href="/community"
          className="bg-white border border-green-600 text-green-700 px-8 py-4 rounded-xl font-semibold text-lg shadow-md hover:bg-green-50 hover:scale-105 transition-all duration-300"
        >
          Join the Community
        </Link>
      </div>
    </section>
  );
}

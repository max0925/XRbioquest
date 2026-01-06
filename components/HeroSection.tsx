"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative flex flex-col items-center text-center pt-40 pb-32 px-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Animated background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
           style={{
             backgroundImage: `linear-gradient(to right, #1e3a8a 1px, transparent 1px),
                               linear-gradient(to bottom, #1e3a8a 1px, transparent 1px)`,
             backgroundSize: '60px 60px'
           }}>
      </div>

      {/* Gradient glow effects - multiple layers for depth */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/20 blur-[120px] rounded-full animate-pulse-slow"></div>
      <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-purple-400/15 blur-[100px] rounded-full animate-float"></div>
      <div className="absolute top-[40%] left-[5%] w-[300px] h-[300px] bg-cyan-400/10 blur-[80px] rounded-full animate-float-delayed"></div>

      {/* Floating STEM geometric shapes */}
      <div className="absolute top-[15%] right-[15%] w-20 h-20 border-2 border-blue-300/40 rounded-lg rotate-12 animate-float-slow"></div>
      <div className="absolute top-[60%] left-[12%] w-16 h-16 border-2 border-purple-300/40 rotate-45 animate-spin-very-slow"></div>
      <div className="absolute top-[25%] left-[20%] w-12 h-12 border-2 border-cyan-300/40 rounded-full animate-float"></div>

      {/* Hexagon shapes (molecular motif) */}
      <div className="absolute top-[70%] right-[20%] w-14 h-16 animate-float-delayed">
        <svg viewBox="0 0 100 115" className="w-full h-full stroke-blue-400/30 fill-none stroke-2">
          <polygon points="50,5 95,30 95,80 50,105 5,80 5,30" />
        </svg>
      </div>
      <div className="absolute top-[18%] left-[8%] w-10 h-12 animate-float-slow">
        <svg viewBox="0 0 100 115" className="w-full h-full stroke-purple-400/30 fill-none stroke-2">
          <polygon points="50,5 95,30 95,80 50,105 5,80 5,30" />
        </svg>
      </div>

      {/* DNA helix inspired decorative lines */}
      <div className="absolute top-[10%] right-[5%] w-1 h-32 bg-gradient-to-b from-transparent via-blue-300/40 to-transparent animate-float"></div>
      <div className="absolute top-[50%] left-[3%] w-1 h-40 bg-gradient-to-b from-transparent via-purple-300/40 to-transparent animate-float-delayed"></div>

      {/* Particle constellation - client-side only to prevent hydration mismatch */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      )}

      {/* Main heading with staggered animation */}
      <h1 className="text-[3.5rem] md:text-[6rem] font-bold leading-[1.05] tracking-tight text-slate-900 max-w-6xl mb-6 relative z-10 animate-fade-up"
          style={{
            fontFamily: '"Outfit", "Sora", system-ui, sans-serif',
            textShadow: '0 0 40px rgba(59, 130, 246, 0.1)'
          }}>
        From{" "}
        <span className="inline-block bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
          Abstract Concepts
        </span>
        <br />
        <span className="inline-block bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent animate-gradient-shift">
          to Living Worlds
        </span>
        <span className="text-cyan-500">.</span>
      </h1>

      {/* Subtitle with delayed animation */}
      <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mb-12 leading-relaxed relative z-10 animate-fade-up-delayed"
         style={{ fontFamily: '"Manrope", "Plus Jakarta Sans", system-ui, sans-serif' }}>
        Design immersive 3D lessons effortlessly — no tech skills required.
        <br />
        <span className="text-lg text-slate-500 mt-2 inline-block">
          Powered by AI & XR technology for next-generation STEM education
        </span>
      </p>

      {/* CTA buttons with enhanced styling */}
      <div className="flex flex-col sm:flex-row justify-center gap-5 mb-20 relative z-10 animate-fade-up-more-delayed">
        <Link
          href="/create-lesson"
          className="group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-5 rounded-2xl font-semibold text-lg shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-[1.02] transition-all duration-300 overflow-hidden"
          style={{ fontFamily: '"Outfit", system-ui, sans-serif' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="relative z-10 flex items-center justify-center gap-2">
            Create Your AI-Powered Lesson
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </Link>

        <Link
          href="/community"
          className="group relative bg-white/80 backdrop-blur-sm border-2 border-blue-200 text-blue-700 px-10 py-5 rounded-2xl font-semibold text-lg shadow-lg hover:bg-white hover:border-purple-300 hover:text-purple-700 hover:scale-[1.02] transition-all duration-300"
          style={{ fontFamily: '"Outfit", system-ui, sans-serif' }}
        >
          <span className="flex items-center justify-center gap-2">
            Join the Community
            <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
        </Link>
      </div>

      {/* Feature highlights with icons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl relative z-10 animate-fade-up-most-delayed">
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-blue-100 hover:border-blue-300 hover:shadow-lg transition-all duration-300 group">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800" style={{ fontFamily: '"Outfit", system-ui, sans-serif' }}>AI-Powered</h3>
          <p className="text-sm text-slate-600 text-center">Intelligent lesson generation</p>
        </div>

        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-purple-100 hover:border-purple-300 hover:shadow-lg transition-all duration-300 group">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800" style={{ fontFamily: '"Outfit", system-ui, sans-serif' }}>Immersive XR</h3>
          <p className="text-sm text-slate-600 text-center">VR/AR learning experiences</p>
        </div>

        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-cyan-100 hover:border-cyan-300 hover:shadow-lg transition-all duration-300 group">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800" style={{ fontFamily: '"Outfit", system-ui, sans-serif' }}>No Code</h3>
          <p className="text-sm text-slate-600 text-center">Effortless creation for educators</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
          }
        }

        @keyframes spin-very-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.3;
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-fade-up {
          animation: fade-up 0.8s ease-out forwards;
        }

        .animate-fade-up-delayed {
          animation: fade-up 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }

        .animate-fade-up-more-delayed {
          animation: fade-up 0.8s ease-out 0.4s forwards;
          opacity: 0;
        }

        .animate-fade-up-most-delayed {
          animation: fade-up 0.8s ease-out 0.6s forwards;
          opacity: 0;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float 6s ease-in-out infinite 2s;
        }

        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .animate-spin-very-slow {
          animation: spin-very-slow 20s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 5s ease infinite;
        }
      `}</style>
    </section>
  );
}

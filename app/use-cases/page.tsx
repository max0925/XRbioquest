"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navigation from "../../components/Navigation";

// ═══════════════════════════════════════════════════════════════════════════
// USE CASES PAGE - "Living Science" Aesthetic
// Organic biology meets clean modern tech design
// ═══════════════════════════════════════════════════════════════════════════

// Floating cell-like decorative element
function FloatingCell({
  size,
  color,
  blur,
  top,
  left,
  right,
  bottom,
  delay,
  duration
}: {
  size: number;
  color: string;
  blur?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay: number;
  duration: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: color,
        filter: blur ? `blur(${blur}px)` : undefined,
        top,
        left,
        right,
        bottom,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -15, 0, 10, 0],
        x: [0, 8, 0, -5, 0],
      }}
      transition={{
        opacity: { duration: 0.8, delay },
        scale: { duration: 0.8, delay },
        y: { duration: duration, repeat: Infinity, ease: "easeInOut", delay },
        x: { duration: duration * 1.3, repeat: Infinity, ease: "easeInOut", delay },
      }}
    />
  );
}

// DNA helix strand element
function DNAStrand({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left';

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        [isLeft ? 'left' : 'right']: '-60px',
        top: '15%',
        height: '70%',
        width: '120px',
        opacity: 0.06,
      }}
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      animate={{ opacity: 0.06, x: 0 }}
      transition={{ duration: 1.2, delay: 0.5 }}
    >
      <svg viewBox="0 0 100 400" className="w-full h-full" fill="none">
        {[...Array(12)].map((_, i) => (
          <g key={i}>
            <motion.ellipse
              cx={isLeft ? 30 + Math.sin(i * 0.5) * 20 : 70 - Math.sin(i * 0.5) * 20}
              cy={20 + i * 32}
              rx="18"
              ry="6"
              stroke="currentColor"
              strokeWidth="2"
              className="text-emerald-900"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.8 + i * 0.08 }}
            />
            <motion.line
              x1={isLeft ? 30 : 70}
              y1={20 + i * 32}
              x2={isLeft ? 70 : 30}
              y2={20 + i * 32 + 16}
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-emerald-800"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 1 + i * 0.08 }}
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
}

// Microscopic texture overlay
function MicroscopicTexture() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.015]"
      style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
        backgroundSize: '24px 24px',
      }}
    />
  );
}

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-24 px-6 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-white to-white" />

        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-gradient-radial from-emerald-100/60 via-emerald-50/20 to-transparent rounded-full blur-3xl" />

        {/* DNA Strands */}
        <DNAStrand side="left" />
        <DNAStrand side="right" />

        {/* Microscopic texture */}
        <MicroscopicTexture />

        {/* Floating cells */}
        <FloatingCell
          size={280}
          color="radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.06))"
          blur={0}
          top="8%"
          right="5%"
          delay={0.2}
          duration={8}
        />
        <FloatingCell
          size={180}
          color="radial-gradient(circle at 40% 40%, rgba(52, 211, 153, 0.15), rgba(16, 185, 129, 0.05))"
          blur={0}
          top="55%"
          left="3%"
          delay={0.4}
          duration={10}
        />
        <FloatingCell
          size={120}
          color="radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1), rgba(20, 184, 166, 0.04))"
          blur={0}
          bottom="15%"
          right="12%"
          delay={0.6}
          duration={7}
        />
        <FloatingCell
          size={90}
          color="radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.18), transparent)"
          blur={20}
          top="20%"
          left="15%"
          delay={0.3}
          duration={9}
        />
        <FloatingCell
          size={60}
          color="radial-gradient(circle at 50% 50%, rgba(52, 211, 153, 0.2), transparent)"
          blur={10}
          bottom="25%"
          left="20%"
          delay={0.8}
          duration={6}
        />

        {/* Small nucleus dots */}
        {[
          { top: '12%', left: '25%', size: 8, delay: 1.0 },
          { top: '35%', right: '18%', size: 6, delay: 1.2 },
          { bottom: '30%', right: '25%', size: 10, delay: 1.1 },
          { top: '60%', left: '10%', size: 7, delay: 1.3 },
          { bottom: '40%', left: '30%', size: 5, delay: 1.4 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-emerald-500/30"
            style={{
              width: dot.size,
              height: dot.size,
              top: dot.top,
              left: dot.left,
              right: dot.right,
              bottom: dot.bottom,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              delay: dot.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200/60 text-emerald-700 text-xs font-bold tracking-[0.2em] uppercase"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              For Educators
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="mt-8 mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-gray-900 leading-[1.05]"
              style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
            >
              Where Biology
            </span>
            <span
              className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.05] mt-1"
              style={{
                fontFamily: '"Syne", system-ui, sans-serif',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #14b8a6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Comes Alive
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 leading-relaxed mb-10"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            Create immersive 3D learning experiences that spark curiosity
            and deepen understanding — <span className="text-gray-900 font-medium">no coding required</span>
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href="/contact"
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-base transition-all duration-300 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 hover:scale-[1.02]"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              {/* Button glow effect */}
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <span className="relative">Schedule a Demo</span>

              {/* Animated arrow */}
              <motion.svg
                className="relative w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                initial={{ x: 0 }}
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </motion.svg>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="mt-14 flex flex-wrap items-center justify-center gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            {[
              { number: "500+", label: "Educators" },
              { number: "50K+", label: "Students Reached" },
              { number: "98%", label: "Satisfaction" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
              >
                <div
                  className="text-2xl sm:text-3xl font-bold text-emerald-600"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                >
                  {stat.number}
                </div>
                <div
                  className="text-sm text-gray-500 mt-1"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-gray-300 flex items-start justify-center p-2"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

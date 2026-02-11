"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
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

      {/* Experience Quote Section */}
      <ExperienceQuoteSection />

      {/* Standards & Library Section */}
      <StandardsLibrarySection />

      {/* For Teachers Section */}
      <ForTeachersSection />

      {/* Final CTA Section */}
      <FinalCTASection />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPERIENCE QUOTE SECTION - Inspirational quote with feature bullets
// ═══════════════════════════════════════════════════════════════════════════

function ExperienceQuoteSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const experienceItems = [
    {
      icon: HeartIcon,
      text: "Watch a heart beat from the inside",
    },
    {
      icon: CellIcon,
      text: "Shrink down and explore the inside of a cell",
    },
    {
      icon: ProteinIcon,
      text: "See protein synthesis unfold in real-time",
    },
    {
      icon: InfinityIcon,
      text: "The possibilities are endless",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-28 px-6 overflow-hidden"
    >
      {/* Light gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-emerald-50/40 to-white" />

      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-radial from-emerald-100/30 via-transparent to-transparent rounded-full blur-3xl" />

      {/* Decorative organic shapes */}
      <motion.div
        className="absolute top-16 left-[10%] w-32 h-32 rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #10b981, transparent)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 10, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 right-[15%] w-24 h-24 rounded-full opacity-[0.05]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #14b8a6, transparent)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          rotate: [0, -15, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Quote */}
        <motion.blockquote
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Opening quote mark */}
          <motion.span
            className="block text-6xl sm:text-7xl text-emerald-300 leading-none mb-4"
            style={{ fontFamily: 'Georgia, serif' }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            "
          </motion.span>

          <p
            className="text-2xl sm:text-3xl md:text-4xl text-gray-800 leading-relaxed font-medium tracking-tight"
            style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          >
            Where biology stops being diagrams on a page — and becomes worlds students can{' '}
            <span
              className="font-bold"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              step inside
            </span>
            .
          </p>
        </motion.blockquote>

        {/* Experience bullets */}
        <motion.div
          className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {experienceItems.map((item, index) => (
            <motion.div
              key={index}
              className="group flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100/60 shadow-sm hover:shadow-md hover:border-emerald-200/80 transition-all duration-300"
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.5 + index * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -2 }}
            >
              {/* Icon container */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/80 flex items-center justify-center group-hover:from-emerald-100 group-hover:to-emerald-200/80 transition-all duration-300">
                <item.icon className="w-6 h-6 text-emerald-600" />
              </div>

              {/* Text */}
              <p
                className="text-gray-700 font-medium text-[15px] leading-snug"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {item.text}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM ORGANIC ICONS - Biology-themed SVG icons
// ═══════════════════════════════════════════════════════════════════════════

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Anatomical heart shape */}
      <path d="M12 21C12 21 4 14.5 4 9.5C4 6.5 6.5 4 9 4C10.5 4 11.8 4.8 12 6C12.2 4.8 13.5 4 15 4C17.5 4 20 6.5 20 9.5C20 14.5 12 21 12 21Z" />
      {/* Heartbeat line */}
      <path d="M4 12H7L9 9L11 15L13 11L15 13H20" strokeWidth="1.5" />
    </svg>
  );
}

function CellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Cell membrane */}
      <ellipse cx="12" cy="12" rx="9" ry="8" />
      {/* Nucleus */}
      <ellipse cx="12" cy="12" rx="4" ry="3.5" />
      {/* Organelles */}
      <circle cx="7" cy="9" r="1.2" />
      <circle cx="17" cy="14" r="1" />
      <circle cx="8" cy="16" r="0.8" />
      <circle cx="16" cy="8" r="0.9" />
    </svg>
  );
}

function ProteinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* DNA/Protein helix */}
      <path d="M4 4C4 4 8 8 12 8C16 8 20 4 20 4" />
      <path d="M4 12C4 12 8 16 12 16C16 16 20 12 20 12" />
      <path d="M4 20C4 20 8 24 12 24C16 24 20 20 20 20" />
      {/* Connecting bonds */}
      <line x1="8" y1="6" x2="8" y2="14" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="16" y1="6" x2="16" y2="14" />
    </svg>
  );
}

function InfinityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Infinity symbol with organic feel */}
      <path d="M12 12C12 12 8 7 5 7C2.5 7 1 9 1 12C1 15 2.5 17 5 17C8 17 12 12 12 12C12 12 16 7 19 7C21.5 7 23 9 23 12C23 15 21.5 17 19 17C16 17 12 12 12 12Z" />
      {/* Sparkle accents */}
      <circle cx="5" cy="12" r="0.5" fill="currentColor" />
      <circle cx="19" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDARDS & LIBRARY SECTION - Curriculum standards and 3D model showcase
// ═══════════════════════════════════════════════════════════════════════════

function StandardsLibrarySection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  const standardsBadges = [
    { name: "NGSS", fullName: "Next Generation Science Standards" },
    { name: "AP Biology", fullName: "Advanced Placement Biology" },
    { name: "IB Biology", fullName: "International Baccalaureate" },
    { name: "State Standards", fullName: "All 50 States Aligned" },
  ];

  const lessonCards = [
    {
      title: "Cell Structure & Function",
      grade: "Grades 9-12",
      duration: "45 min",
      image: "🔬",
    },
    {
      title: "DNA Replication",
      grade: "Grades 10-12",
      duration: "50 min",
      image: "🧬",
    },
    {
      title: "Photosynthesis",
      grade: "Grades 8-11",
      duration: "40 min",
      image: "🌿",
    },
    {
      title: "Human Heart Anatomy",
      grade: "Grades 9-12",
      duration: "55 min",
      image: "❤️",
    },
  ];

  const modelCategories = [
    { name: "Cell Biology", count: "30+", icon: "🦠" },
    { name: "Anatomy", count: "25+", icon: "🫀" },
    { name: "Molecular", count: "20+", icon: "⚛️" },
    { name: "Ecosystems", count: "25+", icon: "🌍" },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-6 overflow-hidden bg-white"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-6"
            style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          >
            Standards-Aligned Content &{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              3D Model Library
            </span>
          </h2>

          {/* Standards Badges */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 mt-8"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {standardsBadges.map((badge, index) => (
              <motion.div
                key={badge.name}
                className="group relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
              >
                <div className="px-4 py-2 bg-emerald-50 border border-emerald-200/70 rounded-full text-emerald-700 text-sm font-semibold tracking-wide hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-300 cursor-default"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {badge.name}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {badge.fullName}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Left Column - Lesson Cards */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <BookIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <h3
                className="text-xl font-semibold text-gray-900"
                style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
              >
                Ready-to-Use Lessons
              </h3>
            </div>

            <div className="space-y-3">
              {lessonCards.map((lesson, index) => (
                <motion.div
                  key={lesson.title}
                  className="group relative flex items-center gap-4 p-4 bg-gradient-to-br from-white to-gray-50/80 rounded-xl border border-gray-200/80 hover:border-emerald-300/80 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  {/* Lesson icon/emoji */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 flex items-center justify-center text-2xl shadow-sm">
                    {lesson.image}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className="font-semibold text-gray-900 text-[15px] mb-1"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      {lesson.title}
                    </h4>
                    <div
                      className="flex items-center gap-3 text-xs text-gray-500"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      <span>{lesson.grade}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>{lesson.duration}</span>
                    </div>
                  </div>

                  {/* Expert Verified Badge */}
                  <div className="flex-shrink-0 px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                  >
                    Expert Verified
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Model Categories */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <CubeIcon className="w-5 h-5 text-teal-600" />
              </div>
              <h3
                className="text-xl font-semibold text-gray-900"
                style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
              >
                3D Model Library
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {modelCategories.map((category, index) => (
                <motion.div
                  key={category.name}
                  className="group relative p-5 bg-gradient-to-br from-white to-teal-50/30 rounded-xl border border-gray-200/80 hover:border-teal-300/80 hover:shadow-lg hover:shadow-teal-100/50 transition-all duration-300"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  {/* Icon */}
                  <div className="text-3xl mb-3">{category.icon}</div>

                  {/* Category name */}
                  <h4
                    className="font-semibold text-gray-900 text-sm mb-1"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                  >
                    {category.name}
                  </h4>

                  {/* Model count */}
                  <div
                    className="text-xs text-gray-500"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                  >
                    {category.count} models
                  </div>

                  {/* 100+ badge */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 bg-teal-500 text-white text-[9px] font-bold uppercase tracking-wider rounded-full"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                  >
                    100+ models
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Total count banner */}
            <motion.div
              className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/50 flex items-center justify-between"
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 1 }}
            >
              <span
                className="text-gray-700 font-medium text-sm"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Growing library updated monthly
              </span>
              <span
                className="text-emerald-600 font-bold text-lg"
                style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
              >
                100+ 3D Models
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Additional icons for Standards section
function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FOR TEACHERS SECTION - Built for Biology Teachers
// ═══════════════════════════════════════════════════════════════════════════

function ForTeachersSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  const teacherCards = [
    {
      icon: CodeOffIcon,
      title: "No Code Required",
      description: "Create stunning 3D environments with natural language. Just describe what you want to teach and watch it come to life.",
    },
    {
      icon: ControlIcon,
      title: "You Stay in Control",
      description: "Customize every element of your lesson. Add annotations, set waypoints, and guide students through the experience your way.",
    },
    {
      icon: ChartIcon,
      title: "Track Progress",
      description: "Monitor student engagement with built-in analytics. See who's completed lessons and identify areas where students need support.",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-6 overflow-hidden"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-emerald-50/30 to-white" />

      {/* Decorative elements */}
      <motion.div
        className="absolute top-20 right-[8%] w-40 h-40 rounded-full opacity-[0.03]"
        style={{
          background: 'radial-gradient(circle at 40% 40%, #10b981, transparent)',
        }}
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-24 left-[5%] w-28 h-28 rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #059669, transparent)',
        }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="inline-block px-4 py-1.5 mb-5 rounded-full bg-emerald-100/80 border border-emerald-200/60 text-emerald-700 text-xs font-bold tracking-[0.2em] uppercase"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            For Teachers
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight"
            style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          >
            Built for{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Biology Teachers
            </span>
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {teacherCards.map((card, index) => (
            <motion.div
              key={card.title}
              className="group relative p-7 bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-xl hover:border-emerald-300/60 transition-all duration-400"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
            >
              {/* Icon */}
              <div className="w-14 h-14 mb-5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all duration-300">
                <card.icon className="w-7 h-7 text-emerald-600" />
              </div>

              {/* Title */}
              <h3
                className="text-xl font-semibold text-gray-900 mb-3"
                style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
              >
                {card.title}
              </h3>

              {/* Description */}
              <p
                className="text-gray-600 text-[15px] leading-relaxed"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {card.description}
              </p>

              {/* Hover accent line */}
              <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left" />
            </motion.div>
          ))}
        </div>

        {/* Testimonial Quote */}
        <motion.div
          className="relative max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <div className="relative p-8 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 rounded-2xl border border-emerald-100">
            {/* Quote mark */}
            <span
              className="absolute -top-4 left-8 text-5xl text-emerald-300/80 leading-none"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              "
            </span>

            <blockquote
              className="text-lg sm:text-xl text-gray-700 leading-relaxed mb-4 pl-4"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              BioQuest lets me create the lessons I've always imagined but never had the tools to build. My students are more engaged than ever.
            </blockquote>

            <div className="flex items-center gap-3 pl-4">
              {/* Avatar placeholder */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-sm"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                SM
              </div>
              <div>
                <div
                  className="font-semibold text-gray-900 text-sm"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  Sarah M.
                </div>
                <div
                  className="text-xs text-gray-500"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  Biology Teacher, Portland High School
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Icons for For Teachers section
function CodeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 9.5L8 12l2 2.5" />
      <path d="M14 9.5l2 2.5-2 2.5" />
      <line x1="4" y1="4" x2="20" y2="20" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function ControlIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 2 5-6" />
      <circle cx="7" cy="16" r="1.5" fill="currentColor" />
      <circle cx="11" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" />
      <circle cx="20" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL CTA SECTION - Ready to Transform Your Classroom
// ═══════════════════════════════════════════════════════════════════════════

function FinalCTASection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-6 bg-gray-50"
    >
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Title */}
        <motion.h2
          className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-6"
          style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Ready to Transform Your{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Biology Classroom
          </span>
          ?
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          className="text-lg text-gray-600 mb-10 max-w-xl mx-auto"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          Join hundreds of educators creating immersive learning experiences for their students.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link
            href="/contact"
            className="group relative inline-flex items-center gap-3 px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/35 hover:scale-[1.02]"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {/* Button glow effect */}
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <span className="relative">Schedule a Demo</span>

            {/* Arrow */}
            <motion.svg
              className="relative w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </motion.svg>
          </Link>
        </motion.div>

        {/* Trust note */}
        <motion.p
          className="mt-6 text-sm text-gray-500"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          Free for individual educators. School plans available.
        </motion.p>
      </div>
    </section>
  );
}

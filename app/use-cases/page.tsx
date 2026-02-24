"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Navigation from "../../components/Navigation";
import { ExperienceLibrarySection } from '@/components/ExperienceLibrarySection';

// ═══════════════════════════════════════════════════════════════════════════
// USE CASES PAGE - "Living Science" Aesthetic
// Photo-driven hero with immersive VR classroom imagery
// ═══════════════════════════════════════════════════════════════════════════

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-24 px-6 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/vrclass.png"
            alt="Students in VR classroom"
            className="w-full h-full object-cover blur-[2px]"
            style={{ objectPosition: '70% center' }}
          />
        </div>

        {/* Very light global dark overlay — keeps image crisp */}
        <div className="absolute inset-0 bg-black/15" />

        {/* Bottom emerald fade — only bottom ~42%, top 58% stays crystal clear */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '42%',
            background: 'linear-gradient(to top, #064e3b 0%, rgba(6,78,59,0.78) 28%, rgba(6,78,59,0.28) 65%, transparent 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 text-white text-xs font-bold tracking-[0.2em] uppercase"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              For Educators
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="mt-8 mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-white leading-[1.05] drop-shadow-lg"
              style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
            >
              Where Biology
            </span>
            <span
              className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.05] mt-1 drop-shadow-lg"
              style={{
                fontFamily: '"Syne", system-ui, sans-serif',
                background: 'linear-gradient(135deg, #34d399 0%, #6ee7b7 50%, #5eead4 100%)',
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
            className="max-w-2xl mx-auto text-lg sm:text-xl text-white/90 leading-relaxed mb-10 drop-shadow-md"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Create immersive 3D learning experiences that spark curiosity
            and deepen understanding — <span className="text-white font-semibold">no coding required</span>
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href="/contact"
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-base transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-400/40 hover:scale-[1.02]"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              {/* Button glow effect */}
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-300/20 to-teal-300/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

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

          {/* Trust badge */}
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Trusted by educators nationwide
            </span>
          </motion.div>
        </div>

      </section>

      {/* Experience Library Section */}
      <ExperienceLibrarySection />

      {/* Experience Quote Section */}
      <ExperienceQuoteSection />

      {/* For Teachers Section */}
      <ForTeachersSection />

      {/* Standards & Library Section */}
      <StandardsLibrarySection />

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
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* ── Main content on emerald-900 (Hero flows directly in via its bottom wave) ── */}
      <div className="relative bg-emerald-900 px-6 py-16">
        {/* Subtle noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        {/* Inner glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-emerald-700/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Quote */}
          <motion.blockquote
            className="text-center mb-14"
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className="block text-6xl sm:text-7xl text-emerald-400/60 leading-none mb-4"
              style={{ fontFamily: 'Georgia, serif' }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              "
            </motion.span>

            <p
              className="text-2xl sm:text-3xl md:text-4xl text-white/95 leading-relaxed font-medium tracking-tight"
              style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
            >
              Where biology stops being diagrams on a page — and becomes worlds students can{' '}
              <span
                className="font-bold text-emerald-400"
              >
                step inside
              </span>
              .
            </p>
          </motion.blockquote>

          {/* Experience cards */}
          <motion.div
            className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {experienceItems.map((item, index) => (
              <motion.div
                key={index}
                className="group flex items-center gap-4 p-5 bg-white rounded-2xl shadow-lg shadow-emerald-950/30 hover:shadow-xl hover:shadow-emerald-950/40 border border-white/10 transition-all duration-300"
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  duration: 0.6,
                  delay: 0.5 + index * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -3 }}
              >
                {/* Icon container */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all duration-300">
                  <item.icon className="w-6 h-6 text-emerald-600" />
                </div>

                {/* Text */}
                <p
                  className="text-gray-800 font-medium text-[15px] leading-snug"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {item.text}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
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
      className="relative py-20 px-6 overflow-hidden bg-white"
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
// FOR TEACHERS SECTION - Built for Teachers (full-bleed photo + glass cards)
// Quote bar integrated at bottom of image
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
      className="relative overflow-hidden"
    >
      {/* Full-bleed background image */}
      <div className="absolute inset-0">
        <img
          src="/bioteacher.png"
          alt="Biology teacher using BioQuest in the classroom"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 30%' }}
        />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Top fade: emerald-900 → transparent, ties into the section above */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{ height: '180px', background: 'linear-gradient(to bottom, #064e3b 0%, rgba(6,78,59,0.55) 45%, transparent 100%)' }}
      />

      {/* Left-to-right gradient for card readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />

      {/* Content: flex column so quote bar sits at natural bottom */}
      <div className="relative z-10 flex flex-col">

        {/* Main content area */}
        <div className="max-w-6xl mx-auto px-6 py-16 w-full">

          {/* Title */}
          <motion.div
            className="mb-8 max-w-lg"
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="inline-block px-4 py-1.5 mb-4 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 text-white text-xs font-bold tracking-[0.2em] uppercase"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              For Teachers
            </span>
            <h2
              className="text-4xl sm:text-5xl font-semibold text-white tracking-tight drop-shadow-lg leading-tight"
              style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
            >
              Built for{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #34d399 0%, #6ee7b7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Teachers
              </span>
            </h2>
          </motion.div>

          {/* Feature cards — vertical stack, gap-4, compact glassmorphism */}
          <div className="flex flex-col gap-4 max-w-md">
            {teacherCards.map((card, index) => (
              <motion.div
                key={card.title}
                className="relative bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl shadow-black/15 p-5 hover:bg-white/90 transition-all duration-300"
                initial={{ opacity: 0, x: -30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  duration: 0.55,
                  delay: 0.2 + index * 0.13,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ x: 6 }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shadow-sm">
                    <card.icon className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-sm font-semibold text-gray-900 mb-1 leading-snug"
                      style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                    >
                      {card.title}
                    </h3>
                    <p
                      className="text-xs text-gray-600 leading-relaxed"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      {card.description}
                    </p>
                  </div>
                </div>
                <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-400/60 to-emerald-600/30 rounded-full" />
              </motion.div>
            ))}
          </div>

        </div>

        {/* Sarah testimonial — centered glassmorphism speech bubble */}
        <div className="px-6 pb-12 flex justify-center">
          <motion.div
            className="bg-white/80 backdrop-blur-md rounded-2xl max-w-3xl w-full p-6 shadow-2xl shadow-black/25 border border-white/60"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
        

            {/* Quote text */}
            <p
              className="text-base sm:text-lg text-gray-800 italic leading-relaxed mb-5"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              BioQuest lets me create the lessons I&apos;ve always imagined but never had the tools to build. My students are more engaged than ever.
            </p>

            {/* Divider + Sarah attribution */}
            <div className="flex items-center gap-3 pt-4 border-t border-emerald-100/80">
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                SM
              </div>
              <div>
                <p
                  className="text-sm font-semibold text-gray-900 leading-tight"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  Sarah M.
                </p>
                <p
                  className="text-xs text-gray-500 mt-0.5"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  Biology Teacher, Portland High School
                </p>
              </div>
            </div>
          </motion.div>
        </div>

      </div>

      {/* Bottom wave: Teachers (dark photo) → Standards (white) */}
      <div className="relative z-10 -mt-px">
        <svg
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height: '96px' }}
        >
          <rect width="1440" height="96" fill="rgba(0,0,0,0)" />
          <path
            d="M0,96 C240,40 480,0 720,32 C960,64 1200,96 1440,48 L1440,96 Z"
            fill="#ffffff"
          />
        </svg>
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
      className="relative py-20 px-6 overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/vrscene.png"
          alt="Immersive VR biology scene"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Emerald tint */}
      <div className="absolute inset-0 bg-emerald-900/15" />

      {/* Vignette */}
      <div className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Title */}
        <motion.h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-6 drop-shadow-lg"
          style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Ready to Transform Your{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #34d399 0%, #6ee7b7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Classroom
          </span>
          ?
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          className="text-lg sm:text-xl text-white/85 mb-12 max-w-xl mx-auto drop-shadow-md"
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
            className="group relative inline-flex items-center gap-3 px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-400/40 hover:scale-[1.03]"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-300/20 to-teal-300/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <span className="relative">Schedule a Demo</span>

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
          className="mt-6 text-sm text-white/60"
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

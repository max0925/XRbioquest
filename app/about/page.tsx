"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Navigation from "../../components/Navigation";

// ─── Fade-in wrapper ─────────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Founder card ─────────────────────────────────────────────────────────────
function FounderCard({
  photo,
  name,
  role,
  story,
  delay = 0,
}: {
  photo: string;
  name: string;
  role: string;
  story: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className="bg-emerald-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Photo + identity */}
      <div className="flex items-center gap-4 mb-6">
        <img
          src={photo}
          alt={name}
          className="w-16 h-16 rounded-full object-cover ring-2 ring-white/60 flex-shrink-0 shadow-sm"
        />
        <div>
          <p
            className="text-base font-semibold text-white leading-tight"
            style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          >
            {name}
          </p>
          <p
            className="text-xs text-emerald-300 mt-0.5 font-medium"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {role}
          </p>
        </div>
      </div>

      {/* Accent line */}
      <div className="w-8 h-0.5 bg-white/30 rounded-full mb-5" />

      {/* Story */}
      <p
        className="text-base text-white/75 leading-relaxed"
        style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
      >
        {story}
      </p>
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navigation />

      {/* ════════════════════════════════════════════════════════════
          HERO — soft emerald gradient, decorative circles
      ════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[62vh] flex items-center justify-center pt-28 pb-28 px-6 bg-emerald-800 overflow-hidden">

        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        {/* Inner glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-emerald-600/25 blur-3xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center max-w-2xl mx-auto">

          {/* Label pill */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6"
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-bold tracking-[0.22em] uppercase"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              About Us
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-white mb-6 leading-[1.04]"
            style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Our{" "}
            <span className="text-emerald-400">Story</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-lg mx-auto"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            Two students on a mission to make science accessible to everyone
          </motion.p>
        </div>

        {/* White wave at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg viewBox="0 0 1440 96" preserveAspectRatio="none" className="w-full block" style={{ height: '96px' }}>
            <rect width="1440" height="96" fill="#065f46" />
            <path d="M0,96 C240,40 480,0 720,32 C960,64 1200,96 1440,48 L1440,96 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          TEAM — two large profile cards
      ════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">

          <FadeIn className="text-center mb-14">
            <p className="text-xs font-semibold text-emerald-600 mb-2 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              The People
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              Meet the Team
            </h2>
          </FadeIn>

          <div className="flex flex-col sm:flex-row gap-8 justify-center items-start">
            {[
              {
                photo: "/avatar.png",
                name: "Zheng Bian",
                role: "Co-founder, CEO & CTO",
                school: "Penn GSE '25",
                origin: "🇨🇳 From China",
                quote: "I want to give students the tools I wish I had.",
                delay: 0,
              },
              {
                photo: "/meerim.jpg",
                name: "Meerim Kanatova",
                role: "Co-founder, CFO & COO",
                school: "Penn GSE '25",
                origin: "🇰🇬 From Kyrgyzstan",
                quote: "Learning should feel like discovery, not memorization.",
                delay: 0.14,
              },
            ].map((member) => (
              <FadeIn key={member.name} delay={member.delay} className="flex-1 flex flex-col items-center text-center max-w-xs mx-auto">
                {/* Photo */}
                <div className="relative mb-5">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-64 h-80 rounded-2xl object-cover shadow-lg"
                  />
                  {/* Subtle emerald corner accent */}
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-xl bg-emerald-100 -z-10" />
                </div>

                {/* Name */}
                <h3 className="text-xl font-semibold text-gray-900 mb-1" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
                  {member.name}
                </h3>

                {/* Role */}
                <p className="text-sm text-emerald-700 font-medium mb-1" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {member.role}
                </p>

                {/* School + origin */}
                <p className="text-xs text-gray-400 mb-4" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {member.school} · {member.origin}
                </p>

                {/* Quote */}
                <p className="text-sm text-gray-500 italic leading-relaxed border-t border-gray-100 pt-4 max-w-[220px]" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  &ldquo;{member.quote}&rdquo;
                </p>
              </FadeIn>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ORIGIN STORIES — two columns + bridge paragraph
      ════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">

          {/* Two founder columns */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 mb-16">
            <FounderCard
              photo="/avatar.png"
              name="Zheng Bian"
              role="Co-founder, CEO & CTO · Penn GSE '25"
              story="Growing up in China, I failed almost every STEM class—not because I wasn't capable, but because abstract concepts taught through textbooks never clicked. I needed to see things, explore them, touch them. Traditional education wasn't built for learners like me."
              delay={0}
            />
            <FounderCard
              photo="/meerim.jpg"
              name="Meerim Kanatova"
              role="Co-founder, CFO & COO · Penn GSE '25"
              story="In Kyrgyzstan, traditional education made science feel distant and frustrating. We had brilliant teachers but no tools to make biology tangible. Students would memorize diagrams they'd never truly understand."
              delay={0.14}
            />
          </div>

          {/* Divider with emerald dot */}
          <FadeIn className="flex items-center gap-4 mb-14" delay={0.1}>
            <div className="flex-1 h-px bg-gray-100" />
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <div className="flex-1 h-px bg-gray-100" />
          </FadeIn>

          {/* Bridge paragraph — centered */}
          <FadeIn delay={0.15}>
            <div className="max-w-2xl mx-auto text-center">
              {/* Large decorative quote mark */}
              <span
                className="block text-6xl text-emerald-300/70 leading-none mb-4 -mt-2"
                style={{ fontFamily: "Georgia, serif" }}
                aria-hidden="true"
              >
                "
              </span>
              <p
                className="text-lg sm:text-xl text-gray-700 leading-relaxed"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                At Penn GSE, studying Learning Science &amp; Technology, we discovered how
                immersive experiences could transform understanding. Research showed that
                spatial, interactive learning creates connections that textbooks simply
                cannot. That&apos;s why we built BioQuest — to give every student the
                experience we wish we&apos;d had.
              </p>

              {/* CTA */}
              <div className="mt-10 flex flex-wrap gap-3 justify-center">
                <Link
                  href="/environment-design"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02]"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  Try BioQuest Free
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:border-emerald-300 hover:text-emerald-700 transition-all duration-300"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  Get in Touch
                </Link>
              </div>
            </div>
          </FadeIn>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          MISSION — deep emerald, white text
      ════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 px-6 bg-emerald-800 overflow-hidden">
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        {/* Inner glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-emerald-600/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <FadeIn>
            <p className="text-xs font-semibold text-emerald-300 mb-3 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              What Drives Us
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6 leading-tight" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              Our Mission
            </h2>
            <p className="text-xl sm:text-2xl text-white/90 font-medium leading-relaxed mb-8" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              Make abstract science tangible through immersive technology.
            </p>
            <div className="w-12 h-0.5 bg-emerald-400/60 mx-auto mb-8 rounded-full" />
            <p className="text-base text-white/70 leading-relaxed max-w-xl mx-auto" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              A world where every student can explore, experiment, and understand — regardless of how they learn best.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CTA — white background
      ════════════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-8 leading-tight" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              Join us in transforming science education
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/environment-design"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02]"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Get Started
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:border-emerald-300 hover:text-emerald-700 transition-all duration-300"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Contact Us
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}

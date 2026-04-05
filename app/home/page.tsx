'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_TABS = [
  {
    label: '🧬 Cell Biology',
    prompt: 'Create a cell biology game about organelle functions for high school students',
  },
  {
    label: '🧪 Genetics',
    prompt: 'Create a genetics game about DNA replication and transcription for AP Biology',
  },
  {
    label: '🌿 Ecology',
    prompt: 'Create an ecology game about food webs and energy flow for middle school',
  },
  {
    label: '🫀 Human Body',
    prompt: 'Create a human body game about the cardiovascular and respiratory systems',
  },
  {
    label: '☀️ Photosynthesis',
    prompt: 'Create a photosynthesis game about the light reactions and Calvin cycle for AP Biology',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '✏️',
    title: 'Describe a Lesson',
    description:
      'Tell the AI what your students should learn. Reference any standard, topic, or learning goal.',
  },
  {
    step: '02',
    icon: '✨',
    title: 'AI Builds the Game',
    description:
      '3D assets, quest chains, NPC guide, scoring, and NGSS-aligned knowledge cards — assembled in 60 seconds.',
  },
  {
    step: '03',
    icon: '🥽',
    title: 'Students Play in VR',
    description:
      'Share a link. Students explore in browser or VR headset. No install required.',
  },
];

const DEMO_STEPS = [
  'Analyzing learning objectives',
  'Selecting NGSS standards: HS-LS1-7',
  'Placing 3D biology assets (6 organelles)',
  'Designing quest chain (3 missions)',
  'Spawning AI guide NPC',
];

const METRICS = [
  { value: '6', label: 'Letters of Intent' },
  { value: '90%', label: 'Student Engagement' },
  { value: '3', label: 'Active Pilots' },
  { value: '60s', label: 'Generation Time' },
];

const TEAM = [
  { name: 'Zheng Bian', role: 'Co-founder & CTO', school: "Penn GSE '25", photo: '/avatar.png' },
  {
    name: 'Meerim Kanatova',
    role: 'Co-founder & COO',
    school: "Penn GSE '25",
    photo: '/meerim.jpg',
  },
];

type BioElement = {
  icon: string;
  size: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  delay: number;
  duration: number;
  anim: number;
};

const BIO_ELEMENTS: BioElement[] = [
  { icon: '🧬', size: 64, top: '14%', left: '4%', delay: 0, duration: 6, anim: 0 },
  { icon: '🔬', size: 56, top: '8%', right: '7%', delay: 1.4, duration: 7, anim: 1 },
  { icon: '🫀', size: 52, top: '38%', left: '2%', delay: 0.8, duration: 5.5, anim: 2 },
  { icon: '🧪', size: 48, top: '22%', right: '3%', delay: 2, duration: 6.5, anim: 1 },
  { icon: '🌿', size: 44, bottom: '22%', left: '5%', delay: 1.2, duration: 7.2, anim: 0 },
  { icon: '⚡', size: 40, top: '52%', right: '2%', delay: 0.5, duration: 5, anim: 2 },
];

const ORGANELLES = [
  { label: 'Mitochondria', x: 25, y: 42, color: '#10b981' },
  { label: 'Lysosome', x: 56, y: 28, color: '#3b82f6' },
  { label: 'Golgi', x: 72, y: 56, color: '#8b5cf6' },
  { label: 'Glucose', x: 42, y: 66, color: '#f59e0b' },
  { label: 'ER', x: 18, y: 64, color: '#ec4899' },
];

// ─── Floating Bio Decorations ─────────────────────────────────────────────────

function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {BIO_ELEMENTS.map((el, i) => (
        <div
          key={i}
          className="absolute hidden lg:flex items-center justify-center rounded-full bg-white border border-emerald-100"
          style={{
            width: el.size,
            height: el.size,
            top: el.top,
            bottom: el.bottom,
            left: el.left,
            right: el.right,
            boxShadow: '0 4px 16px rgba(16,185,129,0.10)',
            animation: `bioFloat${el.anim} ${el.duration}s ease-in-out ${el.delay}s infinite`,
          }}
        >
          <span style={{ fontSize: el.size * 0.44 }}>{el.icon}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function Navigation() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid #e5e7eb' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <Image src="/bio.png" alt="BioQuest" width={30} height={30} className="rounded-lg" />
          <span
            className="text-gray-900"
            style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17 }}
          >
            BioQuest
          </span>
        </a>

        <div className="hidden md:flex items-center gap-7">
          {[
            { label: 'Experiences', href: '/experiences' },
            { label: 'Create', href: '/create' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'About', href: '/about' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors no-underline"
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
            >
              {item.label}
            </a>
          ))}
        </div>

        <button
          onClick={() => router.push('/create')}
          className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#059669', fontFamily: 'DM Sans, sans-serif' }}
        >
          Get Started
        </button>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  const handleGenerate = () => {
    const val = prompt.trim();
    if (val) router.push(`/create?prompt=${encodeURIComponent(val)}`);
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-12 overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 65%)',
        }}
      />

      <FloatingElements />

      <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span
            className="text-emerald-700 text-sm font-medium"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            AI-Powered Biology Games
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08 }}
          className="text-5xl md:text-[58px] font-extrabold text-gray-900 leading-[1.12] tracking-tight mb-6"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          What should your students{' '}
          <span className="relative">
            <span style={{ color: '#059669' }}>explore</span>
            <svg
              className="absolute -bottom-1 left-0 right-0 w-full"
              viewBox="0 0 200 8"
              fill="none"
              preserveAspectRatio="none"
              style={{ height: 6 }}
            >
              <path
                d="M2 5 Q50 2 100 5 Q150 8 198 4"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.5"
              />
            </svg>
          </span>{' '}
          today?
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          Describe a lesson goal. AI generates a playable VR biology game with quests, scoring,
          and NGSS-aligned content — in 60 seconds.
        </motion.p>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="relative flex items-center bg-white rounded-2xl overflow-hidden mb-5"
          style={{
            boxShadow: '0 4px 28px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.06)',
          }}
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. Mitosis and cell division for AP Biology..."
            className="flex-1 px-6 py-5 text-base text-gray-800 placeholder-gray-400 bg-transparent outline-none"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          />
          <button
            onClick={handleGenerate}
            className="m-2 px-5 py-3 rounded-xl text-white text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-95 flex-shrink-0"
            style={{ backgroundColor: '#059669', fontFamily: 'DM Sans, sans-serif' }}
          >
            Generate Experience →
          </button>
        </motion.div>

        {/* Category pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(`/create?prompt=${encodeURIComponent(tab.prompt)}`)}
              className="px-4 py-2 rounded-full text-sm bg-white border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-200 cursor-pointer"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <div className="w-px h-10 bg-gradient-to-b from-transparent via-emerald-400 to-transparent" />
        <div className="w-1 h-1 rounded-full bg-emerald-400" />
      </motion.div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section className="py-28 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 mb-4"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Simple Process
          </p>
          <h2
            className="text-4xl font-extrabold text-gray-900"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            How it works?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative bg-white border border-gray-100 rounded-2xl p-8 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
            >
              {/* Emerald top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                style={{ backgroundColor: '#10b981' }}
              />

              {/* Step number — subtle background */}
              <div
                className="absolute top-5 right-6 text-6xl font-black leading-none select-none"
                style={{ color: 'rgba(16,185,129,0.07)', fontFamily: 'Syne, sans-serif' }}
              >
                {card.step}
              </div>

              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-6">
                {card.icon}
              </div>

              <div
                className="text-xs font-bold tracking-widest text-emerald-500 mb-2"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                STEP {card.step}
              </div>

              <h3
                className="text-xl font-bold text-gray-900 mb-3"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                {card.title}
              </h3>

              <p
                className="text-gray-500 text-sm leading-relaxed"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Demo Section ─────────────────────────────────────────────────────────────

function GameMockup() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden w-full"
      style={{ backgroundColor: '#0a1628', aspectRatio: '16/9' }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
        <div
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{
            backgroundColor: 'rgba(16,185,129,0.2)',
            color: '#10b981',
            fontFamily: 'DM Sans, sans-serif',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          Score: 150
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  i < 2 ? '#10b981' : i === 2 ? '#fbbf24' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Phase 2 / 5
        </div>
      </div>

      {/* Organelle nodes */}
      {ORGANELLES.map((org) => (
        <div
          key={org.label}
          className="absolute flex flex-col items-center"
          style={{ left: `${org.x}%`, top: `${org.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div
            className="w-9 h-9 rounded-full"
            style={{
              backgroundColor: org.color,
              boxShadow: `0 0 18px ${org.color}55, 0 0 6px ${org.color}`,
            }}
          />
          <span
            className="mt-1.5 text-white/60 whitespace-nowrap"
            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9 }}
          >
            {org.label}
          </span>
        </div>
      ))}

      {/* NPC bubble */}
      <div
        className="absolute bottom-14 right-3 max-w-[138px] rounded-xl p-3"
        style={{
          backgroundColor: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.28)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: '#10b981' }} />
          <span
            className="text-xs font-semibold"
            style={{ color: '#34d399', fontFamily: 'DM Sans, sans-serif' }}
          >
            Dr. Nucleus
          </span>
        </div>
        <p
          className="text-white/55 leading-snug"
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10 }}
        >
          Think about where energy production happens!
        </p>
      </div>

      {/* Bottom quest bar */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(8,18,36,0.88)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div>
          <p
            className="text-white/35 mb-0.5"
            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 9, letterSpacing: '0.1em' }}
          >
            CURRENT QUEST
          </p>
          <p
            className="text-white text-sm font-medium"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Drag glucose → mitochondria
          </p>
        </div>
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
          style={{ backgroundColor: '#059669', color: 'white', fontFamily: 'DM Sans, sans-serif' }}
        >
          T — Hint
        </div>
      </div>
    </div>
  );
}

function DemoSection() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveStep((s) => (s + 1) % DEMO_STEPS.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="py-28 px-6" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 mb-4"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            See It In Action
          </p>
          <h2
            className="text-4xl font-extrabold text-gray-900"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            From prompt to VR game in 60 seconds
          </h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 items-stretch">
          {/* Step list */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-[38%] bg-white rounded-2xl p-8 border border-gray-100 flex flex-col"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span
                className="text-sm font-semibold text-gray-700"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                BioQuest AI is generating...
              </span>
            </div>

            <div className="space-y-5 flex-1">
              {DEMO_STEPS.map((step, i) => {
                const done = i < activeStep;
                const active = i === activeStep;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-400"
                      style={{
                        backgroundColor: done
                          ? '#10b981'
                          : active
                          ? 'rgba(16,185,129,0.15)'
                          : 'rgba(0,0,0,0.05)',
                        border: active ? '2px solid #10b981' : 'none',
                      }}
                    >
                      {done && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                      {active && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <span
                      className="text-sm transition-all duration-300"
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        color: done ? '#374151' : active ? '#059669' : '#9ca3af',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${((activeStep + 1) / DEMO_STEPS.length) * 100}%`,
                  backgroundColor: '#10b981',
                }}
              />
            </div>
          </motion.div>

          {/* Game mockup */}
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full lg:w-[62%]"
          >
            <GameMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Experience Library ───────────────────────────────────────────────────────

function ExperienceLibrarySection() {
  const router = useRouter();

  return (
    <section className="py-28 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 mb-4"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Experience Library
          </p>
          <h2
            className="text-4xl font-extrabold text-gray-900"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Ready-to-play biology games
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 — Voyage Inside the Cell */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="relative h-44 overflow-hidden bg-gray-100">
              <Image
                src="/Voyage.png"
                alt="Voyage Inside the Cell"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {['VR Ready', 'Web', 'AI NPC'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3
                className="text-lg font-bold text-gray-900 mb-1 leading-tight"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                Voyage Inside the Cell
              </h3>
              <p
                className="text-xs text-gray-400 mb-5"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                8 min · NGSS: HS-LS1-2
              </p>
              <button
                onClick={() => router.push('/play/voyage-inside-cell')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#059669', fontFamily: 'DM Sans, sans-serif' }}
              >
                Launch Experience
              </button>
            </div>
          </motion.div>

          {/* Cards 2 & 3 — Coming soon */}
          {[
            { title: 'DNA & Genetics Lab', icon: '🧬', tag: 'Coming Q3 2025' },
            { title: 'Ecology Field Study', icon: '🌿', tag: 'Coming Q3 2025' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i + 1) * 0.1 }}
              className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-emerald-200"
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdf4 100%)',
                minHeight: 320,
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}
              >
                {item.icon}
              </div>
              <h3
                className="text-base font-bold text-gray-800 mb-3"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                {item.title}
              </h3>
              <span
                className="px-3 py-1.5 rounded-full text-xs font-medium text-emerald-700 bg-white border border-emerald-200"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {item.tag}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Traction ─────────────────────────────────────────────────────────────────

function TractionSection() {
  return (
    <section className="py-20 px-6" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {METRICS.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl p-6 text-center border border-gray-100"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <div
                className="text-[42px] font-black leading-none mb-2"
                style={{ fontFamily: 'Syne, sans-serif', color: '#059669' }}
              >
                {metric.value}
              </div>
              <div
                className="text-sm text-gray-500"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {metric.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Team ─────────────────────────────────────────────────────────────────────

function TeamSection() {
  return (
    <section className="py-28 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 mb-4"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            The Team
          </p>
          <h2
            className="text-3xl font-extrabold text-gray-900"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Built by educators, for educators
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TEAM.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-5 bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-emerald-100">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                  style={{ backgroundColor: '#10b981' }}
                >
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path
                      d="M1 3L3 5L7 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <div
                  className="font-bold text-gray-900 text-lg"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  {member.name}
                </div>
                <div
                  className="text-sm text-gray-500 mb-2"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {member.role}
                </div>
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {member.school}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  const router = useRouter();

  return (
    <section
      className="py-32 px-6 relative overflow-hidden"
      style={{ backgroundColor: '#f0fdf4' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.14) 0%, transparent 68%)',
        }}
      />
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 leading-tight"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Build your first biology game.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-lg text-gray-500 mb-10"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          No setup. No 3D expertise. Just describe what students should learn.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <button
            onClick={() => router.push('/create')}
            className="px-8 py-4 rounded-2xl text-base font-semibold text-white transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#059669', fontFamily: 'DM Sans, sans-serif' }}
          >
            Start Creating Free
          </button>
          <button
            onClick={() => router.push('/community')}
            className="px-8 py-4 rounded-2xl text-base font-semibold text-gray-700 bg-white border border-gray-200 transition-all duration-200 cursor-pointer hover:border-emerald-400 hover:text-emerald-700 active:scale-95"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Book a Demo
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Image src="/bio.png" alt="BioQuest" width={22} height={22} className="rounded" />
          <span
            className="text-gray-900"
            style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}
          >
            BioQuest
          </span>
        </div>
        <p
          className="text-sm text-gray-400"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          © 2025 BioQuest · Penn GSE '25
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* Keyframe animations for floating biology elements */}
      <style>{`
        @keyframes bioFloat0 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-20px) rotate(4deg); }
        }
        @keyframes bioFloat1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-14px) rotate(-3deg); }
          66%       { transform: translateY(-24px) rotate(3deg); }
        }
        @keyframes bioFloat2 {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-16px) scale(1.05); }
        }
      `}</style>

      <div className="min-h-screen bg-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <Navigation />
        <HeroSection />
        <HowItWorksSection />
        <DemoSection />
        <ExperienceLibrarySection />
        <TractionSection />
        <TeamSection />
        <CTASection />
        <Footer />
      </div>
    </>
  );
}

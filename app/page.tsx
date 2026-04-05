"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ExperienceLibrarySection } from '@/components/ExperienceLibrarySection';

const CATEGORY_TABS = [
  { label: '🧬 Cell Biology', prompt: 'Create a cell biology game about organelle functions for high school students' },
  { label: '🧪 Genetics', prompt: 'Create a genetics game about DNA replication and transcription for AP Biology' },
  { label: '🌿 Ecology', prompt: 'Create an ecology game about food webs and energy flow for middle school' },
  { label: '🫀 Human Body', prompt: 'Create a human body game about the cardiovascular and respiratory systems' },
  { label: '☀️ Photosynthesis', prompt: 'Create a photosynthesis game about the light reactions and Calvin cycle for AP Biology' },
];

// ─── Sector icons ────────────────────────────────────────────────────────────
function SectorSchoolIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Graduation cap */}
      <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function SectorHomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function SectorUsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

// ─── Section layout constants ────────────────────────────────────────────────
// Diagonal clip-path: parallelogram with 64px slant on top + bottom
const SLANT = 64;
const EMERALD_CLIP  = `polygon(0 ${SLANT}px, 100% 0, 100% calc(100% - ${SLANT}px), 0 100%)`;
const EMERALD_CLIP_LAST = `polygon(0 ${SLANT}px, 100% 0, 100% 100%, 0 100%)`; // flat bottom for final section

export default function Home() {
  const router = useRouter();
  const [heroPrompt, setHeroPrompt] = useState("");

  const handleHeroGenerate = () => {
    const val = heroPrompt.trim();
    if (val) router.push(`/create?prompt=${encodeURIComponent(val)}`);
  };

  const sectorsRef   = useRef<HTMLElement>(null);
  const demoRef      = useRef<HTMLElement>(null);
  const featuresRef  = useRef<HTMLElement>(null);
  const socialRef    = useRef<HTMLElement>(null);
  const aboutRef     = useRef<HTMLElement>(null);
  const ctaRef       = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("animate-in"); }),
      { threshold: 0.07, rootMargin: "0px 0px -40px 0px" }
    );
    [sectorsRef, demoRef, featuresRef, socialRef, aboutRef, ctaRef].forEach((r) => { if (r.current) observer.observe(r.current); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-white overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — video bg, typewriter, white text
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 px-6 overflow-hidden">
        {/* Background video */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(2px) brightness(0.55)", zIndex: 0 }}
          autoPlay muted loop playsInline
        >
          <source src="/0211-small.mp4" type="video/mp4" />
        </video>

        {/* Overlay gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1, background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.7) 100%)" }} />

        {/* Scroll-down indicator */}
        <div
          className="absolute left-1/2 -translate-x-1/2 scroll-arrow-fade"
          style={{ zIndex: 4, bottom: "24px" }}
          aria-hidden="true"
        >
          <div className="scroll-bounce flex flex-col items-center gap-1">
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>


        {/* Content */}
        <div className="max-w-5xl mx-auto relative text-center" style={{ zIndex: 2 }}>

          {/* Label pill */}
          <div
            className="inline-flex items-center gap-2 rounded-full fade-in-up"
            style={{
              animationDelay: "0s",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 20px",
              marginBottom: "40px",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span
              style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              For Educators &amp; Designers
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-white fade-in-up"
            style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "clamp(40px, 5.5vw, 64px)",
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              textShadow: "0 2px 30px rgba(0,0,0,0.3)",
              marginBottom: "20px",
              animationDelay: "0.1s",
            }}
          >
            What should your students<br />
            <span style={{
              background: "linear-gradient(135deg, #34d399, #6ee7b7, #a7f3d0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>explore</span> today?
          </h1>

          {/* Subtitle */}
          <p
            className="mx-auto fade-in-up"
            style={{
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "17px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.65,
              maxWidth: "560px",
              marginBottom: "36px",
              animationDelay: "0.2s",
            }}
          >
            AI generates a playable biology game with quests, scoring, and
            NGSS-aligned content —{" "}
            <span style={{ color: "rgba(255,255,255,0.9)" }}>no code required</span>
            , playable on both{" "}
            <span style={{ color: "rgba(255,255,255,0.9)" }}>Web and VR</span>.
          </p>

          {/* Prompt input — glassmorphism */}
          <div
            className="hero-input-container relative flex items-center mb-5 fade-in-up mx-auto"
            style={{
              animationDelay: "0.3s",
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "16px",
              padding: "6px 6px 6px 24px",
              maxWidth: "580px",
            }}
          >
            <input
              type="text"
              value={heroPrompt}
              onChange={(e) => setHeroPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleHeroGenerate()}
              placeholder="e.g. Mitosis and cell division for AP Biology..."
              className="hero-glass-input flex-1 bg-transparent outline-none"
              style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: "15px",
                color: "white",
              }}
            />
            <button
              onClick={handleHeroGenerate}
              className="hero-generate-btn whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95"
              style={{
                backgroundColor: "#10b981",
                color: "white",
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: '"DM Sans", system-ui, sans-serif',
                border: "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#059669"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#10b981"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              Generate Experience →
            </button>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap justify-center gap-2 fade-in-up" style={{ animationDelay: "0.4s" }}>
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => router.push(`/create?prompt=${encodeURIComponent(tab.prompt)}`)}
                className="transition-all duration-200 cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "100px",
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          OUR SECTORS — white bg, 3 cards, diagonal emerald bar at bottom
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={sectorsRef} className="relative pt-20 pb-20 px-6 bg-emerald-800 scroll-fade overflow-hidden">
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        {/* Inner glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12 stagger-title">
            <p className="text-xs font-semibold text-emerald-300 mb-2 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Who It&apos;s For
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-white" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              Our Sectors
            </h2>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-6 stagger-content">
            {[
              {
                Icon: SectorSchoolIcon,
                title: "Secondary Education",
                description: "Supporting conceptual understanding in secondary science classrooms.",
              },
              {
                Icon: SectorHomeIcon,
                title: "Homeschool & Independent Learning",
                description: "Flexible, self-paced exploration of complex STEM ideas at home.",
              },
              {
                Icon: SectorUsersIcon,
                title: "Inclusive Learning",
                description: "Multiple pathways to understand the same scientific concept.",
              },
            ].map((sector, i) => (
              <div
                key={i}
                className="group flex flex-col items-center text-center p-7 rounded-xl border border-white/10 hover:border-white/25 hover:bg-white/10 transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.07)", transitionDelay: `${i * 90}ms` }}
              >
                {/* Icon bubble — centered */}
                <div className="w-12 h-12 rounded-full bg-emerald-600/60 flex items-center justify-center mb-5 group-hover:bg-emerald-400/80 transition-colors duration-300 flex-shrink-0">
                  <sector.Icon className="w-6 h-6 text-emerald-200 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Title */}
                <h3
                  className="text-[15px] font-semibold text-white mb-2 leading-snug"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                >
                  {sector.title}
                </h3>

                {/* Description */}
                <p
                  className="text-sm text-white/65 leading-relaxed"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {sector.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience Library Section */}
      <ExperienceLibrarySection />

      {/* ══════════════════════════════════════════════════════════════════════
          PRODUCT DEMO — white
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="demo" ref={demoRef} className="py-20 px-6 bg-white scroll-fade">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 stagger-title">
            <p className="text-xs font-semibold text-emerald-600 mb-2 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>Product Demo</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>See it in action</h2>
            <p className="text-base text-gray-500 max-w-xl mx-auto" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Watch how educators transform STEM concepts into VR experiences
            </p>
          </div>

          <div className="relative rounded-xl overflow-hidden shadow-lg aspect-video w-full max-w-4xl mx-auto stagger-content">
            <iframe
              src="https://www.youtube.com/embed/5l33aAtTS6g"
              style={{ border: 'none' }}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURES — deep emerald, diagonal clip-path parallelogram
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={featuresRef}
        className="relative bg-emerald-800 scroll-fade"
        style={{
          clipPath: EMERALD_CLIP,
          paddingTop:    `calc(5rem + ${SLANT}px)`,
          paddingBottom: `calc(5rem + ${SLANT}px)`,
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        {/* Inner glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-emerald-600/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-12 stagger-title">
            <p className="text-xs font-semibold text-emerald-300 mb-2 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>Features</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>Built for educators</h2>
            <p className="text-base text-white/65 max-w-xl mx-auto" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Everything you need to create immersive learning experiences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 stagger-content">
            {[
              {
                icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
                title: "AI-Powered",
                description: "Intelligent lesson generation that understands your curriculum and creates tailored VR experiences automatically.",
              },
              {
                icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
                title: "Immersive XR",
                description: "Full VR and AR support that brings abstract concepts to life through interactive experiences.",
              },
              {
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
                title: "No Code",
                description: "Intuitive interface designed for educators. Create professional VR lessons without any technical expertise.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-xl border border-white/10 hover:border-white/25 hover:bg-white/10 transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.07)", transitionDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-600/60 flex items-center justify-center mb-4 group-hover:bg-emerald-400/80 transition-colors duration-300">
                  <svg className="w-5 h-5 text-emerald-200 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>{feature.title}</h3>
                <p className="text-sm text-white/65 leading-relaxed" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TRACTION — white, 4 metric cards
      ══════════════════════════════════════════════════════════════════════ */}
      <section ref={socialRef} className="py-20 px-6 bg-white scroll-fade">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 stagger-title">
            <p className="text-xs font-semibold text-emerald-600 mb-2 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>Traction</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>Early momentum</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-content">
            {[
              { value: "6", label: "Letters of Intent" },
              { value: "90%", label: "Student Engagement" },
              { value: "3", label: "Active Pilots" },
              { value: "60s", label: "Generation Time" },
            ].map((metric, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 text-center border border-gray-100"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)", transitionDelay: `${i * 60}ms` }}
              >
                <div
                  className="text-4xl font-black leading-none mb-2"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif', color: "#059669" }}
                >
                  {metric.value}
                </div>
                <div className="text-sm text-gray-500" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ABOUT — white, two-column: story left, founders right
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="our-story" ref={aboutRef} className="relative py-20 px-6 bg-white scroll-fade overflow-hidden">
        {/* Decorative emerald circles */}
        <div className="absolute -left-24 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-emerald-700 opacity-[0.07] pointer-events-none" />
        <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-emerald-700 opacity-[0.07] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-12 stagger-title">
            <p className="text-xs font-semibold text-emerald-600 mb-2 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Our Story
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              Why We Built BioQuest
            </h2>
          </div>

          {/* Two-column */}
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left — story */}
            <div className="stagger-content">
              <p className="text-base text-gray-600 leading-relaxed mb-8" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                Growing up in Asia, we both struggled with abstract STEM concepts taught through traditional textbooks. At Penn, studying Learning Science &amp; Technology, we found a better way. BioQuest is our answer: making science tangible, visual, and explorable for every student.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 font-semibold text-sm hover:bg-emerald-600 hover:text-white transition-all duration-300"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Learn More
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            {/* Right — founder profile cards */}
            <div className="flex gap-6 justify-center stagger-content">
              {[
                { photo: "/avatar.png",  name: "Zheng Bian",      role: "Co-founder, CEO & CTO", school: "Penn GSE '25" },
                { photo: "/meerim.jpg",  name: "Meerim Kanatova", role: "Co-founder, CFO & COO", school: "Penn GSE '25" },
              ].map((founder) => (
                <div key={founder.name} className="flex flex-col items-center">
                  {/* Photo card with overlay */}
                  <div className="relative w-48 h-64 rounded-2xl overflow-hidden flex-shrink-0">
                    <img
                      src={founder.photo}
                      alt={founder.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Stronger dark gradient for text readability */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 40%, transparent 70%)' }} />
                    {/* Name + role + school overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-[14px] font-bold text-white leading-tight" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
                        {founder.name}
                      </p>
                      <p className="text-[11px] text-white/80 mt-1" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                        {founder.role}
                      </p>
                      <p className="text-[10px] text-white/55 mt-0.5" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                        {founder.school}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA — deep emerald, diagonal top edge only
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={ctaRef}
        className="relative bg-emerald-800 scroll-fade"
        style={{
          clipPath: EMERALD_CLIP_LAST,
          paddingTop:    `calc(5rem + ${SLANT}px)`,
          paddingBottom: "5rem",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-semibold text-white mb-4 leading-tight stagger-title" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
            Ready to transform
            <br />
            your classroom?
          </h2>
          <p className="text-base text-white/70 mb-10 max-w-xl mx-auto stagger-content" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            Join hundreds of educators creating immersive STEM experiences with AI and XR technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6 stagger-cta">
            <Link
              href="/create"
              className="group px-7 py-3.5 bg-white hover:bg-emerald-50 text-emerald-900 rounded-xl font-semibold text-base transition-all duration-300 flex items-center gap-2 shadow-lg shadow-black/20 hover:shadow-xl hover:scale-[1.02]"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <span>Get Started Free</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <Link
              href="/community"
              className="px-7 py-3.5 text-white rounded-xl font-medium text-base border border-white/30 hover:border-white/50 hover:bg-white/10 transition-all duration-300"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Book a Demo
            </Link>
          </div>

          <p className="text-xs text-white/45 stagger-cta" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            No credit card required • Free plan • Cancel anytime
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-gray-100 py-8 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-gray-400" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>© 2025 BioQuest. All rights reserved.</div>
            <div className="flex gap-6">
              <Link href="/create" className="text-xs text-gray-500 hover:text-emerald-600 transition-colors" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>Create</Link>
              <Link href="/community" className="text-xs text-gray-500 hover:text-emerald-600 transition-colors" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>Community</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Global Styles ───────────────────────────────────────────────────── */}
      <style jsx global>{`
        /* Hero load animations */
        .fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Scroll-triggered section fade + slide */
        .scroll-fade {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.75s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .scroll-fade.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        /* Staggered children: title → content → cta */
        .stagger-title,
        .stagger-content,
        .stagger-cta {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .animate-in .stagger-title   { opacity: 1; transform: translateY(0); transition-delay: 0.08s; }
        .animate-in .stagger-content { opacity: 1; transform: translateY(0); transition-delay: 0.22s; }
        .animate-in .stagger-cta     { opacity: 1; transform: translateY(0); transition-delay: 0.38s; }

        a, button { transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1); }

        /* Hero glass input placeholder */
        .hero-glass-input::placeholder { color: rgba(255,255,255,0.35); }

        /* Hero input container focus-within ring */
        .hero-input-container:focus-within {
          border-color: rgba(110,231,183,0.4);
          box-shadow: 0 0 0 4px rgba(110,231,183,0.08);
        }

        /* Scroll-down arrow */
        .scroll-arrow-fade {
          opacity: 0;
          animation: arrowFadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 1.6s forwards;
        }
        @keyframes arrowFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .scroll-bounce {
          animation: scrollBounce 1.8s ease-in-out 2.2s infinite;
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
      `}</style>
    </div>
  );
}

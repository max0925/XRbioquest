"use client";
import Link from "next/link";
import { useState } from "react";

const EXPERIENCES = [
  {
    id: 1,
    title: "Voyage Inside the Cell",
    subject: "Biology",
    grade: "Grades 9–12",
    duration: "15 min",
    description: "Journey through cellular organelles in immersive 3D. Click mitochondria, observe ATP production, and explore the full secretory pathway.",
    tags: ["VR Ready", "AI Generated"],
    href: "/experiences/voyage-inside-cell",
    icon: "🧬",
    thumbnail: "/Voyage.png",
    gradientFrom: "#10b981",
    gradientTo: "#059669",
    isPlaceholder: false,
  },
  {
    id: 2,
    title: "Coming Soon",
    subject: "",
    grade: "",
    duration: "",
    description: "More experiences coming soon",
    tags: [],
    href: "/environment-design",
    icon: "✨",
    gradientFrom: "#e5e7eb",
    gradientTo: "#d1d5db",
    isPlaceholder: true,
  },
  {
    id: 3,
    title: "Coming Soon",
    subject: "",
    grade: "",
    duration: "",
    description: "More experiences coming soon",
    tags: [],
    href: "/environment-design",
    icon: "✨",
    gradientFrom: "#e5e7eb",
    gradientTo: "#d1d5db",
    isPlaceholder: true,
  },
];

export function ExperienceLibrarySection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleNav = (direction: "prev" | "next") => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    if (direction === "prev") {
      setActiveIndex((prev) => (prev === 0 ? EXPERIENCES.length - 1 : prev - 1));
    } else {
      setActiveIndex((prev) => (prev === EXPERIENCES.length - 1 ? 0 : prev + 1));
    }

    setTimeout(() => setIsTransitioning(false), 400);
  };

  return (
    <section className="relative py-20 px-6 bg-white overflow-hidden" style={{ maxHeight: "520px" }}>
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #10b981 1px, transparent 0)`,
          backgroundSize: "32px 32px"
        }}
      />

      {/* Organic gradient orbs */}
      <div
        className="absolute top-10 -right-20 w-80 h-80 rounded-full opacity-[0.06] blur-3xl"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-[0.05] blur-3xl"
        style={{ background: "radial-gradient(circle, #059669 0%, transparent 70%)" }}
      />

      <div className="relative max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-12">
          {/* Pill label */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 backdrop-blur-sm border border-emerald-500/20"
            style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)" }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
            />
            <span
              className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-700"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Experience Library
            </span>
          </div>

          {/* Title */}
          <h2
            className="text-4xl font-bold mb-2 tracking-tight"
            style={{
              fontFamily: '"Syne", system-ui, sans-serif',
              color: "#0f172a",
              lineHeight: "1.1"
            }}
          >
            Ready-to-Use VR Experiences
          </h2>

          <p
            className="text-base text-gray-600"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Jump into immersive learning — no setup required
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative flex items-center justify-center gap-6">

          {/* Left Arrow */}
          <button
            onClick={() => handleNav("prev")}
            disabled={isTransitioning}
            className="group relative flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-emerald-500 hover:border-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
            style={{ boxShadow: "0 4px 20px rgba(16, 185, 129, 0.15)" }}
            aria-label="Previous experience"
          >
            <svg
              className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Cards Container */}
          <div className="flex items-center justify-center gap-6 overflow-visible" style={{ minHeight: "320px", width: "900px" }}>
            {[-1, 0, 1].map((offset) => {
              const index = (activeIndex + offset + EXPERIENCES.length) % EXPERIENCES.length;
              const exp = EXPERIENCES[index];
              const isCenter = offset === 0;
              const isLeft = offset === -1;
              const isRight = offset === 1;

              return (
                <Link
                  key={exp.id}
                  href={exp.href}
                  className="group relative flex-shrink-0 rounded-2xl bg-white transition-all duration-500 ease-out"
                  style={{
                    width: isCenter ? "310px" : "280px",
                    transform: isCenter
                      ? "scale(1.05) translateY(-8px)"
                      : isLeft
                        ? "scale(0.92) translateX(10px)"
                        : "scale(0.92) translateX(-10px)",
                    opacity: isCenter ? 1 : 0.5,
                    zIndex: isCenter ? 10 : 5,
                    border: isCenter ? "2px solid #10b981" : "2px solid #e5e7eb",
                    boxShadow: isCenter
                      ? "0 20px 40px rgba(16, 185, 129, 0.2), 0 8px 16px rgba(0, 0, 0, 0.08)"
                      : "0 4px 12px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  {/* Thumbnail gradient */}
                  <div
                    className="relative overflow-hidden rounded-t-2xl flex items-center justify-center"
                    style={{
                      height: isCenter ? "150px" : "130px",
                      background: `radial-gradient(ellipse at top left, ${exp.gradientFrom} 0%, ${exp.gradientTo} 100%)`,
                      transition: "height 0.5s ease-out"
                    }}
                  >
                    {/* Decorative pattern overlay */}
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: `linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)`,
                        backgroundSize: "200% 200%",
                        animation: isCenter ? "shimmer 3s infinite" : "none"
                      }}
                    />

                    {/* Thumbnail Image or Icon */}
                    {exp.thumbnail ? (
                      <img
                        src={exp.thumbnail}
                        alt={exp.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="relative text-7xl transition-transform group-hover:scale-110 duration-300"
                        style={{
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
                          fontSize: isCenter ? "5rem" : "4rem",
                          transition: "font-size 0.5s ease-out"
                        }}
                      >
                        {exp.icon}
                      </div>
                    )}
                  </div>

                  {/* Card content */}
                  <div
                    className="p-5 transition-all duration-500"
                    style={{ paddingTop: isCenter ? "1.5rem" : "1.25rem" }}
                  >
                    {exp.isPlaceholder ? (
                      /* Placeholder card content */
                      <>
                        <h3
                          className="font-bold mb-2 leading-tight transition-all duration-500"
                          style={{
                            fontFamily: '"Syne", system-ui, sans-serif',
                            color: "#0f172a",
                            fontSize: isCenter ? "1.125rem" : "1rem",
                            lineHeight: "1.3"
                          }}
                        >
                          Coming Soon
                        </h3>
                        <p
                          className="text-xs leading-relaxed text-gray-600 mb-4"
                          style={{
                            fontFamily: '"DM Sans", system-ui, sans-serif',
                            lineHeight: "1.6"
                          }}
                        >
                          More experiences coming soon
                        </p>
                        {isCenter && (
                          <div
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors"
                            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                          >
                            Create your own
                            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Real experience card content */
                      <>
                        {/* Title */}
                        <h3
                          className="font-bold mb-2 leading-tight transition-all duration-500"
                          style={{
                            fontFamily: '"Syne", system-ui, sans-serif',
                            color: "#0f172a",
                            fontSize: isCenter ? "1.125rem" : "1rem",
                            lineHeight: "1.3"
                          }}
                        >
                          {exp.title}
                        </h3>

                        {/* Metadata */}
                        <div
                          className="flex items-center gap-2 text-xs mb-3"
                          style={{
                            fontFamily: '"DM Sans", system-ui, sans-serif',
                            color: "#64748b"
                          }}
                        >
                          <span className="font-semibold text-emerald-600">{exp.subject}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>{exp.grade}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>{exp.duration}</span>
                        </div>

                        {/* Description - only show on center card */}
                        {isCenter && (
                          <p
                            className="text-xs leading-relaxed text-gray-600 mb-3"
                            style={{
                              fontFamily: '"DM Sans", system-ui, sans-serif',
                              lineHeight: "1.6"
                            }}
                          >
                            {exp.description.slice(0, 100)}...
                          </p>
                        )}

                        {/* Launch indicator */}
                        {isCenter && (
                          <div
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors"
                            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                          >
                            Launch Experience
                            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => handleNav("next")}
            disabled={isTransitioning}
            className="group relative flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-emerald-500 hover:border-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
            style={{ boxShadow: "0 4px 20px rgba(16, 185, 129, 0.15)" }}
            aria-label="Next experience"
          >
            <svg
              className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center items-center gap-2 mt-8">
          {EXPERIENCES.map((_, index) => (
            <button
              key={index}
              onClick={() => !isTransitioning && setActiveIndex(index)}
              disabled={isTransitioning}
              className="relative transition-all duration-300 disabled:cursor-not-allowed"
              style={{
                width: index === activeIndex ? "28px" : "8px",
                height: "8px",
                borderRadius: "100px",
                background: index === activeIndex
                  ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                  : "#d1d5db",
              }}
              aria-label={`Go to experience ${index + 1}`}
            >
              {index === activeIndex && (
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: "rgba(16, 185, 129, 0.3)",
                    filter: "blur(4px)"
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </section>
  );
}

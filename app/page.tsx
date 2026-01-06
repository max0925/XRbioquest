"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const demoRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const socialRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);

    // Intersection Observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    const sections = [demoRef, featuresRef, socialRef, ctaRef];
    sections.forEach(ref => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-24 pb-16 px-6 overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/30 via-white to-white"></div>

        {/* Minimal decorative blur */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-emerald-50 border border-emerald-100 fade-in-up">
              <div className="flex -space-x-1">
                <div className="w-5 h-5 rounded-full bg-emerald-400 border-2 border-white"></div>
                <div className="w-5 h-5 rounded-full bg-cyan-400 border-2 border-white"></div>
                <div className="w-5 h-5 rounded-full bg-teal-400 border-2 border-white"></div>
              </div>
              <span className="text-xs font-medium text-emerald-900" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                Trusted by <span className="font-semibold">500+</span> educators
              </span>
            </div>

            {/* Headline - Much smaller, elegant */}
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 mb-5 leading-tight fade-in-up"
              style={{
                fontFamily: '"Syne", "IBM Plex Sans", system-ui, sans-serif',
                animationDelay: '0.1s'
              }}
            >
              Create VR Classrooms<br />
              <span className="text-gray-500">in Minutes,</span>{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                No Code Required
              </span>
            </h1>

            {/* Subtitle - Refined size */}
            <p
              className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed fade-in-up"
              style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                animationDelay: '0.2s'
              }}
            >
              Design immersive 3D learning experiences effortlessly with{" "}
              <span className="text-gray-900 font-medium">AI-powered tools</span>{" "}
              built for educators.
            </p>

            {/* CTA Buttons - Normal size */}
            <div
              className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-12 fade-in-up"
              style={{ animationDelay: '0.3s' }}
            >
              <Link
                href="/create-lesson"
                className="group relative px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-base transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02]"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                <span>Start Creating</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <button
                className="group px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-base border border-gray-200 hover:border-gray-300 transition-all duration-300 flex items-center gap-2"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>See Demo</span>
              </button>
            </div>

            {/* Feature badges - Compact */}
            <div
              className="flex flex-wrap justify-center gap-4 fade-in-up"
              style={{ animationDelay: '0.4s' }}
            >
              {["AI-Powered", "Full VR/AR", "No Code"].map((feature) => (
                <div key={feature} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/80 border border-gray-100 shadow-sm">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium text-gray-700" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Product Demo Section - Tighter spacing */}
      <section ref={demoRef} className="py-16 px-6 bg-gray-50/50 scroll-fade">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-emerald-600 mb-2 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Product Demo
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              See it in action
            </h2>
            <p className="text-base text-gray-600 max-w-xl mx-auto" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Watch how educators transform STEM concepts into VR experiences
            </p>
          </div>

          {/* Demo preview */}
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-500">
            <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center cursor-pointer transition-colors">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  3D VR Classroom Preview
                </p>
              </div>
            </div>

            {/* Stats overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex gap-3">
              <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-100">
                <div className="text-lg font-semibold text-gray-900" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
                  &lt;2 min
                </div>
                <div className="text-xs text-gray-600" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  Creation time
                </div>
              </div>
              <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-100">
                <div className="text-lg font-semibold text-gray-900" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
                  100%
                </div>
                <div className="text-xs text-gray-600" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  No coding
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Compact */}
      <section ref={featuresRef} className="py-16 px-6 scroll-fade">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-emerald-600 mb-2 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Features
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              Built for educators
            </h2>
            <p className="text-base text-gray-600 max-w-xl mx-auto" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Everything you need to create immersive learning experiences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
                title: "AI-Powered",
                description: "Intelligent lesson generation that understands your curriculum and creates tailored VR experiences automatically."
              },
              {
                icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
                title: "Immersive XR",
                description: "Full VR and AR support that brings abstract concepts to life through interactive experiences."
              },
              {
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
                title: "No Code",
                description: "Intuitive interface designed for educators. Create professional VR lessons without any technical expertise."
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-lg border border-gray-200 bg-white hover:border-emerald-500 hover:shadow-md transition-all duration-300"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-600 transition-colors duration-300">
                  <svg className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section - Compact */}
      <section ref={socialRef} className="py-16 px-6 bg-gray-50/50 scroll-fade">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-emerald-600 mb-2 tracking-wider uppercase" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Testimonials
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              Trusted by educators
            </h2>
            <p className="text-base text-gray-600" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Join 500+ STEM teachers transforming their classrooms
            </p>
          </div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              {
                quote: "This platform has completely transformed how I teach molecular biology. My students are now excited about chemistry.",
                name: "Dr. Sarah Chen",
                role: "Chemistry Teacher, Lincoln HS"
              },
              {
                quote: "As someone with zero coding experience, I was amazed at how quickly I could create immersive physics simulations.",
                name: "Michael Torres",
                role: "Physics Teacher, Riverside Academy"
              }
            ].map((testimonial, i) => (
              <div key={i} className="p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-300">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-700 mb-4 leading-relaxed" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
                      {testimonial.name}
                    </div>
                    <div className="text-xs text-gray-600" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* School logos */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-6" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              Used at leading institutions
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-30">
              {["Stanford", "MIT", "Berkeley", "Princeton", "Yale"].map((school) => (
                <div key={school} className="text-lg font-medium text-gray-900" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
                  {school}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Compact */}
      <section ref={ctaRef} className="py-20 px-6 scroll-fade">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-semibold text-gray-900 mb-4 leading-tight" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
            Ready to transform<br />your classroom?
          </h2>
          <p className="text-base text-gray-600 mb-8 max-w-xl mx-auto" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            Join hundreds of educators creating immersive STEM experiences with AI and XR technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
            <Link
              href="/create-lesson"
              className="group px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-base transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02]"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <span>Get Started Free</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <Link
              href="/community"
              className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-base border border-gray-200 hover:border-gray-300 transition-all duration-300"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Book a Demo
            </Link>
          </div>

          <p className="text-xs text-gray-500" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            No credit card required • Free plan • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-gray-500" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              © 2025 BioQuest. All rights reserved.
            </div>
            <div className="flex gap-6">
              <Link href="/create-lesson" className="text-xs text-gray-600 hover:text-emerald-600 transition-colors" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                Create Lesson
              </Link>
              <Link href="/community" className="text-xs text-gray-600 hover:text-emerald-600 transition-colors" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                Community
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Styles */}
      <style jsx global>{`
        .fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .scroll-fade {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        .scroll-fade.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Smooth transitions on all interactive elements */
        a, button {
          transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}

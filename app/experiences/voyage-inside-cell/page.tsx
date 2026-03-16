"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function VoyageInsideCellPage() {
  const phasesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const phases = document.querySelectorAll(".phase-item");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("phase-visible"), i * 80);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    phases.forEach((p) => observer.observe(p));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ background: "#050d1a", color: "#e8f0ff", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        .syne { font-family: 'Syne', sans-serif; }
        @keyframes float {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .phase-item {
          opacity: 0;
          transform: translateX(-20px);
          transition: all 0.5s ease;
        }
        .phase-visible {
          opacity: 1 !important;
          transform: translateX(0) !important;
        }
        .phase-card-hover:hover {
          border-color: rgba(16,185,129,0.3) !important;
          transform: translateX(4px);
        }
        .outcome-card:hover {
          border-color: rgba(16,185,129,0.3) !important;
          transform: translateY(-4px);
        }
        .principle-card:hover {
          border-color: rgba(16,185,129,0.3) !important;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #050d1a; }
        ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.2); border-radius: 3px; }
      `}</style>

      {/* BACK BAR */}
      <div style={{ padding: "20px 48px", borderBottom: "1px solid rgba(100,180,255,0.12)", background: "rgba(5,13,26,0.9)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ color: "#7a90b8", textDecoration: "none", fontSize: 14, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 8, transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#10b981")}
          onMouseLeave={e => (e.currentTarget.style.color = "#7a90b8")}>
          ← Back to Home
        </Link>
      </div>

      {/* HERO */}
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "80px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/Voyage.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.25) blur(3px)',
          transform: 'scale(1.05)',
        }} />
        {/* bg glows */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 60% 40%, rgba(16,185,129,0.06) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 30% 70%, rgba(52,211,153,0.07) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, #10b981, transparent)", left: "52%", top: "10%", opacity: 0.06, animation: "float 12s linear infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #34d399, transparent)", left: "70%", top: "55%", opacity: 0.06, animation: "float 9s linear infinite", animationDelay: "-3s", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 640 }}>
          {/* badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 100, padding: "6px 14px", fontSize: 13, fontWeight: 500, color: "#10b981", marginBottom: 28, animation: "fadeUp 0.6s ease both" }}>
            <div style={{ width: 7, height: 7, background: "#10b981", borderRadius: "50%", animation: "pulse 2s infinite" }} />
            Featured Game Case Study
          </div>

          <h1 className="syne" style={{ fontSize: "clamp(44px, 6vw, 72px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 24, animation: "fadeUp 0.6s 0.1s ease both" }}>
            Voyage<br />
            <span style={{ background: "linear-gradient(135deg, #10b981, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Inside the Cell
            </span>
          </h1>

          <p style={{ fontSize: 18, lineHeight: 1.7, color: "#7a90b8", maxWidth: 520, marginBottom: 40, animation: "fadeUp 0.6s 0.2s ease both" }}>
            A 5-minute immersive VR biology game where students explore, interact, and master cell biology through hands-on challenges — earning points and unlocking AP/IB-aligned knowledge cards along the way.
          </p>

          <div style={{ display: "flex", gap: 32, marginBottom: 48, animation: "fadeUp 0.6s 0.3s ease both" }}>
            {[["5 min", "Play Time"], ["6", "Phases"], ["4", "Concepts Taught"], ["750+", "Total Points"]].map(([num, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <span className="syne" style={{ fontSize: 28, fontWeight: 800, color: "#10b981", display: "block" }}>{num}</span>
                <span style={{ fontSize: 12, color: "#7a90b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 16, animation: "fadeUp 0.6s 0.4s ease both" }}>
            <Link href="/voyage" style={{ background: "#10b981", color: "#050d1a", padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none", transition: "opacity 0.2s, transform 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Launch Experience →
            </Link>
            <a href="#phases" style={{ background: "transparent", border: "1px solid rgba(100,180,255,0.12)", color: "#e8f0ff", padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 500, textDecoration: "none", transition: "border-color 0.2s, transform 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(100,180,255,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              Learn More ↓
            </a>
          </div>
        </div>

        {/* Cell Visual */}
        <div style={{ position: "absolute", right: -60, top: "50%", transform: "translateY(-50%)", width: 560, height: 560, pointerEvents: "none" }} aria-hidden="true">
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "2px solid rgba(16,185,129,0.2)", position: "relative", animation: "rotateSlow 40s linear infinite", background: "radial-gradient(ellipse at 40% 40%, rgba(16,185,129,0.04), transparent 60%)" }}>
            {[
              { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", w: 80, h: 80, top: "30%", left: "35%", delay: "0s", emoji: "🔋" },
              { bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.3)", w: 64, h: 64, top: "55%", left: "55%", delay: "-2s", emoji: "🗑️" },
              { bg: "rgba(79,255,176,0.1)", border: "rgba(79,255,176,0.3)", w: 56, h: 56, top: "20%", left: "60%", delay: "-4s", emoji: "📦" },
              { bg: "rgba(255,200,80,0.1)", border: "rgba(255,200,80,0.3)", w: 72, h: 72, top: "65%", left: "25%", delay: "-1s", emoji: "🧬" },
            ].map(({ bg, border, w, h, top, left, delay, emoji }) => (
              <div key={emoji} style={{ position: "absolute", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: bg, border: `1.5px solid ${border}`, width: w, height: h, top, left, animation: `orbFloat 6s ease-in-out infinite`, animationDelay: delay }}>
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid rgba(100,180,255,0.12)", margin: "0 48px" }} />

      {/* GAME STORY */}
      <section id="phases" style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#10b981", marginBottom: 16 }}>The Premise</p>
        <h2 className="syne" style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.02em" }}>
          A sick cell.<br />One student-doctor. Five missions.
        </h2>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#7a90b8", maxWidth: 600, marginBottom: 64 }}>
          The cell is in crisis — mitochondria have gone dark, waste is piling up, and protein delivery has halted. Students are shrunk and injected into the cell with a mission: restore each organelle to bring the cell back to life. Every action earns points, and each completed challenge unlocks a curriculum-aligned knowledge card that reinforces the science behind the gameplay.
        </p>

        <div ref={phasesRef} style={{ position: "relative" }}>
          {/* vertical line */}
          <div style={{ position: "absolute", left: 40, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, #10b981, #34d399, #4fffb0)", opacity: 0.3 }} />

          {[
            {
              num: "0", numBg: "rgba(16,185,129,0.12)", numBorder: "rgba(16,185,129,0.3)", numColor: "#10b981",
              title: "Enter the Cell", time: "~15 sec",
              desc: 'Students start outside a massive bioluminescent cell floating in deep space. A brief intro orients them: "This cell is dying. It needs your help." The 360° AI-generated skybox creates an alien microscopic world. Students familiarize themselves with movement controls (WASD + mouse, or VR controllers) before diving in.',
              learn: "Key concept: Orientation and spatial awareness — students build a mental model of the cell's interior layout before interacting with organelles.",
              mechanic: "🎮 Mechanic: intro screen + \"Begin Voyage\" button → phase advance",
            },
            {
              num: "1", numBg: "rgba(255,200,80,0.12)", numBorder: "rgba(255,200,80,0.3)", numColor: "#ffc850",
              title: "Find the Mitochondria", time: "~30 sec", points: "+100 pts",
              desc: "The cell interior is dim. Students must locate and click the Mitochondria among the floating organelles. A glowing teal ring highlights the target. Clicking the correct organelle triggers a knowledge card about mitochondrial structure and ATP production. Wrong clicks are ignored — no penalty, just guidance.",
              learn: "Key concept: Mitochondria are the cell's power plants — their double-membrane structure with cristae folds maximizes ATP synthase surface area.",
              mechanic: "🎮 Mechanic: click-to-identify → +100 points → knowledge card overlay",
              knowledgeCard: "The double-membraned powerhouse. Cristae folds maximize surface area for ATP synthase — more folds = more ATP. (AP Bio: Inner membrane = electron transport chain site. IB HL: B2.2.4)",
            },
            {
              num: "2", numBg: "rgba(255,128,80,0.12)", numBorder: "rgba(255,128,80,0.3)", numColor: "#ff8050",
              title: "Feed the Cell — Cellular Respiration", time: "~45 sec", points: "+150 pts (+50 speed bonus)",
              desc: "A glowing glucose molecule appears near the Mitochondria. Students must grab and drag the glucose into the Mitochondria's entry zone. On success, a spectacular ATP burst animation fires — 36 blue ATP spheres radiate outward while 6 gray CO₂ molecules float upward. Complete it in under 10 seconds for a 50-point speed bonus.",
              learn: "Key concept: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36 ATP. Three stages: Glycolysis (cytoplasm) → Krebs Cycle (matrix) → Electron Transport Chain (inner membrane).",
              mechanic: "🎮 Mechanic: grab-and-drag into snap zone → ATP particle burst + CO₂ float animation → speed bonus timer",
              knowledgeCard: "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36 ATP. Common misconception: carbon atoms leave as CO₂ you breathe out — mass is conserved. (AP Bio / IB)",
            },
            {
              num: "3", numBg: "rgba(255,128,128,0.12)", numBorder: "rgba(255,128,128,0.3)", numColor: "#ff8080",
              title: "Clean the Cell — Lysosome Recycling", time: "~60 sec", points: "+100 pts per protein (300 total)",
              desc: "Three damaged protein spheres float in the cytoplasm. Students must grab each one and drag it into the Lysosome. Each successful delivery triggers a green particle burst and +100 points. A progress counter (0/3, 1/3, 2/3, 3/3) tracks completion. After all three are delivered, a knowledge card explains lysosomal enzyme function at pH 4.5.",
              learn: "Key concept: Lysosomes contain 50+ hydrolytic enzymes at pH 4.5. If ruptured, cytoplasm's higher pH neutralizes enzymes — a safety mechanism. Waste is broken into reusable monomers.",
              mechanic: "🎮 Mechanic: multi-target drag (3 items) → progress counter → green particle burst per delivery",
              knowledgeCard: "Contains 50+ hydrolytic enzymes at pH 4.5. Lysosome dysfunction → Tay-Sachs disease. (IB / AP Bio: connects to autophagy pathway)",
            },
            {
              num: "4", numBg: "rgba(79,255,176,0.12)", numBorder: "rgba(79,255,176,0.3)", numColor: "#4fffb0",
              title: "Build a Protein — The Secretory Pathway", time: "~60 sec", points: "+100 pts per step (200 total)",
              desc: "This is the most complex challenge — a two-step transport chain. Step 1: A polypeptide chain model appears. Students drag it into the Endoplasmic Reticulum for folding and glycosylation. Step 2: A processed protein sphere emerges from the ER. Students drag it to the Golgi Apparatus for sorting and packaging. Each step awards 100 points and the instruction text updates dynamically. A vesicle animation plays after completion.",
              learn: "Key concept: Ribosome → Rough ER (folding + glycosylation) → Golgi (sorting + packaging) → Vesicle → Cell Membrane. Order is essential — each station modifies the protein.",
              mechanic: "🎮 Mechanic: 2-step sequential drag chain with dynamic instruction updates → vesicle budding animation",
              knowledgeCard: "Protein pathway: Ribosome → Rough ER → Golgi → Vesicle → Membrane. AP Bio FRQ target: Golgi cis face receives from ER, trans face ships to membrane.",
            },
            {
              num: "5", numBg: "rgba(168,156,255,0.12)", numBorder: "rgba(168,156,255,0.3)", numColor: "#a89cff",
              title: "Mission Complete — Cell Restored", time: "~20 sec", points: "Final score display",
              desc: "All organelles pulse with renewed energy. A celebration screen appears with confetti animation and the student's final score (out of 750+ possible points). The scoring breakdown rewards both accuracy and speed. Students can review the 4 knowledge cards they earned — each aligned to AP Biology and IB curriculum standards. A \"Play Again\" button lets them retry for a higher score.",
              learn: "Outcome: Students leave with a coherent mental model of organelle function — not just names, but roles, mechanisms, and exam-relevant details.",
              mechanic: "🎮 Mechanic: confetti celebration + score reveal + knowledge card review + replay button",
            },
          ].map((phase) => (
            <div key={phase.num} className="phase-item" style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 32, marginBottom: 40 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: phase.numBg, border: `2px solid ${phase.numBorder}`, color: phase.numColor, fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, position: "relative", zIndex: 1 }}>
                {phase.num}
              </div>
              <div className="phase-card-hover" style={{ background: "#0c1829", border: "1px solid rgba(100,180,255,0.12)", borderRadius: 16, padding: "28px 32px", transition: "border-color 0.3s, transform 0.3s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <span className="syne" style={{ fontSize: 18, fontWeight: 700 }}>{phase.title}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 100, padding: "4px 12px", border: "1px solid rgba(16,185,129,0.2)" }}>{phase.time}</span>
                    {(phase as any).points && <span style={{ fontSize: 12, fontWeight: 600, color: "#ffc850", background: "rgba(255,200,80,0.1)", borderRadius: 100, padding: "4px 12px", border: "1px solid rgba(255,200,80,0.2)" }}>{(phase as any).points}</span>}
                  </div>
                </div>
                <p style={{ fontSize: 15, color: "#7a90b8", lineHeight: 1.65, marginBottom: 16 }}>{phase.desc}</p>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(79,255,176,0.06)", border: "1px solid rgba(79,255,176,0.15)", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: "#4fffb0", marginBottom: 10 }}>
                  <span style={{ flexShrink: 0 }}>💡</span>
                  <span><strong>{ }</strong>{phase.learn}</span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(123,109,255,0.12)", border: "1px solid rgba(123,109,255,0.25)", borderRadius: 6, padding: "5px 10px", fontSize: 13, color: "#a89cff" }}>
                  {phase.mechanic}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border: "none", borderTop: "1px solid rgba(100,180,255,0.12)", margin: "0 48px" }} />

      {/* LEARNING OUTCOMES */}
      <section style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#10b981", marginBottom: 16 }}>What Students Learn</p>
        <h2 className="syne" style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.02em" }}>Four concepts. Zero memorization.</h2>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#7a90b8", maxWidth: 600, marginBottom: 64 }}>Each interaction is designed so the action itself teaches the concept — no passive reading required.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {[
            { icon: "⚡", iconBg: "rgba(255,200,80,0.1)", title: "Mitochondria & ATP", desc: "Double-membrane structure with cristae folds maximizing ATP synthase surface area — learned by clicking to identify, then feeding glucose to trigger a 36-ATP burst animation." },
            { icon: "🔥", iconBg: "rgba(255,128,80,0.1)", title: "Cellular Respiration", desc: "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36 ATP — experienced by dragging glucose into the mitochondria and watching ATP radiate outward while CO₂ floats away. Speed bonus rewards quick thinking." },
            { icon: "♻️", iconBg: "rgba(255,128,128,0.1)", title: "Lysosome Function", desc: "Contains 50+ hydrolytic enzymes at pH 4.5. Understood by physically collecting 3 damaged proteins and delivering them for enzymatic digestion. Progress tracking reinforces completion." },
            { icon: "📬", iconBg: "rgba(79,255,176,0.1)", title: "Endomembrane System / Secretory Pathway", desc: "ER → Golgi → Vesicle → Membrane — internalized by running a 2-step delivery chain where each station visibly transforms the protein. Dynamic instructions guide each step." },
          ].map(({ icon, iconBg, title, desc }) => (
            <div key={title} className="outcome-card" style={{ background: "#0c1829", border: "1px solid rgba(100,180,255,0.12)", borderRadius: 16, padding: 28, transition: "border-color 0.3s, transform 0.3s" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: iconBg, marginBottom: 16 }}>{icon}</div>
              <div className="syne" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>
              <p style={{ fontSize: 14, color: "#7a90b8", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border: "none", borderTop: "1px solid rgba(100,180,255,0.12)", margin: "0 48px" }} />

      {/* SCORING & KNOWLEDGE SYSTEM */}
      <section style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#10b981", marginBottom: 16 }}>Scoring & Knowledge System</p>
        <h2 className="syne" style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.02em" }}>Gamification meets curriculum</h2>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#7a90b8", maxWidth: 600, marginBottom: 64 }}>Points and knowledge cards create a measurable feedback loop — students know instantly when they've mastered a concept.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {[
            { icon: "⭐", iconBg: "rgba(255,200,80,0.1)", title: "Point System", desc: "Every interaction earns points — 100 for identification, 150 for respiration (plus 50 speed bonus), 100 per protein cleanup, and 100 per transport step. Final scores reach 750+ for top performers." },
            { icon: "💡", iconBg: "rgba(79,255,176,0.1)", title: "Knowledge Cards", desc: "After each phase, curriculum-aligned knowledge cards reinforce the science. Content maps to AP Biology standards and IB HL topics with exam-relevant details and common misconceptions." },
            { icon: "⚡", iconBg: "rgba(255,128,80,0.1)", title: "Speed Bonuses", desc: "Phase 2 rewards quick thinkers with a 50-point speed bonus for completing cellular respiration in under 10 seconds — adding urgency without sacrificing understanding." },
            { icon: "📊", iconBg: "rgba(168,156,255,0.1)", title: "Progress Tracking", desc: "Visual phase dots, score counters, and step-by-step instructions keep students oriented. Multi-step phases show completion progress (1/3, 2/3, 3/3) for immediate feedback." },
          ].map(({ icon, iconBg, title, desc }) => (
            <div key={title} className="outcome-card" style={{ background: "#0c1829", border: "1px solid rgba(100,180,255,0.12)", borderRadius: 16, padding: 28, transition: "border-color 0.3s, transform 0.3s" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: iconBg, marginBottom: 16 }}>{icon}</div>
              <div className="syne" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>
              <p style={{ fontSize: 14, color: "#7a90b8", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border: "none", borderTop: "1px solid rgba(100,180,255,0.12)", margin: "0 48px" }} />

      {/* DESIGN PRINCIPLES */}
      <section style={{ padding: "100px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#10b981", marginBottom: 16 }}>Design Rationale</p>
        <h2 className="syne" style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.02em" }}>Why this works in a classroom</h2>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#7a90b8", maxWidth: 600, marginBottom: 64 }}>Every design choice traces back to learning science principles — not just what looks cool in VR.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {[
            { num: "01", title: "Narrative-driven motivation", desc: '"Save the cell" gives students a goal and a sense of urgency. Motivation precedes learning — students are far more focused when they have agency over an outcome.' },
            { num: "02", title: "Action-concept binding with scoring", desc: "Every mechanic encodes a concept AND earns points. The scoring system isn't decoration — it creates a measurable feedback loop. Students know instantly if they've completed a task, and speed bonuses add healthy urgency. Knowledge cards close the loop by connecting the action to exam-relevant content." },
            { num: "03", title: "Progressive complexity", desc: "Phase 1 starts with simple click-to-identify. Phase 2 introduces single drag-and-drop. Phase 3 scales to multi-target collection (3 items). Phase 4 culminates in a sequential 2-step transport chain. Each phase builds on the previous mechanic while adding cognitive complexity." },
            { num: "04", title: "Built on BioQuest's framework", desc: "The whole game maps to JSON config: scenes, assets, trigger zones, narration sequences. A teacher can generate this entire experience from a single prompt — no 3D expertise needed." },
          ].map(({ num, title, desc }) => (
            <div key={num} className="principle-card" style={{ background: "#0c1829", border: "1px solid rgba(100,180,255,0.12)", borderRadius: 16, padding: "28px 32px", display: "flex", gap: 20, alignItems: "flex-start", transition: "border-color 0.3s" }}>
              <div className="syne" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, opacity: 0.15, flexShrink: 0, color: "#10b981" }}>{num}</div>
              <div>
                <div className="syne" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>
                <p style={{ fontSize: 14, color: "#7a90b8", lineHeight: 1.65 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "100px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(16,185,129,0.07), transparent 70%)" }} />
        <h2 className="syne" style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 20, position: "relative", zIndex: 1 }}>
          Build your own<br />biology game.
        </h2>
        <p style={{ fontSize: 18, color: "#7a90b8", maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.65, position: "relative", zIndex: 1 }}>
          Describe a lesson goal. BioQuest handles the rest — assets, interactions, and VR delivery — in minutes.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", position: "relative", zIndex: 1 }}>
          <Link href="/environment-design" style={{ background: "#10b981", color: "#050d1a", padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
            Start Creating Free
          </Link>
          <Link href="/voyage" style={{ background: "transparent", border: "1px solid rgba(100,180,255,0.12)", color: "#e8f0ff", padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 500, textDecoration: "none" }}>
            Launch Experience →
          </Link>
        </div>
      </div>
    </div>
  );
}

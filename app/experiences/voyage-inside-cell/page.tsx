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
            A 4-minute immersive VR biology game where students become cellular doctors — repairing organelles and learning cell biology by doing.
          </p>

          <div style={{ display: "flex", gap: 32, marginBottom: 48, animation: "fadeUp 0.6s 0.3s ease both" }}>
            {[["4 min", "Play Time"], ["5", "Phases"], ["4", "Concepts Taught"], ["90%", "Engagement Lift"]].map(([num, label]) => (
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
          A sick cell.<br />One student-doctor. Four missions.
        </h2>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#7a90b8", maxWidth: 600, marginBottom: 64 }}>
          The cell is in crisis — mitochondria have gone dark, waste is piling up, and protein delivery has halted. Students are shrunk and injected into the cell with a mission: restore each organelle to bring the cell back to life.
        </p>

        <div ref={phasesRef} style={{ position: "relative" }}>
          {/* vertical line */}
          <div style={{ position: "absolute", left: 40, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, #10b981, #34d399, #4fffb0)", opacity: 0.3 }} />

          {[
            {
              num: "1", numBg: "rgba(16,185,129,0.12)", numBorder: "rgba(16,185,129,0.3)", numColor: "#10b981",
              title: "Enter the Cell", time: "~30 sec",
              desc: 'Students start outside a massive cell — an alien, glowing structure. A voice guides them: "This cell is dying. It needs your help. Step through the membrane." Students physically walk through the phospholipid bilayer with a full crossing animation.',
              learn: "Key concept: The cell membrane is a selective barrier — controlling what enters and exits the cell.",
              mechanic: "🎮 Mechanic: walk-through portal trigger",
            },
            {
              num: "2", numBg: "rgba(255,200,80,0.12)", numBorder: "rgba(255,200,80,0.3)", numColor: "#ffc850",
              title: "Restart the Mitochondria — Energy Crisis", time: "~60 sec",
              desc: "The cell interior is dark — no ATP, no energy. Students spot the dimmed mitochondria and must drag floating glucose molecules into the organelle's entry point. As each glucose molecule enters, the mitochondria lights up and the cell brightens.",
              learn: "Key concept: Mitochondria are the cell's power plants — converting glucose into ATP (cellular energy).",
              mechanic: "🎮 Mechanic: grab-and-drop into trigger zone → glow animation",
            },
            {
              num: "3", numBg: "rgba(255,100,100,0.12)", numBorder: "rgba(255,100,100,0.3)", numColor: "#ff8080",
              title: "Clear the Lysosomes — Waste Crisis", time: "~45 sec",
              desc: "Broken proteins and cellular debris float everywhere. Students grab waste particles and throw them into lysosomes, triggering a satisfying dissolve animation. The environment visibly clears as each load is processed.",
              learn: "Key concept: Lysosomes are the cell's recycling centers — breaking down waste and worn-out components.",
              mechanic: "🎮 Mechanic: throw/toss gesture → dissolve particle effect",
            },
            {
              num: "4", numBg: "rgba(79,255,176,0.12)", numBorder: "rgba(79,255,176,0.3)", numColor: "#4fffb0",
              title: "Deliver the Proteins — Transport Chain", time: "~60 sec",
              desc: "Ribosomes on the ER are producing protein balls — but delivery has stopped. Students run the supply chain: pick up proteins from the ER, carry them to the Golgi apparatus (which packages them into vesicles), then deliver the vesicles to the cell membrane.",
              learn: "Key concept: Ribosomes make proteins → ER processes → Golgi packages → vesicles deliver. The full secretory pathway.",
              mechanic: "🎮 Mechanic: multi-step carry chain — 3 sequential drop zones",
            },
            {
              num: "5", numBg: "rgba(123,109,255,0.12)", numBorder: "rgba(123,109,255,0.3)", numColor: "#a89cff",
              title: "Cell Restored — Summary", time: "~30 sec",
              desc: "All organelles light up and hum with activity. The camera pulls back to reveal the whole cell, now pulsing with health. A recap screen surfaces 4 knowledge cards — one per concept learned — reinforcing what happened and why it matters.",
              learn: "Outcome: Students leave with a coherent mental model of organelle function — not just names, but roles.",
              mechanic: "🎮 Mechanic: cinematic camera pull + knowledge card overlay",
            },
          ].map((phase) => (
            <div key={phase.num} className="phase-item" style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 32, marginBottom: 40 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: phase.numBg, border: `2px solid ${phase.numBorder}`, color: phase.numColor, fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, position: "relative", zIndex: 1 }}>
                {phase.num}
              </div>
              <div className="phase-card-hover" style={{ background: "#0c1829", border: "1px solid rgba(100,180,255,0.12)", borderRadius: 16, padding: "28px 32px", transition: "border-color 0.3s, transform 0.3s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="syne" style={{ fontSize: 18, fontWeight: 700 }}>{phase.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 100, padding: "4px 12px", border: "1px solid rgba(16,185,129,0.2)" }}>{phase.time}</span>
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
            { icon: "🧱", iconBg: "rgba(16,185,129,0.1)", title: "Cell Membrane", desc: "Selective permeability — experienced by physically passing through the bilayer with a sensory crossing effect." },
            { icon: "⚡", iconBg: "rgba(255,200,80,0.1)", title: "Mitochondria & ATP", desc: "Glucose-to-energy conversion — learned by dragging glucose in and watching light return to the cell." },
            { icon: "♻️", iconBg: "rgba(255,100,100,0.1)", title: "Lysosome Function", desc: "Cellular waste recycling — understood by physically collecting and depositing debris for enzymatic digestion." },
            { icon: "📬", iconBg: "rgba(79,255,176,0.1)", title: "Protein Secretory Pathway", desc: "ER → Golgi → vesicle → membrane — internalized by physically running the delivery chain step-by-step." },
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
            { num: "02", title: "Action-concept binding", desc: "Every mechanic encodes a concept. Dragging glucose into mitochondria IS the lesson — not a decoration on top of it. Students learn through procedural memory, not declarative recall." },
            { num: "03", title: "Progressive complexity", desc: "Simple drag-drop in Phase 2 scaffolds into a 3-step transport chain in Phase 4. Cognitive load is managed deliberately — students build schema before tackling complexity." },
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

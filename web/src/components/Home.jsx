import React, { useRef, useEffect } from "react";
import { Upload, Brain, Sparkles, Play } from "lucide-react";

/**
 * Home
 * - Petit sommaire en haut (ancres internes)
 * - 3 sections : What is an exoplanet? / How ExoML works / Why it matters
 * - Visuels animés (canvas) identiques à ta première version
 *
 * Props:
 * - onReplayStory?: () => void   (optionnel — affiche un bouton pour relancer la Story)
 */
export default function Home({ onReplayStory }) {
  return (
    <div className="max-w-6xl mx-auto px-5 py-8 space-y-10">
      {/* Intro / Sommaire */}
      <div className="bg-black/45 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Welcome to ExoML</h2>
        <p className="text-gray-300 text-sm mb-5">
          A quick tour of what exoplanets are, how ExoML works, and why it matters.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="#what"
            className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
          >
            1. What is an exoplanet?
          </a>
          <a
            href="#how"
            className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
          >
            2. How ExoML works
          </a>
          <a
            href="#why"
            className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
          >
            3. Why it matters
          </a>
        </div>
      </div>

      {/* What is an exoplanet? */}
      <section
        id="what"
        className="grid md:grid-cols-2 gap-6 items-center bg-gradient-to-br from-[#1a1033]/70 to-[#2a124b]/60 border border-white/10 rounded-2xl p-6"
      >
        <div className="pr-1">
          <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
            What is an exoplanet?
          </h3>
          <p className="text-gray-200 text-[15px] leading-7">
            An <span className="font-semibold">exoplanet</span> is a planet that orbits a star
            outside our Solar System. We often detect them when they pass in front of their star,
            causing a tiny, regular dip in brightness — the <em>transit method</em>.
          </p>
        </div>

        {/* visuel : étoile + planète + courbe (version d’origine) */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <div className="aspect-[5/3] w-full rounded-xl border border-white/10 overflow-hidden bg-gradient-to-br from-purple-900/25 to-pink-900/15">
            <ExoMiniScene />
          </div>
        </div>
      </section>

      {/* How ExoML works */}
      <section
        id="how"
        className="bg-gradient-to-br from-[#1a1033]/75 to-[#2a124b]/70 border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-6 leading-tight">
          How ExoML works
        </h3>
        <p className="text-gray-300 text-[15px] leading-7 mb-5">
          From raw light curves to predictions — in three simple steps.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { t: "Upload", d: "Load NASA light-curves (or use samples).", i: Upload },
            { t: "Train", d: "Learn patterns from planets vs false signals.", i: Brain },
            { t: "Classify", d: "Predict planet, candidate, or false alarm.", i: Sparkles },
          ].map(({ t, d, i: I }) => (
            <div
              key={t}
              className="rounded-xl border border-white/10 p-4 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <I className="w-5 h-5 text-purple-300" />
                <h4 className="text-white font-semibold">{t}</h4>
              </div>
              <p className="text-gray-300 text-sm">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why it matters */}
      <section
        id="why"
        className="grid md:grid-cols-2 gap-6 items-center bg-gradient-to-br from-[#1a1033]/70 to-[#2a124b]/60 border border-white/10 rounded-2xl p-6"
      >
        <div className="order-2 md:order-1">
          <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
            Why it matters
          </h3>
          <p className="text-gray-200 text-[15px] leading-7 mb-5">
            Each planet we find tells us more about how solar systems form — and where life might
            exist beyond Earth. ExoML speeds up discovery so scientists can focus on the most
            promising signals.
          </p>

          {typeof onReplayStory === "function" && (
            <button
              onClick={onReplayStory}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm text-white"
            >
              <Play className="w-4 h-4" />
              Replay Story
            </button>
          )}
        </div>

        {/* visuel : grille à points + halo + ligne */}
        <div className="order-1 md:order-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <div className="aspect-[5/3] w-full rounded-xl border border-white/10 overflow-hidden bg-gradient-to-br from-indigo-950/40 to-purple-900/30">
            <WhyMiniScene />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========= Visuel 1 : étoile + planète en transit + courbe de flux ========= */
function ExoMiniScene() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    let W, H, dpr;
    const STAR_R = 78;
    const PLANET_R = 10;
    const SPEED = 1.4;
    const LINE_Y_RATIO = 0.82;

    function fit() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      W = Math.max(360, Math.floor(rect.width));
      H = Math.max(220, Math.floor(rect.height));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    const onR = () => fit();
    window.addEventListener("resize", onR);

    const cx = Math.floor(W * 0.73);
    const cy = Math.floor(H * 0.46);

    let px = Math.floor(W * 0.18);
    const py = cy;

    // courbe de flux
    const lineY = Math.floor(H * LINE_Y_RATIO);
    const samples = new Array(W).fill(lineY);
    let t = 0;
    const rippleAmp = 1.6;

    let raf;
    function draw() {
      ctx.clearRect(0, 0, W, H);

      // fond doux
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "rgba(16, 10, 40, 0.45)");
      bg.addColorStop(1, "rgba(10, 8, 30, 0.55)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // glow étoile
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, STAR_R * 2.4);
      g1.addColorStop(0, "rgba(255, 246, 210, 0.08)");
      g1.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(cx, cy, STAR_R * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // coeur étoile
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, STAR_R);
      g2.addColorStop(0, "rgba(255, 248, 220, 0.95)");
      g2.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(cx, cy, STAR_R, 0, Math.PI * 2);
      ctx.fill();

      // planète
      const pg = ctx.createRadialGradient(
        px - PLANET_R * 0.4,
        py - PLANET_R * 0.5,
        0,
        px,
        py,
        PLANET_R
      );
      pg.addColorStop(0, "#2b3445");
      pg.addColorStop(1, "#0c1019");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, PLANET_R, 0, Math.PI * 2);
      ctx.fill();

      // Dip de flux si recouvrement
      const dist = Math.hypot(px - cx, py - cy);
      const overlap = dist < STAR_R + PLANET_R;
      const dip = overlap ? 6 : 0;

      // ligne de flux animée
      samples.shift();
      const n = Math.sin(t * 0.14) * rippleAmp;
      samples.push(lineY + n + dip);

      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const y = samples[x] || lineY;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // déplacement planète
      px += SPEED;
      if (px > Math.floor(W * 0.86)) px = Math.floor(W * 0.14);

      t += 1;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onR);
    };
  }, []);

  return <canvas ref={ref} className="w-full h-full block" />;
}

/* ========= Visuel 2 : grille de points + halo central + ligne subtile ========= */
function WhyMiniScene() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    let W, H, dpr;

    function fit() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      W = Math.max(360, Math.floor(rect.width));
      H = Math.max(220, Math.floor(rect.height));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    const onR = () => fit();
    window.addEventListener("resize", onR);

    const cx = () => canvas.width / (2 * (Math.min(window.devicePixelRatio || 1, 2)));
    const cy = () => canvas.height / (2 * (Math.min(window.devicePixelRatio || 1, 2)));

    let t = 0;
    let raf;
    function draw() {
      const _cx = cx();
      const _cy = cy();
      const _W = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
      const _H = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

      ctx.clearRect(0, 0, _W, _H);

      // fond dégradé sombre
      const bg = ctx.createLinearGradient(0, 0, 0, _H);
      bg.addColorStop(0, "rgba(8, 6, 30, 0.85)");
      bg.addColorStop(1, "rgba(12, 9, 40, 0.95)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, _W, _H);

      // grille de points
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      const step = 18;
      for (let y = step; y < _H - step; y += step) {
        for (let x = step; x < _W - step; x += step) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // halo central
      const radius = Math.min(_W, _H) * 0.45;
      const g = ctx.createRadialGradient(_cx, _cy, 0, _cx, _cy, radius);
      g.addColorStop(0, "rgba(200,180,255,0.16)");
      g.addColorStop(1, "rgba(200,180,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(_cx, _cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // ligne subtile (horizon) animée
      const mid = Math.floor(_H * 0.78);
      const wobble = Math.sin(t * 0.02) * 0.8;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(32, mid + wobble);
      ctx.lineTo(_W - 32, mid - wobble);
      ctx.stroke();

      t += 1;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onR);
    };
  }, []);

  return <canvas ref={ref} className="w-full h-full block" />;
}

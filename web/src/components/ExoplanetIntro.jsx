import React, { useRef, useEffect, useState } from "react";

/**
 * ExoplanetIntro
 * Phases: "intro" → "text1" → "curve" → (Next)
 *         "upload" → "train" → "classify" → "promptLab" → "lab" → "why"
 */
export default function ExoplanetIntro({ onContinue }) {
  const canvasRef = useRef(null);

  // Phases & flags
  const [phase, setPhase] = useState("intro");
  const [uploadVisible, setUploadVisible] = useState(false);
  const [curveLeaving, setCurveLeaving] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [labEntering, setLabEntering] = useState(false);
  const [trainVisible, setTrainVisible] = useState(false);
  const [classifyVisible, setClassifyVisible] = useState(false);

  // WHY sequence
  const [whyVisible, setWhyVisible] = useState(false); // fade flag
  const [whyStep, setWhyStep] = useState(0);           // 0=off, 1=title, 2=paragraph, 3=CTA
  const [bgScale, setBgScale] = useState(1.06);        // gentle zoom-out
  const zoomRafRef = useRef(null);

  // timeouts cleaner
  const timeouts = useRef([]);
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  };
  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
      if (zoomRafRef.current) cancelAnimationFrame(zoomRafRef.current);
    };
  }, []);

  // live transit depth (0..TRANSIT_DIMMING) for synced curve
  const transitDepthRef = useRef(0);
  const getTransitDepth = () => transitDepthRef.current;

  // ====== BACKGROUND (stars + star + orbiting planet) ======
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    // Config
    const STAR_COUNT = 550;
    const STAR_SIZE_MIN = 0.25;
    const STAR_SIZE_MAX = 1.05;
    const STAR_SPEED_MIN = 0.006;
    const STAR_SPEED_MAX = 0.02;

    const STAR_RADIUS = 140;
    const STAR_GLOW = STAR_RADIUS * 2;

    const PLANET_RADIUS = 28;
    const TRACK_OFFSET_Y = 0;
    const TRANSIT_DIMMING = 0.10;
    const TRANSIT_SPEED = 0.9;
    const TRACK_MARGIN = STAR_RADIUS + 220;

    let width = 0, height = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const cx = width / 2;
    const cy = height / 2;
    const trackY = cy + TRACK_OFFSET_Y;

    // starfield
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: STAR_SIZE_MIN + Math.random() * (STAR_SIZE_MAX - STAR_SIZE_MIN),
      vy: STAR_SPEED_MIN + Math.random() * (STAR_SPEED_MAX - STAR_SPEED_MIN),
      tw: Math.random() * Math.PI * 2,
    }));

    // planet
    let planetX = cx - TRACK_MARGIN;
    let starPulse = 0, pulseDir = 1;

    function drawStars() {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      for (const s of stars) {
        s.tw += 0.02;
        const alpha = 0.55 + 0.45 * Math.abs(Math.sin(s.tw));
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

        s.y += s.vy;
        if (s.y > height) s.y = -4;
      }
      ctx.globalAlpha = 1;
    }

    function drawStarGlow() {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, STAR_GLOW);
      g.addColorStop(0, `rgba(255, 255, 210, ${0.18 + 0.02 * starPulse})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, STAR_GLOW, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawStarCore() {
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, STAR_RADIUS);
      core.addColorStop(0, `rgba(255, 255, 200, ${0.92 + 0.06 * starPulse})`);
      core.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, STAR_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawPlanet(x, y) {
      const grad = ctx.createRadialGradient(
        x - PLANET_RADIUS * 0.5,
        y - PLANET_RADIUS * 0.6,
        PLANET_RADIUS * 0.2,
        x, y, PLANET_RADIUS
      );
      grad.addColorStop(0, "#334155");
      grad.addColorStop(1, "#0b0f17");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, PLANET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawTransitDimming(x, y) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const overlap = dist < STAR_RADIUS + PLANET_RADIUS;
      if (overlap) {
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = `rgba(0,0,0,${TRANSIT_DIMMING})`;
        ctx.beginPath();
        ctx.arc(cx, cy, STAR_RADIUS * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
    }

    function tick() {
      drawStars();
      drawStarGlow();

      const dx = planetX - cx;
      const dy = trackY - cy;
      const Rsum = STAR_RADIUS + PLANET_RADIUS;
      const dist = Math.hypot(dx, dy);

      const overlapping = dist < Rsum;
      if (!overlapping) {
        drawPlanet(planetX, trackY);
        drawStarCore();
      } else {
        drawStarCore();
        drawPlanet(planetX, trackY);
        drawTransitDimming(planetX, trackY);
      }

      starPulse += 0.02 * pulseDir;
      if (starPulse > 1 || starPulse < 0) pulseDir *= -1;

      planetX += TRANSIT_SPEED;
      if (planetX > cx + TRACK_MARGIN) {
        planetX = cx - TRACK_MARGIN;
      }

      // smooth transit depth factor (0..1), scaled to TRANSIT_DIMMING
      const factor = Math.max(0, Math.min(1, 1 - dist / Rsum));
      transitDepthRef.current = factor * TRANSIT_DIMMING;

      requestAnimationFrame(tick);
    }
    tick();

    return () => window.removeEventListener("resize", resize);
  }, []);

  // Auto step: 5s after "text1" -> "curve"
  useEffect(() => {
    if (phase !== "text1") return;
    const t = later(() => setPhase("curve"), 5000);
    return () => clearTimeout(t);
  }, [phase]);

  // WHY SEQUENCE runner
  useEffect(() => {
    if (phase !== "why") return;

    // Step 1: show title
    setWhyStep(1);
    setWhyVisible(true);

    // background zoom-out over ~10s
    const start = performance.now();
    const DURATION = 10000; // ms
    const from = 1.06, to = 1.00;

    function tick(now) {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
      setBgScale(from + (to - from) * eased);
      if (t < 1) zoomRafRef.current = requestAnimationFrame(tick);
    }
    zoomRafRef.current = requestAnimationFrame(tick);

    // After 5s → fade title out, then paragraph in
    const t1 = later(() => {
      setWhyVisible(false);
      later(() => {
        setWhyStep(2);
        setWhyVisible(true);
      }, 650);
    }, 5000);

    // After 5s (title) + 7s (paragraph) → CTA
    const t2 = later(() => {
      setWhyVisible(false);
      later(() => {
        setWhyStep(3);
        setWhyVisible(true);
      }, 650);
    }, 5000 + 7000);

    return () => {
      if (zoomRafRef.current) cancelAnimationFrame(zoomRafRef.current);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  return (
    <section className="fixed inset-0 w-screen h-screen overflow-hidden bg-black text-white z-[9999]">
      {/* background wrapper with gentle zoom-out during WHY */}
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${bgScale})`,
          transformOrigin: "center center",
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* PHASE 1 — Intro card */}
      <div
        className={`absolute bottom-8 right-8 max-w-md transition-opacity duration-700 ${
          phase === "intro" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 p-6 shadow-xl">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-400 bg-clip-text text-transparent">
            What is an Exoplanet?
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-6 leading-relaxed">
            An exoplanet is a planet that orbits a star outside our Solar System.
            Most are detected when they pass in front of their star, dimming its
            light — a phenomenon called the <em>transit method</em>. NASA’s
            telescopes, like Kepler and TESS, have discovered thousands of them.
          </p>
          <button
            onClick={() => setPhase("text1")}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-lg font-semibold transform transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-400/50 hover:scale-105"
          >
            Continue
          </button>
        </div>
      </div>

      {/* PHASE 2 — Context text #1 */}
      <div
        className={`absolute bottom-8 right-8 max-w-md transition-opacity duration-700 ${
          phase === "text1" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 p-6 shadow-xl">
          <p className="text-gray-200 text-xl leading-relaxed">
            Each dip in a star’s brightness may reveal a planet passing in front of it…
          </p>
        </div>
      </div>

      {/* PHASE 3 — Synced light curve + text + Next */}
      <div
        className={`absolute inset-x-0 bottom-8 flex flex-col items-center gap-4 transition-opacity duration-700
          ${phase === "curve" && !curveLeaving ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <p className="text-gray-200 text-lg md:text-xl bg-black/35 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
          This is what NASA’s TESS telescope observes.
        </p>

        <LightCurveCanvas getTransitDepth={getTransitDepth} />

        <button
          onClick={() => {
            // Clear pending timers (avoid double-chaining)
            timeouts.current.forEach(clearTimeout);
            timeouts.current = [];

            // 1) Fade out curve block
            setCurveLeaving(true);

            later(() => {
              // 2) Upload step in
              setPhase("upload");
              setCurveLeaving(false);
              setUploadVisible(true);

              // Upload visible ~7s
              later(() => {
                setUploadVisible(false);

                // 3) Train step
                later(() => {
                  setPhase("train");
                  setTrainVisible(true);

                  // Train ~8s
                  later(() => {
                    setTrainVisible(false);

                    // 4) Classify step
                    later(() => {
                      setPhase("classify");
                      setClassifyVisible(true);

                      // Classify ~8s
                      later(() => {
                        setClassifyVisible(false);

                        // 5) Prompt “Now, try…”
                        later(() => {
                          setPhase("promptLab");
                          setPromptVisible(true);

                          // prompt ~6s
                          later(() => {
                            setPromptVisible(false);

                            // 6) mini-lab
                            later(() => {
                              setPhase("lab");
                              setLabEntering(true);
                              later(() => setLabEntering(false), 700);
                            }, 600);
                          }, 6000);
                        }, 600);
                      }, 8000);
                    }, 600);
                  }, 8000);
                }, 600);
              }, 7000);
            }, 700);
          }}
          className="mt-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/15 text-sm"
        >
          Next
        </button>
      </div>

      {/* PHASE "UPLOAD" — CSV holographique + mini courbe */}
      <div
        className={`absolute inset-0 flex items-end md:items-center justify-end p-6 md:p-10 transition-opacity duration-700
          ${phase === "upload" ? (uploadVisible ? "opacity-100" : "opacity-0") : "opacity-0 pointer-events-none"}`}
      >
        <div className="w-full max-w-lg bg-black/45 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl">
          {/* .csv card */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-14 bg-white/10 rounded-md border border-white/20 flex items-center justify-center">
              <span className="text-xs text-white/80 font-semibold">.csv</span>
            </div>
            <div className="text-white/90">
              <p className="text-sm">NASA Open Data</p>
              <p className="text-xs text-white/60">Kepler / K2 / TESS light curves</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
            <UploadLightCurveCanvas />
          </div>

          <div className="mt-4">
            <p className="text-gray-100 text-base md:text-lg leading-relaxed">
              We start with real NASA data — light curves collected by space telescopes like TESS.
              <br />
              Each curve tells how a star’s brightness changes over time.
            </p>
          </div>
        </div>
      </div>

      {/* PHASE "TRAIN" — lignes qui apprennent (à gauche) */}
      <div
        className={`absolute inset-0 flex items-end md:items-center justify-start p-6 md:p-10 transition-opacity duration-700
          ${phase === "train" ? (trainVisible ? "opacity-100" : "opacity-0") : "opacity-0 pointer-events-none"}`}
      >
        <div className="w-full max-w-xl bg-black/45 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl md:text-2xl font-semibold mb-2">Train</h3>
          <p className="text-gray-100 text-base md:text-lg leading-relaxed mb-4">
            ExoML learns from thousands of these curves — comparing known planets and false signals —
            until it recognizes the tiny patterns that mean <span className="italic">“a planet is really there.”</span>
          </p>

          <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
            <TrainLinesCanvas />
          </div>
        </div>
      </div>

      {/* PHASE "CLASSIFY" — texte sur l’étoile + courbe + barres */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-1000
          ${phase === "classify" && classifyVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <p className="max-w-2xl text-lg md:text-2xl text-gray-100 bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl mb-10">
          Once trained, it can look at new signals and predict:<br />
          <span className="text-purple-300 font-semibold">
            Is this a planet, a false alarm, or something we’ve never seen before?
          </span>
        </p>

        <div className="flex flex-col items-center gap-6">
          {/* Courbe animée */}
          <ClassifySignalCanvas width={480} height={170} />

          {/* Barres de probabilité (démo) */}
          <div className="space-y-2 text-gray-200 text-sm md:text-base">
            <div className="flex items-center gap-2">
              <span className="w-28 text-purple-300">🟣 Planet</span>
              <div className="h-3 w-60 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-[1500ms] ease-out" style={{ width: "80%" }}></div>
              </div>
              <span>80%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 text-yellow-300">🟡 Candidate</span>
              <div className="h-3 w-60 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 transition-all duration-[1500ms] delay-500 ease-out" style={{ width: "15%" }}></div>
              </div>
              <span>15%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 text-red-400">🔴 False Alarm</span>
              <div className="h-3 w-60 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-[1500ms] delay-1000 ease-out" style={{ width: "5%" }}></div>
              </div>
              <span>5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE INTERMÉDIAIRE — Prompt "Now, try adjusting..." */}
      <div className="absolute inset-0 flex items-end md:items-center justify-center pointer-events-none">
        <div
          className={`transition-opacity duration-700 bg-black/35 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4
            ${phase === "promptLab" && promptVisible ? "opacity-100" : "opacity-0"}`}
        >
          <p className="text-gray-100 text-lg md:text-xl">
            Now, try adjusting the curve to see how ExoML interprets it.
          </p>
        </div>
      </div>

      {/* PHASE "LAB" — mini-lab */}
      <div
        className={`absolute inset-0 flex items-center justify-center p-4 md:p-8 transition-opacity duration-700
          ${phase === "lab" ? (labEntering ? "opacity-0" : "opacity-100") : "opacity-0 pointer-events-none"}`}
      >
        <HoloLab
          onNext={() => {
            // fade out lab then go to WHY
            setLabEntering(true);
            later(() => {
              setPhase("why");
              setLabEntering(false);
            }, 600);
          }}
        />
      </div>

      {/* PHASE "WHY" — title → paragraph → CTA */}
      <div
        className={`absolute inset-0 flex items-center justify-center text-center px-6 transition-opacity duration-700
          ${phase === "why" ? (whyVisible ? "opacity-100" : "opacity-0") : "opacity-0 pointer-events-none"}`}
      >
        {whyStep === 1 && (
          <h2 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-300 via-pink-300 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]">
            Why it matters?
          </h2>
        )}

        {whyStep === 2 && (
          <p className="max-w-3xl text-lg md:text-2xl text-gray-100 bg-black/35 backdrop-blur-md px-6 py-5 rounded-2xl border border-white/10">
            Each planet we find tells us more about where we came from — and where life might exist beyond Earth.
          </p>
        )}

        {whyStep === 3 && (
          <div className="flex flex-col items-center gap-6">
            <p className="max-w-2xl text-lg md:text-2xl text-gray-100 bg-black/35 backdrop-blur-md px-6 py-5 rounded-2xl border border-white/10">
              Ready to try it yourself with real data?
            </p>
            <button
              onClick={onContinue}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-lg font-semibold transform transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-400/50 hover:scale-105"
            >
              Start the real experiment
            </button>
          </div>
        )}
      </div>

      {/* Skip button — always visible */}
      <button
        onClick={onContinue}
        className="absolute top-6 right-6 z-[10000] px-5 py-2 bg-black/40 backdrop-blur-md border border-white/20 text-white/90 rounded-full text-sm font-medium hover:bg-white/10 hover:text-white transition-all duration-300"
      >
        Skip Intro →
      </button>
    </section>
  );
}

/* ---------- Canvas de la phase "curve", synchronisé avec la planète ---------- */
function LightCurveCanvas({ getTransitDepth }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");

    let W = 760, H = 220;
    const marginL = 40, marginR = 10, marginT = 20, marginB = 30;
    function fit() {
      const maxW = Math.min(760, Math.floor(window.innerWidth * 0.9));
      W = Math.max(320, maxW); H = 220;
      canvas.width = W; canvas.height = H;
    }
    fit();
    const onR = () => fit();
    window.addEventListener("resize", onR);

    let currentFlux = 1.0;
    const easing = 0.08;
    const rippleAmp = 0.008;
    let x = 0;
    const xMax = W - marginL - marginR;

    const pts = [];
    function toPixelY(flux) {
      return marginT + (1.2 - flux) * (H - marginT - marginB);
    }

    function drawAxes() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginL, H - marginB);
      ctx.lineTo(W - marginR, H - marginB);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(marginL, marginT);
      ctx.lineTo(marginL, H - marginB);
      ctx.stroke();

      ctx.fillStyle = "rgba(220,220,255,0.7)";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText("Time →", W - 70, H - 12);
      ctx.fillText("Flux", 8, 28);
    }

    let raf;
    function tick() {
      drawAxes();

      const targetFlux = 1 - (getTransitDepth?.() || 0);
      currentFlux += (targetFlux - currentFlux) * easing;

      const t = performance.now() * 0.003;
      const flux = currentFlux + Math.sin(t * 1.7) * rippleAmp;

      const px = 40 + x;
      const py = toPixelY(flux);
      pts.push({ x: px, y: py });
      if (pts.length > xMax) pts.shift();

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.shadowColor = "rgba(255,255,255,0.35)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      x += 2.2;
      if (x > xMax) {
        x = 0;
        pts.length = 0;
      }

      raf = requestAnimationFrame(tick);
    }

    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onR);
    };
  }, [getTransitDepth]);

  return (
    <canvas
      ref={ref}
      className="rounded-xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.06)] bg-black/30"
    />
  );
}

/* ------ Upload mini courbe (panneau Upload) ------ */
function UploadLightCurveCanvas() {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    let width = 0, height = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = 160;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const baseline = 1.0;
    const dipDepth = 0.04;
    const dipWidth = 0.12;
    const dipCenter = 0.5;

    let reveal = 0;
    let raf;

    function render() {
      ctx.clearRect(0, 0, width, height);

      // subtle grid
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = "#8ab5ff";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (i / 4) * (height - 1);
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // x axis
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.75);
      ctx.lineTo(width, height * 0.75);
      ctx.stroke();

      // curve
      ctx.strokeStyle = "rgba(160,200,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const yScale = height * 0.2;
      const yBase  = height * 0.5;
      const maxX = Math.max(2, Math.floor(width * reveal));

      for (let i = 0; i <= maxX; i++) {
        const t = i / Math.max(1, width);
        const dx = (t - dipCenter) / (dipWidth / 2);
        const transit = Math.exp(-dx * dx); // 0..1
        const flux = baseline - dipDepth * transit;

        const y = yBase - (flux - baseline) * yScale * 8;
        const x = i;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      reveal = Math.min(1, reveal + 0.02);
      raf = requestAnimationFrame(render);
    }
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "160px", display: "block" }}
    />
  );
}

/* ------ Train: trois courbes (2 rouges bruitées + 1 blanche) ------ */
function TrainLinesCanvas() {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    let W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = 200;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const centerY = H / 2;
    const margin = 30;
    const xMax = W - margin * 2;

    function canonicalFlux(x01) {
      const center = 0.5;
      const width = 0.09;
      const sigma = width / 2.3;
      const dip = Math.exp(-((x01 - center) ** 2) / (2 * sigma ** 2));
      const depth = 0.07;
      return 1 - depth * dip;
    }

    const lines = [
      { color: "rgba(255,100,100,0.9)", offsetY: -20, amp: 1.1, noise: 0.1, phase: Math.random() * 1000 },
      { color: "rgba(255,255,255,1.0)", offsetY: 0, amp: 1.0, noise: 0.02, phase: 0 },
      { color: "rgba(255,100,100,0.9)", offsetY: 20, amp: 0.9, noise: 0.12, phase: Math.random() * 2000 },
    ];

    const start = performance.now();
    const DURATION = 4000;

    function drawAxes() {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, centerY);
      ctx.lineTo(W - margin, centerY);
      ctx.stroke();
    }

    let raf;
    function render(now) {
      const t = Math.min(1, (now - start) / DURATION);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      ctx.clearRect(0, 0, W, H);
      drawAxes();

      for (const L of lines) {
        ctx.beginPath();
        for (let x = 0; x <= xMax; x++) {
          const x01 = x / xMax;
          let flux = canonicalFlux(x01);

          const ripple = 0.006 * Math.sin(x01 * 40 + now * 0.002 + L.phase);
          const noise =
            (Math.random() - 0.5) *
            (L.noise * (L.color.includes("255,100,100") ? 1 - ease * 0.8 : 0.2));

          flux += ripple + noise;

          const y = centerY - (flux - 1) * 100 + L.offsetY * (1 - ease * 0.5);
          if (x === 0) ctx.moveTo(margin + x, y);
          else ctx.lineTo(margin + x, y);
        }

        ctx.strokeStyle = L.color;
        ctx.lineWidth = L.color.includes("255,255,255") ? 2.3 : 1.5;
        ctx.shadowColor = L.color;
        ctx.shadowBlur = L.color.includes("255,255,255") ? 8 : 3;
        ctx.stroke();
      }

      // little glowing planet at end
      const px = W - margin - 15;
      const py = centerY - 3;
      const r = 6 + 2 * Math.sin(now * 0.004);
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
      g.addColorStop(0, "rgba(180,200,255,0.9)");
      g.addColorStop(1, "rgba(180,200,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r * 2, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(render);
    }

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} style={{ width: "100%", height: "200px", display: "block" }} />;
}

/* ------ Classify: courbe animée simple ------ */
function ClassifySignalCanvas({ width = 480, height = 170 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    let t = 0;
    let raf;

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // baseline
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      // animated signal
      ctx.strokeStyle = "rgba(200,200,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const y =
          H / 2 +
          Math.sin((x / W) * 8 * Math.PI + t) * 20 * (0.5 + 0.5 * Math.sin(t * 0.7));
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      t += 0.04;
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={ref}
      className="rounded-lg border border-white/10 bg-black/30 shadow-md"
      style={{ width, height }}
    />
  );
}

/* ------ Slider réutilisable ------ */
function Slider({ label, min, max, step, value, onChange }) {
  return (
    <div>
      <label className="text-sm text-gray-300 block mb-1">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-purple-500"
      />
    </div>
  );
}

/* ---------- MINI LAB (phase "lab") ---------- */
function HoloLab({ onNext }) {
  const [depth, setDepth] = useState(0.06);     // 0..0.2
  const [duration, setDuration] = useState(0.08); // 0.02..0.2
  const [noise, setNoise] = useState(0.02);     // 0..0.12

  const probs = (() => {
    const d = Math.min(0.2, Math.max(0, depth));
    const n = Math.min(0.12, Math.max(0, noise));
    const dur = Math.min(0.2, Math.max(0.02, duration));

    const durationFit = Math.exp(-Math.pow((dur - 0.08) / 0.04, 2)); // ~1 si proche de 0.08

    // scores bruts
    const planetScore   = (d / 0.2) * (1 - n / 0.12) * (0.6 + 0.4 * durationFit);
    const fpScore       = (n / 0.12) * (1 - d / 0.2) * 0.9;
    const candidateBase = 0.35 + 0.65 * ((0.5 + (d / 0.2) * 0.5) * (1 - Math.abs(dur - 0.08) / 0.12)) * (1 - n / 0.12);
    const candidateScore= Math.max(0.1, candidateBase);

    const sum = planetScore + fpScore + candidateScore || 1;
    return {
      Planet: planetScore / sum,
      Candidate: candidateScore / sum,
      "False Positive": fpScore / sum,
    };
  })();

  const comment = (() => {
    if (depth > 0.12 && noise < 0.03) return "Deeper transit with low noise → very likely a planet.";
    if (depth < 0.025 && noise > 0.05) return "Shallow dip with high noise → likely a false positive.";
    if (Math.abs(duration - 0.08) < 0.02) return "Transit duration looks consistent with a plausible orbit.";
    return "Adjust depth, duration, and noise to see how confidence changes.";
  })();

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl bg-black/45 backdrop-blur-md border border-white/10 p-6 md:p-8 shadow-2xl">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Now, try adjusting the curve to see how ExoML interprets it.</h3>
      </div>

      <div className="mb-6">
        <ControlledLightCurve depth={depth} duration={duration} noise={noise} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Slider
          label={`Transit Depth: ${(depth * 100).toFixed(1)}%`}
          min={0}
          max={0.2}
          step={0.005}
          value={depth}
          onChange={setDepth}
        />
        <Slider
          label={`Transit Duration: ${(duration * 100).toFixed(1)}% of window`}
          min={0.02}
          max={0.2}
          step={0.005}
          value={duration}
          onChange={setDuration}
        />
        <Slider
          label={`Signal Noise: ${(noise * 100).toFixed(1)}%`}
          min={0}
          max={0.12}
          step={0.002}
          value={noise}
          onChange={setNoise}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-2">
          {Object.entries(probs).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{k}</span>
                <span className="text-white font-medium">{(v * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                  style={{ width: `${v * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm text-purple-200/90">{comment}</p>
          <div className="pt-4 flex justify-end">
            <button
              onClick={onNext}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------ Courbe contrôlée (mini-lab) ------ */
function ControlledLightCurve({ depth, duration, noise }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let W = 760, H = 240;
    const marginL = 40, marginR = 10, marginT = 22, marginB = 34;

    function fit() {
      const maxW = Math.min(760, Math.floor(window.innerWidth * 0.9));
      W = Math.max(320, maxW); H = 240;
      canvas.width = W; canvas.height = H;
    }
    fit();
    const onR = () => fit();
    window.addEventListener("resize", onR);

    const pts = [];
    let x = 0;
    const xMax = W - marginL - marginR;

    function drawAxes() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginL, H - marginB);
      ctx.lineTo(W - marginR, H - marginB);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(marginL, marginT);
      ctx.lineTo(marginL, H - marginB);
      ctx.stroke();

      ctx.fillStyle = "rgba(220,220,255,0.7)";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText("Time →", W - 70, H - 12);
      ctx.fillText("Flux", 8, 28);
    }

    // transit params in timeline (0..1)
    const center = 0.5;
    const halfWidth = duration / 2;

    function fluxAt(x01, tms) {
      const inTransit = Math.abs(x01 - center) <= halfWidth;
      let dip = 0;
      if (inTransit) {
        const sigma = halfWidth / 2.2 || 0.01;
        dip = depth * Math.exp(-((x01 - center) ** 2) / (2 * sigma ** 2));
      }
      const ripple = 0.006 * Math.sin(x01 * 20 + tms * 0.0017);
      const noiseTerm = (noise > 0 ? (Math.random() - 0.5) * noise : 0);
      return 1 - dip + ripple + noiseTerm;
    }

    function toPixelY(flux) {
      return marginT + (1.2 - flux) * (H - marginT - marginB);
    }

    let raf;
    function tick() {
      drawAxes();

      const tms = performance.now();

      const px = marginL + x;
      const x01 = (px - marginL) / (W - marginL - marginR);
      const f = Math.max(0.8, Math.min(1.2, fluxAt(x01, tms)));
      const py = toPixelY(f);

      pts.push({ x: px, y: py });
      if (pts.length > xMax) pts.shift();

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.shadowColor = "rgba(255,255,255,0.35)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      x += 2.2;
      if (x > xMax) {
        x = 0;
        pts.length = 0;
      }

      raf = requestAnimationFrame(tick);
    }

    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onR);
    };
  }, [depth, duration, noise]);

  return (
    <canvas
      ref={ref}
      className="rounded-xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.06)] bg-black/30 w-full"
    />
  );
}

import { useRef, useEffect } from "react";

/**
 * Full-screen starfield + mouse-triggered shooting stars.
 * Mount this once (e.g., in App.jsx). The canvas stays behind all content.
 */
export default function StarfieldOverlay(props) {
  // ---- props with defaults
  const {
    starCount = 180,                 // number of background stars
    driftSpeed = 0.03,               // slow drift speed of stars
    twinkleSpeed = 0.015,            // twinkle phase increment
    density = 0.9,                   // spawn rate for shooting stars while moving (0.6–1.2 good)
    colorCore = "rgba(255,255,255,0.85)",   // bright core of shooting star
    colorTrail = "rgba(168,85,247,0.85)",   // trail color (violet)
  } = props;

  // ---- refs
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const starsRef = useRef([]);
  const shootersRef = useRef([]);
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });

    let width = 0, height = 0, dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // populate stars once
      if (!starsRef.current.length) {
        for (let i = 0; i < starCount; i++) {
          starsRef.current.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.2 + 0.4,
            twinkle: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    function spawnShooter(x, y) {
      const speed = 4 + Math.random() * 3; // diagonal
      const life = 700 + Math.random() * 800; // ms
      const size = 1 + Math.random() * 1.2;
      shootersRef.current.push({
        x, y,
        vx: speed * 0.9,     // right
        vy: speed * 0.45,    // down
        size,
        life,
        maxLife: life,
      });
      if (shootersRef.current.length > 200) shootersRef.current.shift();
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const now = performance.now();
      if (now - lastSpawnRef.current > (16 / density)) {
        spawnShooter(
          x + (Math.random() - 0.5) * 24,
          y + (Math.random() - 0.5) * 24
        );
        lastSpawnRef.current = now;
      }
    }

    function drawBackground() {
      // night gradient (deep blue -> black)
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#0b0d2a");
      g.addColorStop(1, "#000000");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }

    function drawStars() {
      for (const s of starsRef.current) {
        s.twinkle += twinkleSpeed;
        const tw = 0.5 + 0.5 * Math.sin(s.twinkle);
        ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * tw})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();

        // gentle drift
        s.y += driftSpeed;
        s.x += driftSpeed * 0.3;

        if (s.y > height + 2) { s.y = -2; s.x = Math.random() * width; }
        if (s.x > width + 2)  { s.x = -2; s.y = Math.random() * height; }
      }
    }

    function drawShooter(sh) {
      const a = Math.max(0, sh.life / sh.maxLife);

      // trail gradient
      const grad = ctx.createLinearGradient(
        sh.x, sh.y, sh.x - sh.vx * 8, sh.y - sh.vy * 8
      );
      grad.addColorStop(0, colorTrail.replace("0.85", (0.2 + 0.65 * a).toFixed(2)));
      grad.addColorStop(1, "rgba(255,255,255,0)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = sh.size;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x - sh.vx * 8, sh.y - sh.vy * 8);
      ctx.stroke();

      // bright core
      ctx.fillStyle = colorCore.replace("0.85", (0.3 + 0.55 * a).toFixed(2));
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, sh.size, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawShooters(dt) {
      for (let i = shootersRef.current.length - 1; i >= 0; i--) {
        const sh = shootersRef.current[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life -= dt;

        drawShooter(sh);

        if (
          sh.life <= 0 ||
          sh.x < -50 || sh.y < -50 ||
          sh.x > width + 50 || sh.y > height + 50
        ) {
          shootersRef.current.splice(i, 1);
        }
      }
    }

    // init
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(50, now - last);
      last = now;

      drawBackground();
      drawStars();
      drawShooters(dt);

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    // cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [starCount, driftSpeed, twinkleSpeed, density, colorCore, colorTrail]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[1]"
    />
  );
}

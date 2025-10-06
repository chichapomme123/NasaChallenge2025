// src/components/Classification.jsx
import React, { useMemo, useRef, useState } from "react";
import { Sparkles, Download, AlertCircle, Info } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/** Allowed ranges (saisie guidée) */
const RANGES = {
  period:   { min: 0.05, max: 2000, label: "Orbital Period (days)" },      // très court -> très long
  duration: { min: 0.2,  max: 40,   label: "Transit Duration (hours)" },   // typiquement ~0.5–20 h
  depth:    { min: 0.00001, max: 0.1, label: "Transit Depth (fraction)" }, // 10 ppm à 10% (fraction)
  radius:   { min: 0.2,  max: 30,   label: "Planet Radius (R⊕)" },         // 0.2–30 R⊕
  snr:      { min: 0,    max: 100,  label: "Signal-to-Noise Ratio (SNR)"}, // 0–100 (MES/SNR)
  rstar:    { min: 0.05, max: 20,   label: "Stellar Radius (R☉)" },        // 0.05–20 R☉
};

/* Small, accessible info tooltip shown next to labels */
function InfoHint({ text }) {
  return (
    <span className="group relative inline-flex items-center ml-2 align-middle">
      <button type="button" className="outline-none" aria-label="More info">
        <Info className="w-4 h-4 text-purple-300/80 group-hover:text-purple-200 transition-colors cursor-help" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-5 top-1 z-10 w-64 rounded-md border border-white/10 bg-[rgba(10,10,22,.95)] px-3 py-2 text-xs leading-relaxed text-gray-200 shadow-xl opacity-0 translate-y-1
                   group-hover:opacity-100 group-hover:translate-y-0
                   group-focus-within:opacity-100 group-focus-within:translate-y-0
                   transition-all"
      >
        {text}
      </span>
    </span>
  );
}

/* Reusable numeric field with range helper */
function NumberField({ label, hint, placeholder, value, onChange, range }) {
  const invalid =
    value !== "" &&
    (Number.isNaN(Number(value)) ||
      Number(value) < range.min ||
      Number(value) > range.max);

  return (
    <div className="mb-4">
      <label className="text-sm text-gray-300 block mb-2">
        <span className="align-middle">{label}</span>
        {hint && <InfoHint text={hint} />}
      </label>
      <input
        type="number"
        step="any"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-white/10 text-white rounded-lg px-4 py-2 border ${
          invalid ? "border-red-400" : "border-purple-500/30"
        } placeholder:text-gray-400`}
      />
      <div className={`text-xs mt-1 ${invalid ? "text-red-300" : "text-gray-500"}`}>
        Allowed range: {range.min} – {range.max}
      </div>
    </div>
  );
}

export default function Classification({ modelReady = true }) {
  // Inputs
  const [period, setPeriod]     = useState("");
  const [duration, setDuration] = useState("");
  const [depth, setDepth]       = useState("");
  const [radius, setRadius]     = useState("");
  const [snr, setSnr]           = useState("");
  const [rstar, setRstar]       = useState("");

  // Result + export state
  const [result, setResult] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null); // {type:'ok'|'err', msg:string}
  const resultRef = useRef(null);

  // Validation
  const valuesValid = useMemo(() => {
    const checks = [
      check(period, RANGES.period),
      check(duration, RANGES.duration),
      check(depth, RANGES.depth),
      check(radius, RANGES.radius),
      check(snr, RANGES.snr),
      check(rstar, RANGES.rstar),
    ];
    return checks.every(Boolean);
  }, [period, duration, depth, radius, snr, rstar]);

  function check(val, { min, max }) {
    if (val === "" || val === null) return false;
    const n = Number(val);
    if (Number.isNaN(n)) return false;
    return n >= min && n <= max;
  }

  /* ---------------- Prediction that varies with inputs ---------------- */
  function predictFromInputs(inp) {
    const P   = Number(inp.period);     // days
    const Dur = Number(inp.duration);   // hours
    const D   = Number(inp.depth);      // fraction
    const R   = Number(inp.radius);     // R_earth
    const SNR = Number(inp.snr);
    const RS  = Number(inp.rstar);      // R_sun

    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const near = (x, c, w) => clamp01(1 - Math.abs(x - c) / w);
    const durationDays = Dur / 24;
    const duty = P > 0 ? durationDays / P : 0;
    const dutyGood = near(duty, 0.03, 0.03);

    const R_earth_to_sun = 0.0091577;
    const Rp_over_Rs = (R * R_earth_to_sun) / Math.max(RS, 0.05);
    const depthExpected = clamp01(Rp_over_Rs * Rp_over_Rs);
    const depthConsistency = near(D, depthExpected, Math.max(0.001, depthExpected * 0.6));

    const depthStrength = clamp01(D / 0.02);
    const snrNorm = clamp01(SNR / 50);

    const ultraShort = P < 0.5 ? 1 : 0;
    const ultraLong  = P > 500 ? 1 : 0;
    const moderatePeriod = P > 0.8 && P < 120 ? 1 : 0;

    const zConfirmed =
      1.1 * depthConsistency +
      0.9 * snrNorm +
      0.5 * dutyGood +
      0.35 * moderatePeriod +
      0.25 * depthStrength -
      0.35 * ultraShort -
      0.2  * ultraLong;

    const zFalse =
      0.8 * (1 - snrNorm) +
      0.55 * (1 - depthConsistency) +
      0.35 * ultraShort +
      0.3  * ultraLong -
      0.25 * moderatePeriod;

    const zCandidate =
      0.35 +
      0.45 * near(depthStrength, 0.4, 0.25) +
      0.35 * near(snrNorm, 0.35, 0.25) +
      0.25 * (dutyGood < 0.35 ? 1 : 0);

    const probs = softmax({
      "Confirmed Planet": zConfirmed,
      "False Positive":   zFalse,
      Candidate:          zCandidate,
    });

    let label = "Confirmed Planet";
    let best = -1;
    Object.entries(probs).forEach(([k, v]) => {
      if (v > best) { best = v; label = k; }
    });

    const explanation = buildExplanation(
      { P, Dur, D, R, SNR, RS, duty, depthExpected },
      { depthConsistency, snrNorm, dutyGood, depthStrength, moderatePeriod, ultraShort, ultraLong },
      label
    );

    return { label, probs, explanation };
  }

  const softmax = (obj) => {
    const keys = Object.keys(obj);
    const mx = Math.max(...keys.map((k) => obj[k]));
    const exps = keys.map((k) => Math.exp(obj[k] - mx));
    const sum = exps.reduce((a, b) => a + b, 0);
    const out = {};
    keys.forEach((k, i) => (out[k] = exps[i] / sum));
    return out;
  };

  function buildExplanation(inp, feats, label) {
    const bullets = [];
    const pushIf = (cond, text) => cond && bullets.push(text);

    if (label === "Confirmed Planet") {
      pushIf(feats.depthConsistency > 0.55, "Transit depth matches the expected (Rp/R★)² geometry.");
      pushIf(feats.snrNorm > 0.5, "High SNR strengthens confidence in a real transit.");
      pushIf(feats.dutyGood > 0.5, "Transit duration relative to period (duty cycle) is physically plausible.");
      pushIf(feats.moderatePeriod === 1, "Orbital period is within a well-observed range.");
      if (!bullets.length) bullets.push("Overall feature balance matches typical confirmed exoplanets.");
    } else if (label === "False Positive") {
      pushIf(feats.snrNorm < 0.35, "Low SNR — signal likely dominated by noise or systematics.");
      pushIf(feats.depthConsistency < 0.35, "Depth inconsistent with (Rp/R★)² for the given sizes.");
      pushIf(feats.ultraShort === 1, "Ultra-short orbital period is prone to aliases or systematics.");
      pushIf(feats.ultraLong === 1, "Very long period yields weak coverage and uncertain events.");
      if (!bullets.length) bullets.push("Indicators lean toward spurious or non-planetary origins.");
    } else {
      pushIf(feats.depthStrength > 0.35 && feats.snrNorm >= 0.35 && feats.snrNorm < 0.65,
        "Intermediate depth and SNR lead to an ambiguous classification.");
      pushIf(feats.dutyGood < 0.45, "Transit duration vs. period is atypical.");
      if (!bullets.length) bullets.push("Mixed indicators; features do not decisively favour one class.");
    }

    return `Why this result?\n• ${bullets.join("\n• ")}`;
  }

  function classify() {
    if (!modelReady) {
      setResult(null);
      setExportStatus({ type: "err", msg: "Please train the model first (Training tab)." });
      return;
    }
    if (!valuesValid) {
      setResult(null);
      setExportStatus({ type: "err", msg: "Please enter valid values within the allowed ranges." });
      return;
    }

    const { label, probs, explanation } = predictFromInputs({
      period, duration, depth, radius, snr, rstar,
    });

    const topProb = probs[label] || 0;
    setResult({
      prediction: label,
      confidence: topProb,
      probabilities: probs,
      explanation,
    });
    setExportStatus(null);
  }

  function resetForm() {
    setPeriod("");
    setDuration("");
    setDepth("");
    setRadius("");
    setSnr("");
    setRstar("");
    setResult(null);
    setExportStatus(null);
  }

  async function handleExportPDF() {
    if (!result) {
      setExportStatus({ type: "err", msg: "Nothing to export yet. Please classify first." });
      return;
    }
    try {
      setExportStatus(null);
      setExporting(true);

      const node = resultRef.current;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: null });
      const img = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const marginX = 12;
      let y = 14;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("ExoML – Classification Report", marginX, y);
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, marginX, y);
      y += 8;

      pdf.setFont("helvetica", "bold");
      pdf.text("Inputs", marginX, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      const inputs = [
        [RANGES.period.label,   String(period)],
        [RANGES.duration.label, String(duration)],
        [RANGES.depth.label,    String(depth)],
        [RANGES.radius.label,   String(radius)],
        [RANGES.snr.label,      String(snr)],
        [RANGES.rstar.label,    String(rstar)],
      ];
      inputs.forEach(([k, v]) => { pdf.text(`• ${k}: ${v}`, marginX, y); y += 5; });
      y += 2;

      pdf.setFont("helvetica", "bold");
      pdf.text("Prediction", marginX, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Class: ${result.prediction}  —  Confidence: ${(result.confidence * 100).toFixed(1)}%`,
        marginX, y
      );
      y += 8;

      const maxImgWidth = pageWidth - marginX * 2;
      const imgRatio = canvas.height / canvas.width;
      const imgHeight = maxImgWidth * imgRatio;
      if (y + imgHeight > 290) { pdf.addPage(); y = 14; }
      pdf.addImage(img, "PNG", marginX, y, maxImgWidth, imgHeight);

      const filename = `ExoML_Result_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.pdf`;
      pdf.save(filename);
      setExportStatus({ type: "ok", msg: "PDF generated successfully." });
    } catch (err) {
      console.error(err);
      setExportStatus({ type: "err", msg: "Export failed. Please try again." });
    } finally {
      setExporting(false);
    }
  }

  /* ------------------------------ RENDER ------------------------------ */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: form */}
      <div className="bg-black/40 backdrop-blur-md rounded-lg p-6 border border-purple-500/30">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-purple-300" />
          <h2 className="text-xl font-bold text-white">Classify a New Planet</h2>
        </div>

        {!modelReady && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-300 font-medium">Untrained Model</p>
              <p className="text-xs text-gray-400 mt-1">
                Please train the model first in the “Training” tab.
              </p>
            </div>
          </div>
        )}

        {/* The 6 inputs with info hints */}
        <NumberField
          label={RANGES.period.label}
          hint="Time the planet takes to complete one orbit around its star (in days)."
          placeholder="e.g., 12.4"
          value={period}
          onChange={setPeriod}
          range={RANGES.period}
        />
        <NumberField
          label={RANGES.duration.label}
          hint="Total time the star appears dimmed during a single transit (in hours)."
          placeholder="e.g., 3.5"
          value={duration}
          onChange={setDuration}
          range={RANGES.duration}
        />
        <NumberField
          label={RANGES.depth.label}
          hint="Fractional dimming of the star’s light during transit (e.g., 0.01 = 1%)."
          placeholder="e.g., 0.008"
          value={depth}
          onChange={setDepth}
          range={RANGES.depth}
        />
        <NumberField
          label={RANGES.radius.label}
          hint="Estimated planetary radius relative to Earth’s radius (R⊕)."
          placeholder="e.g., 2.5"
          value={radius}
          onChange={setRadius}
          range={RANGES.radius}
        />
        <NumberField
          label={RANGES.snr.label}
          hint="Signal-to-Noise Ratio (higher = clearer detection)."
          placeholder="e.g., 18"
          value={snr}
          onChange={setSnr}
          range={RANGES.snr}
        />
        <NumberField
          label={RANGES.rstar.label}
          hint="Host star’s radius in solar radii (R☉)."
          placeholder="e.g., 0.9"
          value={rstar}
          onChange={setRstar}
          range={RANGES.rstar}
        />

        <div className="pt-2 flex gap-3">
          <button
            onClick={classify}
            disabled={!modelReady}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Classify
          </button>

          <button
            onClick={resetForm}
            className="flex-1 bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* RIGHT: result */}
      <div
        ref={resultRef}
        className="bg-black/40 backdrop-blur-md rounded-lg p-6 border border-purple-500/30 flex flex-col"
      >
        <h2 className="text-xl font-bold text-white mb-4">Classification Result</h2>

        {!result ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
            <Sparkles className="w-16 h-16 text-gray-600 mb-4" />
            <p>Enter the parameters and click "Classify"</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* prediction */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-400 mb-2">Prediction</p>
              <p className="text-3xl font-bold text-white mb-1">{result.prediction}</p>
              <p className="text-purple-300">
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </p>
            </div>

            {/* probabilities */}
            <div className="bg-purple-500/10 rounded-lg p-4 mt-4">
              <p className="text-sm font-medium text-white mb-3">Class Probabilities</p>
              {Object.entries(result.probabilities).map(([cls, prob]) => (
                <div key={cls} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{cls}</span>
                    <span className="text-white font-medium">{(prob * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{ width: `${(prob * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* explanation */}
            <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-purple-300 mt-0.5" />
                <p className="text-sm text-gray-300 whitespace-pre-line">
                  {result.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* footer actions + toasts */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={exporting || !result}
            className="flex-1 bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export Result"}
          </button>
        </div>

        {exportStatus && (
          <div
            className={`mt-3 rounded-lg p-3 text-sm border ${
              exportStatus.type === "ok"
                ? "bg-green-500/10 border-green-500/30 text-green-200"
                : "bg-red-500/10 border-red-500/30 text-red-200"
            }`}
          >
            {exportStatus.msg}
          </div>
        )}
      </div>
    </div>
  );
}

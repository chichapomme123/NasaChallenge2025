import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as ReTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// ---- Couleurs (harmonie UI) ----
const CANDIDATE = "#22d3ee";      // cyan-400
const CONFIRMED = "#c084fc";       // purple-400
const FALSE_POS = "#fb7185";       // rose-400

// ---- Petits composants UI ----
function MetricCard({ label, value, barColor, barPct }) {
  return (
    <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-purple-500/30">
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <p className="text-4xl font-bold text-white mb-2">{value}</p>
      <div className="w-full bg-gray-700/60 rounded-full h-2">
        <div
          className={`h-full rounded-full`}
          style={{
            width: `${barPct}%`,
            background:
              barColor ??
              "linear-gradient(90deg, rgba(34,197,94,1) 0%, rgba(16,185,129,1) 100%)",
          }}
        />
      </div>
    </div>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="bg-[rgba(3,3,14,.8)] rounded-xl p-6 border border-white/10">
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <p className="text-4xl font-bold text-white">{value ?? "—"}</p>
    </div>
  );
}

// ---- Matrice de confusion (couleurs boostées) ----
function ConfusionMatrix({ matrix, classes }) {
  return (
    <div className="bg-[rgba(8,8,24,.9)] rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4">Confusion Matrix</h3>

      <div className="grid grid-cols-4 gap-3 text-sm text-gray-300">
        <div></div>
        {classes.map((c) => (
          <div key={`h-${c}`} className="text-center opacity-80">
            {c}
          </div>
        ))}

        {matrix.map((row, i) => (
          <React.Fragment key={`r-${i}`}>
            <div className="flex items-center">{classes[i]}</div>
            {row.map((val, j) => {
              const isDiag = i === j;

              const classBox = isDiag
                ? // diagonale brillante (vert émeraude)
               "bg-gradient-to-br from-emerald-900/70 to-green-700/40 border-green-400/30"
                : // hors-diag plus punchy, rose/violet
                "bg-gradient-to-br from-fuchsia-950/50 to-rose-800/30 border-rose-400/20";

              const textClass = isDiag ? "text-emerald-200" : "text-pink-200";

              return (
                <div
                  key={`c-${i}-${j}`}
                  className={`p-6 rounded-xl text-center font-bold ${textClass} border ${classBox} shadow-[inset_0_0_40px_rgba(255,255,255,0.03)]`}
                >
                  {val}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---- Graphique Donut (classes prédites) ----
function ClassDonut({ data }) {
  const chartData = useMemo(
    () => [
      { name: "Candidate", value: data.candidate, color: CANDIDATE },
      { name: "Confirmed Planet", value: data.confirmed, color: CONFIRMED },
      { name: "False Positive", value: data.falsePositive, color: FALSE_POS },
    ],
    [data]
  );

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4">
        Predicted Class Distribution
      </h3>
      <div className="w-full h-[320px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="85%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
            >
              {chartData.map((d, idx) => (
                <Cell key={idx} fill={d.color} stroke="transparent" />
              ))}
            </Pie>

            <ReTooltip
              // <<< Tooltip sombre + texte blanc >>>
              contentStyle={{
                background: "#0b0b13",
                border: "1px solid rgba(139,92,246,0.6)",
                borderRadius: "10px",
                color: "#fff",
                boxShadow: "0 8px 30px rgba(0,0,0,.45)",
              }}
              labelStyle={{ color: "#e5e7eb" }}
              itemStyle={{ color: "#fff" }}
              formatter={(v, n) => [`${v}`, n]}
            />
            <Legend
              wrapperStyle={{ color: "#e5e7eb" }}
              formatter={(v) => <span style={{ color: "#e5e7eb" }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- Courbes Accuracy / F1 dans le temps ----
function TrainingLines({ points }) {
  const data = points.map((p, i) => ({
    name: `T${i + 1}`,
    acc: Math.round(p.acc * 1000) / 10, // %
    f1: Math.round(p.f1 * 1000) / 10,   // %
  }));

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4">
        Accuracy &amp; F1 over Trainings
      </h3>
      <div className="w-full h-[320px]">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradF1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb7185" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#b3b3cc" />
            <YAxis
              stroke="#b3b3cc"
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <ReTooltip
              contentStyle={{
                background: "#0b0b13",
                border: "1px solid rgba(139,92,246,0.6)",
                borderRadius: "10px",
                color: "#fff",
              }}
              formatter={(v) => [`${v}%`, ""]} // une seule fois le %
            />
            <Area
              type="monotone"
              dataKey="acc"
              name="Accuracy"
              stroke="#a78bfa"
              fill="url(#gradAcc)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="f1"
              name="F1-Score"
              stroke="#fb7185"
              fill="url(#gradF1)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================================

/**
 * Stats
 * Props (optionnels, valeurs par défaut fournies pour la démo) :
 * - datasetSize: number
 * - lastTrainingTime: string (ex: "2.3s")
 * - confusion: 3x3 numbers
 * - predictedDistribution: { confirmed, candidate, falsePositive }
 * - history: [{acc: 0.94, f1:0.941}, ...]  // entre parenthèses: on calculera plus tard depuis les vraies runs
 */
export default function Stats({
  datasetSize = 7592,
  lastTrainingTime = null,
  confusion = [
    [450, 12, 8],
    [15, 380, 5],
    [10, 8, 420],
  ],
  predictedDistribution = { confirmed: 520, candidate: 600, falsePositive: 200 },
  history = [
    { acc: 0.94, f1: 0.94 },
    { acc: 0.953, f1: 0.944 },
    { acc: 0.965, f1: 0.948 },
    { acc: 0.968, f1: 0.951 },
  ],
}) {
  const classes = ["Confirmed Planet", "False Positive", "Candidate"];

  // (Calculs réels plus tard) — pour l’instant valeurs fixées pour l’UI
  const accuracy = 0.947;
  const precision = 0.932;
  const recall = 0.951;
  const f1 = 0.941;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Accuracy"
          value={`${(accuracy * 100).toFixed(1)}%`}
          barColor="linear-gradient(90deg,#34d399 0%,#10b981 100%)"
          barPct={accuracy * 100}
        />
        <MetricCard
          label="Precision"
          value={`${(precision * 100).toFixed(1)}%`}
          barColor="linear-gradient(90deg,#60a5fa 0%,#06b6d4 100%)"
          barPct={precision * 100}
        />
        <MetricCard
          label="Recall"
          value={`${(recall * 100).toFixed(1)}%`}
          barColor="linear-gradient(90deg,#c084fc 0%,#ec4899 100%)"
          barPct={recall * 100}
        />
      </div>

      {/* Matrix + Details (même rangée) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        <div className="lg:col-span-1 min-w-0">
          <ConfusionMatrix matrix={confusion} classes={classes} />
        </div>

        {/* RIGHT: compact Details */}
<div className="lg:col-span-1 min-w-0 self-start">
  <div className="bg-[rgba(3,3,14,.85)] rounded-xl p-4 border border-white/10 h-fit">
    <p className="text-base font-semibold text-white mb-3">Details</p>

    {/* tiles plus compactes */}
    <div className="space-y-3">
      <div className="rounded-lg bg-black/30 border border-white/10 px-4 py-3">
        <p className="text-xs text-gray-400 mb-1">F1-Score</p>
        <p className="text-2xl font-bold text-white">{(f1 * 100).toFixed(1)}%</p>
      </div>

      <div className="rounded-lg bg-black/30 border border-white/10 px-4 py-3">
        <p className="text-xs text-gray-400 mb-1">Dataset Size</p>
        <p className="text-2xl font-bold text-white">
          {datasetSize.toLocaleString()}
        </p>
      </div>

      <div className="rounded-lg bg-black/30 border border-white/10 px-4 py-4">
        <p className="text-xs text-gray-400 mb-1">Last Training Time</p>
        <p className="text-lg font-semibold text-white">
          {lastTrainingTime ?? "—"}
        </p>
      </div>
    </div>
  </div>
</div>
      </div>  
      {/* Graphiques en dessous */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClassDonut data={predictedDistribution} />
        <TrainingLines points={history} />
      </div>
    </div>
  );
}

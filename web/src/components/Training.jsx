// src/components/Training.jsx
import React, { useRef, useState } from "react";
import {
  Database,
  Upload as UploadIcon,
  Info,
  Brain,
  Play,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

/* ------------------------------ Small UI card ------------------------------ */
function InfoTile({ label, value }) {
  return (
    <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

/* ---------------------- REQUIRED FIELDS (final list) ----------------------- */
const REQUIRED_FIELDS = [
  {
    id: "orbital_period",
    label: "Orbital Period (days)",
    synonyms: [
      "orbital_period","period","p","pl_orbper","koi_period","orbper","orb per","orbital period","per","t0_p"
    ],
  },
  {
    id: "transit_duration",
    label: "Transit Duration (days)",
    synonyms: [
      "transit_duration","duration","koi_duration","tdur","transitdur","tr_dur","tr_dur_days","tdur_d"
    ],
  },
  {
    id: "transit_depth",
    label: "Transit Depth (fraction)",
    synonyms: [
      "transit_depth","depth","koi_depth","pl_trandep","tran_depth","depth_frac","transit depth"
    ],
  },
  {
    id: "planet_radius",
    label: "Planet Radius (R⊕)",
    synonyms: [
      "planet_radius","pl_rade","pl_radj","koi_prad","radius","prad","rp","planet radius"
    ],
  },
  {
    id: "snr",
    label: "Signal-to-Noise Ratio (SNR)",
    synonyms: [
      "snr","signal_to_noise","signal-to-noise","koi_snr","tce_snr","mes","snratio"
    ],
  },
  {
    id: "stellar_radius",
    label: "Stellar Radius (R☉)",
    synonyms: [
      "stellar_radius","st_rad","radius_star","rstar","host_radius","star_radius","rs"
    ],
  },
  {
    id: "target",
    label: "Label / Target",
    synonyms: [
      "target","label","class","tfopwg_disp","koi_disposition","disposition","y","outcome","status"
    ],
  },
];

/* ----------------------------- CSV utilities ------------------------------ */

/** Détection robuste des headers & délimiteur */
function detectHeaders(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  let headerLine = null;
  let headerIndex = -1;
  let delim = ",";

  const tryDelims = [",", ";", "\t", "|"];

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || "").trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    // choisir le séparateur qui produit le plus de colonnes
    let best = { d: ",", count: 1 };
    for (const d of tryDelims) {
      const c = line.split(d).length;
      if (c > best.count) best = { d, count: c };
    }
    if (best.count >= 2) {
      headerLine = line;
      headerIndex = i;
      delim = best.d;
      break;
    }
  }

  if (headerLine == null) {
    return { headers: [], delim: ",", headerIndex: -1, lines };
  }

  const headers = headerLine
    .split(delim)
    .map((h) => String(h).replace(/^"+|"+$/g, "").trim())
    .filter(Boolean);

  return { headers, delim, headerIndex, lines };
}

/** Automapping basé sur synonyms */
function buildAutoMapping(availableColumns) {
  const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, "_");
  const normalizedCols = availableColumns.map((c) => ({ raw: c, norm: norm(c) }));

  const mapping = {}; // { fieldId: rawColumnName }

  for (const field of REQUIRED_FIELDS) {
    const wanted = new Set(field.synonyms.map(norm));
    // match exact
    const exact = normalizedCols.find((c) => wanted.has(c.norm));
    if (exact) {
      mapping[field.id] = exact.raw;
      continue;
    }
    // match "contient"
    const fuzzy = normalizedCols.find(
      (c) =>
        [...wanted].some((w) => c.norm.includes(w)) ||
        [...wanted].some((w) => w.includes(c.norm))
    );
    if (fuzzy) mapping[field.id] = fuzzy.raw;
  }
  return mapping;
}

/** Compte lignes data, features, et classes si target est mappée */
function computeDatasetStats({ lines, headerIndex, headers, delim, mapping }) {
  // Samples: lignes non vides & non commentées APRÈS la ligne d’headers
  let samples = 0;
  const start = headerIndex >= 0 ? headerIndex + 1 : 0;

  // Features = nb de colonnes d’headers
  const features = headers.length;

  // Classes: valeurs distinctes dans la colonne Target si mappée
  let classesSet = null;
  let targetIdx = -1;
  if (mapping && mapping.target) {
    targetIdx = headers.findIndex((h) => h === mapping.target);
    if (targetIdx >= 0) classesSet = new Set();
  }

  // itération limitée si fichier énorme (mais généralement ok)
  for (let i = start; i < lines.length; i++) {
    const raw = (lines[i] || "").trim();
    if (!raw) continue;
    if (raw.startsWith("#")) continue;

    // split naïf (OK pour nos cas)
    const cols = raw.split(delim);
    // si première "ligne data" est identique aux headers (certains CSV les répètent), on saute
    if (i === start) {
      const maybeHeaderAgain = cols.map((c) => String(c).replace(/^"+|"+$/g, "").trim());
      const same =
        maybeHeaderAgain.length === headers.length &&
        maybeHeaderAgain.every((c, idx) => c === headers[idx]);
      if (same) continue;
    }

    samples++;

    if (classesSet) {
      const v = (cols[targetIdx] ?? "").replace(/^"+|"+$/g, "").trim();
      if (v) classesSet.add(v);
    }
  }

  const classes = classesSet ? classesSet.size : null;
  return { samples, features, classes };
}

/* -------------------------------- Component -------------------------------- */

export default function Training({
  onUploadSuccess,      // optional callback
  onTrainingComplete,   // optional callback
}) {
  // Upload & parsing state
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState("");        // ⬅️ on garde le texte CSV
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Headers / mapping
  const [headers, setHeaders] = useState([]);
  const [delim, setDelim] = useState(",");
  const [headerIndex, setHeaderIndex] = useState(-1);
  const [columnMap, setColumnMap] = useState({});
  const [needMapping, setNeedMapping] = useState(false);
  const [datasetReady, setDatasetReady] = useState(false);

  // Current dataset (dyn)
  const [dsRows, setDsRows] = useState(null);
  const [dsCols, setDsCols] = useState(null);
  const [dsClasses, setDsClasses] = useState(null);

  // Training state (mock)
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [modelTrained, setModelTrained] = useState(false);

  // UI controls
  const [algorithm, setAlgorithm] = useState("RXGBoost");
  const [splitPct, setSplitPct] = useState("70/10/20");

  const inputRef = useRef(null);

  /* ------------------------------ Upload handlers ----------------------------- */
  const handleBrowseClick = () => inputRef.current?.click();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    acceptFile(f);
  };

  function acceptFile(f) {
    setUploadError("");
    setUploadSuccess("");
    setHeaders([]);
    setDelim(",");
    setHeaderIndex(-1);
    setColumnMap({});
    setNeedMapping(false);
    setDatasetReady(false);
    setCsvText("");

    setDsRows(null);
    setDsCols(null);
    setDsClasses(null);

    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv") {
      setFile(null);
      setUploadError("The file must be a .csv. Please try again.");
      return;
    }
    setFile(f);
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    acceptFile(f);
  };

  const handleConfirmUpload = async () => {
    if (!file) {
      setUploadError("Please select a .csv file first.");
      setUploadSuccess("");
      return;
    }
    setUploadError("");
    setUploadSuccess("");

    try {
      const text = await file.text();
      setCsvText(text);

      // headers + delim + headerIndex
      const meta = detectHeaders(text);
      setHeaders(meta.headers);
      setDelim(meta.delim);
      setHeaderIndex(meta.headerIndex);

      if (!meta.headers || meta.headers.length === 0) {
        setUploadError(
          "Could not detect column headers in this CSV (comment header detected?). Please check the file."
        );
        return;
      }

      // automapping
      const mapping = buildAutoMapping(meta.headers);
      setColumnMap(mapping);

      // stats de base (rows/features) même si target pas encore mappée
      const baseStats = computeDatasetStats({
        lines: meta.lines,
        headerIndex: meta.headerIndex,
        headers: meta.headers,
        delim: meta.delim,
        mapping: {}, // target pas encore garantie
      });
      setDsRows(baseStats.samples);
      setDsCols(baseStats.features);

      // si target mappée -> classes; sinon mapping manuel requis
      const missing = REQUIRED_FIELDS.filter((f) => !mapping[f.id]);
      if (missing.length === 0) {
        const fullStats = computeDatasetStats({
          lines: meta.lines,
          headerIndex: meta.headerIndex,
          headers: meta.headers,
          delim: meta.delim,
          mapping,
        });
        setDsClasses(fullStats.classes ?? "—");

        setNeedMapping(false);
        setDatasetReady(true);
        setUploadSuccess(`"${file.name}" has been uploaded successfully. Columns recognized.`);
        onUploadSuccess?.({ fileName: file.name, headers: meta.headers, mapping });
      } else {
        setNeedMapping(true);
        setUploadSuccess("");
        setDsClasses(null);
      }
    } catch (e) {
      setUploadError("Could not read the CSV headers. Please check the file and try again.");
    }
  };

  const finalizeMapping = () => {
    const allSet = REQUIRED_FIELDS.every((f) => columnMap[f.id]);
    if (!allSet) {
      setUploadError("Please map all required fields before continuing.");
      return;
    }
    setUploadError("");
    setNeedMapping(false);
    setDatasetReady(true);
    setUploadSuccess(`"${file?.name}" has been uploaded successfully. Mapping saved.`);

    // recalculer classes maintenant que la target est mappée
    if (csvText && headers.length) {
      const meta = { lines: csvText.replace(/^\uFEFF/, "").split(/\r?\n/), headerIndex, headers, delim };
      const fullStats = computeDatasetStats({
        lines: meta.lines,
        headerIndex: meta.headerIndex,
        headers: meta.headers,
        delim: meta.delim,
        mapping: columnMap,
      });
      setDsClasses(fullStats.classes ?? "—");
    }

    onUploadSuccess?.({ fileName: file?.name, headers, mapping: columnMap });
  };

  /* ----------------------------- Training handlers ---------------------------- */
  const handleStartTraining = () => {
    if (!datasetReady) {
      setUploadError("Please upload your dataset first (and complete the column mapping).");
      return;
    }
    if (isTraining) return;

    setModelTrained(false);
    setTrainingProgress(0);
    setIsTraining(true);

    const start = Date.now();
    const interval = setInterval(() => {
      setTrainingProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          setModelTrained(true);
          onTrainingComplete?.({ finishedAt: new Date(), durationMs: Date.now() - start });
          return 100;
        }
        return p + 6;
      });
    }, 250);
  };

  /* --------------------------------- UI parts -------------------------------- */
  const UploadArea = () => (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors 
      ${dragOver ? "border-purple-400 bg-purple-500/10" : "border-purple-500/40 bg-white/5 hover:bg-white/10"}`}
    >
      <UploadIcon className="w-12 h-12 text-purple-300 mx-auto mb-3" />
      {file ? (
        <>
          <p className="text-white font-medium mb-1">{file.name}</p>
          <p className="text-sm text-gray-400">Ready to upload</p>
        </>
      ) : (
        <>
          <p className="text-white font-medium mb-1">Drag and drop your CSV file</p>
          <p className="text-sm text-gray-400">or click to browse</p>
          <p className="text-xs text-gray-500 mt-2">Format: .csv</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* --- Upload + Dataset side cards --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Data */}
        <div className="lg:col-span-2 bg-black/40 backdrop-blur-md rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-6 h-6 text-purple-300" />
            <h2 className="text-xl font-bold text-white">Upload Data</h2>
          </div>

          {/* Alerts */}
          {uploadError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <p className="text-sm text-red-300">{uploadError}</p>
            </div>
          )}
          {uploadSuccess && (
            <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <p className="text-sm text-green-300">{uploadSuccess}</p>
            </div>
          )}

          {/* Dropzone */}
          <UploadArea />

          {/* Required columns hint */}
          <div className="mt-5 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-300 mt-0.5" />
              <div>
                <p className="text-sm text-purple-200/90 font-medium">
                  Required columns (flexible names accepted)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Orbital Period, Transit Duration, Transit Depth, Planet Radius, SNR, Stellar Radius, Target label.
                </p>
              </div>
            </div>
          </div>

          {/* Mapping UI if needed */}
          {needMapping && (
            <div className="mt-5 bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-white font-semibold mb-2">Map required fields</p>
              <p className="text-sm text-gray-300 mb-4">
                We couldn't confidently detect some columns. Please map each required field to a column from your file.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_FIELDS.map((f) => (
                  <div key={f.id} className="bg-black/30 border border-white/10 rounded-lg p-3">
                    <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                    <select
                      value={columnMap[f.id] || ""}
                      onChange={(e) => setColumnMap((m) => ({ ...m, [f.id]: e.target.value }))}
                      className="w-full bg-black/60 text-white rounded px-3 py-2 border border-purple-500/30"
                    >
                      <option value="">-- Select a column --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={finalizeMapping}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/40 transition-all"
                >
                  Save mapping
                </button>
                <button
                  onClick={() => setNeedMapping(false)}
                  className="px-5 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleConfirmUpload}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
            >
              <UploadIcon className="w-5 h-5" />
              Upload dataset
            </button>
            <button
              onClick={() => {
                setFile(null);
                setUploadError("");
                setUploadSuccess("");
                setHeaders([]);
                setDelim(",");
                setHeaderIndex(-1);
                setColumnMap({});
                setNeedMapping(false);
                setDatasetReady(false);
                setCsvText("");
                setDsRows(null);
                setDsCols(null);
                setDsClasses(null);
              }}
              className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Current Dataset (dyn) */}
        <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-lg font-bold text-white mb-4">Current Dataset</h3>
          <div className="space-y-3">
            <InfoTile label="Total Samples" value={dsRows !== null ? dsRows.toLocaleString() : "—"} />
            <InfoTile label="Features" value={dsCols !== null ? dsCols : "—"} />
            <InfoTile label="Classes" value={dsClasses !== null ? dsClasses : "—"} />
          </div>
        </div>
      </div>

      {/* --- Training section --- */}
      <div className="mt-6 bg-black/40 backdrop-blur-md rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-300" />
            <h2 className="text-xl font-bold text-white">Start Training</h2>
          </div>
          {modelTrained && <span className="text-sm text-green-400">Model trained just now</span>}
        </div>

        {isTraining && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Training in progress...</span>
              <span>{trainingProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${trainingProgress}%` }}
                
              />
            </div>
          </div>
        )}

        {/* Controls row — two cards side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20 min-h-[112px]">
            <p className="text-sm text-gray-400 mb-2">Algorithm</p>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full h-11 bg-black/60 text-white rounded px-3 text-sm
                        border border-purple-500/30
                        focus:outline-none focus:ring-2 focus:ring-purple-400/40"
            >
              <option>XGBoost</option>
              <option>CATBoost</option>
              <option>LightGBM</option>
            </select>
          </div>

          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20 min-h-[112px]">
            <p className="text-sm text-gray-400 mb-2">Train/Val/Test Split</p>
            <select
              value={splitPct}
              onChange={(e) => setSplitPct(e.target.value)}
              className="w-full h-11 bg-black/60 text-white rounded px-3 text-sm
                        border border-purple-500/30
                        focus:outline-none focus:ring-2 focus:ring-purple-400/40"
            >
              <option value="70/10/20">70/10/20</option>
              <option value="70/20/10">70/20/10</option>
              <option value="80/10/10">80/10/10</option>
              <option value="80/15/5">80/15/5</option>
            </select>
          </div>
        </div>


        <button
          onClick={handleStartTraining}
          disabled={isTraining}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5" />
          {isTraining ? "Training in progress..." : "Start Training"}
        </button>
      </div>
    </div>
  );
}

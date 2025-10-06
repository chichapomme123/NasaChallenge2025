import React, { useState } from 'react';
import {
  Home as HomeIcon, Settings, BarChart3, Brain, CheckCircle, Sparkles, Info,
} from 'lucide-react';

import StarfieldOverlay from './components/StarfieldOverlay.jsx';
import ExoplanetIntro from './components/ExoplanetIntro';
import Home from './components/Home.jsx';
import Training from "./components/Training.jsx";
import Classification from "./components/Classification.jsx";
import Stats from "./components/Stat.jsx";
import About from "./components/About.jsx";

export default function ExoplanetMLInterface() {
  // ---------------- State ----------------
  const [activeTab, setActiveTab] = useState('splash'); // 'splash' | 'story' | 'home' | 'train' | 'classify' | 'stats' | 'settings'
  const [modelTrained, setModelTrained] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [classificationResult, setClassificationResult] = useState(null);

  // Navbar
  const tabs = [
    { id: 'story', label: 'Story', icon: Sparkles },
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'train', label: 'Training', icon: Brain },
    { id: 'classify', label: 'Classification', icon: Sparkles },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'settings', label: 'Hyperparameters', icon: Settings },
    { id: 'about', label: 'About', icon: Info },
  ];

  // Hyperparams
  const [hyperparams, setHyperparams] = useState({
    n_estimators: 100,
    max_depth: 10,
    min_samples_split: 2,
    learning_rate: 0.1,
    test_size: 0.2,
  });

  // Stats mock
  const [modelStats] = useState({
    accuracy: 0.947,
    precision: 0.932,
    recall: 0.951,
    f1Score: 0.941,
    datasetSize: 7592,
    trainingTime: '2.3s',
    classes: ['Confirmed Planet', 'False Positive', 'Candidate'],
  });

  const [confusionMatrix] = useState([
    [450, 12, 8],
    [15, 380, 5],
    [10, 8, 420],
  ]);

  // ---------------- Actions ----------------
  const handleTrainModel = () => {
    setIsTraining(true);
    setTrainingProgress(0);
    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          setModelTrained(true);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };


  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header compact */}
      <header className="relative z-30 bg-black/50 backdrop-blur-md border-b border-purple-500/25">
        <div className="max-w-6xl mx-auto px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="leading-tight">
                <h1 className="text-xl font-bold">ExoML</h1>
                <p className="text-xs text-purple-300">
                  Machine Learning–based Exoplanet Classification System
                </p>
              </div>
            </div>

            {modelTrained && (
              <div className="hidden md:flex items-center gap-2 bg-green-500/15 px-3 py-1.5 rounded-lg border border-green-500/30">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-sm">Model ready</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navbar visible partout sauf sur le splash */}
      {activeTab !== 'splash' && (
        <nav className="relative z-30">
          <div className="max-w-6xl mx-auto px-5 mt-4">
            <div className="flex flex-wrap gap-1.5 bg-black/55 backdrop-blur-md rounded-xl p-1.5 border border-white/10 shadow-lg shadow-black/20">
              {tabs.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all text-sm ${
                      isActive
                        ? 'bg-purple-600 text-white shadow shadow-purple-500/40'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    <span className="font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* -------- SPLASH -------- */}
      {activeTab === 'splash' && (
        <section className="relative flex flex-col items-center justify-center text-center min-h-[80vh]">
          <StarfieldOverlay />
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />
          <div className="relative z-20 px-6 py-10 max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.05] pb-1 bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-400 bg-clip-text text-transparent">
              Discover New Worlds Beyond Our Solar System
            </h1>
            <p className="text-gray-300 text-lg md:text-xl mb-8">
              Every pixel of light we capture could reveal a new world!
            </p>
            <p className="text-gray-50 text-lg md:text-xl mb-2">
              ExoML uses NASA&apos;s open data and machine learning to detect exoplanets automatically.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setActiveTab('home')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-lg font-semibold transform transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-400/50 hover:scale-105"
              >
                Start Exploring
              </button>
              <button
                onClick={() => setActiveTab('story')}
                className="px-6 py-3 bg-white/10 border border-white/20 rounded-full text-lg font-semibold hover:bg-white/20 transition-colors"
              >
                Play Story
              </button>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-purple-700/20 to-transparent blur-3xl z-0" />
        </section>
      )}

      {/* -------- CONTENU PRINCIPAL (hors splash) -------- */}
      {activeTab !== 'splash' && (
        <main className="max-w-6xl mx-auto px-5 py-6 space-y-8">
          {/* HOME */}
          {activeTab === 'home' && <Home onReplayStory={() => setActiveTab('story')} />}

          {/* STORY */}
          {activeTab === 'story' && <ExoplanetIntro onContinue={() => setActiveTab('home')} />}
    
          {/* TRAINING */}
          {activeTab === 'train' && (
            <Training
                onUploadSuccess={(info) => console.log("Uploaded:", info)}
                onTrainingComplete={() => setModelTrained(true)}
              />          
          )}

          {/* CLASSIFICATION */}
          {activeTab === 'classify' && (
            <Classification modelTrained={modelTrained} />
          )}

          {/* STATS */}
          {activeTab === 'stats' && (
          <Stats
            datasetSize={modelStats?.datasetSize ?? 0}        // passe la vraie taille si tu l’as
            lastTrainingMs={0} /* depuis Training */
              />
            )}


          {/* SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-black/40 backdrop-blur-md rounded-lg p-6 border border-purple-500/30">

                <div className="flex items-center gap-2 mb-6">
                  <Settings className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-bold">Model Hyperparameters</h2>
                </div>

                <div className="space-y-6">
                  <RangeSetting
                    label="Number of Estimators (n_estimators)"
                    min={10}
                    max={500}
                    value={hyperparams.n_estimators}
                    onChange={(v) => setHyperparams({ ...hyperparams, n_estimators: v })}
                  />
                  <RangeSetting
                    label="Maximum Depth (max_depth)"
                    min={3}
                    max={50}
                    value={hyperparams.max_depth}
                    onChange={(v) => setHyperparams({ ...hyperparams, max_depth: v })}
                  />
                  <RangeSetting
                    label="Minimum Samples per Split (min_samples_split)"
                    min={2}
                    max={20}
                    value={hyperparams.min_samples_split}
                    onChange={(v) => setHyperparams({ ...hyperparams, min_samples_split: v })}
                  />
                  <RangeSetting
                    label="Learning Rate (learning_rate)"
                    min={0.01}
                    max={1}
                    step={0.01}
                    value={hyperparams.learning_rate}
                    onChange={(v) => setHyperparams({ ...hyperparams, learning_rate: v })}
                    format={(v) => v.toFixed(2)}
                  />
                  <RangeSetting
                    label="Test Set Size (%)"
                    min={0.1}
                    max={0.5}
                    step={0.05}
                    value={hyperparams.test_size}
                    onChange={(v) => setHyperparams({ ...hyperparams, test_size: v })}
                    format={(v) => `${(v * 100).toFixed(0)}%`}
                  />

                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all">
                      Apply and Retrain
                    </button>
                    <button className="px-6 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STORY */}
          {activeTab === 'about' && <About onContinue={() => setActiveTab('about')} />}
    
        </main>
      )}
    </div>
  );
}

/* ---------- Small UI Helpers ---------- */

function LabeledInput({ label, ...props }) {
  return (
    <div>
      <label className="text-sm text-gray-400 block mb-2">{label}</label>
      <input
        {...props}
        className="w-full bg-white/10 rounded-lg px-4 py-2 border border-purple-500/30 placeholder:text-gray-400"
      />
    </div>
  );
}

function MetricCard({ label, value, barColor, barPct }) {
  return (
    <div className="bg-black/40 backdrop-blur-md rounded-lg p-6 border border-purple-500/30">
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <p className="text-4xl font-bold mb-1">{value}</p>
      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
        <div className={`h-full bg-gradient-to-r ${barColor} rounded-full`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="bg-purple-500/10 rounded-lg p-3">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function RangeSetting({ label, min, max, step = 1, value, onChange, format }) {
  const display = format ? format(value) : value;
  return (
    <div>
      <label className="text-sm text-gray-400 block mb-2">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-sm text-gray-500 mt-1">
        <span>{min}</span>
        <span className="font-medium text-white">{display}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

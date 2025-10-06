import StarfieldOverlay from "./components/StarfieldOverlay";
import ExoplanetMLInterface from "./ExoplanetMLInterface";

export default function App() {
  return (
    <div className="relative min-h-screen text-white">
      {/* Global background */}
      <StarfieldOverlay />

      {/* App content above */}
      <div className="relative z-[2]">
        <ExoplanetMLInterface />
      </div>
    </div>
  );
}

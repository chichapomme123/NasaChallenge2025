import React from "react";

const teamMembers = [
      {
    name: "Chaima Jabri",
    role: "ML Engineer & Project Lead",
    img: "/Chaima Jabri.jpg",
  },
  {
    name: "Aïcha Bouaziz",
    role: "Frontend Developer & UX Designer",
    img: "/Aicha Bouaziz .jpg",
  },
  {
    name: "Chayma Ben Zribia",
    role: "Data Analyst & Model Evaluation",
    img: "/Chayma Ben Zribia.jpg",
  },
  {
    name: "May Benjeddou",
    role: "Backend Developer & Integration",
    img: "/May Benjeddou.jpg",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a002b] to-[#2a004a] text-white py-16 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6 text-purple-300">About Our Project</h1>
        <p className="text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
          Our Exoplanet Classification System was developed as part of an academic and research project
          aiming to identify exoplanets using machine learning. We combine astrophysics and artificial
          intelligence to create a model capable of distinguishing between candidates, false positives,
          and confirmed planets.
        </p>

        <h2 className="text-3xl font-semibold mb-8 text-purple-200">Meet the Team</h2>

        {/* TEAM GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="bg-white/5 border border-purple-500/20 rounded-2xl p-6 hover:scale-105 transition-transform backdrop-blur-md shadow-lg"
            >
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 mb-4 rounded-full overflow-hidden border-2 border-purple-400/40">
                  <img
                    src={member.img}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-purple-200">{member.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{member.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* PROJECT VISION */}
        <div className="mt-20 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold mb-4 text-purple-200">Our Vision</h2>
          <p className="text-gray-300 leading-relaxed">
            We believe that artificial intelligence can accelerate the discovery of exoplanets
            and contribute to understanding our universe. This project represents our passion for
            innovation, collaboration, and scientific exploration. By combining data science and
            astrophysics, we hope to bring machine learning closer to the stars ✨.
          </p>
        </div>
      </div>
    </div>
  );
}

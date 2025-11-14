"use client";

import { useState } from "react";
import {
  Atom,
  FlaskConical,
  Mountain,
  Brain,
  MousePointerClick,
  RefreshCcw,
} from "lucide-react";
import { motion } from "framer-motion";

const subjectPresets = ["Biology", "Physics", "Chemistry", "Earth Science"];

const effectsBySubject: Record<string, string[]> = {
  Biology: ["Growth", "Photosynthesis", "Water Flow", "Light Reaction"],
  Physics: ["Gravity", "Bounce", "Collision", "Magnetic"],
  Chemistry: ["A + B → Color Change", "Heat Reaction", "Gas Formation"],
  "Earth Science": ["Rain Cycle", "Erosion", "Volcano", "Wind Flow"],
};

const environmentPresets = ["Sunny", "Rainy", "Foggy", "Night"];
const interactionPresets = ["On Click", "On Proximity", "On Timer", "Loop Animation"];

export default function EnvironmentDesignPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>("Physics");
  const [selectedEffects, setSelectedEffects] = useState<string[]>(["Gravity"]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string[]>(["Sunny"]);
  const [selectedInteraction, setSelectedInteraction] = useState<string[]>(["On Click"]);

  const toggleFromArray = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(
      list.includes(value) ? list.filter((i) => i !== value) : [...list, value]
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-90px)] mt-[80px] overflow-hidden">
      {/* 左侧工具栏 */}
      <aside className="w-full md:w-[18%] bg-white border-r border-gray-200 p-5 flex flex-col gap-5 overflow-y-auto">
        {/* Subject Section */}
        <div>
          <h3 className="text-gray-700 font-medium text-sm mb-2 tracking-wide">SUBJECT</h3>
          <div className="flex flex-wrap gap-2">
            {subjectPresets.map((subj) => (
              <button
                key={subj}
                onClick={() => {
                  setSelectedSubject(subj);
                  setSelectedEffects([]);
                }}
                className={`px-3 py-1.5 text-[12px] rounded-full border transition ${
                  selectedSubject === subj
                    ? "bg-emerald-600 text-white"
                    : "border-gray-300 text-gray-700 hover:border-emerald-400"
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>

        {/* Effects Section */}
        <div>
          <h3 className="text-gray-700 font-medium text-sm mb-2 tracking-wide">EFFECTS</h3>
          <div className="flex flex-wrap gap-2">
            {effectsBySubject[selectedSubject].map((fx) => (
              <button
                key={fx}
                onClick={() => toggleFromArray(fx, selectedEffects, setSelectedEffects)}
                className={`px-3 py-1.5 text-[12px] rounded-full border transition ${
                  selectedEffects.includes(fx)
                    ? "bg-emerald-600 text-white"
                    : "border-gray-300 text-gray-700 hover:border-emerald-400"
                }`}
              >
                {fx}
              </button>
            ))}
          </div>
        </div>

        {/* Environment Section */}
        <div>
          <h3 className="text-gray-700 font-medium text-sm mb-2 tracking-wide">ENVIRONMENT</h3>
          <div className="flex flex-wrap gap-2">
            {environmentPresets.map((env) => (
              <button
                key={env}
                onClick={() => toggleFromArray(env, selectedEnvironment, setSelectedEnvironment)}
                className={`px-3 py-1.5 text-[12px] rounded-full border transition ${
                  selectedEnvironment.includes(env)
                    ? "bg-blue-500 text-white"
                    : "border-gray-300 text-gray-700 hover:border-blue-400"
                }`}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        {/* Interaction Section */}
        <div>
          <h3 className="text-gray-700 font-medium text-sm mb-2 tracking-wide">INTERACTIONS</h3>
          <div className="flex flex-wrap gap-2">
            {interactionPresets.map((inter) => (
              <button
                key={inter}
                onClick={() => toggleFromArray(inter, selectedInteraction, setSelectedInteraction)}
                className={`px-3 py-1.5 text-[12px] rounded-full border transition ${
                  selectedInteraction.includes(inter)
                    ? "bg-purple-500 text-white"
                    : "border-gray-300 text-gray-700 hover:border-purple-400"
                }`}
              >
                {inter}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 leading-snug mt-3">
          Tip: Select subject first, then combine effects, environment, and interactions
          to design immersive lessons.
        </p>
      </aside>

      {/* 中间场景视图 */}
      <main className="flex-1 relative flex flex-col justify-center items-center bg-white p-6">
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner bg-gray-100">
          <img
            src="/environment.jpg"
            alt="Environment preview"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-white/70 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-700">
            <p className="font-medium text-[13px] mb-1">Active Effects</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedEffects.length === 0 && (
                <span className="text-gray-500 text-xs">No effects</span>
              )}
              {selectedEffects.map((fx) => (
                <span
                  key={fx}
                  className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-700"
                >
                  {fx}
                </span>
              ))}
              {selectedEnvironment.map((env) => (
                <span
                  key={env}
                  className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-700"
                >
                  {env}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 悬浮底部工具栏 */}
        <div className="absolute bottom-4 flex items-center gap-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-md">
          <MousePointerClick className="w-5 h-5 text-gray-700" />
          <Atom className="w-5 h-5 text-gray-700" />
          <FlaskConical className="w-5 h-5 text-gray-700" />
          <Mountain className="w-5 h-5 text-gray-700" />
          <Brain className="w-5 h-5 text-gray-700" />
          <RefreshCcw className="w-5 h-5 text-gray-700" />
        </div>
      </main>

      {/* 右侧面板 */}
      <aside className="w-full md:w-[22%] bg-white border-l border-gray-200 p-6 overflow-y-auto">
        <h3 className="text-gray-700 font-medium text-sm mb-3 tracking-wide">AI ASSET GENERATOR</h3>
        <p className="text-[13px] text-gray-500 mb-4">
          Describe the 3D asset you need
        </p>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-2 text-[13px] text-gray-700 mb-3 resize-none"
          rows={3}
          placeholder="Generate a stylized low-poly forest with a river..."
        />
        <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg mb-5 text-[13px] transition">
          Generate 3D Asset
        </button>

        {/* ✅ SUGGESTIONS 改进版 */}
        <h4 className="text-gray-700 font-medium text-sm mb-2 tracking-wide">SUGGESTIONS</h4>
            <div className="grid grid-cols-2 gap-3 mb-5">
            {/* 🌉 River & Bridge */}
            <div className="group border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all duration-300">
                <img
                src="/bridge.png"
                alt="River & Bridge"
                className="w-full h-24 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="p-2 text-center">
                <p className="font-medium text-gray-800 text-[12px] leading-tight">River & Bridge</p>
                <p className="text-[11px] text-gray-500">Environment</p>
                </div>
            </div>

            {/* ☁️ Cloud Model */}
            <div className="group border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all duration-300">
                <img
                src="/cloud.png"
                alt="Cloud Model"
                className="w-full h-24 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="p-2 text-center">
                <p className="font-medium text-gray-800 text-[12px] leading-tight">Cloud Model</p>
                <p className="text-[11px] text-gray-500">Weather</p>
                </div>
            </div>

            {/* ☀️ Sun Model */}
            <div className="group border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all duration-300">
                <img
                src="/sun.png"
                alt="Sun Model"
                className="w-full h-24 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="p-2 text-center">
                <p className="font-medium text-gray-800 text-[12px] leading-tight">Sun Model</p>
                <p className="text-[11px] text-gray-500">Light Source</p>
                </div>
            </div>

            {/* 🧑 Avatar */}
            <div className="group border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all duration-300">
                <img
                src="/humanfigure.png"
                alt="Avatar"
                className="w-full h-24 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="p-2 text-center">
                <p className="font-medium text-gray-800 text-[12px] leading-tight">Avatar</p>
                <p className="text-[11px] text-gray-500">Character</p>
                </div>
            </div>
            </div>


        {/* SELECTED ASSET */}
        <div>
          <h4 className="text-gray-700 font-medium text-sm mb-2 tracking-wide">SELECTED ASSET</h4>
          <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-300 to-blue-400" />
            <div>
              <p className="text-[13px] font-medium text-gray-700">River & Bridge</p>
              <p className="text-[11px] text-gray-500">Environment</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {["Water", "Bridge", "Nature"].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

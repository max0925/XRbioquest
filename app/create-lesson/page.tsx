"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, ArrowUp } from "lucide-react";
import Navigation from "../../components/Navigation";
import { motion, AnimatePresence } from "framer-motion";

function FastTyping({ text, delay = 5 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!text) {
      setDisplayed("");
      setIndex(0);
      return;
    }
    setDisplayed("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text) return;
    if (index >= text.length) return;

    const timeout = setTimeout(() => {
      setDisplayed((prev) => prev + text[index]);
      setIndex((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timeout);
  }, [index, text, delay]);

  if (!text) return null;
  return <div className="whitespace-pre-wrap">{displayed}</div>;
}

export default function CreateLessonPage() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [fileName, setFileName] = useState("");
  const [isChatStarted, setIsChatStarted] = useState(false);
  const router = useRouter();

  const handleSend = () => {
    if (!input.trim() && !fileName) return;
    setIsChatStarted(true);

    const aiReply = `
**Understanding Your Prompt:**  
You want to design a VR lesson about the water cycle for 5th graders. The goal is to help students visualize evaporation, condensation, and precipitation interactively.

**Lesson Design Suggestions:**  
Structure the lesson around inquiry — start with a guiding question like “Where does rain come from?”  
Include a mini quiz after each stage of the cycle to reinforce understanding.

**Proposed VR/AR Game:**  
Students enter a 3D world where they act as water molecules. They can evaporate into clouds, condense into raindrops, and fall back to earth — forming a complete cycle.  
Each phase has small missions (e.g., “Find the sun’s heat source!”).

**Learning Principles:**  
- Constructivism: Students learn by embodying roles in a system.  
- Situated Learning: Knowledge tied to an immersive environment.  
- Feedback & Reflection: Visual cues reinforce cycle understanding.

**Required 3D Assets:**  
☁️ Cloud models  
💧 Water drops  
🌞 Sun animation  
🏞️ Terrain map with rivers and lakes  
🌫️ Steam particle effects
    `.trim();

    setTimeout(() => setResponse(aiReply), 300);
    setInput("");
    setFileName("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const handleRefine = () => {
    setResponse(" Sure — let’s refine your idea! What aspect would you like to modify?");
  };

  const handleGenerateEnvironment = () => {
    router.push("/environment-design");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] text-gray-800 transition-all duration-500">
      {/* ✅ 保持全局背景与导航一致 */}
      <Navigation />

      <div className="flex flex-1 pt-[64px]">
        {/* ✅ 左侧边栏改为 sticky，背景浅灰，保持在左侧 */}
        <aside className="w-72 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] sticky top-[64px] flex flex-col justify-between shadow-sm">
          <div className="px-6 pt-6">
            <div className="flex items-center gap-3 mb-8">
              <img
                src="/avatar.png"
                alt="User Avatar"
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
              <div className="flex flex-col">
                <p className="font-semibold text-gray-900 leading-tight">Zheng Bian</p>
                <p className="text-xs text-gray-500">Teacher Mode</p>
              </div>
            </div>

            <button className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition duration-200 shadow-sm">
              + New Lesson
            </button>

            <nav className="mt-6 space-y-1 text-sm font-medium text-gray-700">
              {["My Projects", "Folders", "Favorites", "Archive"].map((item) => (
                <button
                  key={item}
                  className="w-full flex items-center px-3 py-2 rounded-md hover:bg-green-50 hover:text-green-600 transition duration-200"
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>

          <div className="px-6 pb-6 border-t border-gray-100 pt-4 flex flex-col gap-2">
            <button className="flex items-center px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-green-50 hover:text-green-600 transition duration-200">
              Settings
            </button>
            <button className="flex items-center px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition duration-200">
              Logout
            </button>
            <p className="text-xs text-gray-400 mt-2">© 2025 BioQuest</p>
          </div>
        </aside>

        {/* ✅ 主内容部分去掉 ml-72，页面居中 */}
        <main className="flex-1 flex flex-col items-center justify-start pt-10 px-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!isChatStarted ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative w-28 h-28 bg-gradient-to-r from-green-400 via-blue-400 to-purple-500 rounded-full blur-[40px] opacity-70 animate-pulse mb-6" />
                <h1 className="text-[2.4rem] font-extrabold text-gray-900 leading-tight mb-2">
                  Good afternoon, Zheng
                </h1>
                <p className="text-base text-gray-500 font-medium mb-10">
                  Ready to design your own immersive VR/AR learning experience?
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-3xl flex flex-col gap-5 mb-8"
              >
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="self-end bg-green-100 text-gray-800 px-5 py-3 rounded-2xl shadow-sm max-w-[80%]"
                >
                  {input || "Design a VR lesson about the water cycle for 5th graders."}
                </motion.div>

                {response && (
                  <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="self-start bg-white border border-gray-100 px-5 py-4 rounded-2xl shadow-sm text-gray-800 max-w-[90%] leading-relaxed whitespace-pre-wrap"
                  >
                    <FastTyping text={response} delay={5} />

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleRefine}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition"
                      >
                        Not satisfied — refine the idea
                      </button>
                      <button
                        onClick={handleGenerateEnvironment}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                      >
                        Generate Environment
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 输入框 */}
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 hover:shadow-md focus-within:shadow-lg transition-all duration-200 mb-10"
          >
            <div className="flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hi Zheng — describe your lesson idea..."
                className="flex-grow bg-transparent outline-none text-gray-700 placeholder-gray-400 text-sm py-3 pl-3"
              />
              <button
                onClick={handleSend}
                className="ml-3 p-3 bg-green-600 hover:bg-green-700 rounded-full shadow-sm text-white transition-all transform hover:scale-110"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex justify-between items-center mt-3 text-gray-500 text-sm relative">
              <label
                htmlFor="fileUpload"
                className="flex items-center gap-2 cursor-pointer hover:text-green-600 transition-colors"
              >
                <Paperclip size={15} />
                <span>Attach</span>
              </label>
              <input id="fileUpload" type="file" className="hidden" onChange={handleFileChange} />
              {fileName && (
                <span className="text-xs text-gray-400 truncate max-w-[150px]">{fileName}</span>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

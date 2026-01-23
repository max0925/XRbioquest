"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, ArrowUp, Sparkles, Plus, X, Image as ImageIcon, Atom, Dna, Zap } from "lucide-react";
import Navigation from "../../components/Navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';

// Typing effect component
function FastTyping({ text, delay = 2 }: { text: string; delay?: number }) {
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

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        components={{
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3 flex items-center gap-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-2 my-4">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="text-gray-700 leading-relaxed flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
        }}
      >
        {displayed}
      </ReactMarkdown>
    </div>
  );
}

// Example prompt cards
const examplePrompts = [
  {
    icon: Dna,
    color: "from-emerald-500 to-teal-500",
    title: "DNA Replication",
    prompt: "Create an interactive VR lesson about DNA replication for high school biology students"
  },
  {
    icon: Atom,
    color: "from-blue-500 to-cyan-500",
    title: "Solar System",
    prompt: "Design a 3D solar system exploration experience for middle school astronomy"
  },
  {
    icon: Zap,
    color: "from-purple-500 to-pink-500",
    title: "Atomic Structure",
    prompt: "Build a VR lesson on atomic structure and electron orbitals for chemistry class"
  },
  {
    icon: Sparkles,
    color: "from-orange-500 to-amber-500",
    title: "Human Anatomy",
    prompt: "Create an immersive anatomy lesson focusing on the skeletal and muscular systems"
  }
];

export default function CreateLessonPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; type?: 'chat' | 'lesson' }>>([]);
  const [fileName, setFileName] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}`);
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Core send logic - redirect to environment-design with prompt
  const handleSend = async (promptText?: string) => {
    const messageToSend = promptText || input;
    if (!messageToSend.trim() || isLoading) return;

    // Store the prompt and redirect to environment-design
    localStorage.setItem("initial_prompt", messageToSend);
    router.push(`/environment-design?prompt=${encodeURIComponent(messageToSend)}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const clearFile = () => {
    setFileName("");
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRefine = () => {
    window.alert("Sure! Please describe what you want to change in the input box below.");
  };

  const handleGenerateEnvironment = () => {
    router.push("/environment-design");
  };

  const handleNewChat = () => {
    setIsChatStarted(false);
    setInput("");
    setMessages([]);
    setFileName("");
    setFilePreview(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 relative overflow-hidden">
      <Navigation />

      <div className="flex flex-1 pt-[64px] relative z-10">
        {/* Sidebar */}
        <AnimatePresence>
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-[280px] bg-white/80 backdrop-blur-xl border-r border-gray-200/50 min-h-[calc(100vh-64px)] sticky top-[64px] flex flex-col shadow-xl"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {/* New Chat Button */}
            <div className="p-4 border-b border-gray-200/50">
              <motion.button
                onClick={handleNewChat}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:shadow-lg transition-all duration-300 text-sm font-semibold"
              >
                <Plus size={18} strokeWidth={2.5} />
                New Lesson
              </motion.button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-xs font-bold text-gray-500 mb-3 px-2 uppercase tracking-wider">Recent</div>
              <div className="space-y-2">
                {isChatStarted && messages.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 text-sm text-gray-900 truncate cursor-pointer hover:shadow-md transition-all"
                  >
                    {messages[0]?.content.substring(0, 30)}...
                  </motion.div>
                )}
              </div>
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-200/50 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  ZB
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">Zheng Bian</p>
                  <p className="text-xs text-emerald-600 font-medium">Teacher Mode ✨</p>
                </div>
              </div>
            </div>
          </motion.aside>
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center relative">
          <div className="flex-1 w-full max-w-4xl flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <AnimatePresence mode="wait">
                {!isChatStarted ? (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center text-center pt-8 pb-6 max-h-[300px]"
                  >
                    {/* Compact DNA orb */}
                    <motion.div
                      className="relative mb-4"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.4 }}
                    >
                      {/* Outer glow */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="w-24 h-24 rounded-full bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 blur-xl"
                          animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.4, 0.6, 0.4],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </div>

                      {/* Core orb */}
                      <div className="relative w-[60px] h-[60px] rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-xl flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{
                            duration: 15,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        >
                          <Dna size={28} className="text-white" strokeWidth={2} />
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Compact welcome text */}
                    <motion.h1
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-gray-900 via-emerald-900 to-gray-900 bg-clip-text text-transparent"
                      style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                    >
                      Create VR Lessons with AI
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-base text-gray-600 mb-6"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      Describe a lesson idea or try an example below
                    </motion.p>

                    {/* Compact example prompts */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-wrap gap-2 justify-center max-w-2xl"
                    >
                      {examplePrompts.map((example, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSend(example.prompt)}
                          className="group px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:border-emerald-400 hover:shadow-md transition-all duration-200 text-left"
                          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${example.color} flex items-center justify-center flex-shrink-0`}>
                              <example.icon size={14} className="text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{example.title}</span>
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="space-y-8">
                    {/* Render all messages */}
                    {messages.map((message, index) => (
                      message.role === 'user' ? (
                        // User Message
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-end"
                        >
                          <div className="max-w-[75%]">
                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              className="relative bg-gradient-to-br from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-3xl rounded-tr-md shadow-lg"
                            >
                              <div className="absolute inset-0 bg-emerald-400 rounded-3xl rounded-tr-md blur-xl opacity-20"></div>
                              <p className="relative z-10 text-[15px] leading-relaxed" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                                {message.content}
                              </p>
                            </motion.div>

                            {/* Image Preview */}
                            {filePreview && index === messages.length - 2 && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-4 relative inline-block"
                              >
                                <img
                                  src={filePreview}
                                  alt="Uploaded reference"
                                  className="max-w-xs rounded-2xl border-2 border-emerald-300 shadow-xl"
                                />
                                <button
                                  onClick={clearFile}
                                  className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                                >
                                  <X size={16} strokeWidth={3} />
                                </button>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        // AI Message
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-start"
                        >
                          <div className="max-w-[85%]">
                            <div className="flex items-start gap-4">
                              <motion.div
                                animate={{
                                  rotate: index === messages.length - 1 && isLoading ? [0, 360] : 0,
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: index === messages.length - 1 && isLoading ? Infinity : 0,
                                  ease: "linear"
                                }}
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg"
                              >
                                <Sparkles size={20} className="text-white" strokeWidth={2.5} />
                              </motion.div>

                              <div className="flex-1">
                                <motion.div
                                  whileHover={{ scale: 1.005 }}
                                  className="relative bg-white/90 backdrop-blur-sm border border-gray-200 px-6 py-5 rounded-3xl rounded-tl-md shadow-xl"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/50 to-cyan-100/50 rounded-3xl rounded-tl-md blur-2xl opacity-0 hover:opacity-30 transition-opacity"></div>

                                  <div className="relative z-10">
                                    <div className="text-[15px] text-gray-800" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                                      <FastTyping text={message.content} delay={1} />
                                    </div>

                                    {/* Action Buttons (only for lesson type) */}
                                    {message.type === 'lesson' && index === messages.length - 1 && !isLoading && (
                                      <div className="flex gap-3 mt-8 pt-5 border-t border-gray-100">
                                        <motion.button
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={handleRefine}
                                          className="px-5 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-all font-medium"
                                          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                                        >
                                          ✏️ Refine Idea
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={handleGenerateEnvironment}
                                          className="px-5 py-2.5 text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl transition-all font-semibold shadow-lg"
                                          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                                        >
                                          🚀 Generate Environment
                                        </motion.button>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    ))}

                    {/* Loading state */}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="max-w-[85%]">
                          <div className="flex items-start gap-4">
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg"
                            >
                              <Sparkles size={20} className="text-white" strokeWidth={2.5} />
                            </motion.div>

                            <div className="flex-1">
                              <motion.div className="relative bg-white/90 backdrop-blur-sm border border-gray-200 px-6 py-5 rounded-3xl rounded-tl-md shadow-xl">
                                <div className="flex items-center gap-3 text-gray-600 py-2">
                                  <div className="flex gap-1.5">
                                    <motion.span
                                      className="w-2.5 h-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                                      animate={{ y: [0, -10, 0] }}
                                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                    />
                                    <motion.span
                                      className="w-2.5 h-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                                      animate={{ y: [0, -10, 0] }}
                                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                    />
                                    <motion.span
                                      className="w-2.5 h-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                      animate={{ y: [0, -10, 0] }}
                                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                                    Thinking...
                                  </span>
                                </div>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={chatEndRef} />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Floating Input Area */}
            <div className="sticky bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-8 pb-8 px-6">
              {/* File Preview */}
              {fileName && !isChatStarted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-sm shadow-md"
                >
                  <ImageIcon size={18} className="text-emerald-600" />
                  <span className="text-emerald-900 font-semibold truncate max-w-[200px]">{fileName}</span>
                  <button
                    onClick={clearFile}
                    className="text-emerald-600 hover:text-emerald-800 hover:scale-110 transition-transform"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </motion.div>
              )}

              <div className="max-w-3xl mx-auto">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="relative"
                >
                  {/* Floating glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-3xl blur-lg opacity-20"></div>

                  <div className="relative flex items-end gap-3 px-5 py-4 bg-white border-2 border-gray-200 rounded-3xl shadow-2xl hover:shadow-emerald-200/50 focus-within:border-emerald-500 focus-within:shadow-emerald-300/50 transition-all duration-300">
                    {/* File Upload */}
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-50"
                    >
                      <Paperclip size={20} strokeWidth={2.5} />
                    </motion.button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*"
                    />

                    {/* Text Input */}
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      disabled={isLoading}
                      placeholder="Describe your lesson idea..."
                      rows={1}
                      className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 resize-none py-2 text-[15px] font-medium"
                      style={{
                        fontFamily: '"DM Sans", system-ui, sans-serif',
                        maxHeight: '160px',
                        minHeight: '28px'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />

                    {/* Send Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSend()}
                      disabled={isLoading || !input.trim()}
                      className={`p-3 rounded-xl transition-all duration-300 shadow-lg ${
                        isLoading || !input.trim()
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-emerald-400/50"
                      }`}
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <ArrowUp size={20} strokeWidth={3} />
                      )}
                    </motion.button>
                  </div>

                  {/* Helper Text */}
                  <p className="text-xs text-gray-400 text-center mt-4 font-medium" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    ✨ Powered by BioQuest AI • Press Enter to send
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

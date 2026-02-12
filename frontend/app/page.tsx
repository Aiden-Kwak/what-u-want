"use client";

import { useState, useRef, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranslationProgress } from "@/components/TranslationProgress";
import { ApiKeyModal } from "@/components/ApiKeyModal";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("ko");
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [translatedFileName, setTranslatedFileName] = useState<string | null>(null);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    // Load API key from localStorage
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleTranslate = async () => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
    }

    if (!file) {
      alert("Please upload a file first");
      return;
    }

    if (!apiKey) {
      alert("Please enter your OpenAI API Key");
      return;
    }

    setIsTranslating(true);
    setProgress(0);
    setLogs([]);
    setTranslatedFileName(null);

    // Use environment variable for API URL (defaults to localhost:8000)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    // Start SSE connection for logs
    const eventSource = new EventSource(
      `${API_URL}/api/logs/stream?session_id=${sessionIdRef.current}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const message = data.message || data.log;

        if (message) {
          // Detect DOWNLOAD_READY signal from background task
          if (message.includes("DOWNLOAD_READY:")) {
            const filename = message.split("DOWNLOAD_READY:")[1].trim();
            setTranslatedFileName(filename);
            handleDownload(filename);
            setProgress(100);
            setLogs((prev) => [...prev, "✅ Translation finished! File is ready."]);
            return; // Keep connection open briefly or close? Usually keep open until user leaves.
          }

          // Check if this is a milestone or progress log
          if (message.includes("📍 MILESTONE") || message.includes("📦 PROGRESS") || message.includes("✅ COMPLETE")) {
            const percentMatch = message.match(/\((\d+)%\)/);
            if (percentMatch) {
              setProgress(parseInt(percentMatch[1]));
            }
          }

          setLogs((prev) => [...prev, message]);
        }
      } catch (error) {
        console.warn("Failed to parse SSE message:", event.data, error);
      }
    };

    eventSource.onerror = () => {
      // Don't close immediately on error, retry might happen or connection just flaky
      // eventSource.close(); 
    };

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("source_lang", sourceLang);
      formData.append("target_lang", targetLang);
      formData.append("session_id", sessionIdRef.current);

      const response = await fetch(`${API_URL}/api/translate`, {
        method: "POST",
        body: formData,
      });

      const responseData = await response.text();
      let result = null;

      try {
        result = JSON.parse(responseData);
      } catch (e) {
        // Not JSON
      }

      if (!response.ok) {
        let errorMessage = "Translation failed";
        if (result && result.detail) {
          errorMessage = result.detail;
        } else {
          errorMessage = responseData.includes("Internal Server Error")
            ? "Server Timeout or Proxy Error. Check logs for progress."
            : responseData.substring(0, 150) || response.statusText;
        }
        throw new Error(errorMessage);
      }

      // Successful job start message (if we reach here)
      setLogs((prev) => [...prev, "🚀 Translation job requested successfully."]);

    } catch (error) {
      console.error("Translation request error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setLogs((prev) => [
        ...prev,
        `⚠️ Request Warning: ${errorMsg}`,
        "ℹ️ The translation might still be starting in the background. Please watch the logs below."
      ]);

      // Do NOT set isTranslating to false or close eventSource here
      // unless we are sure the job failed to even start.
      // If it's a timeout, the background task is likely already running.
    }
  };

  const handleDownload = (filename?: string) => {
    // If filename is an event object (from onClick), use translatedFileName instead
    const fileToDownload = (typeof filename === 'string' ? filename : null) || translatedFileName;

    if (!fileToDownload) {
      console.error("No filename available for download");
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    // Create a direct link for download
    const a = document.createElement("a");
    a.href = `${API_URL}/api/download/${encodeURIComponent(fileToDownload)}`;
    a.download = fileToDownload;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("openai_api_key", key);
    setShowApiKeyModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-indigo-950 dark:to-purple-950 relative overflow-hidden">
      {/* Enhanced Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-rose-400/20 dark:from-pink-500/10 dark:to-rose-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-gradient-to-br from-indigo-400/15 to-blue-400/15 dark:from-indigo-500/8 dark:to-blue-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/30 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl sticky top-0 z-50 shadow-xl shadow-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 slide-in-left">
              <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 dark:shadow-indigo-500/30 float">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-3xl blur-lg opacity-60 animate-pulse" />
                <svg
                  className="relative w-9 h-9 text-white drop-shadow-lg"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
                  Excel Translator
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold tracking-wide">
                  AI-Powered Translation Service
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="group flex items-center space-x-2.5 px-7 py-3.5 rounded-2xl bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 slide-in-right"
            >
              <svg
                className="w-5 h-5 text-gray-700 dark:text-gray-200 group-hover:rotate-90 transition-transform duration-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                Settings
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Settings */}
          <div className="space-y-6">
            {/* File Upload Card */}
            <div className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-3xl rounded-3xl shadow-2xl p-8 border border-white/40 dark:border-gray-700/40 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:border-indigo-300/60 dark:hover:border-indigo-500/40 transition-all duration-500 slide-in-left">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative w-11 h-11 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                  <svg className="relative w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  Upload File
                </h2>
              </div>
              <FileUpload file={file} onFileSelect={setFile} />
            </div>

            {/* Language Selection Card */}
            <div className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-3xl rounded-3xl shadow-2xl p-8 border border-white/40 dark:border-gray-700/40 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:border-purple-300/60 dark:hover:border-purple-500/40 transition-all duration-500 slide-in-left" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                  <svg className="relative w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Language Settings
                </h2>
              </div>
              <LanguageSelector
                sourceLang={sourceLang}
                targetLang={targetLang}
                onSourceChange={setSourceLang}
                onTargetChange={setTargetLang}
              />
            </div>

            {/* Translate Button */}
            <button
              onClick={handleTranslate}
              disabled={!file || isTranslating}
              className="group relative w-full py-7 px-8 rounded-3xl font-bold text-lg text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(99,102,241,0.5)] transform hover:scale-[1.02] hover:-translate-y-1 disabled:transform-none disabled:hover:scale-100 overflow-hidden slide-in-left" style={{ animationDelay: '0.2s' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
              <div className="absolute inset-0 shimmer" />
              {isTranslating ? (
                <span className="relative flex items-center justify-center space-x-3">
                  <svg
                    className="animate-spin h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Translating...</span>
                </span>
              ) : (
                <span className="relative flex items-center justify-center space-x-2">
                  <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Start Translation</span>
                </span>
              )}
            </button>
          </div>

          {/* Right Column - Progress & Logs */}
          <div className="space-y-6">
            <TranslationProgress
              isTranslating={isTranslating}
              progress={progress}
              logs={logs}
              translatedFileName={translatedFileName}
              onDownload={handleDownload}
            />
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl rounded-3xl p-8 border border-white/40 dark:border-gray-700/40 hover:border-indigo-300/60 dark:hover:border-indigo-500/40 shadow-xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 slide-in-bottom overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 dark:from-indigo-500/10 dark:to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-5 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                <svg
                  className="relative w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent mb-3">
                Fast & Accurate
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Powered by GPT-4 for high-quality translations with context awareness
              </p>
            </div>
          </div>

          <div className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl rounded-3xl p-8 border border-white/40 dark:border-gray-700/40 hover:border-purple-300/60 dark:hover:border-purple-500/40 shadow-xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 slide-in-bottom overflow-hidden" style={{ animationDelay: '0.1s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-5 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                <svg
                  className="relative w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-3">
                Multi-Sheet Support
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Handle complex Excel files with multiple sheets seamlessly
              </p>
            </div>
          </div>

          <div className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl rounded-3xl p-8 border border-white/40 dark:border-gray-700/40 hover:border-emerald-300/60 dark:hover:border-emerald-500/40 shadow-xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 slide-in-bottom overflow-hidden" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-5 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                <svg
                  className="relative w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-3">
                Secure & Private
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Your API key is stored locally. Files are processed securely
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleSaveApiKey}
        currentApiKey={apiKey}
      />
    </div>
  );
}

// Made with Bob

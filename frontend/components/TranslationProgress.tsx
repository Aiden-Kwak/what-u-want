"use client";

import { useEffect, useRef } from "react";

interface TranslationProgressProps {
  isTranslating: boolean;
  progress: number;
  logs: string[];
  translatedFileName: string | null;
  onDownload: () => void;
}

export function TranslationProgress({
  isTranslating,
  progress,
  logs,
  translatedFileName,
  onDownload,
}: TranslationProgressProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl rounded-3xl shadow-xl p-8 border border-white/20 dark:border-gray-700/30 slide-in-right">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl blur opacity-50 animate-pulse" />
          <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          Translation Progress
        </h2>
      </div>

      {/* Progress Bar */}
      {isTranslating && (
        <div className="mb-8 scale-in">
          <div className="flex justify-between items-center mb-3">
            <span className="text-base font-bold text-gray-700 dark:text-gray-300">
              Processing...
            </span>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              {progress}%
            </span>
          </div>
          <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 overflow-hidden shadow-inner">
            <div
              className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Logs Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            Activity Log
          </h3>
          {logs.length > 0 && (
            <span className="px-4 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-full border border-blue-200 dark:border-blue-700 shadow-sm">
              {logs.length} entries
            </span>
          )}
        </div>

        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-5 h-96 overflow-y-auto font-mono text-sm shadow-inner border border-gray-200/50 dark:border-gray-700/50">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center fade-in">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 rounded-3xl blur opacity-50" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-3xl flex items-center justify-center shadow-xl float">
                    <svg
                      className="w-12 h-12 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-600 dark:text-gray-400 mb-2">No activity yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Upload a file and start translation to see logs
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:scale-[1.01] slide-in-bottom ${log.includes("✅")
                    ? "text-green-700 dark:text-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 shadow-sm"
                    : log.includes("❌")
                      ? "text-red-700 dark:text-red-300 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border border-red-200 dark:border-red-700 shadow-sm"
                      : log.includes("📦")
                        ? "text-blue-700 dark:text-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-200 dark:border-blue-700 shadow-sm"
                        : "text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
                    }`}
                >
                  <span className="text-gray-500 dark:text-gray-400 mr-2 text-xs font-bold">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      {isTranslating && (
        <div className="mt-6 flex items-center justify-center space-x-3 text-base font-bold text-gray-700 dark:text-gray-300 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl py-4 px-6 border border-blue-200/50 dark:border-blue-700/50 shadow-lg scale-in">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-bounce shadow-lg" />
            <div
              className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce shadow-lg"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-3 h-3 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-bounce shadow-lg"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
          <span>Translation in progress...</span>
        </div>
      )}

      {/* Download Button - Show when translation is complete */}
      {translatedFileName && !isTranslating && (
        <div className="mt-6 scale-in">
          <button
            onClick={onDownload}
            className="group w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <svg className="relative w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <span className="text-lg">Download Translated File</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Made with Bob

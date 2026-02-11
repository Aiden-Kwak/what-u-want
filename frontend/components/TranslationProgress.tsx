"use client";

import { useEffect, useRef } from "react";

interface TranslationProgressProps {
  isTranslating: boolean;
  progress: number;
  logs: string[];
}

export function TranslationProgress({
  isTranslating,
  progress,
  logs,
}: TranslationProgressProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 rounded-3xl shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          Translation Progress
        </h2>
      </div>

      {/* Progress Bar */}
      {isTranslating && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-base font-semibold text-gray-700 dark:text-gray-300">
              Processing...
            </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500 ease-out shadow-lg animate-pulse"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Logs Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Activity Log
          </h3>
          {logs.length > 0 && (
            <span className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              {logs.length} entries
            </span>
          )}
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-5 h-96 overflow-y-auto font-mono text-sm shadow-inner border border-gray-200 dark:border-gray-700">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-3xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-11 h-11 text-gray-400 dark:text-gray-500"
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
                <p className="text-lg font-semibold mb-2">No activity yet</p>
                <p className="text-sm">
                  Upload a file and start translation to see logs
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`py-2 px-3 rounded-xl font-medium transition-all duration-200 hover:scale-[1.01] ${
                    log.includes("✅")
                      ? "text-green-700 dark:text-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700"
                      : log.includes("❌")
                      ? "text-red-700 dark:text-red-300 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border border-red-200 dark:border-red-700"
                      : log.includes("📦")
                      ? "text-blue-700 dark:text-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-200 dark:border-blue-700"
                      : "text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50"
                  }`}
                >
                  <span className="text-gray-500 dark:text-gray-400 mr-2 text-xs">
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
        <div className="mt-6 flex items-center justify-center space-x-3 text-base font-semibold text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 rounded-2xl py-4 px-6 border border-blue-200 dark:border-blue-700">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce shadow-lg" />
            <div
              className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce shadow-lg"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-3 h-3 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce shadow-lg"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
          <span>Translation in progress...</span>
        </div>
      )}
    </div>
  );
}

// Made with Bob

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cpu, Zap, Info, X } from 'lucide-react';

/**
 * Renders the active inference engine status badge:
 * - 🟢 "Engine: On-Device (Gemini Nano)"
 * - ⚡ "Engine: Cloud Edge (Gemini Flash)"
 */
export default function EngineBadge({ engine = 'cloud-fallback', label, details }) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const isOnDevice = engine === 'on-device';

  const displayLabel = label || (isOnDevice ? 'Engine: On-Device (Gemini Nano)' : 'Engine: Cloud Edge (Gemini 3.x Flash)');

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showInfoModal) {
        setShowInfoModal(false);
      }
    };
    if (showInfoModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showInfoModal]);

  const modalContent = showInfoModal ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="engine-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ink/70"
      onClick={() => setShowInfoModal(false)}
    >
      <div
        className="w-full max-w-lg bg-cream border-[3px] border-ink p-6 sm:p-7 shadow-brutal-xl rounded-none relative my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b-2 border-ink mb-4">
          <h2 id="engine-modal-title" className="text-xl font-display font-extrabold text-ink flex items-center gap-2">
            <span>⚡ Two-Tier AI Architecture</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowInfoModal(false)}
            className="p-1.5 border-2 border-ink bg-white hover:bg-amber-100 focus-ring shadow-brutal-sm transition-all"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-ink" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-ink/90">
          <div className="p-3.5 border-2 border-ink bg-white shadow-brutal-sm">
            <div className="flex items-center gap-2 font-bold text-ink mb-1">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 border border-ink"></span>
              <span>Tier 1: On-Device (Chrome Built-in AI)</span>
            </div>
            <p className="text-xs text-ink/80 leading-relaxed">
              Leverages the experimental Chrome Prompt API (<code className="bg-amber-100 px-1 py-0.5 border border-ink/40 font-mono text-[11px]">window.LanguageModel</code>) powered by local Gemini Nano. It executes locally on your hardware with <strong>zero server network cost</strong>, complete privacy, and instant processing.
            </p>
          </div>

          <div className="p-3.5 border-2 border-ink bg-white shadow-brutal-sm">
            <div className="flex items-center gap-2 font-bold text-ink mb-1">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500 border border-ink"></span>
              <span>Tier 2: Cloud Edge (Serverless Gemini 3.x Flash)</span>
            </div>
            <p className="text-xs text-ink/80 leading-relaxed">
              When local AI is unsupported (e.g. Safari, Firefox, iOS, non-flagged Chrome), inference seamlessly routes via Firebase Cloud Function to Google AI Studio Gemini 3.x Flash at the edge.
            </p>
          </div>

          <div className="p-3 bg-violet-100 border-2 border-ink text-xs text-ink font-medium">
            <strong>Current Active State:</strong> {details || 'System automatically selects the optimal engine.'}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setShowInfoModal(false)}
            className="brutal-btn bg-violet-600 text-white px-5 py-2 text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-ink text-xs sm:text-sm font-bold shadow-brutal-sm hover:shadow-brutal transition-all duration-150 focus-ring cursor-pointer ${
            isOnDevice
              ? 'bg-mint-100 text-ink hover:bg-mint/30'
              : 'bg-amber-100 text-ink hover:bg-amber/30'
          }`}
          aria-label={`${displayLabel}. Click for engine details.`}
          title="Click to view inference engine architecture details"
        >
          {isOnDevice ? (
            <span className="flex items-center gap-1.5 text-emerald-800">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-900">
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-700 animate-pulse" aria-hidden="true" />
            </span>
          )}

          <span>{displayLabel}</span>

          <Info className="w-3.5 h-3.5 text-ink/70 group-hover:text-ink transition-colors" aria-hidden="true" />
        </button>
      </div>

      {/* Render modal directly into document.body to ensure true viewport centering */}
      {typeof document !== 'undefined' && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}

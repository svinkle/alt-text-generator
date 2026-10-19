import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Cpu, Zap, Info, X } from 'lucide-react';

/**
 * Renders the active inference engine status badge:
 * - 🟢 "Engine: On-Device (Gemini Nano)"
 * - ⚡ "Engine: Cloud Edge (Gemini Flash)"
 */
export default function EngineBadge({ engine = 'cloud-fallback', label, details }) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const modalRef = useRef(null);
  // Accessibility audit remediation: [START]
  // Move focus into modal on open, trap focus within dialog, and return focus to trigger button on close (WCAG 2.4.3)
  // 2026-10-19, Scott Vinkle <scott@scottvinkle.com>
  const triggerRef = useRef(null);
  const isOnDevice = engine === 'on-device';

  const displayLabel = label || (isOnDevice ? 'Engine: On-Device (Gemini Nano)' : 'Engine: Cloud Edge (Gemini 3.x Flash)');

  const handleCloseModal = () => {
    setShowInfoModal(false);
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  };

  // Close modal on Escape key press and trap Tab focus within dialog
  useEffect(() => {
    if (!showInfoModal) return;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const initialFocusable = modalRef.current?.querySelectorAll(focusableSelector);
    if (initialFocusable?.length > 0) {
      initialFocusable[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(focusableSelector);
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (!modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showInfoModal]);
  // Accessibility audit remediation: [END]

  const modalContent = showInfoModal ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="engine-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ink/70 dark:bg-black/80"
      onClick={handleCloseModal}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-cream dark:bg-[#1E1B18] border-[3px] border-ink dark:border-cream/80 p-6 sm:p-7 shadow-brutal-xl dark:shadow-[8px_8px_0px_0px_#FBF8F1] rounded-none relative my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b-2 border-ink dark:border-cream/80 mb-4">
          <h2 id="engine-modal-title" className="text-xl font-display font-extrabold text-ink dark:text-cream flex items-center gap-2">
            <span>⚡ Two-Tier AI Architecture</span>
          </h2>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 border-2 border-ink dark:border-cream/80 bg-white dark:bg-[#25211E] text-ink dark:text-cream hover:bg-amber-100 dark:hover:bg-amber-950 focus-ring shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#FBF8F1] transition-all"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-ink dark:text-cream" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-ink/90 dark:text-cream/90">
          <div className="p-3.5 border-2 border-ink dark:border-cream/60 bg-white dark:bg-[#25211E] shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#FBF8F1]">
            <div className="flex items-center gap-2 font-bold text-ink dark:text-cream mb-1">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 border border-ink dark:border-cream/80"></span>
              <span>Tier 1: On-Device (Chrome Built-in AI)</span>
            </div>
            <p className="text-xs text-ink/80 dark:text-cream/80 leading-relaxed">
              Leverages the experimental Chrome Prompt API (<code className="bg-amber-100 dark:bg-amber-950 dark:text-amber-200 px-1 py-0.5 border border-ink/40 dark:border-cream/40 font-mono text-[11px]">window.LanguageModel</code>) powered by local Gemini Nano. It executes locally on your hardware with <strong>zero server network cost</strong>, complete privacy, and instant processing.
            </p>
          </div>

          <div className="p-3.5 border-2 border-ink dark:border-cream/60 bg-white dark:bg-[#25211E] shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#FBF8F1]">
            <div className="flex items-center gap-2 font-bold text-ink dark:text-cream mb-1">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500 border border-ink dark:border-cream/80"></span>
              <span>Tier 2: Cloud Edge (Serverless Gemini 3.x Flash)</span>
            </div>
            <p className="text-xs text-ink/80 dark:text-cream/80 leading-relaxed">
              When local AI is unsupported (e.g. Safari, Firefox, iOS, non-flagged Chrome), inference seamlessly routes via Firebase Cloud Function to Google AI Studio Gemini 3.x Flash at the edge.
            </p>
          </div>

          <div className="p-3 bg-violet-100 dark:bg-violet-950/60 border-2 border-ink dark:border-cream/60 text-xs text-ink dark:text-cream font-medium">
            <strong>Current Active State:</strong> {details || 'System automatically selects the optimal engine.'}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleCloseModal}
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
        {/* Accessibility audit remediation: [START]
            Add aria-haspopup="dialog" to dialog launcher in header and remove title attribute (WCAG 4.1.2)
            2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          onClick={() => setShowInfoModal(true)}
          className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-ink dark:border-cream/80 text-xs sm:text-sm font-bold shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#FBF8F1] hover:shadow-brutal dark:hover:shadow-[4px_4px_0px_0px_#FBF8F1] transition-all duration-150 focus-ring cursor-pointer ${
            isOnDevice
              ? 'bg-mint-100 dark:bg-emerald-950/80 text-ink dark:text-emerald-200 hover:bg-mint/30 dark:hover:bg-emerald-900/80'
              : 'bg-amber-100 dark:bg-amber-950/80 text-ink dark:text-amber-200 hover:bg-amber/30 dark:hover:bg-amber-900/80'
          }`}
          aria-label={`${displayLabel}. Click for engine details.`}
        >
        {/* Accessibility audit remediation: [END] */}
          {isOnDevice ? (
            <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-900 dark:text-amber-400">
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-700 dark:text-amber-300 animate-pulse" aria-hidden="true" />
            </span>
          )}

          <span>{displayLabel}</span>

          <Info className="w-3.5 h-3.5 text-ink/70 dark:text-cream/70 group-hover:text-ink dark:group-hover:text-cream transition-colors" aria-hidden="true" />
        </button>
      </div>

      {/* Render modal directly into document.body to ensure true viewport centering */}
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
}

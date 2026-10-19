import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Key, X, Check, ExternalLink, Trash2 } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, onKeySaved }) {
  const [apiKey, setApiKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const modalRef = useRef(null);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('gemini_api_key') || '';
      setApiKey(stored);
      setHasExistingKey(Boolean(stored));
      setSavedSuccess(false);
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen]);

  // Accessibility audit remediation: [START]
  // Move focus into modal on open and strictly trap Tab focus within dialog (WCAG 2.4.3)
  // 2026-10-19, Scott Vinkle <scott@scottvinkle.com>
  useEffect(() => {
    if (!isOpen) return;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const initialFocusable = modalRef.current?.querySelectorAll(focusableSelector);
    if (initialFocusable?.length > 0) {
      initialFocusable[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose]);
  // Accessibility audit remediation: [END]

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
      setHasExistingKey(true);
      setSavedSuccess(true);
      if (onKeySaved) onKeySaved(trimmed);
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setHasExistingKey(false);
    if (onKeySaved) onKeySaved('');
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ink/70 dark:bg-black/80"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-cream dark:bg-[#161616] border-[3px] border-ink dark:border-[#6E6E6E] p-6 shadow-brutal-xl dark:shadow-[8px_8px_0px_0px_#6E6E6E] rounded-none relative my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b-2 border-ink dark:border-[#6E6E6E] mb-4">
          <h2 id="api-key-modal-title" className="text-xl font-display font-extrabold text-ink dark:text-cream flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" aria-hidden="true" />
            <span>Gemini API Key</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-2 border-ink dark:border-[#6E6E6E] bg-white dark:bg-[#2D2D2D] text-ink dark:text-cream hover:bg-amber-100 dark:hover:bg-[#1C1C1C] focus-ring shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] transition-all"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-ink dark:text-cream" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-xs sm:text-sm text-ink/85 dark:text-cream/85 font-medium leading-relaxed">
            Provide a Google AI Studio API key for live Gemini 3.x Flash inference during local development or preview mode.
          </p>

          <div>
            <label htmlFor="gemini-key-input" className="block text-xs font-bold uppercase tracking-wider text-ink dark:text-cream mb-1">
              Google AI Studio Key
            </label>
            <input
              id="gemini-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-3 font-mono text-xs sm:text-sm bg-white dark:bg-[#1C1C1C] border-2 border-ink dark:border-[#6E6E6E] text-ink dark:text-cream shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] focus-ring"
            />
          </div>

          <div className="p-3 bg-white dark:bg-[#1C1C1C] border-2 border-ink dark:border-[#6E6E6E] text-xs text-ink/80 dark:text-cream/80 flex items-center justify-between shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E]">
            <span>Don't have a key yet?</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300 inline-flex items-center gap-1 focus-ring"
            >
              <span>Get Free Key</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {hasExistingKey && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-600 dark:border-rose-400 shadow-brutal-sm hover:bg-rose-100 dark:hover:bg-rose-900 focus-ring flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Key</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold border-2 border-ink dark:border-[#6E6E6E] bg-white dark:bg-[#2D2D2D] text-ink dark:text-cream hover:bg-cream dark:hover:bg-[#1C1C1C] shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] focus-ring"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!apiKey.trim()}
                className="brutal-btn bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Key</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

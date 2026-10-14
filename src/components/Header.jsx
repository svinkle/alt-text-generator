import React, { useState, useEffect } from 'react';
import { Key, Download } from 'lucide-react';
import EngineBadge from './EngineBadge';
import ApiKeyModal from './ApiKeyModal';

export default function Header({ engine, label, details, onOpenApiKeyModal }) {
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (typeof onOpenApiKeyModal === 'function') {
      onOpenApiKeyModal(() => setIsKeyModalOpen(true));
    }
  }, [onOpenApiKeyModal]);

  useEffect(() => {
    const key = typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
    setHasApiKey(Boolean(key));

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleKeySaved = (key) => {
    setHasApiKey(Boolean(key));
  };

  // Accessibility audit remediation: [START]
  // Fix: Added visually hidden skip link before header to bypass repetitive navigation controls (WCAG 2.4.1)
  // Date: 2025-05-14
  // Attribution: Scott Vinkle <scott@scottvinkle.com>
  const handleSkipToMain = (e) => {
    const mainEl = document.getElementById('main') || document.querySelector('main');
    if (mainEl) {
      e.preventDefault();
      if (!mainEl.hasAttribute('tabindex')) {
        mainEl.setAttribute('tabindex', '-1');
      }
      mainEl.focus();
    }
  };
  // Accessibility audit remediation: [END]

  return (
    <>
      {/* Accessibility audit remediation: [START] - Skip to main content link (Scott Vinkle <scott@scottvinkle.com>) */}
      <a
        href="#main"
        onClick={handleSkipToMain}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-ink focus:font-bold focus:border-[3px] focus:border-ink focus:shadow-brutal-sm"
      >
        Skip to main content
      </a>
      {/* Accessibility audit remediation: [END] */}
      <header className="w-full border-b-[3px] border-ink bg-white sticky top-0 z-30 shadow-brutal-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 shadow-brutal-sm rounded flex-shrink-0"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="28" height="28" rx="4" fill="#7C3AED" stroke="#1E1B18" strokeWidth="3" />
              <circle cx="11" cy="11" r="3" fill="#10B981" stroke="#1E1B18" strokeWidth="2" />
              <path d="M4 23L11 16L18 23L23 18L28 23" stroke="#FBF8F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-ink">
                  Alt Text Generator
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-200 border-2 border-ink rounded shadow-brutal-sm uppercase tracking-wider">
                  WCAG 2.2
                </span>
              </div>
              <p className="text-xs sm:text-sm text-ink/75 font-medium mt-0.5">
                Accessible, objective image descriptions powered by progressive AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 self-stretch sm:self-auto justify-between sm:justify-end flex-wrap">
            <EngineBadge engine={engine} label={label} details={details} />

            {/* Optional BYOK API Key button (kept for future use if needed):
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className={`p-2 border-2 border-ink shadow-brutal-sm hover:bg-cream active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-ring text-ink flex items-center gap-1.5 text-xs font-bold ${
                hasApiKey ? 'bg-amber-100 text-amber-950' : 'bg-white'
              }`}
              aria-label="Configure Gemini API key"
              title={hasApiKey ? 'Gemini API key configured' : 'Configure Gemini API key'}
            >
              <Key className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span className="hidden sm:inline">{hasApiKey ? 'API Key Set' : 'API Key'}</span>
            </button>
            */}

            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-emerald-100 hover:bg-emerald-200 border-2 border-ink shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-ring text-ink flex items-center gap-1.5 text-xs font-bold"
                aria-label="Install Alt Text Generator application"
                title="Install PWA"
              >
                <Download className="w-4 h-4 text-emerald-800" aria-hidden="true" />
                <span>Install</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={handleKeySaved}
      />
    </>
  );
}

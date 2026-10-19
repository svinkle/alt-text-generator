import React, { useState, useEffect } from 'react';
import { Key, Download, Sun, Moon, Github } from 'lucide-react';
import EngineBadge from './EngineBadge';
import ApiKeyModal from './ApiKeyModal';

// Helper to determine initial theme: saved preference -> OS setting -> 'light'
export function getInitialTheme() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export default function Header({ engine, label, details, onOpenApiKeyModal }) {
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Accessibility audit remediation: [START]
  // Dark mode theme state defaulting to user's operating system settings (WCAG 1.4.3, 2.1.1, 4.1.2)
  // 2026-10-19, Scott Vinkle <scott@scottvinkle.com>
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? '#101010' : '#7C3AED');
    }
  }, [theme]);

  // Listen to OS preference changes when no explicit manual preference is stored
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleOsChange = (e) => {
      const saved = localStorage.getItem('theme');
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleOsChange);
      return () => mediaQuery.removeEventListener('change', handleOsChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleOsChange);
      return () => mediaQuery.removeListener(handleOsChange);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', nextTheme);
    }
  };
  // Accessibility audit remediation: [END]

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

  return (
    <>
      <a
        href="#main"
        onClick={handleSkipToMain}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white dark:focus:bg-[#161616] focus:text-ink dark:focus:text-cream focus:font-bold focus:border-[3px] focus:border-ink dark:focus:border-[#6E6E6E] focus:shadow-brutal-sm"
      >
        Skip to main content
      </a>
      {/* Accessibility audit remediation: [START]
          Only apply sticky positioning on sm+ viewports so compact/zoomed viewports do not obscure focused controls (WCAG 2.4.11)
          2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
      <header className="w-full border-b-[3px] border-ink dark:border-[#6E6E6E] bg-white dark:bg-[#161616] sm:sticky sm:top-0 z-30 shadow-brutal-sm dark:shadow-[0_2px_0_0_#6E6E6E]">
      {/* Accessibility audit remediation: [END] */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Accessibility audit remediation: [START]
                Remove shadow from main logo to keep clean bordered outline (WCAG 1.4.11)
                2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="28" height="28" rx="4" fill="#7C3AED" stroke="#1E1B18" strokeWidth="3" className="dark:stroke-[#6E6E6E]" />
              <circle cx="11" cy="11" r="3" fill="#10B981" stroke="#1E1B18" strokeWidth="2" className="dark:stroke-[#6E6E6E]" />
              <path d="M4 23L11 16L18 23L23 18L28 23" stroke="#FBF8F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* Accessibility audit remediation: [END] */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-ink dark:text-cream">
                Alt Text Generator
              </h1>
              <p className="text-xs sm:text-sm text-ink/75 dark:text-cream/75 font-medium mt-0.5">
                Accessible, objective image descriptions powered by progressive AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 self-stretch sm:self-auto justify-between sm:justify-end flex-wrap">
            {/* Accessibility audit remediation: [START]
                Comment out dialog launcher in header as it's not critical information for end users
                2026-10-19, Scott Vinkle <scott@scottvinkle.com>
            <EngineBadge engine={engine} label={label} details={details} />
            Accessibility audit remediation: [END] */}

            {/* Accessibility audit remediation: [START]
                Add GitHub repository icon link beside theme toggle (WCAG 1.4.3, 2.4.4, 4.1.2)
                2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
            <a
              href="https://github.com/svinkle/alt-text-generator"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="p-2 border-2 border-ink dark:border-[#6E6E6E] bg-white dark:bg-[#2D2D2D] text-ink dark:text-cream shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] hover:bg-cream dark:hover:bg-[#383838] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-ring flex items-center justify-center rounded cursor-pointer"
            >
              <Github className="w-4 h-4 text-ink dark:text-cream" aria-hidden="true" />
            </a>
            {/* Accessibility audit remediation: [END] */}

            {/* Accessibility audit remediation: [START]
                Theme toggle button defaulting to OS settings (WCAG 1.4.3, 2.1.1, 4.1.2)
                2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'dark'}
              className="p-2 border-2 border-ink dark:border-[#6E6E6E] bg-white dark:bg-[#2D2D2D] text-ink dark:text-cream shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] hover:bg-cream dark:hover:bg-[#383838] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-ring flex items-center justify-center rounded cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-ink" aria-hidden="true" />
              )}
            </button>
            {/* Accessibility audit remediation: [END] */}

            {/* Optional BYOK API Key button (kept for future use if needed):
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setIsKeyModalOpen(true)}
              className={`p-2 border-2 border-ink shadow-brutal-sm hover:bg-cream active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-ring text-ink flex items-center gap-1.5 text-xs font-bold ${
                hasApiKey ? 'bg-amber-100 text-amber-950' : 'bg-white'
              }`}
              aria-label="Configure Gemini API key"
            >
              <Key className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span className="hidden sm:inline">{hasApiKey ? 'API Key Set' : 'API Key'}</span>
            </button>
            */}

            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 border-2 border-ink dark:border-[#6E6E6E] shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-ring text-ink dark:text-emerald-200 flex items-center gap-1.5 text-xs font-bold"
                aria-label="Install Alt Text Generator application"
              >
                <Download className="w-4 h-4 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
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

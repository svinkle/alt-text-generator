import React from 'react';
import { Sparkles, Github, Eye } from 'lucide-react';
import EngineBadge from './EngineBadge';

export default function Header({ engine, label, details }) {
  return (
    <header className="w-full border-b-[3px] border-ink bg-white/80 backdrop-blur-sm sticky top-0 z-30 shadow-brutal-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-violet-600 border-[3px] border-ink shadow-brutal-sm flex items-center justify-center text-white flex-shrink-0">
            <Eye className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" aria-hidden="true" />
          </div>
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

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
          <EngineBadge engine={engine} label={label} details={details} />
          
          <a
            href="https://github.com/svinkle/alt-text-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white border-2 border-ink shadow-brutal-sm hover:bg-cream active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-ring text-ink"
            aria-label="View source code on GitHub"
            title="GitHub Repository"
          >
            <Github className="w-5 h-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}

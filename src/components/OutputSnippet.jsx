import React, { useState, useRef } from 'react';
import { Copy, Check, Code, FileText, Sparkles, Cpu, Edit3 } from 'lucide-react';
import { copyToClipboard } from '../utils/copyToClipboard';

function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function OutputSnippet({
  altText,
  onAltTextChange,
  filename,
  engineUsed,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  // Accessibility audit remediation: [START]
  // Move focus to revealed textarea when activating Edit mode (WCAG 2.4.3)
  // 2026-10-19, Scott Vinkle <scott@scottvinkle.com>
  const textareaRef = useRef(null);

  const handleToggleEdit = () => {
    const nextEditing = !isEditing;
    setIsEditing(nextEditing);
    if (nextEditing) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };
  // Accessibility audit remediation: [END]

  const cleanFilename = filename || 'image.jpg';
  const htmlSnippet = `<img src="${escapeHtmlAttr(cleanFilename)}" alt="${escapeHtmlAttr(altText)}" />`;
  const safeMdAlt = String(altText).replace(/[[\]]/g, '\\$&');
  const safeMdUrl = String(cleanFilename).replace(/[()]/g, '\\$&');
  const markdownSnippet = `![${safeMdAlt}](${safeMdUrl})`;

  const handleCopy = async (key, textToCopy) => {
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey(null);
      }, 2000);
    }
  };

  return (
    <section aria-labelledby="results-section-title" className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-mint border border-ink shadow-brutal-sm rounded-full"></div>
          <h2 id="results-section-title" className="text-xl sm:text-2xl font-display font-extrabold text-ink dark:text-cream">
            Generated Alt Text & Snippets
          </h2>
        </div>

        {engineUsed === 'on-device' && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#1C1C1C] border-2 border-ink dark:border-[#6E6E6E] text-ink dark:text-cream text-xs font-bold shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E]">
            <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Generated On-Device (0 Network Latency)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 1. Raw Alt Text Card */}
        <div className="brutal-card p-5 sm:p-6 bg-white relative">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink dark:border-[#6E6E6E] mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-violet-100 dark:bg-violet-950 border-2 border-ink dark:border-[#6E6E6E] shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] text-violet-700 dark:text-violet-300">
                <FileText className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg text-ink dark:text-cream">
                Raw Alt Text Description
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Accessibility audit remediation: [START]
                  Move focus to textarea on Edit toggle and ensure copy button accessible name begins with visible text (WCAG 2.4.3, 2.5.3, 4.1.3)
                  2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
              <button
                type="button"
                onClick={handleToggleEdit}
                className="px-2.5 py-1 text-xs font-bold border-2 border-ink dark:border-[#6E6E6E] bg-white dark:bg-[#2D2D2D] hover:bg-cream dark:hover:bg-[#1C1C1C] text-ink dark:text-cream shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all focus-ring flex items-center gap-1"
                aria-label={isEditing ? 'Done editing alt text' : 'Edit alt text'}
              >
                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isEditing ? 'Done' : 'Edit'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy('raw', altText)}
                className={`brutal-btn px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 ${
                  copiedKey === 'raw'
                    ? 'bg-mint text-ink'
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                }`}
              >
                {copiedKey === 'raw' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                    <span>Copied!</span>
                    <span className="sr-only"> raw alt text to clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    <span>Copy Text</span>
                    <span className="sr-only"> (raw alt text to clipboard)</span>
                  </>
                )}
              </button>
              {/* Accessibility audit remediation: [END] */}
            </div>
          </div>

          {isEditing ? (
            /* Accessibility audit remediation: [START]
               Focus textarea on open and link helper note via aria-describedby (WCAG 2.4.3, 1.3.1)
               2026-10-19, Scott Vinkle <scott@scottvinkle.com> */
            <div>
              <label htmlFor="edit-alt-text" className="sr-only">Edit alt text</label>
              <textarea
                ref={textareaRef}
                id="edit-alt-text"
                rows={3}
                value={altText}
                onChange={(e) => onAltTextChange(e.target.value)}
                aria-describedby="edit-alt-text-help"
                className="w-full p-3 font-body text-base text-ink dark:text-cream bg-cream dark:bg-[#1C1C1C] border-2 border-ink dark:border-[#6E6E6E] focus-ring resize-y"
              />
              <p id="edit-alt-text-help" className="text-xs text-ink/70 dark:text-cream/70 mt-1 font-medium">
                Changes to the alt text will immediately reflect in the HTML and Markdown snippets below.
              </p>
            </div>
            /* Accessibility audit remediation: [END] */
          ) : (
            <div className="p-4 bg-cream dark:bg-[#1C1C1C] border-2 border-ink dark:border-[#6E6E6E] font-body text-base sm:text-lg text-ink dark:text-cream leading-relaxed">
              "{altText}"
            </div>
          )}
        </div>

        {/* 2. HTML Snippet Card */}
        <div className="brutal-card p-5 sm:p-6 bg-white relative">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink dark:border-[#6E6E6E] mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 dark:bg-amber-950 border-2 border-ink dark:border-[#6E6E6E] shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] text-amber-800 dark:text-amber-300">
                <Code className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg text-ink dark:text-cream">
                HTML Image Tag Snippet
              </h3>
            </div>

            {/* Accessibility audit remediation: [START]
                Ensure copy button accessible name matches visible text in both default and Copied! states (WCAG 2.5.3, 4.1.3)
                2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
            <button
              type="button"
              onClick={() => handleCopy('html', htmlSnippet)}
              className={`brutal-btn px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 ${
                copiedKey === 'html'
                  ? 'bg-mint text-ink'
                  : 'bg-amber-400 text-ink hover:bg-amber-500'
              }`}
            >
              {copiedKey === 'html' ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                  <span>Copied!</span>
                  <span className="sr-only"> HTML image tag snippet to clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copy HTML</span>
                  <span className="sr-only"> image tag snippet to clipboard</span>
                </>
              )}
            </button>
            {/* Accessibility audit remediation: [END] */}
          </div>

          <div className="p-3 sm:p-4 bg-[#1E1B18] dark:bg-[#101010] text-[#FBF8F1] border-2 border-ink dark:border-[#6E6E6E] font-mono text-xs sm:text-sm overflow-x-auto shadow-inner">
            <code>{htmlSnippet}</code>
          </div>
        </div>

        {/* 3. Markdown Snippet Card */}
        <div className="brutal-card p-5 sm:p-6 bg-white relative">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink dark:border-[#6E6E6E] mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-mint-100 dark:bg-emerald-950 border-2 border-ink dark:border-[#6E6E6E] shadow-brutal-sm dark:shadow-[2px_2px_0px_0px_#6E6E6E] text-emerald-800 dark:text-emerald-300">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg text-ink dark:text-cream">
                Markdown Image Syntax
              </h3>
            </div>

            {/* Accessibility audit remediation: [START]
                Use high-contrast text-ink on bg-mint (6.76:1) instead of white on emerald-500 (WCAG 1.4.3) and align accessible name with visible text (WCAG 2.5.3, 4.1.3)
                2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
            <button
              type="button"
              onClick={() => handleCopy('markdown', markdownSnippet)}
              className={`brutal-btn px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 ${
                copiedKey === 'markdown'
                  ? 'bg-mint text-ink'
                  : 'bg-mint text-ink hover:bg-emerald-400'
              }`}
            >
              {copiedKey === 'markdown' ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                  <span>Copied!</span>
                  <span className="sr-only"> Markdown image syntax to clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copy Markdown</span>
                  <span className="sr-only"> image syntax to clipboard</span>
                </>
              )}
            </button>
            {/* Accessibility audit remediation: [END] */}
          </div>

          <div className="p-3 sm:p-4 bg-[#1E1B18] dark:bg-[#101010] text-[#FBF8F1] border-2 border-ink dark:border-[#6E6E6E] font-mono text-xs sm:text-sm overflow-x-auto shadow-inner">
            <code>{markdownSnippet}</code>
          </div>
        </div>
      </div>

      {/* Accessibility audit remediation: [START]
          Polite live region to announce clipboard copy confirmation to screen readers (WCAG 4.1.3)
          2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {copiedKey === 'raw' && 'Copied raw alt text to clipboard.'}
        {copiedKey === 'html' && 'Copied HTML snippet to clipboard.'}
        {copiedKey === 'markdown' && 'Copied Markdown syntax to clipboard.'}
      </div>
      {/* Accessibility audit remediation: [END] */}
    </section>
  );
}

import React, { useState } from 'react';
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
          <h2 id="results-section-title" className="text-xl sm:text-2xl font-display font-extrabold text-ink">
            Generated Alt Text & Snippets
          </h2>
        </div>

        {engineUsed === 'on-device' && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-ink text-xs font-bold shadow-brutal-sm">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Generated On-Device (0 Network Latency)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 1. Raw Alt Text Card */}
        <div className="brutal-card p-5 sm:p-6 bg-white relative">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-violet-100 border-2 border-ink shadow-brutal-sm text-violet-700">
                <FileText className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg text-ink">
                Raw Alt Text Description
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="px-2.5 py-1 text-xs font-bold border-2 border-ink bg-white hover:bg-cream shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all focus-ring flex items-center gap-1"
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
                aria-label="Copy raw alt text to clipboard"
              >
                {copiedKey === 'raw' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isEditing ? (
            <div>
              <label htmlFor="edit-alt-text" className="sr-only">Edit alt text</label>
              <textarea
                id="edit-alt-text"
                rows={3}
                value={altText}
                onChange={(e) => onAltTextChange(e.target.value)}
                className="w-full p-3 font-body text-base text-ink bg-cream border-2 border-ink focus-ring resize-y"
              />
              <p className="text-xs text-ink/70 mt-1 font-medium">
                Changes to the alt text will immediately reflect in the HTML and Markdown snippets below.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-cream border-2 border-ink font-body text-base sm:text-lg text-ink leading-relaxed">
              "{altText}"
            </div>
          )}
        </div>

        {/* 2. HTML Snippet Card */}
        <div className="brutal-card p-5 sm:p-6 bg-white relative">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 border-2 border-ink shadow-brutal-sm text-amber-800">
                <Code className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg text-ink">
                HTML Image Tag Snippet
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handleCopy('html', htmlSnippet)}
              className={`brutal-btn px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 ${
                copiedKey === 'html'
                  ? 'bg-mint text-ink'
                  : 'bg-amber-400 text-ink hover:bg-amber-500'
              }`}
              aria-label="Copy HTML image tag snippet to clipboard"
            >
              {copiedKey === 'html' ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copy HTML</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 sm:p-4 bg-[#1E1B18] text-[#FBF8F1] border-2 border-ink font-mono text-xs sm:text-sm overflow-x-auto shadow-inner">
            <code>{htmlSnippet}</code>
          </div>
        </div>

        {/* 3. Markdown Snippet Card */}
        <div className="brutal-card p-5 sm:p-6 bg-white relative">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-mint-100 border-2 border-ink shadow-brutal-sm text-emerald-800">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg text-ink">
                Markdown Image Syntax
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handleCopy('markdown', markdownSnippet)}
              className={`brutal-btn px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 ${
                copiedKey === 'markdown'
                  ? 'bg-mint text-ink'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
              aria-label="Copy Markdown image syntax to clipboard"
            >
              {copiedKey === 'markdown' ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 sm:p-4 bg-[#1E1B18] text-[#FBF8F1] border-2 border-ink font-mono text-xs sm:text-sm overflow-x-auto shadow-inner">
            <code>{markdownSnippet}</code>
          </div>
        </div>
      </div>
    </section>
  );
}

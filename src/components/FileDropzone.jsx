import React, { useRef, useState } from 'react';
import { UploadCloud, Link as LinkIcon, X, RefreshCw, CheckCircle2, Globe, FileImage } from 'lucide-react';

/**
 * Format bytes to human readable format
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function FileDropzone({
  selectedFile,
  previewUrl,
  onFileSelect,
  onUrlSubmit,
  onFileRemove,
  onSubmit,
  isLoading,
  statusMessage,
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [urlInputError, setUrlInputError] = useState('');
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        onFileSelect(file);
      } else {
        alert('Please drop a supported image file (PNG, JPEG, or WebP).');
      }
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerFileInput();
    }
  };

  const handleUrlFormSubmit = (e) => {
    e.preventDefault();
    const trimmed = urlInputValue.trim();
    if (!trimmed) {
      setUrlInputError('Please enter an image URL.');
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setUrlInputError('Please enter a valid URL (including https://).');
      return;
    }
    setUrlInputError('');
    onUrlSubmit(trimmed);
  };

  React.useEffect(() => {
    const tabUpload = document.getElementById('tab-upload');
    const tabUrl = document.getElementById('tab-url');
    if (tabUpload) {
      tabUpload.setAttribute('tabindex', activeTab === 'upload' ? '0' : '-1');
    }
    if (tabUrl) {
      tabUrl.setAttribute('tabindex', activeTab === 'url' ? '0' : '-1');
    }
  }, [activeTab]);

  return (
    <section aria-labelledby="upload-section-title" className="w-full">
      <h2 id="upload-section-title" className="sr-only">
        Select or Upload Image for Alt Text Generation
      </h2>

      <div className="brutal-card-lg p-6 sm:p-8 bg-white relative">
        {/* Hidden Accessible File Input */}
        <input
          ref={fileInputRef}
          type="file"
          id="image-file-input"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleInputChange}
          className="sr-only"
          disabled={isLoading}
          aria-describedby="file-upload-help"
        />

        {!selectedFile ? (
          <div>
            {/* Source Selection Tabs */}
            <div
              role="tablist"
              aria-label="Image source options"
              onKeyDown={(e) => {
                let nextTab = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  nextTab = activeTab === 'upload' ? 'url' : 'upload';
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  nextTab = 'upload';
                } else if (e.key === 'End') {
                  e.preventDefault();
                  nextTab = 'url';
                }
                if (nextTab) {
                  setActiveTab(nextTab);
                  setUrlInputError('');
                  const nextBtn = document.getElementById(`tab-${nextTab}`);
                  if (nextBtn) nextBtn.focus();
                }
              }}
              className="flex border-b-2 border-ink mb-6 gap-2"
            >
              <button
                type="button"
                role="tab"
                id="tab-upload"
                tabIndex={activeTab === 'upload' ? 0 : -1}
                aria-selected={activeTab === 'upload'}
                aria-controls="panel-upload"
                onClick={() => {
                  setActiveTab('upload');
                  setUrlInputError('');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 font-display font-bold text-sm border-t-2 border-l-2 border-r-2 border-ink -mb-[2px] transition-all focus-ring ${
                  activeTab === 'upload'
                    ? 'bg-cream text-ink border-b-2 border-b-cream shadow-none'
                    : 'bg-white text-ink/70 hover:text-ink hover:bg-cream/50'
                }`}
              >
                <UploadCloud className="w-4 h-4" aria-hidden="true" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-url"
                aria-selected={activeTab === 'url'}
                aria-controls="panel-url"
                onClick={() => {
                  setActiveTab('url');
                  setUrlInputError('');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 font-display font-bold text-sm border-t-2 border-l-2 border-r-2 border-ink -mb-[2px] transition-all focus-ring ${
                  activeTab === 'url'
                    ? 'bg-cream text-ink border-b-2 border-b-cream shadow-none'
                    : 'bg-white text-ink/70 hover:text-ink hover:bg-cream/50'
                }`}
              >
                <LinkIcon className="w-4 h-4" aria-hidden="true" />
                <span>Image URL</span>
              </button>
            </div>

            {/* TAB PANEL 1: Upload File */}
            {activeTab === 'upload' && (
              <div
                role="tabpanel"
                id="panel-upload"
                aria-labelledby="tab-upload"
              >
                <div
                  role="button"
                  tabIndex={isLoading ? -1 : 0}
                  onClick={triggerFileInput}
                  onKeyDown={handleKeyDown}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`cursor-pointer border-[3px] border-dashed border-ink p-8 sm:p-12 text-center transition-all duration-150 focus-ring ${
                    isDragOver
                      ? 'bg-amber-100 border-violet-600 scale-[0.99]'
                      : 'bg-cream hover:bg-violet-50'
                  }`}
                  aria-label="Upload image drop zone. Press Enter or Space to open file dialog."
                >
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-violet-600 text-white border-[3px] border-ink shadow-brutal flex items-center justify-center mb-5">
                    <UploadCloud className="w-9 h-9 sm:w-11 sm:h-11" aria-hidden="true" />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-display font-bold text-ink mb-2">
                    Drag & Drop Image Here
                  </h3>

                  <p className="text-sm sm:text-base text-ink/80 mb-4 font-medium">
                    or <span className="underline decoration-2 decoration-violet-600 font-bold text-violet-700">browse files</span> from your device
                  </p>

                  <div
                    id="file-upload-help"
                    className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-ink text-xs font-bold text-ink/70 shadow-brutal-sm"
                  >
                    <span>PNG, JPEG, or WEBP up to 10MB</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB PANEL 2: Image URL Input */}
            {activeTab === 'url' && (
              <div
                role="tabpanel"
                id="panel-url"
                aria-labelledby="tab-url"
                className="p-6 sm:p-8 border-[3px] border-dashed border-ink bg-cream"
              >
                <form onSubmit={handleUrlFormSubmit} className="space-y-4 max-w-2xl mx-auto">
                  <div className="text-center sm:text-left space-y-1">
                    <label htmlFor="image-url-input" className="block text-base sm:text-lg font-display font-bold text-ink">
                      Enter Image URL
                    </label>
                    <p className="text-xs sm:text-sm text-ink/75 font-medium">
                      Paste a direct link to any public image on the web (JPEG, PNG, or WebP).
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      id="image-url-input"
                      type="url"
                      value={urlInputValue}
                      onChange={(e) => {
                        setUrlInputValue(e.target.value);
                        if (urlInputError) setUrlInputError('');
                      }}
                      placeholder="https://example.com/photos/image.jpg"
                      disabled={isLoading}
                      required
                      className="flex-1 p-3 border-2 border-ink bg-white font-mono text-sm text-ink placeholder:text-ink/40 shadow-brutal-sm focus-ring"
                    />

                    <button
                      type="submit"
                      disabled={isLoading || !urlInputValue.trim()}
                      className="brutal-btn bg-amber-400 hover:bg-amber-500 text-ink px-6 py-3 text-sm font-bold flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LinkIcon className="w-4 h-4" aria-hidden="true" />
                      <span>Load Image</span>
                    </button>
                  </div>

                  {urlInputError && (
                    <p className="text-xs font-bold text-rose-700 bg-rose-50 border-2 border-rose-600 p-2">
                      {urlInputError}
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
        ) : (
          /* File Selected State (both upload and URL) */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center sm:items-start gap-6 p-4 sm:p-5 border-[3px] border-ink bg-cream shadow-brutal">
              {/* Thumbnail Preview & Attribution */}
              <div className="w-full md:w-48 flex-shrink-0 flex flex-col gap-2">
                <div className="w-full h-44 sm:h-40 border-[3px] border-ink bg-white overflow-hidden shadow-brutal-sm relative group">
                  <img
                    src={previewUrl}
                    alt={`Preview of selected image ${selectedFile.name}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-ink/10 pointer-events-none" />
                </div>

                {selectedFile.attribution && (
                  <div className="text-[11px] text-ink/80 font-medium leading-tight p-2 bg-white border-2 border-ink shadow-brutal-sm">
                    <span>Photo by </span>
                    <a
                      href={selectedFile.attribution.photographerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold text-violet-700 hover:text-violet-900 focus-ring"
                    >
                      {selectedFile.attribution.photographerName}
                    </a>
                    <span> from </span>
                    <a
                      href={selectedFile.attribution.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold text-violet-700 hover:text-violet-900 focus-ring"
                    >
                      {selectedFile.attribution.sourceName}
                    </a>
                  </div>
                )}
              </div>

              {/* Metadata & Actions */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider bg-mint text-ink border-2 border-ink shadow-brutal-sm">
                        Ready to Analyze
                      </span>
                      {selectedFile.isUrl ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-amber-200 text-ink border-2 border-ink shadow-brutal-sm">
                          <Globe className="w-3 h-3" aria-hidden="true" />
                          <span>Web URL</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-violet-100 text-ink border-2 border-ink shadow-brutal-sm">
                          <FileImage className="w-3 h-3" aria-hidden="true" />
                          <span>Local File</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-ink break-all">
                      {selectedFile.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={onFileRemove}
                    disabled={isLoading}
                    className="p-1.5 bg-white border-2 border-ink shadow-brutal-sm hover:bg-rose-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-ring"
                    aria-label="Remove selected image"
                    title="Remove image"
                  >
                    <X className="w-5 h-5 text-ink" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-ink/80 pt-1">
                  <div className="bg-white border-2 border-ink p-2 shadow-brutal-sm">
                    <span className="font-sans text-[11px] block font-bold text-ink/60">SIZE</span>
                    <span className="font-bold">
                      {selectedFile.size ? formatFileSize(selectedFile.size) : 'Web Image'}
                    </span>
                  </div>
                  <div className="bg-white border-2 border-ink p-2 shadow-brutal-sm">
                    <span className="font-sans text-[11px] block font-bold text-ink/60">TYPE</span>
                    <span className="font-bold">{selectedFile.type || 'image/jpeg'}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onFileRemove}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white border-2 border-ink shadow-brutal-sm hover:bg-amber-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all focus-ring"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Change Image</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isLoading}
                className={`w-full sm:w-auto px-8 py-3.5 text-base sm:text-lg font-display font-extrabold text-white border-[3px] border-ink transition-all duration-150 focus-ring flex items-center justify-center gap-3 ${
                  isLoading
                    ? 'bg-violet-400 cursor-not-allowed opacity-80'
                    : 'bg-violet-600 hover:bg-violet-700 shadow-brutal hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_#1E1B18] active:translate-x-[2px] active:translate-y-[2px] active:shadow-brutal-sm cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Analyzing Image...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
                    <span>Generate Alt Text</span>
                  </>
                )}
              </button>

              {isLoading && (
                <span className="text-xs sm:text-sm font-medium text-ink/80 animate-pulse">
                  Applying WCAG digital accessibility standards...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Accessible Live Region for Screen Readers */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {statusMessage}
        </div>
      </div>
    </section>
  );
}

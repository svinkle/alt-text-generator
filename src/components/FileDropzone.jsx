import React, { useRef, useState } from 'react';
import { UploadCloud, Link as LinkIcon, Sparkles, X, RefreshCw, CheckCircle2, Globe, FileImage } from 'lucide-react';

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
  onLoadSample,
  onFileRemove,
  onSubmit,
  isLoading,
  statusMessage,
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url' | 'demo'
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [urlInputError, setUrlInputError] = useState('');
  // Accessibility audit remediation: [START]
  // Replace blocking window.alert() with inline accessible error state and add dynamic APG Tabs keyboard navigation (WCAG 2.1.1, 3.3.1)
  // 2026-10-19, Scott Vinkle <scott@scottvinkle.com>
  const [uploadError, setUploadError] = useState('');
  const tablistRef = useRef(null);
  // Accessibility audit remediation: [END]
  const fileInputRef = useRef(null);
  const natureBtnRef = useRef(null);
  const teamBtnRef = useRef(null);

  // Accessibility audit remediation: [START]
  // Dynamic WAI-ARIA APG Tabs keyboard navigation (ArrowRight, ArrowLeft, Home, End) across all tab elements (WCAG 2.1.1)
  // 2026-10-19, Scott Vinkle <scott@scottvinkle.com>
  const handleTabKeyDown = (e) => {
    const tabs = Array.from(tablistRef.current.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    let nextIndex = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTabEl = tabs[nextIndex];
      const nextTabId = nextTabEl.id.replace('tab-', '');
      setActiveTab(nextTabId);
      setUrlInputError('');
      setUploadError('');
      nextTabEl.focus();
    }
  };
  // Accessibility audit remediation: [END]

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
    if (e.relatedTarget && e.currentTarget && e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Accessibility audit remediation: [START]
  // Replace blocking window.alert() with persistent inline role="alert" error messaging (WCAG 3.3.1)
  // 2026-10-19, Scott Vinkle <scott@scottvinkle.com>
  const validateAndSelectFile = (file) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setUploadError('Unsupported file format. Please upload a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size exceeds the 10MB maximum limit. Please choose a smaller image.');
      return;
    }
    setUploadError('');
    onFileSelect(file);
  };
  // Accessibility audit remediation: [END]

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
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
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Unsupported URL protocol');
      }
    } catch {
      setUrlInputError('Please enter a valid URL (including https://).');
      return;
    }
    setUrlInputError('');
    onUrlSubmit(trimmed);
  };

  const isDemoLoaded = Boolean(
    selectedFile &&
      (selectedFile.source === 'demo' ||
        (Boolean(selectedFile.isDemo || selectedFile.attribution) &&
          selectedFile.source !== 'url' &&
          selectedFile.source !== 'upload'))
  );
  const isUrlLoaded = Boolean(
    selectedFile &&
      (selectedFile.source === 'url' || selectedFile.isUrl) &&
      selectedFile.source !== 'demo'
  );
  const isUploadLoaded = Boolean(
    selectedFile &&
      (selectedFile.source === 'upload' || (!isDemoLoaded && !isUrlLoaded))
  );
  const isNatureActive = Boolean(
    isDemoLoaded &&
      (selectedFile?.name?.includes('mountain') ||
        selectedFile?.name?.includes('hiker') ||
        selectedFile?.attribution?.photographerName?.includes('Daniel'))
  );
  const isTeamActive = Boolean(
    isDemoLoaded &&
      (selectedFile?.name?.includes('team') ||
        selectedFile?.name?.includes('boardroom') ||
        selectedFile?.attribution?.photographerName?.includes('Matthew'))
  );

  const handleRemove = () => {
    const wasNature = isNatureActive;
    const wasTeam = isTeamActive;
    const isDemo = isDemoLoaded || activeTab === 'demo';

    setUploadError('');
    if (onFileRemove) {
      onFileRemove();
    }

    if (isDemo) {
      setTimeout(() => {
        if (wasTeam && teamBtnRef.current) {
          teamBtnRef.current.focus();
        } else if (natureBtnRef.current) {
          natureBtnRef.current.focus();
        }
      }, 0);
    }
  };

  const renderPreviewCard = () => {
    if (!selectedFile) return null;
    return (
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
                  {selectedFile.isDemo || selectedFile.attribution ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-amber-200 text-ink border-2 border-ink shadow-brutal-sm">
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      <span>Demo Sample</span>
                    </span>
                  ) : selectedFile.isUrl ? (
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
                onClick={handleRemove}
                disabled={isLoading}
                className="p-1.5 bg-white border-2 border-ink shadow-brutal-sm hover:bg-rose-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all focus-ring"
                aria-label={isDemoLoaded || activeTab === 'demo' ? 'Close' : 'Remove selected image'}
                title={isDemoLoaded || activeTab === 'demo' ? 'Close' : 'Remove image'}
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
                onClick={handleRemove}
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
    );
  };

  return (
    <section aria-labelledby="upload-section-title" className="w-full">
      <h2 id="upload-section-title" className="sr-only">
        Select or Upload Image for Alt Text Generation
      </h2>

      <div className="brutal-card-lg p-4 sm:p-8 bg-white relative">
        {/* Accessibility audit remediation: [START]
            Remove visually hidden file input from sequential Tab order and accessibility tree (WCAG 4.1.2, 2.4.3)
            2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
        <input
          ref={fileInputRef}
          type="file"
          id="image-file-input"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleInputChange}
          className="sr-only"
          disabled={isLoading}
          tabIndex={-1}
          aria-hidden="true"
        />
        {/* Accessibility audit remediation: [END] */}

        {/* Accessibility audit remediation: [START]
            Implement WAI-ARIA APG Tabs roving tabindex & Arrow key navigation and responsive 320px reflow (WCAG 2.1.1, 1.4.10)
            2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Image source options"
          onKeyDown={handleTabKeyDown}
          className="flex flex-wrap border-b-2 border-ink mb-6 gap-1.5 sm:gap-2"
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
              setUploadError('');
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 font-display font-bold text-xs sm:text-sm border-t-2 border-l-2 border-r-2 border-ink -mb-[2px] transition-all focus-ring ${
              activeTab === 'upload'
                ? 'bg-cream text-ink border-b-2 border-b-cream shadow-none'
                : 'bg-white text-ink/70 hover:text-ink hover:bg-cream/50'
            }`}
          >
            <UploadCloud className="w-4 h-4" aria-hidden="true" />
            <span>Upload File</span>
            {isUploadLoaded && (
              <span className="w-2 h-2 rounded-full bg-violet-600 inline-block ml-0.5" title="File loaded" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            id="tab-url"
            tabIndex={activeTab === 'url' ? 0 : -1}
            aria-selected={activeTab === 'url'}
            aria-controls="panel-url"
            onClick={() => {
              setActiveTab('url');
              setUrlInputError('');
              setUploadError('');
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 font-display font-bold text-xs sm:text-sm border-t-2 border-l-2 border-r-2 border-ink -mb-[2px] transition-all focus-ring ${
              activeTab === 'url'
                ? 'bg-cream text-ink border-b-2 border-b-cream shadow-none'
                : 'bg-white text-ink/70 hover:text-ink hover:bg-cream/50'
            }`}
          >
            <LinkIcon className="w-4 h-4" aria-hidden="true" />
            <span>Image URL</span>
            {isUrlLoaded && (
              <span className="w-2 h-2 rounded-full bg-violet-600 inline-block ml-0.5" title="URL image loaded" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            id="tab-demo"
            tabIndex={activeTab === 'demo' ? 0 : -1}
            aria-selected={activeTab === 'demo'}
            aria-controls="panel-demo"
            onClick={() => {
              setActiveTab('demo');
              setUrlInputError('');
              setUploadError('');
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 font-display font-bold text-xs sm:text-sm border-t-2 border-l-2 border-r-2 border-ink -mb-[2px] transition-all focus-ring ${
              activeTab === 'demo'
                ? 'bg-cream text-ink border-b-2 border-b-cream shadow-none'
                : 'bg-white text-ink/70 hover:text-ink hover:bg-cream/50'
            }`}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Try Demo</span>
            {isDemoLoaded && (
              <span className="w-2 h-2 rounded-full bg-violet-600 inline-block ml-0.5" title="Demo loaded" aria-hidden="true" />
            )}
          </button>
        </div>
        {/* Accessibility audit remediation: [END] */}

        {/* TAB PANEL 1: Upload File */}
        {activeTab === 'upload' && (
          <div
            role="tabpanel"
            id="panel-upload"
            aria-labelledby="tab-upload"
          >
            {isUploadLoaded && selectedFile ? (
              renderPreviewCard()
            ) : (
              /* Accessibility audit remediation: [START]
                 Use visible text for accessible name (WCAG 2.5.3) and display inline role="alert" file validation errors (WCAG 3.3.1)
                 2026-10-19, Scott Vinkle <scott@scottvinkle.com> */
              <div className="space-y-4">
                <div
                  role="button"
                  tabIndex={isLoading ? -1 : 0}
                  aria-describedby={uploadError ? 'file-upload-help file-upload-error' : 'file-upload-help'}
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
                >
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-violet-600 text-white border-[3px] border-ink shadow-brutal flex items-center justify-center mb-5">
                    <UploadCloud className="w-9 h-9 sm:w-11 sm:h-11" aria-hidden="true" />
                  </div>

                  <span className="block text-xl sm:text-2xl font-display font-bold text-ink mb-2">
                    Drag & Drop Image Here
                  </span>

                  <span className="block text-sm sm:text-base text-ink/80 mb-4 font-medium">
                    or <span className="underline decoration-2 decoration-violet-600 font-bold text-violet-700">browse files</span> from your device
                  </span>

                  <div
                    id="file-upload-help"
                    className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-ink text-xs font-bold text-ink/70 shadow-brutal-sm"
                  >
                    <span>PNG, JPEG, or WEBP up to 10MB</span>
                  </div>
                </div>

                {uploadError && (
                  <p
                    id="file-upload-error"
                    role="alert"
                    className="text-xs font-bold text-rose-700 bg-rose-50 border-2 border-rose-600 p-2"
                  >
                    {uploadError}
                  </p>
                )}
              </div>
              /* Accessibility audit remediation: [END] */
            )}
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
            {isUrlLoaded && selectedFile ? (
              renderPreviewCard()
            ) : (
              /* Accessibility audit remediation: [START]
                 Programmatically associate URL input with helper instructions and error message via aria-describedby, aria-invalid, and role="alert" (WCAG 3.3.1)
                 2026-10-19, Scott Vinkle <scott@scottvinkle.com> */
              <form noValidate onSubmit={handleUrlFormSubmit} className="space-y-4 max-w-2xl mx-auto">
                <div className="text-center sm:text-left space-y-1">
                  <label htmlFor="image-url-input" className="block text-base sm:text-lg font-display font-bold text-ink">
                    Enter Image URL
                  </label>
                  <p id="image-url-hint" className="text-xs sm:text-sm text-ink/75 font-medium">
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
                    aria-invalid={Boolean(urlInputError)}
                    aria-describedby={urlInputError ? 'image-url-hint image-url-error' : 'image-url-hint'}
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
                  <p
                    id="image-url-error"
                    role="alert"
                    className="text-xs font-bold text-rose-700 bg-rose-50 border-2 border-rose-600 p-2"
                  >
                    {urlInputError}
                  </p>
                )}
              </form>
              /* Accessibility audit remediation: [END] */
            )}
          </div>
        )}

        {/* TAB PANEL 3: Try Demo */}
        {activeTab === 'demo' && (
          <div
            role="tabpanel"
            id="panel-demo"
            aria-labelledby="tab-demo"
            className="p-6 sm:p-8 border-[3px] border-dashed border-ink bg-cream space-y-6"
          >
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center">
                <h3 className="text-xl sm:text-2xl font-display font-bold text-ink mb-1">
                  Try a Demo Image
                </h3>
                <p className="text-sm sm:text-base text-ink/80 font-medium">
                  Select one of the sample images below to test instant WCAG 2.2-compliant alt text generation without uploading your own file.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Demo Card 1: Mountain Sunrise */}
                <div
                  className={`border-[3px] border-ink bg-white p-4 shadow-brutal flex flex-col justify-between transition-all ${
                    isNatureActive ? 'ring-2 ring-violet-600 bg-amber-50/50' : ''
                  }`}
                >
                  <div>
                    <div className="h-32 sm:h-36 w-full border-2 border-ink mb-3 overflow-hidden bg-amber-50 relative">
                      <img
                        src="https://burst.shopifycdn.com/photos/hiker-looks-out-over-view-from-mountain-summit.jpg?width=600&format=pjpg&exif=0&iptc=0"
                        alt="Mountain Sunrise preview"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isNatureActive && (
                        <span className="absolute top-2 right-2 bg-amber-300 text-ink border-2 border-ink text-[10px] font-extrabold uppercase px-1.5 py-0.5 shadow-brutal-sm">
                          Loaded
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-bold text-base text-ink">
                      Mountain Sunrise
                    </h4>
                    <p className="text-xs text-ink/70 font-medium mt-0.5 mb-3">
                      Hiker on summit with mountain sunrise view
                    </p>
                  </div>
                  <button
                    ref={natureBtnRef}
                    type="button"
                    onClick={() => onLoadSample && onLoadSample('nature')}
                    disabled={isLoading}
                    className={`w-full brutal-btn py-2 text-xs font-bold shadow-brutal-sm disabled:opacity-50 ${
                      isNatureActive
                        ? 'bg-amber-400 hover:bg-amber-500 text-ink'
                        : 'bg-amber-300 hover:bg-amber-400 text-ink'
                    }`}
                    aria-label="Load Mountain Sunrise demo image"
                  >
                    {isLoading && isNatureActive ? 'Loading...' : isNatureActive ? 'Reload Mountain Sunrise' : 'Load Mountain Sunrise'}
                  </button>
                </div>

                {/* Demo Card 2: Team Collaboration */}
                <div
                  className={`border-[3px] border-ink bg-white p-4 shadow-brutal flex flex-col justify-between transition-all ${
                    isTeamActive ? 'ring-2 ring-violet-600 bg-mint-50/50' : ''
                  }`}
                >
                  <div>
                    <div className="h-32 sm:h-36 w-full border-2 border-ink mb-3 overflow-hidden bg-mint-50 relative">
                      <img
                        src="https://burst.shopifycdn.com/photos/business-team-meeting-boardroom.jpg?width=600&format=pjpg&exif=0&iptc=0"
                        alt="Team Collaboration preview"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isTeamActive && (
                        <span className="absolute top-2 right-2 bg-mint text-ink border-2 border-ink text-[10px] font-extrabold uppercase px-1.5 py-0.5 shadow-brutal-sm">
                          Loaded
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-bold text-base text-ink">
                      Team Collaboration
                    </h4>
                    <p className="text-xs text-ink/70 font-medium mt-0.5 mb-3">
                      Colleagues discussing ideas in a conference room
                    </p>
                  </div>
                  <button
                    ref={teamBtnRef}
                    type="button"
                    onClick={() => onLoadSample && onLoadSample('team')}
                    disabled={isLoading}
                    className={`w-full brutal-btn py-2 text-xs font-bold shadow-brutal-sm disabled:opacity-50 ${
                      isTeamActive
                        ? 'bg-mint hover:bg-mint/90 text-ink'
                        : 'bg-mint hover:bg-mint/80 text-ink'
                    }`}
                    aria-label="Load Team Collaboration demo image"
                  >
                    {isLoading && isTeamActive ? 'Loading...' : isTeamActive ? 'Reload Team Collaboration' : 'Load Team Collaboration'}
                  </button>
                </div>
              </div>

              {/* Loaded Demo Preview Section */}
              {isDemoLoaded && selectedFile && (
                <div className="pt-2">
                  {renderPreviewCard()}
                </div>
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

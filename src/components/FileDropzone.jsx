import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

/**
 * Format bytes to human readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function FileDropzone({
  selectedFile,
  previewUrl,
  onFileSelect,
  onFileRemove,
  onSubmit,
  isLoading,
  statusMessage,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
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
    // Only turn off if leaving the drop container
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

  return (
    <section aria-labelledby="upload-section-title" className="w-full">
      <h2 id="upload-section-title" className="sr-only">
        Upload Image for Alt Text Generation
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
          /* Dropzone state: No file selected */
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
        ) : (
          /* File Selected State */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6 p-4 sm:p-5 border-[3px] border-ink bg-cream shadow-brutal">
              {/* Thumbnail Preview */}
              <div className="w-full md:w-48 h-48 sm:h-44 flex-shrink-0 border-[3px] border-ink bg-white overflow-hidden shadow-brutal-sm relative group">
                <img
                  src={previewUrl}
                  alt={`Preview of selected image ${selectedFile.name}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-ink/10 pointer-events-none" />
              </div>

              {/* Metadata & Actions */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider bg-mint text-ink border-2 border-ink shadow-brutal-sm mb-1">
                      Ready to Analyze
                    </span>
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
                    <span className="font-bold">{formatFileSize(selectedFile.size)}</span>
                  </div>
                  <div className="bg-white border-2 border-ink p-2 shadow-brutal-sm">
                    <span className="font-sans text-[11px] block font-bold text-ink/60">TYPE</span>
                    <span className="font-bold">{selectedFile.type || 'image'}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={triggerFileInput}
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

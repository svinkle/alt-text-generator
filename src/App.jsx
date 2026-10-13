import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileDropzone from './components/FileDropzone';
import OutputSnippet from './components/OutputSnippet';
import { generateAltText, checkAvailableEngine } from './utils/aiEngine';
import { AlertCircle, ShieldCheck, Github } from 'lucide-react';

export const PHOTO_ATTRIBUTIONS = {
  nature: {
    photographerName: 'Daniel Moroder',
    photographerUrl:
      'https://www.shopify.com/stock-photos/@daniel_moroder?utm_campaign=photo_credit&utm_content=Browse+Free+HD+Images+of+Hiker+Looks+Out+Over+View+From+Mountain+Summit&utm_medium=referral&utm_source=credit',
    sourceName: 'Burst',
    sourceUrl:
      'https://www.shopify.com/stock-photos/sunrise?utm_campaign=photo_credit&utm_content=Browse+Free+HD+Images+of+Hiker+Looks+Out+Over+View+From+Mountain+Summit&utm_medium=referral&utm_source=credit',
  },
  team: {
    photographerName: 'Matthew Henry',
    photographerUrl:
      'https://www.shopify.com/stock-photos/@matthew_henry?utm_campaign=photo_credit&utm_content=High+Res+Business+Team+Meeting+In+Boardroom+Picture+%E2%80%94+Free+Images&utm_medium=referral&utm_source=credit',
    sourceName: 'Burst',
    sourceUrl:
      'https://www.shopify.com/stock-photos/meetings?utm_campaign=photo_credit&utm_content=High+Res+Business+Team+Meeting+In+Boardroom+Picture+%E2%80%94+Free+Images&utm_medium=referral&utm_source=credit',
  },
};

export function parseImageFilename(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || 'web-image.jpg';
  } catch {
    return 'web-image.jpg';
  }
}

export function detectAttribution(url) {
  if (url && (url.includes('hiker') || url.includes('mountain'))) {
    return PHOTO_ATTRIBUTIONS.nature;
  }
  if (url && (url.includes('boardroom') || url.includes('business-team'))) {
    return PHOTO_ATTRIBUTIONS.team;
  }
  return null;
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [altText, setAltText] = useState('');
  const [engineUsed, setEngineUsed] = useState(null);
  const [engineInfo, setEngineInfo] = useState({
    engine: 'cloud-fallback',
    label: 'Engine: Cloud Edge (Gemini 3.x Flash)',
    details: 'Detecting available inference capabilities...',
  });
  const [statusMessage, setStatusMessage] = useState('Ready for image upload.');

  // Check on-device AI availability on mount
  useEffect(() => {
    let isMounted = true;
    async function detect() {
      const info = await checkAvailableEngine();
      if (isMounted) {
        setEngineInfo(info);
      }
    }
    detect();
    return () => {
      isMounted = false;
    };
  }, []);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (file, attribution = null, source = 'upload') => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    file.attribution = attribution;
    file.isDemo = source === 'demo';
    file.source = source;
    file.isUrl = source === 'url';
    setSelectedFile(file);
    setPreviewUrl(url);
    setError(null);
    setAltText('');
    setEngineUsed(null);
    setStatusMessage(`Selected image ${file.name}. Ready to generate alt text.`);
  };

  const handleUrlSelect = (url, customFilename = null, attribution = null, source = 'url') => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const filename = customFilename || parseImageFilename(url);
    const matchedAttribution = attribution || detectAttribution(url);

    const imageItem = {
      name: filename,
      url: url,
      isUrl: source === 'url',
      isDemo: source === 'demo',
      source: source,
      size: null,
      type: 'image/jpeg',
      attribution: matchedAttribution,
    };

    setSelectedFile(imageItem);
    setPreviewUrl(url);
    setError(null);
    setAltText('');
    setEngineUsed(null);
    setStatusMessage(`Loaded image from URL: ${filename}. Ready to generate alt text.`);
  };

  const handleUrlSubmit = async (url) => {
    setIsLoading(true);
    setError(null);
    setStatusMessage(`Fetching image from ${url}...`);

    const filename = parseImageFilename(url);
    const attribution = detectAttribution(url);

    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        handleFileSelect(file, attribution, 'url');
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Direct fetch failed (possibly CORS), verifying via image element:', e);
    }

    // Fallback: Verify image can load via standard browser Image object
    const img = new Image();
    img.onload = () => {
      handleUrlSelect(url, filename, attribution, 'url');
      setIsLoading(false);
    };
    img.onerror = () => {
      setError('Unable to load image from the provided URL. Please verify the link is accessible.');
      setIsLoading(false);
    };
    img.src = url;
  };

  const handleFileRemove = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setAltText('');
    setEngineUsed(null);
    setStatusMessage('Image removed. Ready for new image.');
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setStatusMessage('Analyzing image and synthesizing WCAG-compliant alt text...');

    try {
      const result = await generateAltText(selectedFile);
      setAltText(result.text);
      setEngineUsed(result.engine);
      setStatusMessage(`Alt text generated successfully using ${result.engine === 'on-device' ? 'On-Device Gemini Nano' : 'Cloud Edge Gemini 3.x Flash'}.`);
    } catch (err) {
      console.error('Error generating alt text:', err);
      const message = err.message || 'Inference failed. Please check your network connection or API settings.';
      setError(message);
      setStatusMessage(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Preset demo loader for 'Mountain Sunrise' and 'Team Collaboration'
  const handleLoadSample = async (sampleType) => {
    setIsLoading(true);
    setError(null);

    const isNature = sampleType === 'nature';
    const sampleLabel = isNature ? 'Mountain Sunrise' : 'Team Collaboration';
    const demoUrl = isNature
      ? 'https://burst.shopifycdn.com/photos/hiker-looks-out-over-view-from-mountain-summit.jpg?width=1850&format=pjpg&exif=0&iptc=0'
      : 'https://burst.shopifycdn.com/photos/business-team-meeting-boardroom.jpg?width=1850&format=pjpg&exif=0&iptc=0';
    const demoFilename = isNature ? 'mountain-sunrise.png' : 'team-collaboration.png';
    const attribution = isNature ? PHOTO_ATTRIBUTIONS.nature : PHOTO_ATTRIBUTIONS.team;

    setStatusMessage(`Loading demo image: ${sampleLabel} (${demoFilename})...`);

    try {
      const response = await fetch(demoUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], demoFilename, { type: blob.type || 'image/jpeg' });
      handleFileSelect(file, attribution, 'demo');
    } catch (err) {
      console.warn('Fetch demo image failed, loading via URL directly:', err);
      handleUrlSelect(demoUrl, demoFilename, attribution, 'demo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col font-body selection:bg-violet-600 selection:text-white">
      {/* Header with Engine Badge and GitHub Link */}
      <Header
        engine={engineUsed || engineInfo.engine}
        label={engineUsed ? (engineUsed === 'on-device' ? 'Engine: On-Device (Gemini Nano)' : 'Engine: Cloud Edge (Gemini 3.x Flash)') : engineInfo.label}
        details={engineInfo.details}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Error notification */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-rose-100 border-[3px] border-ink shadow-brutal text-ink flex items-start gap-3 animate-shake"
          >
            <AlertCircle className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 text-sm font-medium">
              <strong className="block font-bold font-display text-rose-900">Inference Error</strong>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-bold underline focus-ring"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Upload / URL / Demo Dropzone */}
        <FileDropzone
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          onFileSelect={handleFileSelect}
          onUrlSubmit={handleUrlSubmit}
          onLoadSample={handleLoadSample}
          onFileRemove={handleFileRemove}
          onSubmit={handleGenerate}
          isLoading={isLoading}
          statusMessage={statusMessage}
        />

        {/* Results Area */}
        {altText && (
          <OutputSnippet
            altText={altText}
            onAltTextChange={setAltText}
            filename={selectedFile ? selectedFile.name : 'image.jpg'}
            engineUsed={engineUsed}
          />
        )}

        {/* Accessibility Best Practices Card */}
        <div className="border-[3px] border-ink bg-white p-6 shadow-brutal">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-violet-600 stroke-[2.5]" aria-hidden="true" />
            <h3 className="text-lg font-display font-bold text-ink">
              WCAG Alt Text Standards Enforced
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-ink/80">
            <div className="p-3 border-2 border-ink bg-cream shadow-brutal-sm">
              <strong className="block font-bold text-ink mb-1">1. Objective & Concise</strong>
              Focuses on the core subject and context in 1 to 2 sentences without subjective speculation.
            </div>
            <div className="p-3 border-2 border-ink bg-cream shadow-brutal-sm">
              <strong className="block font-bold text-ink mb-1">2. No Redundant Phrases</strong>
              Never starts with "Image of" or "Picture of" — screen readers already announce the image role.
            </div>
            <div className="p-3 border-2 border-ink bg-cream shadow-brutal-sm">
              <strong className="block font-bold text-ink mb-1">3. Transcribes Text</strong>
              Extracts and transcribes any legible text or important data visible within the graphic.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-[3px] border-ink bg-white mt-12 py-6 text-center text-xs font-medium text-ink/75">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <p>
              Made with <span role="img" aria-label="love">❤️</span> by{' '}
              <a
                href="https://scottvinkle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-ink hover:text-violet-700 focus-ring"
              >
                svinkle
              </a>
            </p>
            <span aria-hidden="true" className="text-ink/40">•</span>
            <a
              href="https://github.com/svinkle/alt-text-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-ink hover:text-violet-700 focus-ring"
              aria-label="View source code on GitHub"
              title="GitHub Repository"
            >
              <Github className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="underline">GitHub</span>
            </a>
          </div>
          <a
            href="https://www.w3.org/WAI/tutorials/images/decision-tree/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-violet-700 hover:text-violet-900 focus-ring"
          >
            W3C Image Decision Tree Guidelines ↗
          </a>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileDropzone from './components/FileDropzone';
import OutputSnippet from './components/OutputSnippet';
import { generateAltText, checkAvailableEngine } from './utils/aiEngine';
import { AlertCircle, HelpCircle, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [altText, setAltText] = useState('');
  const [engineUsed, setEngineUsed] = useState(null);
  const [engineInfo, setEngineInfo] = useState({
    engine: 'cloud-fallback',
    label: 'Engine: Cloud Edge (Gemini Flash)',
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

  const handleFileSelect = (file) => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setError(null);
    setAltText('');
    setEngineUsed(null);
    setStatusMessage(`Selected image ${file.name}. Ready to generate alt text.`);
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
      setStatusMessage(`Alt text generated successfully using ${result.engine === 'on-device' ? 'On-Device Gemini Nano' : 'Cloud Edge Gemini Flash'}.`);
    } catch (err) {
      console.error('Error generating alt text:', err);
      const message = err.message || 'Inference failed. Please check your network connection or API settings.';
      setError(message);
      setStatusMessage(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick preset loader for testing/demo purposes
  const handleLoadSample = async (sampleType) => {
    try {
      let sampleData;
      let filename;
      if (sampleType === 'nature') {
        filename = 'mountain-sunrise.png';
        sampleData = createSampleCanvas('A golden sunrise casting light across snow-capped alpine mountains and a tranquil blue lake.', '#1E3A8A', '#F59E0B');
      } else {
        filename = 'team-collaboration.png';
        sampleData = createSampleCanvas('A diverse group of software designers collaborating around a whiteboard with flowcharts.', '#4C1D95', '#10B981');
      }

      const res = await fetch(sampleData);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/png' });
      handleFileSelect(file);
    } catch (e) {
      console.warn('Could not generate sample image:', e);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col font-body selection:bg-violet-600 selection:text-white">
      {/* Header */}
      <Header
        engine={engineUsed || engineInfo.engine}
        label={engineUsed ? (engineUsed === 'on-device' ? 'Engine: On-Device (Gemini Nano)' : 'Engine: Cloud Edge (Gemini Flash)') : engineInfo.label}
        details={engineInfo.details}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Intro banner */}
        <div className="border-[3px] border-ink bg-white p-5 sm:p-6 shadow-brutal flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2 py-0.5 text-xs font-black uppercase tracking-wider bg-violet-100 text-violet-700 border-2 border-ink shadow-brutal-sm">
              Two-Tier Progressive Enhancement
            </span>
            <p className="text-sm sm:text-base text-ink/90 font-medium leading-relaxed">
              Generates concise, objective alt text adhering to WCAG 2.2 guidelines. Runs <strong>locally on-device via Chrome Built-in AI</strong> with fallback to <strong>Gemini 2.0 Flash</strong> in the cloud.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-ink/70">Try a demo image:</span>
            <button
              type="button"
              onClick={() => handleLoadSample('nature')}
              className="text-xs font-bold px-2.5 py-1 bg-amber-100 hover:bg-amber-200 border-2 border-ink shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all focus-ring"
            >
              Mountain Sunrise
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample('team')}
              className="text-xs font-bold px-2.5 py-1 bg-mint-100 hover:bg-mint/40 border-2 border-ink shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all focus-ring"
            >
              Team Design
            </button>
          </div>
        </div>

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

        {/* Upload Dropzone */}
        <FileDropzone
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          onFileSelect={handleFileSelect}
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
          <p>
            Built for digital accessibility with <span className="font-bold text-ink">React</span>, <span className="font-bold text-ink">Tailwind CSS</span>, and <span className="font-bold text-ink">Google Gemini</span>.
          </p>
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

/**
 * Creates a simple canvas-based test graphic for instant demo loading
 */
function createSampleCanvas(text, bg1, bg2) {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 600, 400);
  grad.addColorStop(0, bg1);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 400);

  // Border
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#1E1B18';
  ctx.strokeRect(0, 0, 600, 400);

  // Decorative shapes
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(300, 180, 80, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(300, 180, 60, 0, Math.PI * 2);
  ctx.fill();

  // Label text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WCAG Test Sample Graphic', 300, 320);

  return canvas.toDataURL('image/png');
}

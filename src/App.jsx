import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import FileDropzone from "./components/FileDropzone";
import OutputSnippet from "./components/OutputSnippet";
import { generateAltText, checkAvailableEngine } from "./utils/aiEngine";
import { AlertCircle } from "lucide-react";

export const PHOTO_ATTRIBUTIONS = {
  nature: {
    photographerName: "Daniel Moroder",
    photographerUrl:
      "https://www.shopify.com/stock-photos/@daniel_moroder?utm_campaign=photo_credit&utm_content=Browse+Free+HD+Images+of+Hiker+Looks+Out+Over+View+From+Mountain+Summit&utm_medium=referral&utm_source=credit",
    sourceName: "Burst",
    sourceUrl:
      "https://www.shopify.com/stock-photos/sunrise?utm_campaign=photo_credit&utm_content=Browse+Free+HD+Images+of+Hiker+Looks+Out+Over+View+From+Mountain+Summit&utm_medium=referral&utm_source=credit",
  },
  team: {
    photographerName: "Matthew Henry",
    photographerUrl:
      "https://www.shopify.com/stock-photos/@matthew_henry?utm_campaign=photo_credit&utm_content=High+Res+Business+Team+Meeting+In+Boardroom+Picture+%E2%80%94+Free+Images&utm_medium=referral&utm_source=credit",
    sourceName: "Burst",
    sourceUrl:
      "https://www.shopify.com/stock-photos/meetings?utm_campaign=photo_credit&utm_content=High+Res+Business+Team+Meeting+In+Boardroom+Picture+%E2%80%94+Free+Images&utm_medium=referral&utm_source=credit",
  },
};

export function parseImageFilename(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "web-image.jpg";
  } catch {
    return "web-image.jpg";
  }
}

export function detectAttribution(url) {
  if (url && (url.includes("hiker") || url.includes("mountain"))) {
    return PHOTO_ATTRIBUTIONS.nature;
  }
  if (url && (url.includes("boardroom") || url.includes("business-team"))) {
    return PHOTO_ATTRIBUTIONS.team;
  }
  return null;
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [altText, setAltText] = useState("");
  const [engineUsed, setEngineUsed] = useState(null);
  const [engineInfo, setEngineInfo] = useState({
    engine: "cloud-fallback",
    label: "Engine: Cloud Edge (Gemini 3.x Flash)",
    details: "Detecting available inference capabilities...",
  });
  const [statusMessage, setStatusMessage] = useState("Ready for image upload.");
  const abortControllerRef = useRef(null);
  // Accessibility audit remediation: [START]
  // Shift focus to Dismiss button on error and shift focus to selected tab on dismiss (WCAG 2.4.3 Focus Order)
  // 2026-10-19, Scott Vinkle <scott@scottvinkle.com>
  const dismissBtnRef = useRef(null);

  useEffect(() => {
    if (error && dismissBtnRef.current) {
      dismissBtnRef.current.focus();
    }
  }, [error]);

  const handleDismissError = () => {
    setError(null);
    const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
    activeTab?.focus();
  };

  // Accessibility audit remediation: [START]
  // Clear generated alt text section and shift focus back to currently active Tab (WCAG 2.4.3 Focus Order)
  // 2026-10-19, Scott Vinkle <scott@scottvinkle.com>
  const handleClearGenerated = () => {
    setAltText("");
    const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
    activeTab?.focus();
  };
  // Accessibility audit remediation: [END]

  // Clear live region announcements after 5 seconds to prevent discovering out of context (WCAG 4.1.3)
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => {
      setStatusMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [statusMessage]);
  // Accessibility audit remediation: [END]

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
      abortControllerRef.current?.abort();
    };
  }, []);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (
    file,
    attribution = null,
    source = "upload",
    sampleType = null,
  ) => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    file.attribution = attribution;
    file.isDemo = source === "demo";
    file.source = source;
    file.isUrl = source === "url";
    file.sampleType = sampleType;
    setSelectedFile(file);
    setPreviewUrl(url);
    setError(null);
    setAltText("");
    setEngineUsed(null);
    setStatusMessage(
      `Selected image ${file.name}. Ready to generate alt text.`,
    );
  };

  const handleUrlSelect = (
    url,
    customFilename = null,
    attribution = null,
    source = "url",
    sampleType = null,
  ) => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const filename = customFilename || parseImageFilename(url);
    const matchedAttribution = attribution || detectAttribution(url);

    const imageItem = {
      name: filename,
      url: url,
      isUrl: source === "url",
      isDemo: source === "demo",
      source: source,
      sampleType: sampleType,
      size: null,
      type: "image/jpeg",
      attribution: matchedAttribution,
    };

    setSelectedFile(imageItem);
    setPreviewUrl(url);
    setError(null);
    setAltText("");
    setEngineUsed(null);
    setStatusMessage(
      `Loaded image from URL: ${filename}. Ready to generate alt text.`,
    );
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
        const file = new File([blob], filename, {
          type: blob.type || "image/jpeg",
        });
        handleFileSelect(file, attribution, "url");
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn(
        "Direct fetch failed (possibly CORS), verifying via image element:",
        e,
      );
    }

    // Fallback: Verify image can load via standard browser Image object
    const img = new Image();
    img.onload = () => {
      handleUrlSelect(url, filename, attribution, "url");
      setIsLoading(false);
    };
    img.onerror = () => {
      setError(
        "Unable to load image from the provided URL. Please verify the link is accessible.",
      );
      setIsLoading(false);
    };
    img.src = url;
  };

  const handleFileRemove = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setAltText("");
    setEngineUsed(null);
    setStatusMessage("Image removed. Ready for new image.");
  };

  const handleGenerate = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setStatusMessage(
      "Analyzing image and synthesizing WCAG-compliant alt text...",
    );

    try {
      const result = await generateAltText(selectedFile, {
        signal: controller.signal,
      });
      setAltText(result.text);
      setEngineUsed(result.engine);
      setStatusMessage(
        `Alt text generated successfully using ${result.engine === "on-device" ? "On-Device Gemini Nano" : "Cloud Edge Gemini 3.x Flash"}.`,
      );
    } catch (err) {
      console.error("Error generating alt text:", err);
      const message =
        err.message ||
        "Inference failed. Please check your network connection or API settings.";
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

    const isNature = sampleType === "nature";
    const sampleLabel = isNature ? "Mountain Sunrise" : "Team Collaboration";
    const demoUrl = isNature
      ? "https://burst.shopifycdn.com/photos/hiker-looks-out-over-view-from-mountain-summit.jpg?width=1850&format=pjpg&exif=0&iptc=0"
      : "https://burst.shopifycdn.com/photos/business-team-meeting-boardroom.jpg?width=1850&format=pjpg&exif=0&iptc=0";
    const demoFilename = isNature
      ? "mountain-sunrise.png"
      : "team-collaboration.png";
    const attribution = isNature
      ? PHOTO_ATTRIBUTIONS.nature
      : PHOTO_ATTRIBUTIONS.team;

    setStatusMessage(`Loading demo image: ${sampleLabel} (${demoFilename})...`);

    try {
      const response = await fetch(demoUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], demoFilename, {
        type: blob.type || "image/jpeg",
      });
      handleFileSelect(file, attribution, "demo", sampleType);
    } catch (err) {
      console.warn("Fetch demo image failed, loading via URL directly:", err);
      handleUrlSelect(demoUrl, demoFilename, attribution, "demo", sampleType);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-[#101010] text-ink dark:text-cream flex flex-col font-body selection:bg-violet-600 selection:text-white">
      {/* Header with Engine Badge and GitHub Link */}
      <Header
        engine={engineUsed || engineInfo.engine}
        label={
          engineUsed
            ? engineUsed === "on-device"
              ? "Engine: On-Device (Gemini Nano)"
              : "Engine: Cloud Edge (Gemini 3.x Flash)"
            : engineInfo.label
        }
        details={engineInfo.details}
      />

      {/* Main Content */}
      <main
        id="main"
        className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8"
      >
        {/* Accessibility audit remediation: [START]
            Error banner: Dismiss button first in DOM order, followed by h2 heading and content (WCAG 1.3.1, 1.3.2, 2.4.3)
            2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-rose-100 dark:bg-rose-950/80 border-[3px] border-ink dark:border-rose-400 shadow-brutal dark:shadow-[4px_4px_0px_0px_#F87171] text-ink dark:text-rose-100 animate-shake relative"
          >
            <button
              ref={dismissBtnRef}
              type="button"
              onClick={handleDismissError}
              className="absolute top-4 right-4 text-xs font-bold underline focus-ring text-ink dark:text-rose-200"
            >
              Dismiss
            </button>
            <h2 className="text-sm font-bold font-display text-rose-900 dark:text-rose-200 pr-16">
              Inference Error
            </h2>
            <div className="flex items-start gap-2 mt-1 text-sm font-medium">
              <AlertCircle
                className="w-5 h-5 text-rose-700 dark:text-rose-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          </div>
        )}
        {/* Accessibility audit remediation: [END] */}

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
            filename={selectedFile ? selectedFile.name : "image.jpg"}
            engineUsed={engineUsed}
            onClear={handleClearGenerated}
          />
        )}
      </main>

      {/* Footer */}
      {/* Accessibility audit remediation: [START]
          Dark mode high-contrast styling for footer (WCAG 1.4.3, 1.4.11)
          2026-10-19, Scott Vinkle <scott@scottvinkle.com> */}
      <footer className="border-t-[3px] border-ink dark:border-[#6E6E6E] bg-white dark:bg-[#161616] mt-12 py-6 text-center text-xs font-medium text-ink/75 dark:text-cream/75">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <p>
              Made with{" "}
              <span role="img" aria-label="love">
                ❤️
              </span>{" "}
              by{" "}
              <a
                href="https://scottvinkle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-ink dark:text-cream hover:text-violet-700 dark:hover:text-violet-300 focus-ring"
              >
                svinkle
              </a>
            </p>
          </div>
          {/* Accessibility audit remediation: [START]
              Include programmatic (opens in a new tab) announcement and hide decorative arrow on external footer link (WCAG 4.1.2)
              2026-10-26, Scott Vinkle <scott@scottvinkle.com> */}
          <a
            href="https://www.w3.org/WAI/tutorials/images/decision-tree/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300 focus-ring"
          >
            <span>W3C Image Decision Tree Guidelines</span>
            <span aria-hidden="true" className="ml-1">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {/* Accessibility audit remediation: [END] */}
        </div>
      </footer>
      {/* Accessibility audit remediation: [END] */}
    </div>
  );
}


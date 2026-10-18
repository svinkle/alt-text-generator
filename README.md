# Alt Text Generator

<p align="center">
  <img src="public/favicon.svg" alt="Alt Text Generator logo" width="64" height="64" />
</p>

<p align="center">

[![Release](https://img.shields.io/badge/release-v1.0.0-7C3AED?style=flat)](https://github.com/svinkle/alt-text-generator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981.svg)](LICENSE)
[![Deploy to Firebase](https://img.shields.io/badge/Deploy%20to%20Firebase-passing-0284C7?logo=firebase&logoColor=white)](https://github.com/svinkle/alt-text-generator/actions/workflows/firebase-deploy.yml)

</p>

> Accessible, objective image descriptions powered by progressive AI — on-device via Chrome Built-in AI (Gemini Nano) with zero network latency, seamlessly backed by Google Gemini 3.x Flash on Firebase Cloud Functions.

🌐 **Live Demo:** [https://alt-text-generator.scottvinkle.com/](https://alt-text-generator.scottvinkle.com/)

---

## 🌟 Key Features

- **Two-Tier Progressive AI Architecture:**
  - **Tier 1 (On-Device via Chrome Built-in AI / Gemini Nano):** Checks for `window.LanguageModel` or `window.ai.languageModel`. Executes locally on your device with **zero server cost**, zero network token latency, and 100% client-side privacy.
  - **Tier 2 (Serverless Fallback via Gemini 3.x Flash):** When on-device AI is unsupported (Safari, Firefox, unsupported mobile, or disabled flags), requests route seamlessly to `/api/generate-alt` served by a Firebase Cloud Function.
- **Neo-Brutalist & Tactile Aesthetic:**
  - High-contrast retro palette: Soft cream (`#FBF8F1`), deep dark ink (`#1E1B18`), vibrant violet (`#7C3AED`), electric mint (`#10B981`), and warm amber (`#F59E0B`).
  - Tactile buttons with hard offset shadows (`4px 4px 0px 0px #1E1B18`) shifting dynamically on active press.
- **Strict WCAG 2.2 Accessibility:**
  - **5px Dotted Focus Rings:** Every interactive element features high-visibility outline: `focus-visible:outline-[5px] focus-visible:outline-dotted focus-visible:outline-violet-600 focus-visible:outline-offset-4`.
  - Accessible file dropzone with keyboard activation (`Enter` / `Space`).
  - Live regions (`aria-live="polite"`) announcing analysis state changes to screen readers.
  - System prompt enforcing accessibility best practices (no "image of" redundancy, 1-2 concise objective sentences, optical transcription of legible text).
- **Multi-Format Output:**
  - Plain Text alt description with instant copy feedback.
  - Formatted HTML snippet (`<img src="..." alt="..." />`).
  - Formatted Markdown snippet (`![...](...)`).
  - Live in-place editor to adjust text with instantaneous synchronization across all snippets.

---

## 🏗️ Architecture

```
                                  ┌────────────────────────┐
                                  │   User uploads image   │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [Prompt API Available?]                           [Prompt API Unavailable]
                      │                                               │
             Yes ─────┴───── No                                       │
              │              │                                        │
              ▼              └────────────────────────┐               │
      ┌───────────────┐                               │               │
      │ Tier 1:       │ (on error/unsupported)        ▼               ▼
      │ On-Device     │───────────────────────► ┌───────────────────────────┐
      │ Gemini Nano   │                         │ Tier 2: Cloud Fallback    │
      └───────────────┘                         │ Firebase Cloud Function   │
                                                │ (Gemini 3.x Flash)        │
                                                └───────────────────────────┘
```

---

## 📁 Repository Structure

```
├── .github/workflows/
│   └── firebase-deploy.yml        # Automated CI/CD pipeline
├── functions/                     # Firebase Functions (Tier 2 Cloud Fallback)
│   ├── package.json
│   └── index.js                   # onRequest handler calling @google/genai
├── public/
│   └── favicon.svg                # Neo-brutalist accessibility favicon
├── src/
│   ├── components/
│   │   ├── EngineBadge.jsx        # Badging for on-device vs cloud fallback
│   │   ├── FileDropzone.jsx       # Drag-and-drop file upload with a11y focus
│   │   ├── Header.jsx             # Top bar with status indicator & links
│   │   └── OutputSnippet.jsx      # Raw text, HTML, and Markdown code blocks
│   ├── utils/
│   │   ├── aiEngine.js            # Tier 1 vs Tier 2 router logic & prompt
│   │   └── copyToClipboard.js     # Clipboard utility with fallback
│   ├── App.jsx                    # Application root & state management
│   ├── index.css                  # Tailwind layers & 5px dotted focus indicators
│   └── main.jsx
├── firebase.json                  # Firebase Hosting & Functions routing config
├── .firebaserc                    # Firebase project definition
├── tailwind.config.js             # Neo-brutalist theme tokens
├── vite.config.js                 # Vite bundler & dev proxy configuration
└── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v20+
- (Optional) A Google AI Studio API Key from [aistudio.google.com](https://aistudio.google.com/) for cloud fallback inference.

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/svinkle/alt-text-generator.git
cd alt-text-generator

# Install dependencies
npm install
```

### 3. Local Development

```bash
# Start frontend dev server on http://localhost:3000
npm run dev
```

> **Note:** The local Vite development server includes a built-in mock/proxy handler for `/api/generate-alt`. You can also configure a `GEMINI_API_KEY` in a local `.env` file or use the built-in demo images without an API key.

---

## 🧪 Testing

The repository maintains an automated test suite with 100% line coverage and end-to-end browser tests.

```bash
# Run structural verification and unit/component tests with coverage
npm test

# Run unit tests only
npm run test:unit

# Run Playwright end-to-end tests
npm run test:e2e
```

---

## 🔬 Enabling Chrome Built-in AI (Gemini Nano)

To test Tier 1 on-device execution in Google Chrome:

1. Open Chrome (v128+ or Chrome Canary).
2. Navigate to `chrome://flags/#prompt-api-for-gemini-nano` and set to **Enabled**.
3. Navigate to `chrome://flags/#optimization-guide-on-device-model` and set to **Enabled BypassPerfRequirement**.
4. Restart Chrome and open `chrome://components`.
5. Check for **Optimization Guide On Device Model** and ensure it has downloaded.

When supported, the header badge will indicate:
`🟢 Engine: On-Device (Gemini Nano)`

---

## ♿ WCAG Compliance Notes

- **Success Criterion 1.1.1 (Non-text Content):** Generates concise text alternatives that serve the equivalent purpose without boilerplate phrases like "image of".
- **Success Criterion 2.4.1 (Bypass Blocks):** Features a dedicated "Skip to main content" link to bypass repetitive header navigation via keyboard.
- **Success Criterion 2.4.7 (Focus Visible):** Exceeds minimum contrast and sizing with a high-contrast 5px dotted outline (`#7C3AED`) on all interactive controls.
- **Success Criterion 4.1.2 (Name, Role, Value):** Custom drag-and-drop container and tabs expose standard ARIA roles, live regions (`aria-live="polite"`), and keyboard controls (`Space` / `Enter`).

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Ensure all tests and coverage checks pass (`npm test && npm run test:e2e`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

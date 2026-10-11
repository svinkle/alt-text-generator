# Alt Text Generator

> Accessible, objective image descriptions powered by progressive AI — on-device via Chrome Built-in AI (Gemini Nano) with zero network latency, seamlessly backed by Google Gemini 3.x Flash on Firebase Cloud Functions.

[![Deploy to Firebase](https://github.com/svinkle/alt-text-generator/actions/workflows/firebase-deploy.yml/badge.svg)](https://github.com/svinkle/alt-text-generator/actions/workflows/firebase-deploy.yml)

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
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- A Google AI Studio API Key (free tier available at [aistudio.google.com](https://aistudio.google.com/))

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 3. Local Development
```bash
# Start frontend dev server on http://localhost:3000
npm run dev
```

To run both Firebase Functions and Hosting emulators locally:
```bash
firebase emulators:start
```

---

## 🧪 Enabling Chrome Built-in AI (Gemini Nano)

To test Tier 1 on-device execution in Google Chrome:
1. Open Chrome (v128+ or Chrome Canary).
2. Navigate to `chrome://flags/#prompt-api-for-gemini-nano` and set to **Enabled**.
3. Navigate to `chrome://flags/#optimization-guide-on-device-model` and set to **Enabled BypassPerfRequirement**.
4. Restart Chrome and open `chrome://components`.
5. Check for **Optimization Guide On Device Model** and ensure it has downloaded.

When supported, the header badge will indicate:  
`🟢 Engine: On-Device (Gemini Nano)`

---

## 🚢 Firebase Deployment

### 1. Login & Select Project
```bash
firebase login
firebase use alt-text-generator-app
```

### 2. Configure Gemini API Secret
Set the `GEMINI_API_KEY` secret for Cloud Functions:
```bash
firebase functions:secrets:set GEMINI_API_KEY
```
When prompted, paste your Google AI Studio API key.

### 3. Build & Deploy
```bash
# Build the production frontend bundle
npm run build

# Deploy Hosting and Functions
firebase deploy
```

---

## 🤖 Continuous Deployment (GitHub Actions)

A GitHub Actions workflow is preconfigured in `.github/workflows/firebase-deploy.yml`:
1. In your GitHub repository settings, go to **Settings > Secrets and variables > Actions**.
2. Add the following repository secrets:
   - `FIREBASE_TOKEN`: Generated using `firebase login:ci`.
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID (e.g. `alt-text-generator-app`).
   - `FIREBASE_SERVICE_ACCOUNT` (optional for PR preview channels): The JSON key for your Firebase Service Account.
3. Every push to `main` will build the bundle and deploy the latest version to Firebase.

---

## ♿ WCAG Compliance Notes

- **Success Criterion 1.1.1 (Non-text Content):** Provides concise text alternatives that serve the equivalent purpose without boilerplate or fluff.
- **Success Criterion 2.4.7 (Focus Visible):** Exceeds minimum contrast and sizing by delivering a bold 5px dotted outline on keyboard focus.
- **Success Criterion 4.1.2 (Name, Role, Value):** Custom drag-and-drop container correctly exposes file input roles, drag states, and accessible names.

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

console.log('🧪 Starting Alt Text Generator Verification Suite...\n');

// 1. Verify required files exist
console.log('1. Checking file structure...');
const requiredFiles = [
  'package.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'index.html',
  'firebase.json',
  '.firebaserc',
  '.gitignore',
  'README.md',
  'public/favicon.svg',
  'src/main.jsx',
  'src/App.jsx',
  'src/index.css',
  'src/components/Header.jsx',
  'src/components/EngineBadge.jsx',
  'src/components/FileDropzone.jsx',
  'src/components/OutputSnippet.jsx',
  'src/utils/aiEngine.js',
  'src/utils/copyToClipboard.js',
  'functions/package.json',
  'functions/index.js',
  '.github/workflows/firebase-deploy.yml',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `Missing required file: ${file}`);
  console.log(`  ✓ ${file} exists`);
}

// 2. Verify prompt instruction
console.log('\n2. Verifying Prompt Engineering compliance...');
const expectedPrompt = "You are an expert in digital accessibility and WCAG standards. Write a concise, objective, and descriptive alt text for this image. Focus on the core subject, action, context, and any legible text. Do not start with 'Image of' or 'Picture of'. Limit the response to 1 to 2 clear sentences.";

const aiEngineSrc = readFileSync(join(root, 'src/utils/aiEngine.js'), 'utf-8');
assert(aiEngineSrc.includes(expectedPrompt), 'src/utils/aiEngine.js does not contain the exact specified prompt.');
console.log('  ✓ Client aiEngine.js contains the exact WCAG prompt instruction');

const functionsSrc = readFileSync(join(root, 'functions/index.js'), 'utf-8');
assert(functionsSrc.includes(expectedPrompt), 'functions/index.js does not contain the exact specified prompt.');
console.log('  ✓ Cloud Functions index.js contains the exact WCAG prompt instruction');

// 3. Verify Focus-Visible 5px dotted outline specification
console.log('\n3. Verifying Keyboard Accessibility (5px dotted outline)...');
const indexCss = readFileSync(join(root, 'src/index.css'), 'utf-8');
assert(indexCss.includes('outline: 5px dotted #7C3AED !important'), 'index.css missing 5px dotted outline in :focus-visible');
assert(indexCss.includes('focus-visible:outline-[5px]'), 'index.css missing focus-visible:outline-[5px] utility');
assert(indexCss.includes('focus-visible:outline-dotted'), 'index.css missing focus-visible:outline-dotted utility');
assert(indexCss.includes('focus-visible:outline-violet-600'), 'index.css missing focus-visible:outline-violet-600 utility');
assert(indexCss.includes('focus-visible:outline-offset-4'), 'index.css missing focus-visible:outline-offset-4 utility');
console.log('  ✓ 5px dotted focus indicator strictly matches spec in CSS');

// 4. Verify Neo-brutalist theme colors in tailwind.config.js
console.log('\n4. Verifying Color Palette Tokens...');
const tailwindConfig = readFileSync(join(root, 'tailwind.config.js'), 'utf-8');
assert(tailwindConfig.includes('#FBF8F1'), 'tailwind.config.js missing cream #FBF8F1');
assert(tailwindConfig.includes('#1E1B18'), 'tailwind.config.js missing ink #1E1B18');
assert(tailwindConfig.includes('#7C3AED'), 'tailwind.config.js missing violet #7C3AED');
assert(tailwindConfig.includes('#10B981'), 'tailwind.config.js missing mint #10B981');
assert(tailwindConfig.includes('#F59E0B'), 'tailwind.config.js missing amber #F59E0B');
console.log('  ✓ Neo-brutalist color tokens configured accurately');

// 5. Verify firebase.json rewrites for /api/generate-alt
console.log('\n5. Verifying Firebase rewrites...');
const firebaseJson = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf-8'));
assert(firebaseJson.hosting, 'firebase.json missing hosting configuration');
const apiRewrite = firebaseJson.hosting.rewrites?.find(r => r.source === '/api/generate-alt');
assert(apiRewrite, 'firebase.json missing rewrite for /api/generate-alt');
assert(apiRewrite.function === 'generateAlt', 'Rewrite destination should be generateAlt function');
console.log('  ✓ /api/generate-alt rewrites to generateAlt Cloud Function');

// 6. Test aiEngine logic under simulated browser environments
console.log('\n6. Testing aiEngine client routing...');
import { checkAvailableEngine, PROMPT_INSTRUCTION } from '../src/utils/aiEngine.js';
assert.strictEqual(PROMPT_INSTRUCTION, expectedPrompt);

const fallbackResult = await checkAvailableEngine();
assert(fallbackResult.engine === 'cloud-fallback', 'Without window.ai, should report cloud-fallback');
console.log('  ✓ Engine detection correctly identifies cloud fallback in non-AI environments');

// 7. Verify Modal positioning and createPortal
console.log('\n7. Verifying Modal Portal & Viewport centering...');
const engineBadgeSrc = readFileSync(join(root, 'src/components/EngineBadge.jsx'), 'utf-8');
assert(engineBadgeSrc.includes('createPortal'), 'EngineBadge.jsx must use createPortal to escape header containing block');
assert(engineBadgeSrc.includes('document.body'), 'EngineBadge.jsx must mount portal into document.body');
console.log('  ✓ Modal uses createPortal to ensure true viewport centering');

// 8. Verify demo URLs and "Team Collaboration" label
console.log('\n8. Verifying Demo images & "Team Collaboration" button...');
const appSrc = readFileSync(join(root, 'src/App.jsx'), 'utf-8');
assert(appSrc.includes('hiker-looks-out-over-view-from-mountain-summit.jpg'), 'App.jsx missing mountain summit Shopify CDN demo URL');
assert(appSrc.includes('business-team-meeting-boardroom.jpg'), 'App.jsx missing business team Shopify CDN demo URL');
assert(appSrc.includes('Team Collaboration'), 'App.jsx missing "Team Collaboration" button label');
console.log('  ✓ Demo images use real Shopify Burst CDN assets with "Team Collaboration" label');

// 9. Verify Image URL input in FileDropzone
console.log('\n9. Verifying Image URL input capability...');
const fileDropzoneSrc = readFileSync(join(root, 'src/components/FileDropzone.jsx'), 'utf-8');
assert(fileDropzoneSrc.includes('image-url-input'), 'FileDropzone.jsx must contain image URL input');
assert(fileDropzoneSrc.includes('onUrlSubmit'), 'FileDropzone.jsx must accept onUrlSubmit prop');
console.log('  ✓ Image URL input tab & form properly implemented in FileDropzone');

// 11. Verify Gemini 3.x model configuration
console.log('\n11. Verifying Gemini 3.x model configuration...');
const aiEngineFull = readFileSync(join(root, 'src/utils/aiEngine.js'), 'utf-8');
assert(aiEngineFull.includes('gemini-3-flash'), 'aiEngine.js must reference gemini-3-flash');
assert(aiEngineFull.includes('Gemini 3.x Flash'), 'aiEngine.js must label engine as Gemini 3.x Flash');
const functionsFull = readFileSync(join(root, 'functions/index.js'), 'utf-8');
assert(functionsFull.includes('gemini-3-flash'), 'functions/index.js must default to gemini-3-flash');
// 12. Verify photographer attributions for demo images
console.log('\n12. Verifying photographer attributions...');
assert(appSrc.includes('Daniel Moroder'), 'App.jsx missing Daniel Moroder attribution');
assert(appSrc.includes('Matthew Henry'), 'App.jsx missing Matthew Henry attribution');
assert(appSrc.includes('daniel_moroder'), 'App.jsx missing Daniel Moroder Burst profile URL');
assert(appSrc.includes('matthew_henry'), 'App.jsx missing Matthew Henry Burst profile URL');
assert(fileDropzoneSrc.includes('selectedFile.attribution'), 'FileDropzone.jsx must display selectedFile.attribution');
console.log('  ✓ Photographer attributions correctly linked and rendered for both demo photos');

console.log('\n✨ All verification checks passed with 100% compliance!\n');

# Accessibility Audit Report — Alt Text Generator (WCAG 2.2 Level A & AA)

**Application:** Alt Text Generator (`http://localhost:3000/`)
**Standard:** WCAG 2.2 Level A & Level AA
**Date:** October 18, 2026

---

# [Engine Badge Modal] Focus is not moved into the modal dialog when opened, allowing background page elements to be focused

## Issue summary

When a user activates the inference engine status badge button in the header (`Engine: Cloud Edge (Gemini 3.x Flash)`), a modal dialog (`role="dialog"`, `aria-modal="true"`) opens to display the "Two-Tier AI Architecture" details. However, keyboard focus is never moved inside the newly opened dialog—focus remains on the triggering button in the background `<header>`.

Furthermore, because the custom `Tab` key focus-trap listener in [`EngineBadge.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/EngineBadge.jsx#L25-L40) only intercepts `Tab` when `document.activeElement` is already equal to the `first` or `last` focusable element inside the modal, pressing `Tab` after opening the dialog moves keyboard focus across the entire background page (`Install` button, hidden file input, tabs, dropzone, and footer links) while the modal overlay remains open on screen. The same defect exists in [`ApiKeyModal.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/ApiKeyModal.jsx#L34-L49). Screen reader and keyboard-only users are left disoriented in background content behind a modal overlay.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Two-Tier AI Architecture modal dialog open on screen while keyboard focus indicator remains on the background Install button in the header. -->

</details>

### Current code

#### JavaScript ([`src/components/EngineBadge.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/EngineBadge.jsx#L18-L50))

```jsx
// Close modal on Escape key press and trap Tab focus within dialog
useEffect(() => {
  const handleKeyDown = (e) => {
    if (!showInfoModal) return;
    if (e.key === "Escape") {
      setShowInfoModal(false);
      return;
    }
    if (e.key === "Tab" && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };
  if (showInfoModal) {
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
  }
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "";
  };
}, [showInfoModal]);
```

## Steps to reproduce

1. Open the page in any supported web browser.
2. Enable a screen reader (e.g., VoiceOver on macOS with `Cmd + F5`) or use keyboard-only navigation.
3. Press `Tab` to reach the `Engine: Cloud Edge (Gemini 3.x Flash)` button in the header and press `Enter` or `Space` to open the modal.
4. Observe that focus does not move into the modal dialog, and pressing `Tab` moves focus to the background `Install` button and main page controls behind the modal backdrop.

## Behavior

### Expected

Opening a modal dialog moves keyboard focus immediately to the first focusable control inside the dialog (such as the "Close dialog" button) or the dialog container itself, and `Tab` / `Shift + Tab` strictly cycles focus within the modal even if focus was outside the modal bounds.

### Actual

Focus stays on the background trigger button when the modal opens, and pressing `Tab` navigates through all background page controls behind the modal backdrop.

## Recommendation

When `showInfoModal` (or `isOpen` in `ApiKeyModal`) becomes `true`, programmatically move focus to the first focusable element inside `modalRef.current` (or the dialog container). Additionally, update the `Tab` key handler to check `!modalRef.current.contains(document.activeElement)` so focus is always pulled into the dialog if it ever escapes. Alternatively, use the native HTML `<dialog>` element with `.showModal()`, which handles focus movement, focus trapping, and background `inert` state automatically.

### Recommended code

#### JavaScript

```jsx
const triggerRef = useRef(null);

useEffect(() => {
  if (!showInfoModal) return;

  const focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const initialFocusable =
    modalRef.current?.querySelectorAll(focusableSelector);
  if (initialFocusable?.length > 0) {
    initialFocusable[0].focus();
  }

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowInfoModal(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "Tab" && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(focusableSelector);
      if (focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!modalRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  document.body.style.overflow = "hidden";
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "";
  };
}, [showInfoModal]);
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** Engine Badge Modal (`EngineBadge.jsx` & `ApiKeyModal.jsx`)
- **Selector:** `div#root > div > header > div > div:nth-of-type(2) > div > button`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Operable
- **WCAG SC:** [2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)
- **Severity:** Critical
- **Effort:** Medium
- **Disabilities Affected:** Visual, Physical

---

# [Engine Badge Modal] Focus is not returned to the triggering button when the dialog is closed via Close or Got it buttons

## Issue summary

When the "Two-Tier AI Architecture" modal dialog (`EngineBadge.jsx`) is opened and the user activates either the `Close dialog` (`X`) button or the `Got it` button (or clicks the backdrop), the modal unmounts from the DOM without restoring focus to the triggering engine badge button. As a result, `document.activeElement` resets to `document.body`, forcing keyboard-only and screen reader users to tab from the very top of the document again.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Engine Badge button in the header lacking keyboard focus after the Two-Tier AI Architecture modal is dismissed. -->

</details>

### Current code

#### HTML / JSX ([`src/components/EngineBadge.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/EngineBadge.jsx#L69-L76))

```jsx
<button
  type="button"
  onClick={() => setShowInfoModal(false)}
  className="..."
  aria-label="Close dialog"
>
  <X className="..." />
</button>
```

## Steps to reproduce

1. Open the page in any supported web browser.
2. Open the "Two-Tier AI Architecture" dialog by activating the `Engine: Cloud Edge (Gemini 3.x Flash)` button in the header.
3. Move focus to the `Close dialog` button or `Got it` button inside the dialog and press `Enter` (or click `Close dialog`).
4. Press `Tab` and observe that focus starts back at the top of the page (`Skip to main content`) instead of returning to the `Engine: Cloud Edge` trigger button.

## Behavior

### Expected

When the modal dialog is dismissed by any method (`Close dialog` button, `Got it` button, `Escape` key, or backdrop click), keyboard focus returns directly to the trigger button that opened the modal.

### Actual

Unmounting the modal while focus is inside it causes focus to be lost to `document.body`, resetting the user's position in the page tab order.

## Recommendation

Attach a `ref` (`triggerRef`) to the button that opens the modal and create a dedicated `closeModal` helper function that sets `showInfoModal` to `false` and calls `triggerRef.current?.focus()`. Call this helper from the `Close dialog` button, the `Got it` button, the backdrop click handler, and the `Escape` key handler.

### Recommended code

#### JavaScript

```jsx
const triggerRef = useRef(null);

const handleCloseModal = () => {
  setShowInfoModal(false);
  setTimeout(() => {
    triggerRef.current?.focus();
  }, 0);
};
```

```html
<button ref="{triggerRef}" type="button" onClick="{()" ="">
  setShowInfoModal(true)} class="..." aria-label="Engine: Cloud Edge (Gemini 3.x
  Flash). Click for engine details." > ...
</button>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** Engine Badge Modal (`EngineBadge.jsx`)
- **Selector:** `div[role="dialog"] button[aria-label="Close dialog"]`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Operable
- **WCAG SC:** [2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)
- **Severity:** Critical
- **Effort:** Low
- **Disabilities Affected:** Visual, Physical, Cognitive

---

# [Header & Layout] Sticky header completely obscures focused interactive elements when scrolling on small viewports or high zoom

## Issue summary

The application `<header>` uses `sticky top-0 z-30` (`height: 119px` on desktop, `height: 189px` on mobile/zoomed viewports), keeping it fixed at the top of the viewport while the page scrolls. However, no `scroll-padding-top` is defined on the root `<html>` element. When a user scrolls down the page (such as after generating alt text snippets) and navigates backward with `Shift + Tab`—or tabs to an interactive control positioned near the top of the viewport (`0px` to `189px` from the top edge)—the browser considers the element already inside the viewport and does not scroll the page. As a result, focused controls such as the `Upload File`, `Image URL`, and `Try Demo` tabs or action buttons are 100% covered by the opaque sticky header (`z-30`), making it impossible for sighted keyboard users and low-vision zoom users to see which element has keyboard focus.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Mobile/zoomed viewport scrolled slightly down where the sticky header completely covers the focused Upload File tab button underneath it. -->

</details>

### Current code

#### HTML / JSX ([`src/components/Header.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/Header.jsx#L72))

```html
<header
  class="w-full border-b-[3px] border-ink bg-white sticky top-0 z-30 shadow-brutal-sm"
></header>
```

#### CSS ([`src/index.css`](file:///Users/svinkle/Sites/alt-text-generator/src/index.css#L12-L17))

```css
body {
  background-color: #fbf8f1;
  color: #1e1b18;
  margin: 0;
  min-height: 100vh;
}
```

## Steps to reproduce

1. Open the page in Chrome and load a demo image (`Try Demo` -> `Load Mountain Sunrise` -> `Generate Alt Text`) so the page becomes scrollable, or set zoom to 200%–400% (`320px` viewport width).
2. Scroll down slightly (e.g., `window.scrollTo(0, 180)`) or tab down to the `Copy Markdown` button and then press `Shift + Tab` repeatedly to move focus back up the page.
3. Observe that when focus reaches controls positioned under the `sticky top-0` header (such as `#tab-upload`, `#tab-url`, or `#tab-demo`), the focused element and its focus ring are completely hidden behind the sticky `<header>`.

## Behavior

### Expected

When any interactive control receives keyboard focus, it is never completely obscured by the sticky header; the viewport automatically maintains sufficient top scroll padding or un-sticks the header on compact viewports so the focused element remains visible.

### Actual

Interactive controls near the top of the viewport are completely hidden behind the opaque `sticky top-0 z-30` header when focused.

## Recommendation

Apply `scroll-padding-top` on the `html` element in `src/index.css` (e.g., `scroll-padding-top: 10rem;` on desktop and `13rem` on mobile) and/or only apply `sticky top-0` on larger viewports (`sm:sticky sm:top-0`) so that the sticky header does not consume vertical viewport space and obscure focused elements at 400% zoom (`320px` width).

### Recommended code

#### CSS ([`src/index.css`](file:///Users/svinkle/Sites/alt-text-generator/src/index.css))

```css
@layer base {
  html {
    scroll-padding-top: 10rem;
  }
}
```

#### HTML ([`src/components/Header.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/Header.jsx))

```html
<header
  class="w-full border-b-[3px] border-ink bg-white sm:sticky sm:top-0 z-30 shadow-brutal-sm"
></header>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** Header & Global Layout (`Header.jsx`, `index.css`)
- **Selector:** `div#root > div > header`
- **Color scheme:** Light
- **Viewport:** Mobile (320px) / Desktop (1280px)
- **WCAG Principal:** Operable
- **WCAG SC:** [2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- **Severity:** Critical
- **Effort:** Low
- **Disabilities Affected:** Visual, Physical, Cognitive

---

# [File Dropzone] Visually hidden file input is in the sequential Tab order and lacks an explicit programmatic label

## Issue summary

Inside [`FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L315-L324), a visually hidden `<input type="file" id="image-file-input" className="sr-only">` is rendered right before the source selection `tablist` (`Upload File`, `Image URL`, `Try Demo`) and remains mounted across all three tabs.

This causes three compounding accessibility barriers:

1. **Missing programmatic form label (WCAG 4.1.2 / 1.3.1):** The `<input id="image-file-input">` has no associated `<label for="image-file-input">`, `aria-label`, or `aria-labelledby` (flagged by Lighthouse / axe-core `label` audit). Furthermore, its `aria-describedby="file-upload-help"` points to an ID (`#file-upload-help`) that is unmounted whenever the user switches to the `Image URL` or `Try Demo` tab, resulting in a broken ARIA ID reference.
2. **Invisible Tab stop on all tabs (WCAG 2.4.7 / 2.4.3):** Because `<input type="file" class="sr-only">` does not have `tabIndex={-1}`, keyboard users pressing `Tab` from the header land on an invisible 1×1 pixel element before reaching the `Upload File` tab. Because it is clipped via `.sr-only`, no focus indicator is visible on screen when this stop is focused, even when the user is on the `Image URL` or `Try Demo` tab.
3. **Redundant tab stop:** The visible dropzone container (`<div role="button" tabIndex={0}>`) already triggers `fileInputRef.current.click()` on `Enter` or `Space`, making the hidden `<input>` a duplicate keyboard stop.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Page state when pressing Tab after the header buttons, where focus lands on the invisible sr-only file input with no visible focus indicator on screen. -->

</details>

### Current code

#### HTML ([`src/components/FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L315-L324))

```html
<!-- Hidden Accessible File Input -->
<input
  type="file"
  id="image-file-input"
  accept="image/png, image/jpeg, image/webp"
  class="sr-only"
  aria-describedby="file-upload-help"
/>
```

## Steps to reproduce

1. Open the page in Chrome and inspect the accessibility tree or run a Lighthouse Accessibility audit.
2. Observe that `<input type="file" id="image-file-input">` fails the `label` check because it has no associated `<label>` or `aria-label`.
3. Switch to the `Image URL` tab and inspect `<input id="image-file-input">`; observe that `aria-describedby="file-upload-help"` references a non-existent DOM ID.
4. Press `Tab` from the header's `Engine` or `Install` button and observe that focus disappears for one keystroke onto `#image-file-input` before reaching the `Upload File` tab.

## Behavior

### Expected

Every form input has a valid programmatic label, ARIA ID references always point to existing DOM elements, and keyboard users do not land on an invisible, unstyled `.sr-only` tab stop that duplicates the visible dropzone trigger.

### Actual

The `.sr-only` file input lacks an accessible label, has a dangling `aria-describedby` reference when other tabs are active, and intercepts keyboard `Tab` focus with no visible focus indicator.

## Recommendation

Since the custom dropzone acts as the interactive trigger (`fileInputRef.current.click()`), remove the hidden `<input type="file">` from the sequential tab order and accessibility tree using `tabIndex={-1}` and `aria-hidden="true"` (or provide an explicit `aria-label="Upload image file"` and only render/enable it in harmony with the visible control).

### Recommended code

#### HTML

```html
<input
  type="file"
  id="image-file-input"
  accept="image/png, image/jpeg, image/webp"
  class="sr-only"
  tabindex="-1"
  aria-hidden="true"
/>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** File Dropzone (`FileDropzone.jsx`)
- **Selector:** `#image-file-input`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Robust
- **WCAG SC:** [4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html)
- **Severity:** Critical
- **Effort:** Low
- **Disabilities Affected:** Visual, Physical, Neurological

---

# [File Dropzone] Source selection tabs (`role="tab"`) do not support Arrow key navigation or roving `tabindex`

## Issue summary

The image source selector in [`FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L327-L400) uses WAI-ARIA tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, and `role="tabpanel"`). When a screen reader announces `"Image source options, tab list"` and `"Upload File, tab, 1 of 3"`, assistive technology users expect standard ARIA Authoring Practices Guide (APG) Tabs keyboard interaction: using `Left Arrow` and `Right Arrow` (and `Home` / `End`) to move between tabs, while pressing `Tab` moves focus directly from the active tab into the active `tabpanel`.

Currently, none of the `role="tab"` buttons have an `onKeyDown` handler for arrow keys, and all three tabs remain in the `Tab` sequence (`tabIndex={0}` by default). Pressing `Right Arrow` or `Left Arrow` while focused on a tab does nothing, and keyboard users must press `Tab` through every unselected tab before reaching the active tab panel's content.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Image source options tablist showing Upload File, Image URL, and Try Demo tabs. -->

</details>

### Current code

#### HTML ([`src/components/FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L327-L400))

```html
<div role="tablist" aria-label="Image source options" class="...">
  <button
    type="button"
    role="tab"
    id="tab-upload"
    aria-selected="true"
    aria-controls="panel-upload"
    class="..."
  >
    <span>Upload File</span>
  </button>

  <button
    type="button"
    role="tab"
    id="tab-url"
    aria-selected="false"
    aria-controls="panel-url"
    class="..."
  >
    <span>Image URL</span>
  </button>

  <button
    type="button"
    role="tab"
    id="tab-demo"
    aria-selected="false"
    aria-controls="panel-demo"
    class="..."
  >
    <span>Try Demo</span>
  </button>
</div>
```

## Steps to reproduce

1. Open the page in any supported web browser.
2. Enable VoiceOver (`Cmd + F5`) or use the keyboard to press `Tab` until the `Upload File` tab (`#tab-upload`) is focused.
3. Press the `Right Arrow` key to switch to the `Image URL` tab.
4. Observe that nothing happens; focus remains on `Upload File` and `Image URL` is not selected.
5. Press `Tab` and observe that focus moves to the unselected `Image URL` tab rather than entering the active `Upload File` tabpanel.

## Behavior

### Expected

When focus is on a `role="tab"` element inside `role="tablist"`, pressing `Right Arrow` / `Left Arrow` moves focus to and activates the next/previous tab (wrapping around at the ends), `Home` / `End` moves to the first/last tab, and only the active tab has `tabindex="0"` while inactive tabs have `tabindex="-1"`.

### Actual

Arrow keys do not work on the `role="tab"` buttons, and all three tabs are in the sequential `Tab` order.

## Recommendation

Implement the WAI-ARIA APG Tabs pattern with roving `tabindex`:

1. Set `tabIndex={activeTab === 'upload' ? 0 : -1}` on each corresponding `role="tab"` button so `Tab` moves directly from the active tab into the active `tabpanel`.
2. Add an `onKeyDown` handler on the `role="tablist"` container supporting `ArrowRight`, `ArrowLeft`, `Home`, and `End` to move focus and activate the corresponding tab.

### Recommended code

#### JavaScript / JSX

```jsx
const TABS = ["upload", "url", "demo"];
const tabRefs = {
  upload: useRef(null),
  url: useRef(null),
  demo: useRef(null),
};

const handleTabKeyDown = (e) => {
  const currentIndex = TABS.indexOf(activeTab);
  let nextIndex = null;

  if (e.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % TABS.length;
  } else if (e.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
  } else if (e.key === "Home") {
    nextIndex = 0;
  } else if (e.key === "End") {
    nextIndex = TABS.length - 1;
  }

  if (nextIndex !== null) {
    e.preventDefault();
    const nextTab = TABS[nextIndex];
    setActiveTab(nextTab);
    setUrlInputError("");
    tabRefs[nextTab].current?.focus();
  }
};
```

```html
<div
  role="tablist"
  aria-label="Image source options"
  onKeyDown="{handleTabKeyDown}"
  class="..."
>
  <button
    ref="{tabRefs.upload}"
    type="button"
    role="tab"
    id="tab-upload"
    tabindex="0"
    aria-selected="true"
    aria-controls="panel-upload"
    class="..."
  >
    <span>Upload File</span>
  </button>
  <!-- Repeat with tabindex="-1" for unselected tabs -->
</div>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** File Dropzone (`FileDropzone.jsx`)
- **Selector:** `main#main > section > div > div[role="tablist"]`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Operable
- **WCAG SC:** [2.1.1 Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
- **Severity:** Critical
- **Effort:** Medium
- **Disabilities Affected:** Visual, Physical

---

# [File Dropzone] Custom file upload dropzone `aria-label` overrides and excludes the visible text label

## Issue summary

In the `Upload File` tab panel (`#panel-upload`), the interactive dropzone container (`<div role="button" tabIndex={0}>`) displays prominent visible text: `"Drag & Drop Image Here or browse files from your device"`. However, the element sets `aria-label="Upload image drop zone. Press Enter or Space to open file dialog."` ([`FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L426)).

Because `aria-label` completely overrides the element's internal text content in the accessible name computation:

1. **Voice Control / Speech Input failure (WCAG 2.5.3):** Speech recognition users (such as macOS Voice Control or Dragon NaturallySpeaking users) who say _"Click Drag and Drop Image Here"_ or _"Click browse files"_ cannot activate the control because the visible label strings do not appear in the accessible name.
2. **Screen Reader loss of semantics:** Overriding the entire `<div role="button">` with `aria-label` also strips the child `<h3>` and file size limit text (`PNG, JPEG, or WEBP up to 10MB`) when the button is focused.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Upload File dropzone showing visible text 'Drag & Drop Image Here or browse files from your device' while its computed accessible name is 'Upload image drop zone. Press Enter or Space to open file dialog.' -->

</details>

### Current code

#### HTML ([`src/components/FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L412-L446))

```html
<div
  role="button"
  tabindex="0"
  class="..."
  aria-label="Upload image drop zone. Press Enter or Space to open file dialog."
>
  <div class="...">
    <svg class="..." aria-hidden="true">...</svg>
  </div>

  <h3 class="...">Drag &amp; Drop Image Here</h3>

  <p class="...">
    or
    <span class="...">browse files</span>
    from your device
  </p>

  <div id="file-upload-help" class="...">
    <span>PNG, JPEG, or WEBP up to 10MB</span>
  </div>
</div>
```

## Steps to reproduce

1. Open the page in Chrome and open Chrome DevTools.
2. Inspect the dropzone element (`#panel-upload > div[role="button"]`) and open the **Accessibility** pane to view its **Computed Properties**.
3. Observe that the visible text is `"Drag & Drop Image Here or browse files from your device"`, whereas the computed **Name** is `"Upload image drop zone. Press Enter or Space to open file dialog."` (also flagged by Lighthouse's `label-content-name-mismatch` audit).

## Behavior

### Expected

The accessible name of the interactive control matches or begins with its visible text label so voice control users can target it by speaking the visible text, and screen readers announce the actual text shown on screen.

### Actual

The `aria-label` attribute replaces all visible child text with a different string that does not contain `"Drag & Drop Image Here"` or `"browse files"`.

## Recommendation

Remove the overriding `aria-label` attribute from the dropzone `<div role="button">` (or use `aria-labelledby` referencing the visible text and `aria-describedby="file-upload-help"`) so that the accessible name is computed directly from the visible text inside the button. Also avoid nesting an `<h3>` heading inside a `role="button"` element, as interactive buttons flatten semantic child roles in the accessibility tree; style the heading text with a `<span>` or `<p>` instead, or make the "browse files" text a native `<button type="button">` inside the dropzone container.

### Recommended code

#### HTML

```html
<div role="button" tabindex="0" aria-describedby="file-upload-help" class="...">
  <div class="...">
    <svg class="..." aria-hidden="true">...</svg>
  </div>

  <span class="...">Drag &amp; Drop Image Here</span>

  <span class="...">
    or
    <span class="...">browse files</span>
    from your device
  </span>

  <div id="file-upload-help" class="...">
    <span>PNG, JPEG, or WEBP up to 10MB</span>
  </div>
</div>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** File Dropzone (`FileDropzone.jsx`)
- **Selector:** `div#panel-upload > div[role="button"]`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Operable
- **WCAG SC:** [2.5.3 Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html)
- **Severity:** Low
- **Effort:** Low
- **Disabilities Affected:** Visual, Physical, Cognitive, Speech

---

# [File Dropzone] File validation errors rely on blocking native `window.alert()` dialogs instead of inline accessible error messaging

## Issue summary

In [`FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L55-L65), when a user selects or drops an unsupported file type (e.g., `.gif`, `.svg`, `.pdf`) or a file larger than `10MB`, the validation logic calls the browser's blocking `window.alert()` dialog (`alert('Please drop a supported image file (PNG, JPEG, or WebP).')`).

Once the user dismisses the native browser alert, no persistent error message remains on the page to identify what went wrong or what the required file constraints are, and the application's error banner (`role="alert"`) and status region are never updated. Users with cognitive disabilities, low vision, or screen readers have no persistent text description of the input error after the modal alert disappears.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Upload File dropzone with no persistent inline error message after an invalid file upload is rejected. -->

</details>

### Current code

#### JavaScript ([`src/components/FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L55-L65))

```javascript
const validateAndSelectFile = (file) => {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    alert("Please drop a supported image file (PNG, JPEG, or WebP).");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    alert("File size exceeds the 10MB maximum limit.");
    return;
  }
  onFileSelect(file);
};
```

## Steps to reproduce

1. Open the page in any supported web browser.
2. On the `Upload File` tab, select or drag-and-drop an unsupported file (e.g., a `.gif` or `.txt` file) or an image larger than 10MB.
3. Observe that a blocking `window.alert()` popup is triggered, and once dismissed, no inline error message or `role="alert"` banner is rendered in the UI.

## Behavior

### Expected

When file validation fails, a persistent, accessible inline error message (or the application's existing `role="alert"` error banner) is displayed and announced to assistive technologies, clearly identifying the invalid file and how to fix it.

### Actual

A transient, blocking `window.alert()` dialog is shown and no error state or text remains in the interface once closed.

## Recommendation

Replace `window.alert()` with state-driven inline error messaging (similar to `urlInputError` or by passing an `onError` callback to `App.jsx`) rendered in an accessible container associated with the upload control or announced via `role="alert"`.

### Recommended code

#### JavaScript / JSX

```jsx
const [uploadError, setUploadError] = useState("");

const validateAndSelectFile = (file) => {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    setUploadError(
      "Unsupported file format. Please upload a PNG, JPEG, or WebP image.",
    );
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    setUploadError(
      "File size exceeds the 10MB maximum limit. Please choose a smaller image.",
    );
    return;
  }
  setUploadError("");
  onFileSelect(file);
};
```

```html
{uploadError && (
<p id="file-upload-error" role="alert" class="...">{uploadError}</p>
)}
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** File Dropzone (`FileDropzone.jsx`)
- **Selector:** `div#panel-upload > div[role="button"]`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Understandable
- **WCAG SC:** [3.3.1 Error Identification](https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html)
- **Severity:** High
- **Effort:** Medium
- **Disabilities Affected:** Visual, Neurological, Cognitive

---

# [File Dropzone] Image URL input error message is not programmatically associated with the input or announced to screen readers

## Issue summary

In the `Image URL` tab panel (`#panel-url`), submitting an invalid URL (such as `"invalid-url"` or `"ftp://example.com/file.jpg"`) sets `urlInputError` and renders a visual error paragraph below the input: `<p className="...">Please enter a valid URL (including https://).</p>` ([`FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L497-L501)).

However:

1. The `<input id="image-url-input">` does not set `aria-invalid={Boolean(urlInputError)}` or `aria-describedby` pointing to the error message element's `id`.
2. The error `<p>` element does not have `role="alert"` or `aria-live="assertive"`, nor is `statusMessage` updated when validation fails.
3. Similarly, the helper instruction text `"Paste a direct link to any public image on the web (JPEG, PNG, or WebP)."` above the input has no `id` and is not linked to `#image-url-input` via `aria-describedby`.

As a result, when a screen reader user presses `Enter` to submit the form with an invalid URL, nothing is announced—the screen reader remains completely silent, and inspecting the input does not expose the error description.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Image URL tab showing 'Please enter a valid URL (including https://).' below the input field without programmatic association. -->

</details>

### Current code

#### HTML ([`src/components/FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L463-L501))

```html
<div class="...">
  <label for="image-url-input" class="...">Enter Image URL</label>
  <p class="...">
    Paste a direct link to any public image on the web (JPEG, PNG, or WebP).
  </p>
</div>

<div class="...">
  <input
    id="image-url-input"
    type="url"
    value="invalid-url"
    placeholder="https://example.com/photos/image.jpg"
    required
    class="..."
  />

  <button type="submit" class="...">
    <span>Load Image</span>
  </button>
</div>

<p class="...">Please enter a valid URL (including https://).</p>
```

## Steps to reproduce

1. Open the page in any supported web browser and enable a screen reader (e.g., VoiceOver on macOS).
2. Activate the `Image URL` tab (`#tab-url`).
3. Focus the `Enter Image URL` input (`#image-url-input`), type `invalid-url`, and press `Enter`.
4. Observe that the error message `"Please enter a valid URL (including https://)."` appears visually, but the screen reader makes no announcement and the `<input>` has no `aria-describedby` linking it to the error message or helper text.

## Behavior

### Expected

The URL input is programmatically associated with both its helper instructions and any active error message via `aria-describedby`, sets `aria-invalid="true"` when in error, and announces the validation error immediately via `role="alert"` (or moves focus to the invalid input).

### Actual

The error message is a plain `<p>` tag with no `id`, no `role="alert"`, and no programmatic relationship to `<input id="image-url-input">`.

## Recommendation

Add an `id="image-url-hint"` to the instructional paragraph and `id="image-url-error"` with `role="alert"` to the error paragraph. Reference both IDs in `aria-describedby` on `<input id="image-url-input">` and set `aria-invalid={Boolean(urlInputError)}`.

### Recommended code

#### HTML

```html
<div class="...">
  <label for="image-url-input" class="...">Enter Image URL</label>
  <p id="image-url-hint" class="...">
    Paste a direct link to any public image on the web (JPEG, PNG, or WebP).
  </p>
</div>

<div class="...">
  <input
    id="image-url-input"
    type="url"
    value="invalid-url"
    placeholder="https://example.com/photos/image.jpg"
    required
    aria-invalid="true"
    aria-describedby="image-url-hint image-url-error"
    class="..."
  />

  <button type="submit" class="...">
    <span>Load Image</span>
  </button>
</div>

<p id="image-url-error" role="alert" class="...">
  Please enter a valid URL (including https://).
</p>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** File Dropzone (`FileDropzone.jsx`)
- **Selector:** `#image-url-input`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Understandable
- **WCAG SC:** [3.3.1 Error Identification](https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html)
- **Severity:** High
- **Effort:** Low
- **Disabilities Affected:** Visual, Neurological, Cognitive

---

# [File Dropzone] Source selection tablist overflows horizontally at 320px viewport width (400% zoom)

## Issue summary

When the browser viewport is set to `320px` width (or zoomed to 400% on a `1280px` desktop display), the source selection `role="tablist"` container (`Upload File`, `Image URL`, `Try Demo`) in [`FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L327-L331) does not wrap or adapt its horizontal padding/layout. Because the three tab buttons have fixed horizontal padding (`px-4`), icons, and non-wrapping labels inside a padded card (`p-6`), the tablist extends to `365px` wide (`document.documentElement.scrollWidth === 365` vs `clientWidth === 320`), clipping the `"Try Demo"` tab off the right edge of the screen and forcing horizontal two-dimensional scrolling across the entire page.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Page viewed at 320px width where the 'Try Demo' tab overflows past the right border of the card and causes horizontal page scrolling. -->

</details>

### Current code

#### HTML ([`src/components/FileDropzone.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/FileDropzone.jsx#L327-L348))

```html
<div
  role="tablist"
  aria-label="Image source options"
  class="flex border-b-2 border-ink mb-6 gap-2"
>
  <button
    type="button"
    role="tab"
    id="tab-upload"
    aria-selected="true"
    aria-controls="panel-upload"
    class="flex items-center gap-2 px-4 py-2.5 font-display font-bold text-sm ..."
  >
    <svg class="w-4 h-4" aria-hidden="true">...</svg>
    <span>Upload File</span>
  </button>
  <!-- Image URL and Try Demo buttons -->
</div>
```

## Steps to reproduce

1. Open the page in Chrome and open Chrome DevTools.
2. Resize the viewport width to `320px` (or zoom the browser to 400% at a `1280px` window width).
3. Observe that the `Try Demo` tab overflows the right side of the card (`right: 365px` in a `320px` viewport) and a horizontal scrollbar appears on the page.

## Behavior

### Expected

At a `320px` viewport width (400% zoom), all page content—including the source selection tabs—reflows cleanly within the `320px` width without requiring horizontal scrolling or clipping controls.

### Actual

The `role="tablist"` overflows to `365px` wide, cutting off the `Try Demo` tab and introducing horizontal page scrolling.

## Recommendation

Allow the `role="tablist"` container to wrap on narrow screens (`flex-wrap`) or reduce button padding and font size on compact viewports (e.g., `px-2.5 sm:px-4 text-xs sm:text-sm flex-wrap`), and reduce outer card padding at mobile widths (`p-4 sm:p-8`).

### Recommended code

#### HTML

```html
<div
  role="tablist"
  aria-label="Image source options"
  class="flex flex-wrap border-b-2 border-ink mb-6 gap-1.5 sm:gap-2"
>
  <button
    type="button"
    role="tab"
    id="tab-upload"
    aria-selected="true"
    aria-controls="panel-upload"
    class="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 font-display font-bold text-xs sm:text-sm ..."
  >
    <svg class="w-4 h-4" aria-hidden="true">...</svg>
    <span>Upload File</span>
  </button>
  <!-- Image URL and Try Demo buttons -->
</div>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** File Dropzone (`FileDropzone.jsx`)
- **Selector:** `main#main > section > div > div[role="tablist"]`
- **Color scheme:** Light
- **Viewport:** Mobile (320px)
- **WCAG Principal:** Perceivable
- **WCAG SC:** [1.4.10 Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)
- **Severity:** High
- **Effort:** Low
- **Disabilities Affected:** Visual

---

# [Output Snippet] "Copy Markdown" button white text on emerald background fails minimum contrast requirements (2.54:1)

## Issue summary

In [`OutputSnippet.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/OutputSnippet.jsx#L180-L188), the `Copy Markdown` button uses white text (`text-white`, `#FFFFFF`) on an emerald green background (`bg-emerald-500`, `#10B981`) at `14px` bold (`text-xs sm:text-sm font-bold`).

This color combination yields a contrast ratio of **`2.54:1`** (and **`3.30:1`** on hover with `hover:bg-emerald-600`, `#059669`), which falls significantly below the WCAG 2.2 AA minimum requirement of **`4.5:1`** for normal-sized text. Low-vision users and users with color vision deficiencies may struggle to read the button label.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Markdown Image Syntax card showing the 'Copy Markdown' button with low-contrast white text on a bright emerald green background (#10B981). -->

</details>

### Current code

#### HTML ([`src/components/OutputSnippet.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/OutputSnippet.jsx#L179-L201))

```html
<button
  type="button"
  class="brutal-btn px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
  aria-label="Copy Markdown image syntax to clipboard"
>
  <svg class="w-4 h-4" aria-hidden="true">...</svg>
  <span>Copy Markdown</span>
</button>
```

## Steps to reproduce

1. Open the page in Chrome, load a demo image (`Try Demo` -> `Load Mountain Sunrise`), and activate `Generate Alt Text`.
2. Scroll to the **Markdown Image Syntax** card and inspect the `Copy Markdown` button (`button[aria-label="Copy Markdown image syntax to clipboard"]`).
3. Measure the contrast ratio between the foreground text `#FFFFFF` (`rgb(255, 255, 255)`) and background `#10B981` (`rgb(16, 185, 129)`).
4. Observe that the contrast ratio is **`2.54:1`**, failing the `4.5:1` threshold for normal text.

## Behavior

### Expected

The `Copy Markdown` button text and icon have a contrast ratio of at least `4.5:1` against the button background in both default and hover states.

### Actual

The white text (`#FFFFFF`) against `bg-emerald-500` (`#10B981`) has a contrast ratio of only `2.54:1`.

## Recommendation

Either change the text color on `bg-emerald-500` (`bg-mint`) from `text-white` to dark ink (`text-ink`, `#1E1B18`), which achieves a **`6.76:1`** contrast ratio (matching the `Load Team Collaboration` button and the `Copied!` state), or darken the background to `bg-emerald-700` (`#047857`, `5.48:1` against `#FFFFFF`). Using `text-ink` on `bg-mint hover:bg-emerald-400` aligns directly with the app's existing neo-brutalist palette.

### Recommended code

#### HTML

```html
<button
  type="button"
  class="brutal-btn px-3.5 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 bg-mint text-ink hover:bg-emerald-400"
  aria-label="Copy Markdown image syntax to clipboard"
>
  <svg class="w-4 h-4" aria-hidden="true">...</svg>
  <span>Copy Markdown</span>
</button>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** Output Snippet (`OutputSnippet.jsx`)
- **Selector:** `section[aria-labelledby="results-section-title"] > div:nth-of-type(2) > div:nth-of-type(3) button`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Perceivable
- **WCAG SC:** [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- **Severity:** High
- **Effort:** Low
- **Disabilities Affected:** Visual

---

# [Output Snippet] Activating "Edit" on raw alt text does not move focus to the revealed textarea

## Issue summary

In the **Raw Alt Text Description** card ([`OutputSnippet.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/OutputSnippet.jsx#L70-L123)), activating the `Edit` button (`aria-label="Edit alt text"`) toggles `isEditing` to `true` and replaces the static alt text preview with a `<textarea id="edit-alt-text">`. However:

1. Focus remains on the toggle button (which now changes its label to `"Done editing alt text"`), and the `<textarea>` appears _after_ the `Copy Text` button in the DOM order, so a keyboard user must press `Tab` twice (skipping over `Copy Text`) to reach the textarea they just opened to edit.
2. Furthermore, if a user finishes typing inside `#edit-alt-text`, they must press `Shift + Tab` twice to get back to the `Done` button.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Raw Alt Text Description card in editing mode showing the 'Done' button focused in the header above 'Copy Text', while the revealed textarea below is unfocused. -->

</details>

### Current code

#### HTML / JSX ([`src/components/OutputSnippet.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/OutputSnippet.jsx#L70-L118))

```jsx
<button
  type="button"
  onClick={() => setIsEditing(!isEditing)}
  className="..."
  aria-label={isEditing ? 'Done editing alt text' : 'Edit alt text'}
>
  <Edit3 className="..." aria-hidden="true" />
  <span>{isEditing ? 'Done' : 'Edit'}</span>
</button>
...
{isEditing ? (
  <div>
    <label htmlFor="edit-alt-text" className="sr-only">Edit alt text</label>
    <textarea
      id="edit-alt-text"
      rows={3}
      value={altText}
      onChange={(e) => onAltTextChange(e.target.value)}
      className="..."
    />
    <p className="...">
      Changes to the alt text will immediately reflect in the HTML and Markdown snippets below.
    </p>
  </div>
) : ( ... )}
```

## Steps to reproduce

1. Open the page, load a demo image, and activate `Generate Alt Text`.
2. Press `Tab` until the `Edit` button (`button[aria-label="Edit alt text"]`) in the **Raw Alt Text Description** card is focused.
3. Press `Enter` or `Space` to enter edit mode.
4. Observe that focus stays on the `Done` button instead of moving into `<textarea id="edit-alt-text">`, and pressing `Tab` once focuses `Copy Text` instead of the textarea.
5. Also observe that the instructional text `"Changes to the alt text will immediately reflect in the HTML and Markdown snippets below."` is not programmatically associated with `<textarea id="edit-alt-text">` via `aria-describedby`.

## Behavior

### Expected

Activating `Edit` moves keyboard focus directly into the revealed `<textarea id="edit-alt-text">`, and the helper note below the textarea is programmatically linked via `aria-describedby`.

### Actual

Focus stays on the `Done` button, requiring multiple `Tab` presses past unrelated controls (`Copy Text`) to reach the textarea, and the helper text is unassociated with the textarea.

## Recommendation

Add a `ref` to `<textarea id="edit-alt-text">` and move focus to it when `isEditing` transitions to `true`. Additionally, add `id="edit-alt-text-help"` to the helper paragraph and reference it via `aria-describedby="edit-alt-text-help"` on the `<textarea>`.

### Recommended code

#### JavaScript / JSX

```jsx
const textareaRef = useRef(null);

const handleToggleEdit = () => {
  const nextEditing = !isEditing;
  setIsEditing(nextEditing);
  if (nextEditing) {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }
};
```

```html
<div>
  <label for="edit-alt-text" class="sr-only">Edit alt text</label>
  <textarea
    id="edit-alt-text"
    rows="3"
    aria-describedby="edit-alt-text-help"
    class="..."
  ></textarea>
  <p id="edit-alt-text-help" class="...">
    Changes to the alt text will immediately reflect in the HTML and Markdown
    snippets below.
  </p>
</div>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** Output Snippet (`OutputSnippet.jsx`)
- **Selector:** `#edit-alt-text`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Operable
- **WCAG SC:** [2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)
- **Severity:** High
- **Effort:** Low
- **Disabilities Affected:** Visual, Physical, Cognitive

---

# [Output Snippet] Copy buttons (`aria-label`) override visible button text ("Copied!") and fail to announce clipboard status to screen readers

## Issue summary

In [`OutputSnippet.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/OutputSnippet.jsx#L80-L201), the three clipboard buttons display visible text `"Copy Text"`, `"Copy HTML"`, and `"Copy Markdown"`, which dynamically changes to `"Copied!"` with a checkmark icon for 2 seconds when clicked.

However, each button has a static `aria-label` that does not match its visible text and never updates when `copiedKey` changes:

- Visible: `"Copy Text"` / `"Copied!"` -> `aria-label="Copy raw alt text to clipboard"`
- Visible: `"Copy HTML"` / `"Copied!"` -> `aria-label="Copy HTML image tag snippet to clipboard"`
- Visible: `"Copy Markdown"` / `"Copied!"` -> `aria-label="Copy Markdown image syntax to clipboard"`

This causes two accessibility failures:

1. **Unannounced status message (WCAG 4.1.3 Status Messages):** Because the `aria-label` on the `<button>` remains static (`"Copy raw alt text to clipboard"`) and no `role="status"` / `aria-live="polite"` region is updated when `handleCopy` succeeds, screen reader users receive zero confirmation that the text was copied to the clipboard.
2. **Label in Name mismatch (WCAG 2.5.3 Label in Name):** For the `"Copy Text"` button, the visible label word `"Text"` is not a substring of `"Copy raw alt text to clipboard"` in the same sequence (`"Copy Text"` vs `"Copy raw alt text..."`), and when the visible text changes to `"Copied!"`, `"Copied!"` is completely absent from all three accessible names.

<details>
  <summary>Screenshots</summary>

  <!-- Alt: Copy Text button displaying 'Copied!' visually while its accessible name remains 'Copy raw alt text to clipboard' with no live region announcement. -->

</details>

### Current code

#### HTML / JSX ([`src/components/OutputSnippet.jsx`](file:///Users/svinkle/Sites/alt-text-generator/src/components/OutputSnippet.jsx#L80-L101))

```jsx
<button
  type="button"
  onClick={() => handleCopy("raw", altText)}
  className="..."
  aria-label="Copy raw alt text to clipboard"
>
  {copiedKey === "raw" ? (
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
```

## Steps to reproduce

1. Open the page, enable a screen reader (e.g., VoiceOver on macOS), load a demo image, and activate `Generate Alt Text`.
2. Navigate to the `Copy Text`, `Copy HTML`, or `Copy Markdown` button and press `Enter` or `Space`.
3. Observe that while the visual button label changes to `"Copied!"` with a green background, the screen reader makes no announcement that the snippet was copied, and the button's accessible name never changes from `"Copy raw alt text to clipboard"`.

## Behavior

### Expected

Each copy button's accessible name begins with its visible label (e.g., `"Copy Text, raw alt text"` or simply relies on its visible text), and activating any copy button announces a polite status message (e.g., `"Copied raw alt text to clipboard"`) via an `aria-live="polite"` / `role="status"` region.

### Actual

Static `aria-label` attributes mask the `"Copied!"` state change and mismatch `"Copy Text"`, and no live region announces the clipboard copy confirmation to screen readers.

## Recommendation

1. Add a polite live region (`<div role="status" aria-live="polite" className="sr-only">`) in `OutputSnippet.jsx` (or pass a status update to `App.jsx`'s `statusMessage`) that announces `"Copied raw alt text to clipboard."`, `"Copied HTML snippet to clipboard."`, or `"Copied Markdown snippet to clipboard."` when `handleCopy` succeeds.
2. Remove the overriding static `aria-label` attributes on the copy buttons (since their visible text `"Copy Text"`, `"Copy HTML"`, `"Copy Markdown"` inside each titled card is already clear, or append `.sr-only` context after the visible label so the accessible name always starts with the exact visible text).

### Recommended code

#### HTML / JSX

```jsx
<button
  type="button"
  onClick={() => handleCopy('raw', altText)}
  className="..."
>
  {copiedKey === 'raw' ? (
    <>
      <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
      <span>Copied!</span>
      <span className="sr-only"> raw alt text to clipboard</span>
    </>
  ) : (
    <>
      <Copy className="w-4 h-4" aria-hidden="true" />
      <span>Copy Text</span>
      <span className="sr-only"> (raw alt text)</span>
    </>
  )}
</button>

<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {copiedKey === 'raw' && 'Copied raw alt text to clipboard.'}
  {copiedKey === 'html' && 'Copied HTML snippet to clipboard.'}
  {copiedKey === 'markdown' && 'Copied Markdown syntax to clipboard.'}
</div>
```

## Specifications

- **Browser:** Any
- **OS:** macOS
- **Module:** Output Snippet (`OutputSnippet.jsx`)
- **Selector:** `button[aria-label="Copy raw alt text to clipboard"]`
- **Color scheme:** Light
- **Viewport:** Desktop (1280px)
- **WCAG Principal:** Robust
- **WCAG SC:** [4.1.3 Status Messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)
- **Severity:** High
- **Effort:** Low
- **Disabilities Affected:** Visual, Physical, Cognitive, Speech, Neurological

```

```

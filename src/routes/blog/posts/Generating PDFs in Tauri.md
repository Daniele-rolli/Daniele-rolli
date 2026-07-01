---
title: "Generating PDFs natively in Tauri"
date: "2026-07-01"
banner: "/images/blog/2026-07-01.png"
---

I've been porting my app [Beaver Notes](https://github.com/Daniele-rolli/beaver-notes) to Tauri, and I quickly learned that one of the biggest pain points of that transition would be generating PDFs. In Electron you can use Chromium's silent printing options to generate a PDF without ever showing as much as a single dialog to the user. In Tauri, `window.print()` just opens the system print dialog, not what you want from a polished app.

There's no built-in way around this: Tauri doesn't ship a `printToPdf()` command, and every platform requires at least a hidden webview to render into. So after a fair amount of research, I put together a custom pipeline that drives each platform's *native* PDF generation APIs directly. This post walks through that pipeline layer by layer, using Beaver Notes as the running example, so you can adapt it to your own app.

> Quick disclaimer: I used GLM-5.2 to help with research, scaffolding, and parts of the implementation. I like being transparent about my use of AI, so I wanted to mention it upfront. Every line of code was reviewed, tested across all supported platforms, and debugged by me.

## The general problem

Whatever framework you're editing content in Tiptap, ProseMirror, a plain `contenteditable` div, whatever the shape of the problem is the same:

1. You have some DOM you want to turn into a PDF.
2. Tauri has no cross-platform "print silently to a file" API.
3. Every desktop platform *does* expose one, natively so you just have to reach it yourself: `WKWebView` printing on macOS, `WebView2`'s `PrintToPdf` on Windows, `WebKitPrintOperation` on Linux.
4. Mobile has no windowing model to hide a webview in, so it needs its own plugin.

The pipeline below solves this by splitting the work into layers: a JS layer that turns your DOM into a **self-contained, print-ready HTML document**, and a native layer per platform that loads that HTML into a hidden webview and asks the OS to print it to a file instead of a printer. Everything else, pagination, fonts, images, has to be resolved in the HTML *before* it reaches the native side, because none of the native print APIs understand your app's DOM, stylesheets, or JS framework.

## Overview

The pipeline has three layers on desktop, and four on mobile:

| Layer | Location (Beaver Notes) | Role |
| --- | --- | --- |
| **JS orchestration** | [`PDF.js`](https://raw.githubusercontent.com/Beaver-Notes/Beaver-Notes/refs/heads/Tauri/src/utils/share/PDF.js), [`exportBulk.js`](https://raw.githubusercontent.com/Beaver-Notes/Beaver-Notes/refs/heads/Tauri/src/utils/share/exportBulk.js) | Extract content → self-contained HTML with a pagination script |
| **JS bridge** | [`pdf.js`](https://raw.githubusercontent.com/Beaver-Notes/Beaver-Notes/refs/heads/Tauri/src/lib/native/pdf.js) | `backend.invoke('pdf:render', { html, outputPath })` |
| **Rust command** | [`pdf.rs`](https://raw.githubusercontent.com/Beaver-Notes/Beaver-Notes/refs/heads/Tauri/src-tauri/src/commands/pdf.rs) | Opens a hidden webview → prints/saves the PDF via platform-native APIs |
| **Mobile plugin** | [`tauri-plugin-pdf-render`](https://github.com/Beaver-Notes/Beaver-Notes/tree/Tauri/vendor/tauri-plugin-pdf-render) | iOS `WKWebView` / Android `WebView` → native print-to-PDF |

If you're adapting this to your own app: the first two layers (HTML generation, and the bridge that hands it to Rust) are the ones you'll rewrite. The Rust and mobile layers are close to framework-agnostic, they just take an HTML string and an output path, so you can lift them mostly as-is.

## Layer 1: Building the export HTML (`exportBulk.js`)

This is the layer you'll do the most work on, because it's the only one that touches your editor's content directly. In Beaver, `exportBulk.js` is the entry point: it pulls the Tiptap document out of the editor and turns it into a self-contained HTML page. `PDF.js` just calls into it, so you can ignore that file, the interesting logic lives in `exportBulk.js`. Some of it (`mode`, `editor`, `noteId`) is specific to Beaver's Tiptap setup, but the overall approach works with any DOM as long as you adjust the extraction step.

`exportBulk.js` produces a self-contained HTML document in four steps:

1. **Clone the DOM.** `prepareExportDom()` clones the editor element, strips editor-only UI (toolbars, cursors, selection handles), and resolves any custom node views, in Beaver's case, KaTeX formulas, Mermaid diagrams, and image embeds all need to be "flattened" into plain HTML/SVG/`<img>` before printing, since the native print engines don't run your framework's renderer.
2. **Inline the images.** `inlineImages()` reads local asset files and converts them to base64 data URIs. This matters because the hidden webview loads the HTML from a temp file, any image referenced by a relative or app-specific path won't resolve there.
3. **Generate `@page` CSS.** `buildWebPageCss()` produces one of two rule sets:
   - **Paginated mode:** body width is set to `contentWidth` (674px = 794px − 2×60px margin), background is forced white, and `print-color-adjust: exact` is set so background colors and highlights survive printing.
   - **Non-paginated mode:** a plain `@page { size: A4 portrait; margin: 12mm; }` wrapped in `@media print`, letting the browser paginate naturally.
4. **Inject the measurement script.** `buildMeasurementScript()` inserts a JS IIFE (only when `isPaginated: true`) that:
   - Waits for fonts and images to finish loading.
   - Walks every block element and collects layout hints: `force_break`, `keep_together`, `keep_with_next`, `table_region`, `tall_block`.
   - Runs `computeCuts()` to work out page-break positions while respecting orphans/widows.
   - Injects `<div style="break-after:page">` markers directly into the body.

This last step is the key idea of the whole pipeline: instead of trusting each platform's print engine to paginate your content well, you compute the page breaks yourself in JS, where you have full knowledge of the DOM, and hand the *native* engines an already-paginated document. That's what makes the output consistent across five different print backends.

### Keeping constants in sync

A handful of layout constants have to match exactly between the JS layer and the Rust layer, because the JS decides where content gets cut and the Rust configures the actual PDF page geometry:

| Constant | JS (`exportBulk.js`) | Rust (`pdf.rs`) |
| --- | --- | --- |
| A4 CSS width | `A4_CSS_W = 794` | `A4_CSS_W: f64 = 794.0` (macOS) / `i32 = 794` (Windows) |
| A4 CSS height | not exported; computed | `A4_CSS_H: f64 = 1123.0` / `i32 = 1123` |
| A4 points width | `A4_PT_W = 595` | `A4_PT_W: f64 = 595.0` |
| A4 points height | `A4_PT_H = 842` | `A4_PT_H: f64 = 842.0` |
| CSS px → pt | `CSS_PX_TO_PT = 72 / 96` | `CSS_PX_TO_PT: f64 = 72.0 / 96.0` |
| Page margin (CSS px) | `PDF_PAGE_MARGIN_CSS_PX = 60` | `PDF_PAGE_MARGIN_CSS_PX: f64 = 60.0` |
| Page margin (pt) | computed: `(A4_PT_W - (A4_CSS_W - 2*60) * (72/96)) / 2` | same formula |

**If you change any of these, change both sides identically**, a mismatch here is the most common source of subtly-wrong margins or an extra blank page at the end.

## Layer 2: The bridge (`pdf.js` → `pdf.rs`)

Once you have a finished HTML string, getting it into Rust is the easy part. The frontend bridge is a thin wrapper around `invoke`:

```js
export async function renderPdf(html, outputPath) {
  return backend.invoke("pdf:render", { html, outputPath });
}
```

That call is routed through a command alias table (`src/lib/tauri/commands.js`, line 104) that maps the string `'pdf:render'` to the Rust command name `render_pdf`. On the Rust side, `render_pdf` just delegates to a platform-specific `render_native`, picked at compile time via `#[cfg(target_os = "...")]`:

```rust
#[tauri::command]
pub(crate) async fn render_pdf(
    app: AppHandle,
    html: String,
    output_path: String,
) -> Result<(), String> {
    render_native(app, html, output_path).await
}
```

This is the layer with the least to adapt, swap in whatever your app's IPC bridge looks like, as long as it can pass an HTML string and an output path through to Rust.

## Layer 3: The native command (`pdf.rs`)

This is where the actual "print to a file with no dialog" trick happens, and it's different on every desktop platform. In all three cases the algorithm is roughly: write the HTML to a temp file → open it in a hidden webview → wait for it to finish loading → ask the OS's print machinery to write a PDF to disk instead of showing a dialog → clean up.

### macOS

**Tauri APIs used:** 
- `WebviewWindowBuilder` (creates the hidden window)
- `WebviewWindow::with_webview()` (reaches down to the native `WKWebView`)
- `WebviewUrl::External()` (loads the HTML via a `file://` URL)
- `PageLoadEvent::Finished` (detects load completion).

**Algorithm:**

1. Write the HTML to a temp file (`write_html_to_temp()`).
2. Build a hidden `WebviewWindow`, sized 794×1123, no decorations, never shown.
3. Wait for `PageLoadEvent::Finished`, plus a 500ms settling delay.
4. On the main thread, via `with_webview()`, call `run_print_page_pdf()`.
5. Inside `run_print_page_pdf()`:
   - Retrieve the `WKWebView` pointer with `unsafe { Retained::retain(...) }`.
   - Configure `NSPrintInfo` with A4 paper size and margins (`PDF_PAGE_MARGIN_PT`).
   - Set the job disposition to `NSPrintSaveJob`, targeting the output URL.
   - Call `webview.printOperationWithPrintInfo()`.
   - Set `setShowsPrintPanel(false)` and `setShowsProgressPanel(false)`, this is what makes it silent.
   - Run it modally with `runOperationModalForWindow(...)`.
6. Clean up: delete the temp HTML, destroy the window.

The part that actually makes this silent is `run_print_page_pdf()`, it configures `NSPrintInfo` to save straight to a file and turns off both dialogs before running the print operation:

```rust
let print_info = NSPrintInfo::new();
print_info.setPaperSize(CGSize { width: A4_PT_W, height: A4_PT_H });
print_info.setOrientation(NSPaperOrientation::Portrait);
print_info.setTopMargin(PDF_PAGE_MARGIN_PT);
print_info.setBottomMargin(PDF_PAGE_MARGIN_PT);
print_info.setLeftMargin(PDF_PAGE_MARGIN_PT);
print_info.setRightMargin(PDF_PAGE_MARGIN_PT);
unsafe { print_info.setJobDisposition(NSPrintSaveJob); }

let save_url = NSURL::fileURLWithPath_isDirectory(&NSString::from_str(output_path), false);
unsafe {
    let dict = print_info.dictionary();
    dict.insert(NSPrintJobSavingURL, &*save_url);
}

let print_op = unsafe { webview.printOperationWithPrintInfo(&print_info) };
print_op.setShowsPrintPanel(false);
print_op.setShowsProgressPanel(false);

let window = webview.window().ok_or_else(|| "WKWebView has no window".to_string())?;
unsafe {
    print_op.runOperationModalForWindow_delegate_didRunSelector_contextInfo(
        &window, None, None, std::ptr::null_mut(),
    );
}
```

```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.6"
objc2-foundation = { version = "0.3", features = ["NSURL"] }
objc2-core-foundation = "0.3"
objc2-app-kit = { version = "0.3", features = ["NSPrintInfo", "NSPrintOperation", ...] }
objc2-web-kit = { version = "0.3", features = ["block2", "objc2-core-foundation", "objc2-app-kit"] }
block2 = "0.6"
```

**The gotcha:** `runOperationModalForWindow` blocks the AppKit main-thread event loop until printing finishes, that's fine here because it's meant to run synchronously, and a `oneshot` channel signals completion back to the async command. A short 100ms sleep afterward ensures the file is fully flushed to disk before you return.

### Windows

No high-level Tauri API is available here, the implementation talks to `webview2-com` and `windows` directly.

**Algorithm:**

1. Write the HTML to a temp file (`write_export_html_to_temp()`).
2. Spawn a dedicated thread, it must be STA, since WebView2 relies on COM.
3. On that thread:
   - `CoInitializeEx(None, COINIT_APARTMENTTHREADED)`.
   - Register a dummy window class and create a **message-only window** (`HWND_MESSAGE`), so nothing is ever visible.
   - Create a `WebView2` environment → controller → `ICoreWebView2`.
   - Set bounds to A4 size.
   - Navigate to the `file:///...` URL and wait for `NavigationCompleted`.
   - Call `ICoreWebView2_7::PrintToPdf()`, writing to a temp file.
   - Read the temp file's bytes back.
4. Send the bytes to the async command over a channel, then write them to `output_path`.
5. Clean up.

The navigate-then-print sequence, with the `ExecuteScript` call that triggers the measurement script before printing:

```rust
webview.add_NavigationCompleted(&handler, &mut nav_token)?;
webview.Navigate(&HSTRING::from(&url_string))?;
recv_with_pump(&nav_rx)??; // wait for NavigationCompleted, pumping messages

// Trigger the measurement script's side effect (injecting page breaks)
let script = HSTRING::from("JSON.stringify((window.__bnLayout || []))");
let _ = webview.ExecuteScript(&script, &noop_handler);

// PrintToPdf writes straight to a staged file: no dialog, no printer needed
let webview_7: ICoreWebView2_7 = webview.cast()?;
webview_7.PrintToPdf(PCWSTR(pdf_path_hstring.as_ptr()), None, &pdf_handler)?;
let pdf_bytes = recv_with_pump(&pdf_rx)??;
```

```toml
[target.'cfg(windows)'.dependencies]
webview2-com = "0.38"
windows = { version = "0.61", features = ["Win32_System_Com"] }
```

**Gotchas:**
- A message-pump loop (`pump_messages` / `recv_with_pump`) has to keep COM/WebView2 messages flowing while the thread waits on the `mpsc` channel, otherwise WebView2 callbacks never fire.
- `ExecuteScript` is used to trigger the measurement script (`window.__bnLayout`), but since `PrintToPdf` already respects CSS `break-after:page`, what matters is the script's *side effect* of injecting page breaks, not any return value.
- `ICoreWebView2_7` is the interface version that adds `PrintToPdf`, check your `webview2-com` version exposes it (anything shipped in windows 10 and above should work just fine).

### Linux

**Tauri APIs used:** 
- `WebviewWindowBuilder`
- `WebviewWindow::with_webview()` (reaching the underlying `webkit2gtk::WebView`)
- `WebviewUrl::External()`
- `PageLoadEvent::Finished`

**Algorithm:**

1. Set `GTK_PRINT_BACKENDS=file` *before* any GTK initialization, this forces "print to file" without needing a configured printer or CUPS.
2. Write HTML to a temp file (`write_export_html_to_temp()`).
3. Build a hidden `WebviewWindow`, 794×1123.
4. Wait for `PageLoadEvent::Finished`, plus a 150ms settle.
5. Inside `with_webview()`:
   - Create a `webkit2gtk::PrintOperation` for the webview.
   - Configure `gtk::PrintSettings`: `print-to-file=true`, `output-file-format=pdf`, `output-uri=file:///tmp/...`.
   - Configure `gtk::PageSetup`: paper size `iso_a4`, portrait.
   - Connect `connect_finished()` / `connect_failed()` handlers.
   - Call `print_op.print()`.
6. Read the staged PDF bytes and write them to the final `output_path`.
7. Clean up.

The `PrintOperation` setup that makes it write to a file instead of showing a dialog:

```rust
let wk = webview.inner();
let print_op = PrintOperation::new(&wk);

let settings = gtk::PrintSettings::new();
settings.set_bool("print-to-file", true);
settings.set("output-file-format", Some("pdf"));
settings.set("output-uri", Some(&pdf_uri));
settings.set_printer("Print to File");
print_op.set_print_settings(&settings);

let page_setup = gtk::PageSetup::new();
let paper_size = gtk::PaperSize::new(Some("iso_a4"));
page_setup.set_paper_size(&paper_size);
page_setup.set_orientation(gtk::PageOrientation::Portrait);
print_op.set_page_setup(&page_setup);

print_op.connect_finished(move |_op| { /* read the staged PDF bytes back */ });
print_op.connect_failed(move |_op, err| { /* propagate the error */ });
print_op.print();
```

```toml
[target.'cfg(target_os = "linux")'.dependencies]
webkit2gtk = "2"
gtk = "0.18"
```

**Gotchas:**
- Setting `GTK_PRINT_BACKENDS=file` is what avoids the "no printer configured" failure, don't skip it.
- The `output-uri` setting is where the file actually lands, so make sure it points somewhere writable.
- The implementation blocks on `mpsc::recv()` inside an async context, this only works because the print callbacks fire on the GTK main loop, not a background thread.

## Mobile: iOS and Android

There's no windowing model on mobile to hide a native window in, so both platforms go through a custom Tauri plugin, `tauri-plugin-pdf-render`, instead of the desktop `render_native` path:

```rust
use tauri_plugin_pdf_render::{PdfRenderExt, RenderRequest, WriteScopedRequest};

let request = RenderRequest {
    html_path: html_path.to_string_lossy().into_owned(),
    output_path: render_output.clone(),
    timeout_ms: 30_000,
};
tokio::task::spawn_blocking(move || app_clone.pdf_render().render(request))
```

registered in `src-tauri/src/lib.rs` with:

```rust
.plugin(tauri_plugin_pdf_render::init())
```

Saving files on mobile also requires scoped storage access on both platforms, Beaver handles that with a separate plugin, [tauri-plugin-scoped-storage](https://github.com/Daniele-rolli/tauri-plugin-scoped-storage).

### Plugin structure

- `src/lib.rs`: registers the plugin and exposes the `PdfRenderExt` trait.
- `src/mobile.rs`: bridges to platform code via `PluginHandle::run_mobile_plugin()`.
- `src/models.rs`: defines `RenderRequest { html_path, output_path, timeout_ms }` and `WriteScopedRequest`.
- `build.rs`: declares the `"render"` command.

### iOS (Swift)

`ios/Sources/PdfRenderPlugin/PdfRenderPlugin.swift`:

1. `render(_ invoke:)` parses the request and creates a hidden `WKWebView` (794×1123) on the main thread.
2. A `RenderSession` conforms to `WKNavigationDelegate` and starts a timeout via `DispatchQueue.main.asyncAfter`, then loads the HTML with `webView.loadFileURL(htmlURL, allowingReadAccessTo: readAccess)`.
3. `webView(_:didFinish:)` waits 300ms, then calls `capturePDF()`.
4. `capturePDF()` builds a `UIPrintPageRenderer` around `webView.viewPrintFormatter()`, sets `paperRect` (A4: 595×842pt) and a `printableRect` inset by 48pt margins, then renders each page with `UIGraphicsBeginPDFContextToData` / `UIGraphicsBeginPDFPageWithInfo` / `drawPage(at:)`, and writes the resulting data to `outputPath`.

### Android (Kotlin)

`android/src/main/java/PdfRenderPlugin.kt`:

1. `render(invoke)` parses the request and posts the work to the main handler.
2. `runRender()` reads the HTML and **strips the pagination script** with a regex matching `<script>...__bnPaginate...</script>`. This is deliberate: Android's `PrintDocumentAdapter` paginates natively, and the explicit `break-after:page` markers from the measurement script cause blank pages when combined with it.
3. It creates a hidden `WebView` with JavaScript enabled, matches the viewport to the CSS content width, and loads the HTML with `webView.loadUrl("file://...")`.
4. `onPageFinished()` injects `@page { margin: 60px; }` CSS, then after a 500ms delay calls `printWithAdapter()`.
5. `printWithAdapter()` builds `PrintAttributes` (ISO_A4, color, 300dpi), gets an adapter from `webView.createPrintDocumentAdapter("Document")`, and drives its `onLayout()` / `onWrite()` callbacks manually on the main thread using a small set of embedded DEX classes (`ConcreteLayoutCallback`, `ConcreteWriteCallback`) synchronized with a `CountDownLatch`.

**Why the embedded DEX:** `LayoutResultCallback` and `WriteResultCallback` are marked `@hide` in the public Android SDK, their constructors are package-private, so you can't subclass them from normal app code. The plugin ships a small pre-compiled DEX (base64-encoded, loaded at runtime via `InMemoryDexClassLoader`) containing concrete subclasses that *can* be instantiated, then bridges their callbacks back into Kotlin.

## Adapting this to your own app

If you're building this for a different editor or framework, here's roughly what changes and what doesn't:

- **Always rewrite:** the DOM-extraction step (`prepareExportDom` and friends), this is inherently tied to your editor or the DOM you're working with.
- **Usually rewrite:** the pagination heuristics inside the measurement script, if your content has different layout rules (tables, embeds, code blocks, etc. all need their own "don't split here" hints).
- **Mostly reusable as-is:** the Rust `pdf.rs` commands and the mobile plugin, they only care about an HTML string and an output path, so they don't need to know anything about your framework.
- **Keep in sync no matter what:** the A4/margin constants between JS and Rust, and the pagination-marker format your measurement script emits, since the mobile plugin (Android specifically) actively looks for it.

## Resources

### Related GitHub issues

- [`tauri-apps/tauri` #4917: Provide print API](https://github.com/tauri-apps/tauri/issues/4917)
- [`tauri-apps/tauri` #12284: PDF generation programmatically](https://github.com/tauri-apps/tauri/issues/12284)
- [`tauri-apps/wry` #707: Add ability to print webview to pdf silently](https://github.com/tauri-apps/wry/issues/707)
- [`tauri-apps/plugins-workspace` #293: Add plugin for (silent) print API](https://github.com/tauri-apps/plugins-workspace/issues/293)
- [`tauri-apps/plugins-workspace` #3340: New plugin proposal: cross-platform printer support](https://github.com/tauri-apps/plugins-workspace/issues/3340) - shows this is still an open gap as of 2026

### Docs and APIs

- [`WebviewWindowBuilder`](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html)
- [`Webview::with_webview()`](https://docs.rs/tauri/latest/tauri/webview/struct.Webview.html#method.with_webview)
- [`tauri::webview::PlatformWebview`](https://docs.rs/tauri/latest/tauri/webview/struct.PlatformWebview.html) - the platform webview handle passed into `with_webview()`'s closure (this replaced wry's old standalone `PlatformWebview` enum after wry's `tao`-removal refactor)
- [`WebviewWindow::print()`](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html#method.print)
- [`PageLoadEvent`](https://docs.rs/tauri/latest/tauri/webview/enum.PageLoadEvent.html)
- [`WebviewUrl`](https://docs.rs/tauri/latest/tauri/enum.WebviewUrl.html)
- [Tauri mobile plugins](https://v2.tauri.app/develop/plugins/)
- [Tauri JS `WebviewWindow`](https://v2.tauri.app/reference/javascript/api/namespacewebviewwindow/)
- [WebView2 `PrintToPdf`](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2_7#printtopdf)
- [WebKitGTK `PrintOperation`](https://webkitgtk.org/reference/webkit2gtk/stable/class.PrintOperation.html)
- [objc2 AppKit `NSPrintInfo`](https://docs.rs/objc2-app-kit/latest/objc2_app_kit/struct.NSPrintInfo.html)

---
title: "Capacitor SpotSearch"
github: "https://github.com/Daniele-rolli/capacitor-spotsearch"
banner: "/images/projects/spotsearch.png"
stack: "js,swift"
---

# Overview

Capacitor SpotSearch is an iOS plugin that integrates **Core Spotlight indexing** into Capacitor applications, allowing app content to appear directly in system Spotlight results.

It was built to let users open Beaver Pocket notes straight from Spotlight and jump directly into the app. Hybrid apps typically lack this level of OS integration. This plugin provides a clean bridge to native indexing without background automation or hidden synchronization logic.

The API surface is intentionally small. JavaScript decides what gets indexed, when, and under which identifiers. The native layer simply performs the indexing.

# Problem

Capacitor does not ship with built-in Spotlight support.

Without native indexing:

- App content never appears in system search
- Deep linking into specific records is limited
- Hybrid apps fall short of native parity
- Discoverability relies entirely on in-app search

On iOS, Spotlight integration requires direct use of:

- `CSSearchableItem`
- `CSSearchableIndex`
- `CSSearchableItemAttributeSet`

This cannot be implemented purely in JavaScript.

# Architecture

The plugin exposes a thin JavaScript interface and delegates all indexing to Swift using:

- `CoreSpotlight`
- `UniformTypeIdentifiers`

## iOS (Swift)

### User-Opt-In Indexing

Indexing is disabled by default.

```ts
enableIndexing({ enabled: false });
```

The toggle exists for explicit user consent. If indexing is not enabled, calls to index or delete items resolve immediately without performing work.

This guarantees:

- No silent indexing
- No unintended exposure of content
- Clear, user-controlled behavior

### Indexing Flow

1. JavaScript passes structured items
2. Each item becomes a `CSSearchableItem`
3. Metadata is assigned via `CSSearchableItemAttributeSet`
4. Items are submitted through `CSSearchableIndex.default()`

Supported metadata includes:

- `id` (uniqueIdentifier)
- `domain` (domainIdentifier)
- `title`
- `snippet`
- `keywords`
- `url`
- `thumbnailBase64`

All operations are asynchronous and report success or failure back to JavaScript.

# Features

- `enableIndexing(enabled: boolean)` explicit opt-in control
- `indexItems(items: SearchableItem[])`
- `deleteItems(ids: string[])`
- `deleteDomain(domain: string)`

Each indexed entity supports:

- Stable unique identifiers
- Domain-based grouping
- Keyword indexing
- Deep-link URLs
- Optional thumbnail images

# Design Decisions

- Strict opt-in indexing
- No automatic synchronization layer
- No internal persistence model
- No background reindexing

The plugin does not attempt to mirror application state. It acts purely as a bridge to the native Spotlight APIs.

# Challenges

- Avoiding stale or orphaned entries
- Maintaining stable identifier strategies
- Managing thumbnail memory costs
- Ensuring indexing respects user privacy preferences

Spotlight indexing is powerful, but misuse leads to outdated or misleading search results. Control must remain with the app.

# Impact

Capacitor SpotSearch enables hybrid apps to integrate directly with iOS system search in a controlled way:

- Notes and knowledge applications
- Document managers
- Task and project tools
- Content-heavy utilities

It restores parity with native apps while keeping indexing explicit and user-driven.

The result is simple: app content becomes searchable at the OS level, but only when the user chooses it.

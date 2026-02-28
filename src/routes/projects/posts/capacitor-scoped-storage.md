---
title: "Capacitor ScopedStorage"
github: "https://github.com/Daniele-rolli/capacitor-scoped-storage"
banner: "/images/projects/scopedstorage.png"
stack: "js,java,swift"
---

# Overview

Capacitor Scoped Storage is an npm plugin that allows Capacitor apps to read and write files **outside the app sandbox**, inside user-selected folders on iOS and Android.

It was built while working on **Beaver Pocket**, where the default Capacitor Filesystem plugin was limited to app-internal storage and could not write to user-accessible directories such as Documents, shared folders, or cloud-backed locations.

This plugin implements the platform-native solution for external storage access with user-granted, scoped folder permissions backed by security-scoped bookmarks on iOS and the Storage Access Framework on Android.

# Problem

Capacitor’s Filesystem API works inside the app container. It does not support writing to arbitrary user-visible locations.

That limitation blocks common workflows:

- Exporting files to the Files app
- Syncing to cloud-backed directories
- Letting users choose where project data lives
- Interoperating with other apps via real file paths

Modern mobile OSes intentionally restrict filesystem access. Direct writes to `/Documents` or external storage are no longer valid patterns.

The supported approach is:

- **iOS:** security-scoped access via `UIDocumentPicker`
- **Android:** Storage Access Framework (tree `Uri`)

Capacitor does not provide this abstraction out of the box.

# Architecture

The plugin exposes a consistent JavaScript API while delegating storage control to each platform’s official model.

## iOS (Swift)

- Folder selection via `UIDocumentPicker`
- Persistent access through security-scoped bookmarks
- Scoped access lifecycle using `startAccessingSecurityScopedResource()`
- Coordinated writes via `NSFileCoordinator` (important for iCloud and provider-backed locations)

All operations are constrained to the granted folder.

## Android (Java)

- Folder access via Storage Access Framework
- Tree traversal with `DocumentFile`
- Stream-based reads and writes through `ContentResolver`
- Manual copy/move logic within the granted tree URI

No legacy storage permissions. Fully compliant with modern scoped storage rules.

# Features

- `pickFolder()`
- `writeFile`, `appendFile`, `readFile`
- `mkdir`, `rmdir`, `readdir`
- `stat`, `exists`
- `deleteFile`, `move`, `copy`
- `getUriForPath`

Supports both `utf8` and `base64` for binary-safe operations.

# Challenges

- Persisting access across launches (bookmarks / tree URIs)
- Handling cloud provider edge cases
- Normalizing overwrite behavior across platforms
- Avoiding deprecated storage APIs

# Impact

Capacitor Scoped Storage enables real user-controlled file workflows in hybrid apps:

- Note-taking apps (like Beaver Pocket)
- Editors
- Backup/export tools
- Project-based applications
- Cloud-integrated utilities

It brings user-selected, external file workflows to Capacitor apps without relying on deprecated or unsupported storage patterns.

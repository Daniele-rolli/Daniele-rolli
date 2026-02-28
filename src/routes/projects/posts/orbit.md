---
title: "Orbit"
github: "https://github.com/Daniele-rolli/orbit"
banner: "/images/projects/orbit.png"
stack: "swift"
---

# Overview

Orbit is a Swift + SwiftUI iOS app that connects to Colmi smart rings and syncs health data **without the vendor Qring app**. It pairs natively via CoreBluetooth, stores data **encrypted on-device** with Core Data, and exports metrics to **HealthKit** so users can view everything in Apple Health.

The Bluetooth protocol layer is based on Gadgetbridge’s reverse-engineered Colmi implementation, adapted into a native iOS sync pipeline.

# Problem

Most low-cost wearables lock users into proprietary apps that are opaque about what’s collected and where it goes. For Colmi rings, that typically means account-driven flows, limited export, and poor control over data retention.

I built Orbit to provide:

* A native iOS pairing + sync experience
* Local-first, encrypted storage by default
* A clean handoff to Apple Health via HealthKit

# Architecture

Orbit is built with:

* **SwiftUI** for UI
* **CoreBluetooth** for pairing, writes, and notification streams
* **Core Data + encryption** for local persistence
* **HealthKit** for data export into Apple Health

Sync is implemented as a chained pipeline with packet routing and parsers:

* Per-day history requests (Activity, HR, HRV)
* Multi-packet reassembly for “big data” payloads (SpO2, Sleep, Temperature)
* Merge/upsert persistence to deduplicate and survive disconnects

# Features

* Native Bluetooth pairing and device control
* Historical sync for Activity, Heart Rate, HRV, Stress, SpO2, Sleep, Temperature
* Big-data V2 packet buffering + reassembly for fragmented BLE notifications
* Incremental persistence (merge/upsert) to avoid duplicates and data loss
* HealthKit integration for Apple Health sharing

# Challenges

* Handling fragmented BLE payloads and multi-packet history protocols
* Reconstructing accurate timestamps (local-midnight encoded as UTC) to avoid day/slot drift
* Normalizing inconsistent units across packet types (e.g., calories scaling differences)
* Designing persistence to be resilient to disconnects and iOS background limits

# Impact

Orbit turns a cheap wearable into a privacy-respecting data source: sync works without vendor infrastructure, data stays encrypted on-device, and your data sync with your other werables in Apple Health.

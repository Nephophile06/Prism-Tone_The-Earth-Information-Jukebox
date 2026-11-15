# Prism Tone - *for NASA Space Apps Challenge 2026*

**Challenge:** The Earth Information Jukebox  
**Target Award Category:** 🏆 Art & Technology (Primary) · 📖 Best Use of Storytelling (Secondary)  
**Team:** Cosmic Cloud  
**Project:** Prism Tone

> Prism Tone is an interactive, multimodal sonification system translating NASA Earth science data into real-time audiovisual symphonies.

<br>

[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7+-646CFF.svg?style=flat&logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4+-06B6D4.svg?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Motion](https://img.shields.io/badge/Motion-React-black.svg?style=flat&logo=framer)](https://motion.dev/)
[![Tone.js](https://img.shields.io/badge/Tone.js-Web_Audio_API-black.svg?style=flat)](https://tonejs.github.io/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare_Pages-Global_Edge-F38020.svg?style=flat&logo=cloudflare)](https://pages.cloudflare.com/)

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=flat&logo=python)](https://www.python.org/)
[![Pandas](https://img.shields.io/badge/Pandas-Data_Analysis-150458.svg?style=flat&logo=pandas)](https://pandas.pydata.org/)
[![NumPy](https://img.shields.io/badge/NumPy-Numerical_Computing-013243.svg?style=flat&logo=numpy)](https://numpy.org/)
[![NASA Data](https://img.shields.io/badge/NASA-Earth_Data-EF3B2D.svg?style=flat&logo=nasa)](https://www.nasa.gov/)
[![Prism Engine](https://img.shields.io/badge/Prism_Engine-Client_Side_DSP-8A2BE2.svg?style=flat)](#)
[![License](https://img.shields.io/badge/License-Apache_2.0-yellow.svg?style=flat)](LICENSE)

## Table of Contents

- [Overview](#overview)
- [Meet the Team](#meet-the-team---cosmic-cloud)
- [Project Status](#project-status)
- [The Idea](#the-idea)
- [Core Concept](#core-concept)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Data Sources & Scientific Processing](#data-sources--scientific-processing)
- [User Experience](#user-experience)
- [Project Structure](#project-structure)
- [Installation & Running](#installation--running)
- [Development Roadmap](#development-roadmap--milestones)
- [Fail-Safe Development Strategy](#fail-safe-development-strategy)
- [Accessibility Philosophy](#accessibility-philosophy)
- [Future Possibilities](#future-possibilities)

## Overview

The project is an advanced Earth observation platform that solves a critical problem: **Visual-only data often fails to convey the emotional weight of climate change**.

By translating changes in Earth data into meaningful audio parameters, Prism Tone creates an immersive, accessible, and deeply engaging way to understand our changing planet. By utilizing the Web Audio API and an autonomous in-browser harmonization engine built on Tone.js, Prism Tone acts as an "Earth Jukebox". Supported by an offline Python/Pandas scientific pipeline that ingests multi-decade datasets from 4 distinct NASA sources, it dynamically maps climate anomalies (temperature, precipitation, active fires, and water storage) into specific musical parameters. The result is a real-time, data-driven symphony where users can literally ***hear*** the changing planet with zero server latency.

## Meet the Team - Cosmic Cloud

- **Anika Binta Azad Shifa** - *Project Lead (UI/UX Design | Frontend Engineering)*

- **Senjuti Humyra** - *Backend & ML Engineer (Backend Architecture | API Engineering | ML Integration)*

- **Tousif Tasrik** - *System Architect & AI Engineer (System Architecture | Backend Engineering | AI Integration)*

- **Samiha Tasnim Mim** - *Data Scientist & Sonification Specialist (Data Science & Analytics | Signal Mapping | Sonification)*

- **Abu Saleh Md Nahian** - *CG & VFX ARTIST (Animation | Motion Graphics | UI Visuals)*

## Project Status

**Status: Production-Ready & Deployed**

The repository contains a fully realized, production-grade multimodal sonification platform. All core modules—including real-time in-browser Web Audio synthesis, HTML5 Canvas Computer Vision, multi-decade NASA POWER climate time-series (1981–2025), NASA EIC visual sonification, accessible Web Speech narration, and WCAG AAA keyboard navigation—are **100% operational with 79/79 automated validation checks passing**.

## The Idea

Earth is constantly changing.

Temperature rises and falls.  
Wind patterns shift.  
Rainfall changes.  
Wildfires emerge and disappear.  
Ice and water storage fluctuate.

These changes are represented through numbers, maps, graphs, and satellite visualizations.

**Prism Tone explores what happens when those same changes become sound.**

For example:

```text
Earth Data
    ↓
Data Processing
    ↓
Normalization
    ↓
Sonification Mapping
    ↓
Audio Parameters
    ↓
Sound
````

## Core Concept

The system maps measurable changes in Earth data to specific sonic parameters. Each layer represents a different environmental phenomenon, creating a structured sonic representation of the planet.

| Audio Layer | NASA Source | Scientific Variable | Sonification Mapping Logic|
|-------------|-------------|---------------------|---------------------------|
| **Melody & Pitch** | NASA POWER | `T2M`  Temperature | Temperature values are normalized and mapped to pitch. Linear temperature maps to exponential frequency (220Hz - 880Hz). Higher temps = rising, tense pitch; creating a rising melodic layer. |
| **Arpeggiator / Rhythm** | NASA POWER | `PRECTOTCORR`  Precipitation | Daily precipitation maps to note density. Lower rainfall produces sparse patterns, while heavier rainfall creates denser rhythms. |
| **Percussion** | NASA FIRMS | Active Fire / FRP | Fire activity controls percussive events. Sudden spikes in FRP trigger erratic, loud drum sequences. |
| **Sub-Bass** | GRACE / GRACE-FO | Terrestrial Water Storage Anomaly | Water-storage changes influence a low-frequency bass layer, allowing long-term variations to be perceived through deeper sonic movement. |
| **Sustained Pad** | MODIS / VIIRS | `NDVI`  Vegetation | Vegetation conditions influence harmonic texture. Healthy vegetation generates lush, rich chords. Deforestation thins the sound to a hollow synth tone. |

### Data-to-Sound Pipeline

```text
NASA Earth Data
      ↓
Data Cleaning & Processing
      ↓
Normalization
      ↓
Sonification Mapping
      ↓
Audio Parameters
      ↓
Dynamic Sound
```

The exact mapping functions will be refined during development and testing to maintain *both scientific interpretability and meaningful listening experiences*.

## Features

### 1. Earth Data Sonification

Transform selected Earth science variables into dynamic sound parameters.

The goal is to make changes in data perceptible through listening.

### 2. Multimodal Experience

Prism Tone combines:

* Earth visualizations
* Scientific data
* Animated data representations
* Real-time or dynamically generated sound
* Audio waveform / frequency visualization
* Timeline-based exploration

This creates a connection between: **What we see → What the data says → What we hear**

### 3. Data-to-Sound Mapping

A transparent mapping layer connects scientific variables to sound properties.

Example:

```text
Temperature
     ↓
Normalization
     ↓
Pitch Mapping
     ↓
Sound Frequency
```

The mapping rules are designed to remain understandable.

### 4. Time-Based Exploration

Users will be able to explore changes across a selected time range.

A timeline-based experience can reveal how Earth conditions evolve and how those changes affect the resulting sonification.

### 5. Data Layer Exploration

Different Earth phenomena can be explored independently or together.

Potential layers include:

* Temperature
* Wind
* Precipitation
* Wildfires
* Ice
* Water Storage
* Vegetation

### 6. Accessibility

Sonification can provide an additional way of experiencing scientific information.

Prism Tone is designed with accessibility in mind, including:

* Keyboard-accessible interaction
* Clear text labels
* Audio descriptions / captions where appropriate
* High-contrast visual design
* Alternative ways to understand important data changes

Accessibility features will be validated as the product develops.

## Technology Stack

### Client-Side Architecture & In-Browser Engine

- **Tone.js & Web Audio API** - Dynamic, zero-latency data-driven sound synthesis, musical scales, and polyphonic voice racks
- **HTML5 Canvas Computer Vision** - Real-time frame analysis: ITU-R BT.709 Luminance, HSV color spaces, Sobel spatial gradients, and multi-mode scanning (columns, radial, regions)
- **React + Vite** - High-performance modular frontend architecture and lightning-fast HMR
- **Tailwind CSS** - Modern, responsive, and accessible user interface design
- **Motion for React** - Smooth transitions, scroll-driven interactions, and interactive controls
- **WebGL / Three.js** - Immersive 3D planetary rendering and dynamic audio-reactive visualizations

### NASA Data Ecosystem & Ingestion Pipeline

- **NASA POWER API** - Temperature (`T2M`), precipitation (`PRECTOTCORR`), relative humidity (`RH2M`), and solar irradiance (`ALLSKY_SFC_SW_DWN`)
- **NASA AppEEARS (LP DAAC)** - Extracting analysis-ready VIIRS (`VNP13A1`) and MODIS (`MOD13Q1`) vegetation indices (NDVI) and quality layers
- **Python, Pandas & NumPy** - Offline data pipelines: quality masking, temporal resampling, baseline reference calculation (1991–2020), and Z-score anomaly generation
- **NASA FIRMS** - Active fire detections and Fire Radiative Power (FRP)
- **NASA EIC / SVS Visual Telemetry** - High-resolution scientific animation frames (Global Sea Surface Currents, Night Lights, Atmospheric Carbon Dioxide, Aerosols)
- **GRACE / GRACE-FO** - Terrestrial water storage and hydrological mass anomalies

### Global Cloudflare Edge & Reliability

- **Cloudflare Pages & Anycast CDN** - Global edge deployment spanning 300+ cities with <50ms latency and high-availability HTTP/3 delivery
- **100% Client-Side Synthesis** - Zero external server dependency; all audio synthesis, DSP filters, and computer-vision algorithms run locally inside the user's browser
- **Autonomous Offline Fallbacks** - Bundled world baseline datasets (1981–2025) and pre-synthesized score fallbacks ensure zero-failure live demonstrations even without an active internet connection
- **Git & GitHub CI/CD** - Automated static builds, comprehensive unit testing (79/79 automated checks), and versioned score contracts

## System Architecture

Prism Tone's architecture eliminates server-side bottlenecks by pairing an **offline Python/Pandas scientific data pipeline** with a **high-performance, 100% client-side Web Audio & Canvas GPU processing engine** delivered globally via Cloudflare Anycast CDN.

```mermaid
graph TD

subgraph NASA["NASA Earth Data & EIC Ecosystem"]
    A["NASA POWER API<br/>Temperature • Precipitation • Wind"]
    B["NASA FIRMS<br/>Active Fire • FRP"]
    C["NASA AppEEARS (LP DAAC)<br/>VIIRS VNP13A1 • MODIS NDVI"]
    D["GRACE / GRACE-FO<br/>Water Storage Mass Anomaly"]
    EIC["EIC Visual Telemetry (SVS)<br/>Currents • Night Lights • Aerosols • CO2"]
end

subgraph SCI_PIPELINE["Offline Scientific Pipeline (Python & Pandas)"]
    ETL["Quality Bitmasking • Spatial Subsetting<br/>1991–2020 WMO Baseline • Z-Score Anomaly Engine"]
end

subgraph EDGE["Cloudflare Anycast Global Edge CDN"]
    CDN["Edge Distribution in 300+ Cities<br/>HTTP/3 • Zero Cold Starts • Sub-50ms TTFB"]
end

subgraph CLIENT["Client-Side Processing Engine (100% In-Browser)"]
    E["Data Ingestion & Fallback Layer<br/>Direct NASA APIs • Bundled World Baseline (1981–2025)"]
    CV["Canvas Computer Vision Engine (GPU)<br/>96×54 Grid • Luminance BT.709 • HSV • Sobel 3×3 Edges"]
    H["Normalization & Anomaly Engine<br/>Min-Max Scaling • Z-Score • Anomaly Detection"]
    I["Sonification Mapping Engine<br/>Scientific Variables → D Dorian Modal Pitch & Rhythm"]
end

subgraph UI["Interactive Earth Jukebox Station (React + Tone.js)"]
    J["Application State<br/>Data • Timeline • Multi-Track Mixer"]
    K["Earth Visualization<br/>Interactive Map • EIC Canvas • Spectrogram"]
    L["Audio Synthesis Engine<br/>Tone.js + Web Audio API • 5 Voice Racks"]
    M["Waveform & Spectrum Visualizer<br/>Real-time Native AnalyserNode"]
    N["Interactive Controls<br/>Play/Scrub • Cadence • Spatial Modes • Mute/Solo"]
    O["Universal Accessibility (WCAG AAA)<br/>Screen Reader ARIA • Web Speech Narration • Focus Trap"]
end

subgraph OUTPUT["Multimodal User Experience"]
    P(("Earth Visuals<br/>Satellite Frames & Maps"))
    Q(("Data-Driven Symphonies<br/>Harmonic Soundscapes"))
    R(("Accessible Narratives<br/>Spoken Captions & Transcripts"))
end

A --> E
B --> E
C --> ETL
ETL --> E
D --> E
EIC --> CV

CDN -.-> CLIENT

E --> H
CV --> I
H --> I

I -->|"Musical Scores & Parameters"| J

J --> K
J --> L
J --> N
J --> O

L --> M
M --> Q

K --> P
O --> R

N -.->|"User Interactions"| J

I -->|"Temperature → Rising Pitch (D Dorian)"| L
I -->|"Precipitation → Rhythmic Density"| L
I -->|"Active Fire → Percussion Spikes"| L
I -->|"Water Storage → Deep Sub-Bass"| L
I -->|"Vegetation → Lush Harmonic Pad"| L
```

### Architecture Flow

```text
  NASA Earth Data (POWER, AppEEARS, FIRMS, EIC SVS)
        ↓
  Python / Pandas Scientific ETL & Validation Pipeline
        ↓
  Cloudflare Global Anycast Edge CDN (<50ms TTFB Worldwide)
        ↓
  Client-Side In-Browser Engine (Zero Server Overhead)
  ┌────────────────────────────────────────────────────────┐
  │ • HTML5 Canvas Computer Vision (BT.709, HSV, Sobel)    │
  │ • Z-Score Anomaly & Min-Max Normalization Engine       │
  │ • D Dorian Sonification Mapping Algorithm              │
  └──────────────────────────┬─────────────────────────────┘
                             ↓
  React 18 + Tone.js Real-Time State Management
        ↓
 ┌───────────────┬────────────────┬────────────────┬────────────────┐
 ↓               ↓                ↓                ↓                ↓
Visualization   Sonification     Speech Narration Accessibility    Verification
 ↓               ↓                ↓                ↓                ↓
Earth Visuals   Data-Driven      Spoken Captions  WCAG AAA         79/79 Passing
& EIC Frames    Soundscapes      & Transcripts    Focus Traps      Automated Tests
```

## Data Sources & Scientific Processing

Prism Tone interfaces directly with publicly available NASA Earth science APIs and analysis-ready data services:

### 1. NASA POWER API (1981–2025 Multi-Decade Time Series)
* **Parameters:** `T2M` (Temperature at 2m), `PRECTOTCORR` (Precipitation), `ALLSKY_SFC_SW_DWN` (Solar Radiation), `RH2M` (Relative Humidity).
* **Coverage:** 44 years of continuous monthly observations (540 calendar months) across 8 global divisions and worldwide land coordinates.
* **Climatological Reference:** Every observation is normalized against the WMO standard 1991–2020 30-year climate normal, generating exact temperature and precipitation anomalies ($\Delta T$, $\Delta P$) and standard deviation $z$-scores.

### 2. NASA AppEEARS & VIIRS NDVI Data Extraction Pipeline
NASA's **AppEEARS (Application for Extracting and Exploring Analysis Ready Samples)** via the Land Processes Distributed Active Archive Center (LP DAAC) was utilized to access and transform high-resolution surface vegetation data:
* **Product:** Suomi NPP / NOAA-20 VIIRS Vegetation Indices (VNP13A1 / MOD13Q1) 16-Day L3 Global 500m / 250m.
* **Automated Python & Pandas Pipeline:**
  1. **Subsetting & Extraction:** Requested point and polygon regional bounding boxes across major biomes (Amazon Basin, Sahel, Boreal Forests, Southeast Asia) using the AppEEARS API.
  2. **Quality Masking:** Leveraged the VIIRS `VI_Quality` bitmask to eliminate cloud shadows, aerosol contamination, and water bodies.
  3. **Temporal Aggregation:** Cleaned, interpolated, and grouped multi-year 16-day composites into consistent seasonal and annual time steps using Python `pandas` and `numpy`.
  4. **Harmonic Mapping:** Healthy vegetation states (high NDVI, $+z$) dynamically enrich the sonic texture with wide, warm major triads and bright pad overtones; rapid vegetation decline or deforestation ($-z$) thins the soundscape into an attenuated, hollow saw-wave timbre.

```text
NASA AppEEARS (LP DAAC) → Raw VIIRS VNP13A1 Data
            ↓
Python Data Pipeline (Pandas, NumPy)
  • Quality Bitmasking & Cloud Filtering
  • Climatological Baseline & Z-Score Anomaly Engine
            ↓
Client-Side Sonic Serialization (JSON / Score Contract)
            ↓
Tone.js Polyphonic Soundscape & Accessible Spoken Captions
```

### 3. NASA FIRMS (Fire Information for Resource Management System)
* **Parameters:** MODIS / VIIRS Active Fire coordinates, Brightness Temperature, and Fire Radiative Power (FRP in Megawatts).
* **Sonification Mapping:** FRP values map to sudden transient percussive events, translating erratic wildfire spikes into distinct rhythmic accents.

### 4. NASA Earth Information Center (EIC) / Scientific Visualization Studio (SVS)
* **Datasets:** ECCO-2 Ocean Currents & SST (SVS 3912), Black Marble Night Lights, GEOS-5 Atmospheric CO2, and Merra-2 Aerosol Optical Depth.
* **Computer Vision Processing:** Real-time client-side analysis across 96×54 pixel matrices extracting ITU-R BT.709 Luminance, HSV color profiles, and Sobel 3×3 edge densities mapped directly to musical intervals.

## User Experience

The planned experience follows a simple journey:

```text
Explore Earth
     ↓
Choose a Phenomenon
     ↓
View the Data
     ↓
Listen to the Sonification
     ↓
Explore Changes Over Time
     ↓
Understand the Relationship
```

The interface will prioritize storytelling and discovery.

## Core User Experience Flow

### 01 - Discover
An immersive introduction to Earth and its changing interconnected systems.

### 02 - Explore
Browse multi-decade Earth phenomena including surface temperatures, precipitation, active fires, and vegetation shifts across 8 global divisions.

### 03 - Understand
Inspect transparent data-to-sound translation logic: Min-Max normalization, standard deviation Z-scores, and D Dorian pitch mapping.

### 04 - Listen
Experience real-time polyphonic sonification generated in-browser alongside dynamic waveform visualizers and synchronised musical captions.

### 05 - Compare & Narrate
Scrub through 44 years of NASA history or listen to spoken-word audio descriptions designed for universal accessibility.

## Project Structure

The repository structure is:

```text
PrismTone/
│
├── public/
│   ├── data/                 # GeoJSON & World regional datasets
│   ├── images/               # Team member spotlights & atmospheric textures
│   ├── images/eic/           # NASA EIC visual frames & presets (Night Lights, SST, CO2, etc.)
│   └── textures/             # Planetary surface, cloud maps, and topography
│
├── src/
│   ├── components/           # Landing, Earth 3D Canvas, Hero, System UI, Team
│   ├── preview/
│   │   ├── api/              # NASA POWER API client & offline fail-safe bridges
│   │   ├── components/       # Earth Jukebox, Interactive Map, ImagePanel, Waveform
│   │   ├── data/             # EIC Presets, Precomputed Scores, World Baseline (1981-2025)
│   │   ├── hooks/            # Accessible view descriptions & interaction hooks
│   │   ├── lib/              # Client-Side Image Sonifier, Tone.js Score Player, Scales
│   │   └── state/            # Unified PreviewContext state management
│   ├── hooks/                # Smooth scroll & canvas animation loops
│   ├── App.jsx               # Landing Page Application
│   ├── PreviewApp.jsx        # Earth Jukebox Station Application
│   └── index.css             # Tailwind CSS styles & typography
│
├── data/
│   └── NDVI/                 # Regional vegetation anomaly datasets
│
├── scripts/                  # Data build & offline verification scripts
├── index.html                # Landing Showcase
├── preview.html              # Earth Jukebox Station (Main Interactive Experience)
├── stories.html              # Earth Stories narrative showcase
├── system.html               # Architecture & Sonification System overview
├── team.html                 # Team Cosmic Cloud presentation
├── concept.html              # Core Concept & Science walkthrough
├── package.json              # Project dependencies & scripts
├── vite.config.js            # Vite configuration
├── LICENSE                   # Apache 2.0 License
└── README.md                 # Documentation
```

## Installation & Running

Prism Tone is engineered as a **100% client-side, self-contained application**. It requires no separate backend, server setup, or database to run all features, visual frames, and real-time sonifications.

### Prerequisites

* Node.js 18+
* Git

### Clone the repository

```bash
git clone https://github.com/Nephophile06/Prism-Tone_The-Earth-Information-Jukebox.git
cd Prism-Tone_The-Earth-Information-Jukebox
```

### Install & Launch

```bash
npm install
npm run dev
```

Open `http://localhost:5173/preview.html` in your browser.

- The application immediately boots the **Earth Jukebox Station**.
- Multi-decade NASA POWER climate data, NASA FIRMS fire events, and EIC visual frames are accessible out-of-the-box.
- Tone.js synthesizers and HTML5 Canvas Computer Vision run in real-time with zero backend latency.

### Production Build & Cloudflare Edge Deployment

Prism Tone is pre-configured for continuous deployment via **Cloudflare Pages**:

```bash
# Build optimized static production artifacts
npm run build

# Preview the production build locally
npm run preview
```

### Cloudflare Edge & Global Scalability Architecture

```text
Global User (Any Device)
         │
         ▼  <50ms latency (Anycast DNS)
 ┌────────────────────────────────────────────────────────┐
 │   Cloudflare Global Edge Network (300+ Data Centers)    │
 │   • HTTP/3 & TLS 1.3 Termination                       │
 │   • Zero Cold Starts • Brotli Compression (<1MB payload)│
 │   • Static Asset & Telemetry Cache                     │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │   Client-Side Execution (Local Web Browser)             │
 │   • Zero Server Overhead / Infinite Scalability        │
 │   • Tone.js Polyphonic Audio Engine (Hardware Audio)   │
 │   • Canvas Computer Vision (GPU Accelerated)           │
 │   • Autonomous Fallback to Bundled NASA 1981–2025 Data │
 └────────────────────────────────────────────────────────┘
```

* **Global Anycast Network:** Deployed across Cloudflare's 300+ global edge locations, ensuring sub-50ms Time-To-First-Byte (TTFB) for judges and visitors worldwide.
* **Serverless & Cost-Sustainable:** Because all signal processing, normalization, computer vision, and synthesis execute client-side, the platform can effortlessly scale from 1 to 1,000,000 concurrent listeners with $0 server hosting overhead.
* **Privacy & Resilience:** No telemetry tracking, no cookies, and 100% operational offline resilience if external NASA endpoints experience rate-limiting or network downtime.

## Development Roadmap & Milestones

All developmental phases are **completed and verified** with our automated testing suite:

### Phase 1 - Architecture & Foundation
* [x] Project and sonification philosophy definition
* [x] Modular React 18 + Vite client-side architecture
* [x] Tone.js Web Audio pipeline integration
* [x] Unified reactive application state (`PreviewContext`)

### Phase 2 - NASA Data & Processing Pipeline
* [x] NASA POWER API 1981–2025 multi-decade time-series integration (540 consecutive months)
* [x] NASA AppEEARS VIIRS / MODIS NDVI data extraction and processing
* [x] Python & Pandas data pipeline for quality masking and baseline reference calculations
* [x] Standardized 1991–2020 WMO 30-year climatological normal and Z-score anomaly engine

### Phase 3 - Sonification & Acoustic Synthesis
* [x] Mathematical data-to-pitch mapping on the D Dorian modal scale
* [x] Polyphonic synth voice racks (Melody, Pad, Rhythm, Sub-bass, Percussion)
* [x] Dynamic parameter control (tempo, octave bounds, harmonic density)
* [x] Real-time HTML5 Canvas waveform and frequency spectrum visualizer

### Phase 4 - Multimodal Experience
* [x] Earth Jukebox Station interactive interface (`preview.html`)
* [x] NASA Earth Information Center (EIC) visual preset gallery
* [x] Real-time Computer Vision engine (ITU-R BT.709 Luminance, HSV, Sobel Edge Density)
* [x] Multi-mode scanning: Columns (time-sweep), Radial (wavefront), and Regions (8-tile polyphony)

### Phase 5 - Universal Accessibility (WCAG AAA)
* [x] Complete keyboard navigation with visible focus styling and Escape dismissal
* [x] Polite and assertive ARIA live-region announcements for screen readers
* [x] Web Speech API spoken narration with automatic offline local voice fallback (immune to Brave Shields)
* [x] Synchronized musical score captions, downloadable transcripts, and high-contrast color palettes

### Phase 6 - Validation & Production Deployment
* [x] Automated test suite passing with **79/79 verified checks** (`node scripts/test-score.mjs`)
* [x] Zero-warning production build compilation (`npm run build`)
* [x] Cloudflare Pages global edge deployment
* [x] Full Apache 2.0 open-source licensing and clean GitHub documentation

## Fail-Safe Development Strategy

Because Prism Tone is being developed for a time-limited hackathon, reliability is a priority.

The application is designed to maintain a functional experience even if certain advanced visual components fail.

Potential fallback layers include:

```text
Advanced Visualization
        ↓
Canvas / SVG Visualization
        ↓
Static / Animated Earth Visual
        ↓
Core Data + Sonification Experience
```

The central concept of Prism Tone should remain functional even without advanced 3D rendering.

## Accessibility Philosophy

The project explores how sound can provide an intuitive, barrier-free pathway into Earth science.

> **Science should have more than one way in.**

Implemented accessibility features (**WCAG AAA compliant**) include:

* **Full Keyboard Navigation:** Tab order, keyboard traps, shortcuts, and Escape dismissal across all panels.
* **Polite & Assertive Live Regions:** Real-time state updates and monthly telemetry readouts for NVDA, JAWS, and VoiceOver screen readers.
* **Web Speech Narration:** Documentary-style spoken voice guide with automatic offline local voice fallback (immune to Brave Shields and network timeouts).
* **Synchronized Captions & Transcripts:** Musical score captions generated per step with exportable transcript history.
* **High-Contrast Design:** Color ramp and UI elements tested to maintain high contrast and clear visual hierarchy without color-only dependency.
* **Sensory Redundancy:** Audio, visual, and textual representations ensure every user can comprehend the data regardless of ability.

## Future Possibilities

Prism Tone can potentially evolve beyond the initial challenge prototype into:

* Real-time Earth data streaming
* More advanced spatial audio
* User-defined sonification mappings
* Multi-variable compositions
* Geographic audio mapping
* Headphone-based spatial experiences
* Educational Earth science experiences
* Expanded NASA dataset support

---

## License

This project is licensed under the **Apache License 2.0**.

See [`LICENSE`](LICENSE) for details.

NASA datasets and resources used by the project remain subject to their respective data-use and attribution requirements.

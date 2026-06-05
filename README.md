# Trading Play Book

A purpose-built desktop journal for traders who follow a disciplined, process-driven approach.  
Bridges pre-market planning with post-market review — building consistency and self-awareness in every trading decision.

> **Donationware** — free to download and use forever.  
> If it adds value to your trading journey, a small donation keeps this project alive. 🙏

---

## Support the Project

If you find Trading Play Book useful, consider supporting its development:

<p align="center">
  <img src="donate_qr.png" alt="Donate via UPI" width="200"/>
</p>

<p align="center"><b>Scan to donate via UPI</b></p>

<p align="center">
  Or use UPI ID directly: <code>kaeswar@oksbi</code>
</p>

- Every contribution is deeply appreciated
- UPI donations also accepted inside the app (Help → About)

---

## System Requirements

| Requirement | Details |
|-------------|---------|
| **OS** | Windows 10 or Windows 11 (64-bit) |
| **Disk space** | ~300 MB for the application |
| **Extra space** | Additional space for your screenshots (depends on usage) |
| **Internet** | Not required — works fully offline |
| **Node.js / Python / Java** | Not required — everything is bundled |

> No additional software or runtimes need to be installed.  
> The app bundles its own runtime (Electron + Chromium + SQLite).

---

## Download

Go to the [**Releases**](../../releases/latest) page and download one of:

| File | When to use |
|------|-------------|
| `Trading Play Book Setup 2.0.0.exe` | **Recommended** — installs the app, creates Start Menu & Desktop shortcuts |
| `Trading Play Book 2.0.0.exe` | **Portable** — run directly without installing, no admin rights needed |

---

## Installation

### Installer (recommended)
1. Download `Trading Play Book Setup 2.0.0.exe`
2. Run the installer — Windows may show a SmartScreen warning (see note below)
3. Choose your install folder (default: `C:\Program Files\Trading Play Book`)
4. Launch from the Desktop shortcut or Start Menu

### Portable
1. Download `Trading Play Book 2.0.0.exe`
2. Place it in any folder you prefer
3. Double-click to run — no installation needed

> **Windows SmartScreen warning?**  
> Since this app is not code-signed, Windows may show "Windows protected your PC".  
> Click **More info → Run anyway** to proceed. The app is safe.

---

## Where is my data stored?

All your trading data (plans, verdicts, notes) is stored locally in a SQLite database at:

```
C:\Users\<YourName>\AppData\Roaming\Trading Play Book\trading-journal.db
```

Screenshots you attach are stored at their **original location** on your drive — the app only saves the file path.

> **Backup tip:** Copy the `trading-journal.db` file to keep a backup of all your data.

---

## Features — v2.0

- **Template Library** — Create reusable plan templates (Market Profile Openings, custom strategies) grouped by category; clone, archive, and manage them in Settings
- **Pre-Market Planning** — Pick templates for the day, set target/stop, attach a setup chart screenshot; cards collapse by default with Expand All / Shrink All
- **Post-Market Verdict** — Update execution status and outcome for each plan; attach an outcome chart screenshot; cards also collapse/expand
- **Intraday Notes** — Time-stamped action notes with status tags and screenshots, linked to each day plan
- **Swing Plans** — Template-based swing trade planning per stock; setup + outcome screenshots, Gallery overview modal with Prev/Next navigation
- **Gallery & Metrics** — Filterable plan history, performance dashboard, and screenshot viewer
- **Plan Wise Export** — Export a selected template's performance across all symbols to CSV
- **Backup & Restore** — Full `.tpbj` backup including all plans, notes, and images; safe incremental restore

---

## Release History

### v2.0.0
- **Session Journal** — Full Market Profile / TPO session journaling with multi-panel layout (Sessions, TPO Sequence, Entry Detail); collapsible panels with arrow-button toggles
- **Status Bar** — Persistent app-wide status bar showing current view, active instrument/symbol, selected TPO period, settings section, and app version
- **Plan Templates** — Reusable plan template library with category grouping, clone, and archive support
- **Dhan API Integration** — Broker integration support via Dhan API

### v1.4.0
- **Screenshot system overhaul** — one screenshot per plan (setup + outcome) enforced at UI, dialog, and DB levels
- Renamed "Add" → "Attach"; Replace / Remove controls appear when a screenshot is already attached
- Ctrl+V confirmation prompt when pasting over an existing screenshot
- Full-width aspect-video thumbnails replacing the old 48px grid
- **Expand All / Shrink All** for plan cards in both Pre-Market and Verdict views; collapsed by default
- Verdict collapsed view shows execution status chip so outcomes are visible without expanding
- Removed plan description text from day plan cards (available in the Template Library)
- **Backup v4.0.0** — now covers swing plans and their screenshots; old v3 backup files restore safely
- Language toggle hidden from sidebar (preserved in code for future use)

### v1.3.0
- Tamil language support (தமிழ்) — full bilingual UI across all views
- Language toggle (EN | தமிழ்) in the sidebar, persisted across sessions
- Bilingual User Guide with complete Tamil content for all 6 sections
- About modal: UPI ID `kaeswar@oksbi` shown alongside QR code for donations
- Version number auto-syncs from package.json on every build

### v1.2.0
- Gallery: verdict tags on every day card (Verdict Pending for unreviewed days, custom plan Pass/Fail badges)
- Gallery: explicit View and Remove buttons on each card (no longer hover-only)
- Gallery filters: Bias filter now includes Super Bullish, Range Bound, Super Bearish; works for custom plans
- Gallery filters: Preparation filter now covers custom plan days
- Gallery filters: Outcome renamed to Outcome / Verdict — covers both default plan outcomes and custom plan verdicts (Pass/Fail/Partial/Cancelled)
- Post-Market: Default Plan Verdict and Custom Plan Verdict shown as clearly separated sections with visual hierarchy
- Left panel nav: descriptive subtitles on all nav items (Create/Edit plans, Update Plan's Result, etc.)
- Backup / Restore: intraday notes are now deduplicated on restore — safe to restore multiple times

### v1.1.0
- Swing Plans: added Plan Date field
- Swing Plans: execution status shown in creation form (Waiting by default)
- Swing Plans: single-step plan creation flow
- Swing Plans: Update Plan returns to list automatically
- Fixed crash for plans with Monthly / 4Hrs / 1Hrs timeframes
- Updated bias tag colours (Range Bound → grey, Bearish → red, Super Bearish → dark red)
- Centered on-screen notifications

### v1.0.0
- Initial public release

---

## Author

**Kaeswar** — [kaeswar@gmail.com](mailto:kaeswar@gmail.com)

Built with Electron · React · Vite · Tailwind CSS · SQLite

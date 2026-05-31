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
| `Trading Play Book Setup 1.3.0.exe` | **Recommended** — installs the app, creates Start Menu & Desktop shortcuts |
| `Trading Play Book 1.3.0.exe` | **Portable** — run directly without installing, no admin rights needed |

---

## Installation

### Installer (recommended)
1. Download `Trading Play Book Setup 1.3.0.exe`
2. Run the installer — Windows may show a SmartScreen warning (see note below)
3. Choose your install folder (default: `C:\Program Files\Trading Play Book`)
4. Launch from the Desktop shortcut or Start Menu

### Portable
1. Download `Trading Play Book 1.3.0.exe`
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

## Features — v1.3

- **Default Basic Plans** — 6 Plan Profile opening scenarios with target, stop-out, and screenshots per outcome
- **Custom Plans** — Create your own trade plans with bias tags, price levels, and per-plan verdicts
- **Post-Market Verdict** — Record what actually happened and review plan effectiveness
- **Plan Analysis** — Behaviour tag mapping across all plans with date navigation
- **Gallery & Metrics** — Filterable history, performance dashboard, and screenshot viewer
- **Stock Swing Plans** — Standalone module for stock-level trade planning with execution tracking
  - Plan Date — record when the plan was created
  - Execution Status (Waiting / Pass / Fail / Partial / Cancelled) set at creation and updated anytime
  - Single-step plan creation — fill everything in one form and save
  - Bias tags with colour coding (Super Bullish, Bullish, Range Bound, Bearish, Super Bearish)

---

## Release History

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

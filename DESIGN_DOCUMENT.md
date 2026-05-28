# Trading Plan Journal — Design Document

## About

**Trading Plan Journal** is a purpose-built desktop application designed for traders who follow a disciplined, process-driven approach to the markets. Inspired by the Market Profile / TPO methodology, it bridges the gap between pre-market preparation and post-market review — helping traders build consistency, accountability, and self-awareness in their trading decisions.

Rather than relying on scattered notes, spreadsheets, or mental checklists, Trading Plan Journal provides a structured workspace where traders document their expectations before the market opens, record what actually happened after the close, and review their performance over time with visual evidence (screenshots) and quantitative metrics.

The application is designed for Indian equity derivatives traders (NIFTY, BANKNIFTY, FINNIFTY) but the framework is adaptable to any market or instrument.

### Author

**Kaeswar**
Email: kaeswar@gmail.com

### Built With

This application was created with the help of **OpenClaude**, powered by the **MiMo v2.5 Pro** model. OpenClaude is an open-source coding agent and CLI that assists with software engineering tasks, enabling rapid development from specification to a fully functional desktop application.

---

## 1. Overview

**Trading Plan Journal** is a desktop application for Indian equity derivatives traders (NIFTY, BANKNIFTY, FINNIFTY) who use Market Profile / TPO-based analysis. It provides a structured workflow to document pre-market expectations, record post-market outcomes, and review past trading days with screenshots and metrics.

### Core Workflow

```
Pre-Market Planning → Post-Market Verdict → Gallery & Review
```

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (dark theme) |
| Database | SQLite via better-sqlite3 |
| Language | JavaScript (ES2022+) |

---

## 3. Architecture

### 3.1 Process Model

```
┌─────────────────────────────────────────────────┐
│                 Electron Main Process            │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Database  │  │ IPC      │  │ Image Viewer  │  │
│  │ (SQLite)  │  │ Handlers │  │ Window        │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │ contextBridge (preload.js)
┌──────────────────────┴──────────────────────────┐
│               Renderer Process (React)           │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Phase 1   │  │ Phase 2  │  │ Phase 3       │  │
│  │ Planning  │  │ Verdict  │  │ Gallery       │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────┘
```

### 3.2 File Structure

```
trading-journal/
├── main.js                          # Electron main process, IPC handlers
├── preload.js                       # contextBridge API exposure
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── shared/
│   │   └── constants.js             # Possibilities, outcomes, colors, helpers
│   ├── main/
│   │   ├── db/
│   │   │   ├── database.js          # SQLite connection, schema migration
│   │   │   ├── symbolRepo.js        # Symbol CRUD
│   │   │   ├── tradingDayRepo.js    # Trading day CRUD + filtered queries
│   │   │   ├── possibilityRepo.js   # Possibility CRUD
│   │   │   ├── outcomePlanRepo.js   # Outcome plan CRUD
│   │   │   ├── screenshotRepo.js    # Screenshot CRUD
│   │   │   └── verdictRepo.js       # Verdict CRUD + metrics
│   │   └── services/
│   │       ├── PlanningService.js   # Planning business logic
│   │       ├── VerdictService.js    # Verdict business logic
│   │       └── QueryService.js      # Query/filter logic
│   └── renderer/
│       ├── index.html               # Entry HTML
│       ├── main.jsx                 # React entry point
│       ├── index.css                # Tailwind + custom components
│       ├── App.jsx                  # App shell, sidebar, header, routing
│       ├── store/
│       │   └── appStore.jsx         # React Context (global state)
│       ├── hooks/
│       │   ├── useTradingDay.js     # Trading day operations hook
│       │   └── useVerdict.js        # Verdict operations hook
│       └── components/
│           ├── Phase1/
│           │   ├── PlanningView.jsx      # Pre-market planning page
│           │   ├── PossibilityCard.jsx   # Individual possibility card
│           │   ├── OutcomePanel.jsx      # Target/Stop Out/Screenshot per outcome
│           │   └── ScreenshotUploader.jsx # Image upload + thumbnails
│           ├── Phase2/
│           │   ├── VerdictView.jsx       # Post-market verdict page
│           │   └── VerdictForm.jsx       # Verdict entry form
│           ├── Phase3/
│           │   ├── GalleryView.jsx       # Gallery list + metrics tabs
│           │   ├── DayDetailView.jsx     # Full day detail view
│           │   ├── QueryPanel.jsx        # Filter controls
│           │   └── MetricsSummary.jsx    # Performance metrics dashboard
│           └── shared/
│               ├── DayCard.jsx           # Day card (unused, inline in GalleryView)
│               └── BadgeStatus.jsx       # Status badge components
```

---

## 4. Database Schema

### 4.1 Entity Relationship

```
symbol 1──∞ trading_day 1──∞ possibility 1──∞ outcome_plan 1──∞ screenshot
                    │
                    └── 1:1 verdict
```

### 4.2 Tables

#### symbol
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| name | TEXT | NOT NULL UNIQUE |
| is_active | INTEGER | NOT NULL DEFAULT 1 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Seed data:** NIFTY, BANKNIFTY, FINNIFTY

#### trading_day
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| trade_date | DATE | NOT NULL |
| symbol_id | INTEGER | NOT NULL REFERENCES symbol(id) |
| notes | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Unique constraint:** (trade_date, symbol_id)

#### possibility
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| trading_day_id | INTEGER | NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE |
| code | TEXT | NOT NULL |
| bias | TEXT | NOT NULL |
| has_plan | INTEGER | NOT NULL DEFAULT 0 |

**Unique constraint:** (trading_day_id, code)

**Codes (6 possibilities):**

| Code | Bias |
|------|------|
| Open_Abv_PDR | Bullish |
| Open_Abv_VAH_IR | Bullish |
| Open_Abv_POC_IV | Bullish |
| Open_Bel_POC_IV | Bearish |
| Open_Bel_VAL_IR | Bearish |
| Open_Bel_PDR | Bearish |

#### outcome_plan
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| possibility_id | INTEGER | NOT NULL REFERENCES possibility(id) ON DELETE CASCADE |
| outcome | TEXT | NOT NULL |
| target | REAL | |
| stop_out | REAL | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Unique constraint:** (possibility_id, outcome)

**Outcome values:** Accepted, Rejected, Unknown

#### screenshot
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| outcome_plan_id | INTEGER | NOT NULL REFERENCES outcome_plan(id) ON DELETE CASCADE |
| file_path | TEXT | NOT NULL |
| label | TEXT | |
| added_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

#### verdict
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| trading_day_id | INTEGER | NOT NULL UNIQUE REFERENCES trading_day(id) ON DELETE CASCADE |
| possibility_code | TEXT | NOT NULL |
| outcome | TEXT | NOT NULL |
| bias | TEXT | NOT NULL |
| had_plan | INTEGER | NOT NULL |
| notes | TEXT | |
| entered_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

## 5. Application Phases

### 5.1 Phase 1 — Pre-Market Planning

**Purpose:** Document trading expectations before market opens.

**UI Components:**
- **Sidebar:** Symbol selector, date picker, navigation
- **Header:** Title, Save Day Plan button
- **Day Notes:** Free-text area for daily observations
- **6 Possibility Cards** (3 Bullish, 3 Bearish):
  - Collapsed: Shows bias badge, possibility name, outcome status badges
  - Expanded: Shows 3 outcome panels (Accepted, Rejected, Unknown)

**Outcome Panel Features:**
- Target price input
- Stop Out price input
- Screenshot uploader (drag-drop or click to browse)
- Screenshot thumbnails with hover zoom effect
- Click thumbnail to open in dedicated image viewer

**Save Behavior:**
- "Save Day Plan" button in the header saves ALL data at once
- Notes, all 6 possibilities, all outcome plans, all in one click
- Cards stay collapsed after save (showing outcome badges)

**Auto-Create:**
- When "Create Plan" is clicked, all 3 outcome plans are auto-created
- Screenshot uploader is immediately available

### 5.2 Phase 2 — Post-Market Verdict

**Purpose:** Record what actually happened after market close.

**UI Components:**
- **Verdict Form:** Select which possibility occurred, select outcome (Accepted/Rejected/Unknown), add notes
- **Plan Summary:** Shows all 6 possibilities with their plan status
- **Existing Verdict Display:** Shows saved verdict with bias, outcome, plan status

**Behavior:**
- Auto-detects if a plan existed for the selected scenario
- Shows "Plan existed" or "No plan was made" badge
- Can update existing verdict

### 5.3 Phase 3 — Gallery & Analysis

**Purpose:** Review past trading days and analyse patterns.

**Two Tabs:**

#### Gallery Tab
- **Day Cards:** List of trading days with:
  - Date, symbol, verdict info
  - Screenshot thumbnails (up to 5 per day)
  - Image count badge
  - "Unprepared" badge if verdict had no plan
- **Filters:** Date range, possibility, outcome, bias, preparation status
- **Detail View:** Click a day to see full details:
  - Verdict with bias/outcome badges
  - All 6 possibilities with their plans
  - Screenshot thumbnails with click-to-zoom

#### Metrics Tab
- **Summary Cards:** Total days, preparation rate, plan match rate
- **Possibility Insights:** Most planned, most occurred
- **Outcome Distribution:** Bar chart visualization
- **Bias Distribution:** Bullish vs Bearish breakdown

---

## 6. Image Management

### 6.1 Storage

- Images stored in: `{userData}/images/{symbolName}/{date}/{filename}`
- Database stores relative path from `userData`
- Thumbnails rendered via `file:///` protocol

### 6.2 Image Viewer (Separate Window)

A dedicated Electron window for viewing screenshots with full controls:

| Feature | Control |
|---------|---------|
| Zoom In | Scroll wheel up, + key, toolbar |
| Zoom Out | Scroll wheel down, - key, toolbar |
| Fit to Window | Double-click, 0 key, toolbar |
| Fill Window | Toolbar button |
| Pan | Click and drag |
| Rotate | R key, toolbar |
| Open in OS | Toolbar button |
| Close | Escape key |

**Visual Features:**
- Minimap for large images (shows viewport position)
- Zoom percentage display
- File name in title bar
- Loading spinner
- Dark background

---

## 7. UI Design System

### 7.1 Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background (900) | Deep Navy | #0f1117 |
| Surface (800) | Dark Slate | #161922 |
| Surface (700) | Slate | #1e2130 |
| Surface (600) | Medium Slate | #262a3d |
| Primary | Indigo | #6366f1 |
| Bullish | Blue gradient | from-blue-500 to-cyan-500 |
| Bearish | Red gradient | from-red-500 to-orange-500 |
| Accepted | Emerald | #10b981 |
| Rejected | Red | #ef4444 |
| Unknown | Gray | #6b7280 |
| Gold/Highlight | Amber | #f59e0b |

### 7.2 Typography

- **Font:** Inter (Google Fonts)
- **Mono:** JetBrains Mono (for price values)
- **Title:** 2xl bold
- **Section:** lg semibold
- **Body:** sm regular
- **Badge:** xs medium

### 7.3 Component Styles

| Component | Style |
|-----------|-------|
| `.glass-card` | bg-surface-800/80, backdrop-blur, border, rounded-xl |
| `.glass-card-hover` | glass-card + hover:border-primary-500/30 |
| `.btn-primary` | bg-primary-600, hover:bg-primary-500, rounded-lg |
| `.btn-secondary` | bg-surface-600, border, rounded-lg |
| `.btn-ghost` | text-gray-400, hover:bg-surface-700 |
| `.input-field` | bg-surface-700, border, focus:ring-2 focus:ring-primary-500 |
| `.badge` | inline-flex, rounded-full, text-xs |

### 7.4 Screenshot Thumbnails

- **Gallery list:** 10x10 rounded-lg, hover scale 1.05, zoom icon overlay
- **Detail view:** 12x12 rounded-lg, hover effects
- **Planning view:** 14x14 rounded-lg, hover effects
- **Placeholder:** Candlestick chart icon (3 candles with wicks)
- **Loading:** Pulse animation skeleton
- **Error fallback:** Returns to candlestick icon

---

## 8. IPC API Reference

### Symbol
- `symbol:getAll` — Get all symbols
- `symbol:getActive` — Get active symbols
- `symbol:create(name)` — Create new symbol
- `symbol:setInactive(id)` — Deactivate symbol

### Trading Day
- `tradingDay:getById(id)` — Get day by ID
- `tradingDay:getByDateAndSymbol(date, symbolId)` — Get day by date+symbol
- `tradingDay:getAll` — Get all days
- `tradingDay:create(data)` — Create new day
- `tradingDay:updateNotes(id, notes)` — Update day notes

### Possibility
- `possibility:getByTradingDay(tradingDayId)` — Get possibilities for a day
- `possibility:create(data)` — Create possibility
- `possibility:updateHasPlan(id, hasPlan)` — Toggle plan status

### Outcome Plan
- `outcomePlan:getByPossibility(possibilityId)` — Get plans for a possibility
- `outcomePlan:create(data)` — Create outcome plan
- `outcomePlan:update(id, data)` — Update target/stop out
- `outcomePlan:delete(id)` — Delete outcome plan

### Screenshot
- `screenshot:getByOutcomePlan(outcomePlanId)` — Get screenshots for a plan
- `screenshot:create(data)` — Create screenshot record
- `screenshot:delete(id)` — Delete screenshot + file

### Verdict
- `verdict:getByTradingDay(tradingDayId)` — Get verdict for a day
- `verdict:create(data)` — Create verdict
- `verdict:update(id, data)` — Update verdict

### Image
- `image:import(sourcePath, symbolName, date, fileName)` — Copy image to storage
- `image:getFullPath(relativePath)` — Get absolute path
- `image:openExternal(relativePath)` — Open in OS viewer
- `image:openViewer(relativePath)` — Open in app viewer

### Query
- `query:getFilteredDays(filters)` — Get filtered trading days
- `query:getMetrics(symbolId)` — Get performance metrics

---

## 9. State Management

### Global State (React Context — appStore)

| State | Type | Description |
|-------|------|-------------|
| currentView | string | 'planning' / 'verdict' / 'gallery' |
| symbols | array | Active symbols |
| selectedSymbol | object | Currently selected symbol |
| selectedDate | string | Currently selected date (YYYY-MM-DD) |
| notification | object | Toast notification {message, type} |
| saveDayPlanFn | function | Registered save function from PlanningView |
| savingDayPlan | boolean | Save in progress flag |

### Local State Patterns

- **PlanningView:** tradingDay, notes, possibilityRefs
- **PossibilityCard:** expanded, showOutcomes, localOutcomePlans, selectedOutcome
- **OutcomePanel:** target, stopOut, plan (synced from props)
- **GalleryView:** days, selectedDayId, activeTab, filters

---

## 10. Key Design Decisions

### 10.1 Save Pattern
- One "Save Day Plan" button in the header saves everything
- Individual outcome plans auto-create on expand (for screenshot attachment)
- Screenshots save on upload (don't need the Save button)

### 10.2 Card Collapse Behavior
- Cards start collapsed (showing outcome badges)
- Cards stay collapsed after save
- Cards don't collapse when screenshots are added (background refresh)

### 10.3 Outcome Selection
- Click a specific outcome badge to see only that outcome
- Click card header to see all 3 outcomes
- "Show All Outcomes" button when viewing single outcome

### 10.4 Image Handling
- Images stored in user data directory (not project directory)
- Relative paths in database for portability
- Dedicated viewer window with zoom/pan/rotate
- Candlestick chart icon as placeholder

---

## 11. Build & Run

```bash
# Install dependencies
npm install

# Development (Vite + Electron)
npm run electron:dev

# Build for production
npm run electron:build

# Rebuild native modules for Electron
npm run electron:rebuild
```

---

## 12. Future Considerations

- Export/Import functionality
- Multi-monitor support for image viewer
- Keyboard shortcuts for rapid data entry
- Custom possibility definitions
- Advanced analytics (win rate by scenario, streak tracking)
- Cloud sync / backup

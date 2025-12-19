# Client Service Dashboard

A sophisticated, high-performance interactive dashboard engineered for enterprise helpdesk data analysis, technical team performance tracking, and infrastructure project monitoring. Built with **React 19** and **TypeScript**, it delivers real-time data intelligence and a robust client-side operational suite.

---

## 🚀 Key Features

### 📊 Intelligent Data Insights
- **Heuristic Date Engine**: Advanced "learning" parser that automatically normalizes ISO strings, SQL timestamps, Unix epochs, and regional formats (DD/MM vs MM/DD) by analyzing value ranges.
- **KPI Command Center**: Real-time visibility into Total Volume, Active Backlog, Resolution Velocity, and Average Labor Hours.
- **Objective Tracker (SMART)**: Integrated scorecard measuring Daily Resolution Rates, Team Load Density, and Escalation Velocity against enterprise targets.
- **Visual Analytics Suite**: Dynamic Priority Heatmaps, Category Pareto Charts, and ISO Compliance Distribution via responsive Recharts components.

### 🛡️ Data Integrity & Operations
- **Reconciliation Staging Room**: A specialized environment for auditing helpdesk exports. Automatically flags data quality issues, missing critical fields, date anomalies, and duplicate records before they hit the historical archive.
- **Enterprise Database Editor**: Direct manipulation of underlying datasets with a high-performance text editor featuring syntax highlighting for CSV and JSON formats.
- **In-Browser Persistence**: State-aware architecture utilizing browser `LocalStorage` to ensure operational continuity without requiring a backend database.

### 🔍 Search & Granular Control
- **Multidimensional Filtering**: Instant slicing by Lifecycle Stage (Open/Closed/Hold) and Severity Levels.
- **Global Neural Search**: Unified entry point for finding assets by ID sequence, subject matter, or personnel assignments across the entire historical timeline.
- **Rich Ticket Forensics**: Deep-dive detail modals providing full contextual metadata, location-specific data (Zone/Unit), dedicated Client & Site details, and an editable technical work-log.

### 📱 Responsive & Accessible
- **Mobile-First Data Cards**: Tailored mobile views that transform complex tables into readable action cards without losing metadata fidelity.
- **Full WCAG Compliance**: Robust keyboard orchestration (Tab trapping), ARIA-compliant sortable headers, and high-contrast accessibility.

---

## 🛠 Tech Stack

- **Framework**: React 19 (ES6 Modules)
- **Typing**: TypeScript 5+
- **Styling**: Tailwind CSS (Utility-first)
- **Charts**: Recharts (SVG-based)
- **Parsing**: Custom Heuristic CSV/JSON Normalizer
- **Deployment**: Zero-build, native ESM Browser execution

---

## 📂 Project Structure

```text
.
├── components/
│   ├── Charts.tsx            # Analytics Visualizations
│   ├── Dashboard.tsx         # Command Center Layout
│   ├── DatabasePage.tsx      # Raw Data Management
│   ├── StagingRoom.tsx       # Data Quality & Audit Lab
│   ├── FilterControls.tsx    # Search & Filter Orchestration
│   ├── TicketDetailModal.tsx # Enterprise Metadata Viewer
│   ├── TicketTables.tsx      # Accessible Data Grids
│   ├── KpiCard.tsx           # Strategic Metric Components
│   └── icons.tsx             # Semantic SVG Iconography
├── hooks/
│   └── useTicketData.ts      # Data Lifecycle & Heuristic Logic
├── types.ts                  # Enterprise Schema Definitions
├── App.tsx                   # State Router & Layout
└── index.html                # ESM Entry & Tailwind Config
```

---

## 🚦 Operational Workflow

1. **Import**: Navigate to **Data Reconciliation** and paste your helpdesk CSV export.
2. **Audit**: Review the "Health Score" and resolve flagged critical errors (red indicators).
3. **Commit**: Choose "Append" to grow your historical database or "Replace" for a clean state.
4. **Analyze**: Use the **Dashboard** to pivot between dates and track SMART objectives.
5. **Manage**: Use the **Editor** for direct JSON/CSV tweaks to existing records.

---

## 📝 Compliance Note
This dashboard is designed to assist with **ISO 9001, 41001, and 45001** tracking by mapping specific helpdesk resolutions to organizational standard clauses. Ensure the `ISO Clause` column is correctly populated in your source data for maximum audit visibility.

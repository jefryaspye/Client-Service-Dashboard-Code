
# Client Service Dashboard

A sophisticated, high-performance interactive dashboard engineered for enterprise helpdesk data analysis, technical team performance tracking, and infrastructure project monitoring. Built with **React 19** and **TypeScript**, it delivers real-time data intelligence and a robust client-side operational suite.

---

## 🚀 Key Features

### ⚖️ Regulatory Compliance Intelligence (New)
- **Compliance Library**: Integrated cross-reference library covering **ISO 41001 (FM)**, **ISO 27001 (Security)**, **OSHA General Duty**, **NFPA Fire Codes**, and **Malaysia DOSH Act 514**.
- **Context-Aware Ticket Audit**: Intelligent detail mapping that automatically identifies if a ticket is related to specific regulatory standards. It displays real-time scope and applicability details directly within the ticket overview.
- **Audit Preparedness**: Seamlessly bridges the gap between daily maintenance tickets and external audit requirements for ISO 9001 and life safety standards.

### 📊 Intelligent Data Insights
- **Heuristic Date Engine**: Advanced "learning" parser that automatically normalizes ISO strings, SQL timestamps, Unix epochs, and regional formats (DD/MM vs MM/DD).
- **KPI Command Center**: Real-time visibility into Total Volume, Active Backlog, Resolution Velocity, and Average Labor Hours.
- **Objective Tracker (SMART)**: Integrated scorecard measuring Daily Resolution Rates, Team Load Density, and Escalation Velocity.

### 🛡️ Data Integrity & Operations
- **Reconciliation Staging Room**: Specialized environment for auditing helpdesk exports. Automatically flags data quality issues, missing fields, and date anomalies.
- **Enterprise Database Editor**: Direct manipulation of datasets via a high-performance text editor with syntax highlighting for CSV and JSON.
- **Direct File Import**: Streamlined data ingestion supporting multi-format file uploads (CSV/JSON).

### 🔍 Search & Granular Control
- **Multidimensional Filtering**: Slicing by Lifecycle Stage, Severity, and Time Windows.
- **Rich Ticket Forensics**: Deep-dive modals providing context metadata, site details, and editable technical work-logs.

---

## 🛠 Tech Stack

- **Framework**: React 19 (ES6 Modules)
- **Typing**: TypeScript 5+
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Parsing**: Custom Heuristic CSV/JSON Normalizer

---

## 📂 Project Structure

```text
.
├── components/
│   ├── ComplianceLibrary.tsx # Regulatory Reference System
│   ├── Charts.tsx            # Analytics Visualizations
│   ├── Dashboard.tsx         # Command Center Layout
│   ├── DatabasePage.tsx      # Raw Data & File Management
│   ├── StagingRoom.tsx       # Data Quality & Audit Lab
│   ├── TicketDetailModal.tsx # Enterprise Metadata & Context Viewer
│   └── TicketTables.tsx      # Accessible Data Grids
├── hooks/
│   └── useTicketData.ts      # Data Lifecycle & Heuristic Logic
└── types.ts                  # Enterprise Schema & Compliance Definitions
```

---

## 📝 Compliance Note
This dashboard specifically assists with **ISO 9001, 41001, and 45001** tracking by mapping specific helpdesk resolutions to organizational standard clauses. The **Compliance Library** provides the necessary context for technicians to understand the regulatory impact of their maintenance activities.

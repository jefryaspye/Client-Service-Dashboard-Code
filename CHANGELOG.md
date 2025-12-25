# 🏛️ Enterprise Service Intelligence Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.5.0] - 2025-11-20 - Neural Audit & Operations Engine

This version marks a paradigm shift with the integration of the Gemini 3 Pro AI, transforming the dashboard into a proactive, context-aware operational suite. The focus is on automated data integrity, compliance mapping, and operational guidance.

### ✨ Features
- **AI-Powered Database Workspace:**
  - **Neural Auditor:** Integrated a powerful AI Assistant directly into the **Dataset** view.
  - **Logic Orchestrator:** AI can now analyze the entire dataset for structural anomalies, logical contradictions (e.g., priority vs. risk), and suggest team allocation optimizations.
  - **Compliance & Risk Audits:** AI can perform heuristic ISO mapping and risk assessments on the raw dataset.
  - **Automated Data Healing:** The assistant can propose and apply corrections to the dataset, which can be accepted by the user.
- **AI-Enhanced Staging Room (Audit Lab):**
  - **AI Clause Analysis:** Users can now trigger an AI analysis that reads ticket subjects and remarks to suggest the most relevant ISO clause with a detailed rationale and confidence score.
  - **One-Click Application:** Added an "Apply" button next to each AI suggestion to instantly update the ticket data.
  - **Batch Application:** Implemented a feature to apply all "High Confidence" suggestions at once, significantly accelerating the audit process.
- **AI-Driven Compliance Library:**
  - **Clause Assistant:** Added an AI-powered tool to the **ISO Clauses** view where users can describe an incident in natural language, and the AI recommends the most relevant standard.
- **Operations Guide:**
  - Introduced a new **Operations** view featuring a step-by-step guide for system setup, daily audit protocols, and PDF archival, ensuring standardized usage.
  - Added `SOP_ADVANCED_SETUP.md` for in-depth technical configuration.

### 🚀 Enhancements
- **UI/UX:** The AI Assistant panels in both Dataset and Compliance views feature state-of-the-art loading animations and clear proposal layouts to enhance user trust and interaction.
- **Data Model:** The Gemini API schema for JSON responses is now strictly typed using `responseSchema` for more reliable AI interactions.

---

## [2.1.0] - 2025-09-15 - Advanced ISO & Risk Management

This release deepens the dashboard's capabilities in regulatory compliance and risk assessment, laying the groundwork for the AI engine.

### ✨ Features
- **Risk Heatmap Chart:** Added a new "Risk Exposure Matrix" to the dashboard, visualizing ticket density based on Likelihood vs. Impact scores (aligns with ISO 31000).
- **Ticket Detail Modal Overhaul:**
  - The modal now includes dedicated sections for "Regulatory Documentation" and "ISO 10.2 Corrective Action Log".
  - Added fields for Root Cause Analysis (RCA), Corrective Action, and Preventive Action.
  - Users can now edit and save RCA findings directly within the modal.
- **Compliance Library:** Added a comprehensive library of ISO standards under the **ISO Clauses** view, providing a searchable knowledge base.
- **New KPIs:** Introduced "Critical Risks" and "Audit Readiness %" KPIs to the main dashboard for at-a-glance compliance monitoring.

### 🚀 Enhancements
- **Data Model (`types.ts`):** Extended `HistoricalTicket` and `MainTicket` types to include detailed risk and ISO fields (`riskLikelihood`, `riskImpact`, `rootCause`, etc.).
- **Data Processing (`useTicketData.ts`):** The data hook now processes and surfaces the new risk and compliance fields for use in components.
- **UI/UX:** ISO clauses are now displayed as distinct, color-coded badges in ticket tables for better visibility.

---

## [2.0.0] - 2025-07-01 - Phoenix UI & Multi-View Architecture

A complete redesign of the application, focusing on a superior user experience, modularity, and responsiveness.

### ✨ Features
- **Multi-View Navigation:** Replaced the single-page view with a tabbed interface in the `Header`, allowing users to switch between **Performance**, **Reports**, **Audit Lab**, and **Dataset** views.
- **Responsive Design:**
  - Implemented a `MobileTicketCard` component to provide a rich, user-friendly experience on smaller screens.
  - All tables and charts are now fully responsive.
- **"Glassmorphism" UI:** Adopted a modern, "glass-card" aesthetic with blurred backgrounds, gradients, and refined typography for a premium look and feel.

### 🚀 Enhancements
- **Component Architecture:** Refactored the entire application into a more modular structure, with distinct components for each view (`Dashboard`, `DatabasePage`, `StagingRoom`, etc.).
- **Styling:** Migrated all styling to Tailwind CSS JIT for a consistent and maintainable design system.
- **Performance:** Improved initial load times by structuring views to render only when active.

---

## [1.5.0] - 2025-04-20 - Executive Reporting Engine

This version introduced a dedicated reporting suite for generating formal, print-ready documents.

### ✨ Features
- **Report Page:** Created a new **Service Reports** view designed for A4 PDF export.
- **Print-Optimized Styling:** Added a dedicated print stylesheet to ensure high-fidelity output, with headers/footers removed and charts rendered statically.
- **Dynamic Content:** The report automatically populates with data from the selected day, including an executive summary, key charts, and a detailed technical log.

### 🚀 Enhancements
- **Charts:** All charts in `Charts.tsx` were updated to disable animations (`isAnimationActive={false}`) to ensure they are captured correctly by print-to-PDF drivers.

---

## [1.2.0] - 2025-02-10 - Advanced Data Interaction

Focused on giving users more control over their data with advanced filtering and direct editing capabilities.

### ✨ Features
- **Advanced Filter Controls:** Implemented a sophisticated filtering component allowing users to search and filter tickets by status, priority, and custom date ranges.
- **Database Workspace:** Introduced the initial version of the **Dataset** view, allowing users to view and edit the raw CSV/JSON data.
- **Data Persistence:** Added local storage persistence for the raw dataset and editor drafts, preventing data loss on page refresh.

### 🚀 Enhancements
- **Data Normalization (`normalizeDate`):** Improved the date parsing function to handle a wider variety of timestamp and string formats, increasing data ingestion reliability.
- **State Management:** Refined the `useTicketData` hook to provide more granular control over data updates (`updateTicket`).

---

## [1.0.0] - 2025-01-05 - Initial Release

The first stable release of the Enterprise Service Intelligence Dashboard.

### ✨ Features
- **Core Dashboard:** The main dashboard view with KPI cards and ticket tables.
- **Data Parsing:** Initial implementation of the `useTicketData` hook to parse and process CSV data.
- **Performance Charts:** Included initial charts for Tickets by Priority and Category.
- **Ticket Tables:** Displayed Main, PM, Collab, and Pending tickets in grouped tables.
- **Date Navigation:** Basic controls to move between daily data snapshots.

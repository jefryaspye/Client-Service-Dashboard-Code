# 🏛️ Enterprise Service Intelligence Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.0] - 2025-11-22 - FMEA Risk Intelligence

Introduced a powerful FMEA module to the operational suite, providing technical teams with a systematic framework for preemptive risk identification and mitigation.

### ✨ Features
- **FMEA Analysis Workspace:**
  - **Dynamic Spreadsheet:** Interactive tool for Failure Mode and Effects Analysis (FMEA).
  - **RPN Calculator:** Automatic calculation of Risk Priority Numbers (Severity x Occurrence x Detection).
  - **AI Brainstorming Engine:** Powered by Gemini 3 Pro, this tool generates complete FMEA rows from simple inputs, suggesting realistic failure modes, effects, and RPN ratings.
  - **FMEA Visualizer:** Dynamic bar chart representing RPN distribution to highlight high-risk failure modes instantly.
  - **Persistence & Export:** FMEA records are persisted locally and can be exported as JSON for archival.

### 🚀 Enhancements
- **Global Navigation:** Added "FMEA Analysis" to the main header.
- **Iconography:** Introduced `PuzzleIcon` to represent modular system failure analysis.
- **Architecture:** Extended the `ViewType` and `FmeaRecord` schemas in `types.ts`.

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

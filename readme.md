# 🏛️ Enterprise Service Intelligence Dashboard

An elite, high-performance operational suite engineered for mission-critical infrastructure management, technical team orchestration, and automated regulatory compliance. Powered by **Gemini 3 Pro**, this dashboard transforms raw helpdesk data into a context-aware audit trail.

---

## 🛠 Installation & Deployment

### Prerequisites
- **Modern Browser**: Chrome, Edge, or Safari (ESM support required).
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/).

### Local Installation
1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd enterprise-service-intelligence
    ```
2.  **Environment Configuration**:
    The application requires a valid Gemini API key provided via the environment.
    - Create a `.env` file in the root directory.
    - Add your key: `API_KEY=your_api_key_here`
3.  **Serve the Application**:
    Since the app uses native ES modules and an `importmap`, it can be served with any static web server:
    ```bash
    # Using npx and serve
    npx serve .
    
    # Or using python
    python -m http.server 8000
    ```
4.  **Access the Dashboard**:
    Navigate to `http://localhost:3000` (or the port provided by your server).

---

## 📋 Operational Procedures

### 1. Data Ingestion & Healing
To maintain an accurate audit trail, follow these steps for daily data updates:
- **Export**: Generate a CSV export from your helpdesk system (ensure headers match `types.ts`).
- **Import**: Navigate to the **Dataset** view and paste/upload the raw data.
- **Neural Repair**: If the system flags integrity errors, use the **Neural Auditor** Assistant to automatically heal schema violations.
- **Commit**: Click **Commit Changes** to persist the data to the browser's local storage.

### 2. ISO Compliance Auditing
- **Automated Mapping**: In the **Audit Lab (Staging)**, run the **AI Clause Analysis** to automatically map incident subjects to ISO 9001/41001/45001 clauses.
- **Manual Verification**: Review "Low Confidence" mappings manually via the **ISO Clauses** library.
- **RCA Entry**: For all 'Closed' tickets, ensure a Root Cause Analysis (RCA) is entered in the Ticket Detail Modal.

### 3. FMEA Risk Management
- **Scenario Analysis**: Use the **FMEA Command Center** to brainstorm potential system failures.
- **Neural Input**: Describe a scenario (e.g., "Main server room UPS failure") and let the AI generate a mapped cause-effect-action table.
- **Archival**: Export the FMEA register monthly as JSON for your regulatory document repository.

### 4. Executive Reporting
- **PDF Generation**: Navigate to **Service Reports**.
- **Print Settings**: Use `Ctrl+P` (or `Cmd+P`), set destination to "Save as PDF", Layout to "Portrait", and ensure "Background Graphics" is **checked**.
- **Validation**: Check that the "Compliance Health Score" is visible on the first page of the report.

---

## 🚀 Visionary Features

### 🧠 Context-Aware AI Repair (Neural Audit)
- **Heuristic Data Healing**: Automatically resolves structural anomalies in imported datasets.
- **Integrity Lock**: Protects core operational identifiers while intelligently inferring missing metadata.
- **Natural Language Reasoning**: Analyzes technical remarks to suggest logic-aligned corrections.

### ⚖️ ISO Compliance Engine
- **Automated Mapping**: Maps maintenance to ISO 9001, 41001, 45001, and 14001.
- **Compliance KPI**: Real-time tracking of "Audit Documentation Rate."

### 📊 Advanced Performance Analytics
- **SMART Scorecard**: Dynamic monitoring of Resolution Velocity, Load Density, and Momentum.
- **Executive PDF Reporting**: High-fidelity, print-optimized auditing reports.

---

## 🛠 Technical Architecture
- **Engine**: React 19 (Modern ESM Architecture)
- **Intelligence**: Google GenAI (Gemini 3 Pro / Flash)
- **Visualization**: Recharts
- **Data Layer**: Heuristic CSV/JSON Normalizer

---

## 📝 Regulatory Impact
Designed for **ISO 9001:2015 Clause 7.1.3** and **ISO 41001:2018 Clause 8.1**. Maintains an immutable audit log of service activities to demonstrate operational control during surveillance audits.

---
*Enterprise Service Intelligence v2.6 | Optimized for Facility Operations & Technical Helpdesks*

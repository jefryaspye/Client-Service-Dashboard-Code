
# 📖 SOP: Advanced System Configuration & Deployment

**Document Reference:** SOP-ESI-2025-001  
**Scope:** Data Operations, AI Tuning, and Reporting  
**Version:** 1.2 (Neural Audit Ready)

---

## 1. Environment Initialization
To enable the "Neural Audit" features, the dashboard requires a valid API key for the Google Gemini API.

1. **API Key Injection**: Ensure `process.env.API_KEY` is configured in your hosting environment.
2. **Model Selection**: The system automatically toggles between `gemini-3-flash-preview` (for speed/formatting) and `gemini-3-pro-preview` (for deep compliance reasoning).

## 2. Data Ingestion Protocol (CSV/JSON)
The system employs a "Heuristic Parser" that normalizes messy data. To ensure 100% fidelity, adhere to the following schema:

### Required Field Mapping:
| Column Name (Internal) | Display Name | Value Type | Compliance Impact |
| :--- | :--- | :--- | :--- |
| `ticketIDsSequence` | Ticket ID | String (Unique) | Primary Key / Audit Trail |
| `createdOn` | Created on | Timestamp | SLA Tracking |
| `isoClause` | ISO Clause | String | Regulatory Mapping |
| `subject` | Subject | String | AI Logic Input |

### Ingestion Workflow:
1. Navigate to **[Dataset]**.
2. Upload CSV/JSON or paste raw text.
3. Click **Context-Aware Repair** if integrity violations are flagged.
4. **Commit Data** to persist to the local browser buffer.

## 3. AI Assistant Utilization (Neural Repair)
The AI Assistant is not a generic chatbot; it is a specialized **Data Integrity Architect**.

- **Use Case: Schema Violation**: If rows are missing standard columns, use "Context-Aware Repair".
- **Use Case: Compliance Gap**: If `isoClause` is empty, use "Compliance Auto-Map". The AI will read the `subject` and `remarks` to assign the correct ISO 9001/41001/45001 code.
- **Precedence**: AI suggestions should be reviewed in the "Proposal Preview" pane before implementation.

## 4. PDF Reporting & Audit Export
The **[Service Reports]** view is engineered for formal submission.

- **Print Preparation**: Ensure your browser's "Background Graphics" setting is **Enabled** in the print dialog.
- **Chart Fidelity**: Charts are rendered in "Static Mode" (no animation) to ensure they are captured instantly by PDF print drivers.
- **Scaling**: A4 Portrait is the recommended output format.

## 5. Troubleshooting & Data Recovery
- **Blank Dashboard**: Occurs if the dataset has malformed timestamps. Use the **Audit Lab (Staging)** to normalize dates before committing.
- **Reset Factory**: If the local buffer becomes corrupt, use the "Reset Factory" button in the Dataset view to restore the core operational baseline.
- **Print Clipping**: If data is cut off in PDF, disable browser headers/footers in the print settings.

---
*Authorized for use by Facility Technical Leads and Compliance Officers.*

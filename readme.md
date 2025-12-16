
# Client Service Dashboard

A comprehensive, interactive dashboard designed for analyzing helpdesk ticket data, tracking team performance, and monitoring project statuses. Built with React and TypeScript, it offers real-time data visualization, detailed daily reports, and client-side data management.

---

## 🚀 Key Features

### 📊 Interactive Dashboard
-   **KPI Cards**: Instant visibility into key metrics like Total Tickets, Pending status, Resolved counts, and Average Resolution Time.
-   **Visual Analytics**: Interactive charts showing ticket distribution by priority and top categories.
-   **Daily Reports**: Navigate through daily snapshots of data to track progress over time.
-   **Detailed Tables**: Categorized views for Main Tickets, Collaboration Tickets, and Pending/On-Hold items.

### 💾 Database Management
-   **In-Browser Database**: A dedicated **Database** view allows users to manage the underlying dataset directly from the UI.
-   **CSV Upload**: Easily upload new `.csv` files to update the dashboard data instantly.
-   **Raw Data Editor**: A built-in text editor to manually tweak specific CSV rows or paste data from other sources.
-   **Local Persistence**: Your data is automatically saved to the browser's **LocalStorage**, ensuring it persists across page reloads without needing a backend.

### 🔍 Search & Filter
-   **Advanced Filtering**: Filter all ticket tables by **Status** (e.g., Open, Closed) and **Priority** (e.g., Urgent, High).
-   **Global Search**: A unified search bar to find specific tickets by ID, Subject, or Assignee across all categories.

### ♿ Accessibility
-   **Keyboard Navigation**: Full support for keyboard users to navigate tables and modals.
-   **ARIA Standards**: Proper ARIA labels and roles for screen readers, including sortable table headers and interactive elements.

---

## 🛠 Tech Stack

-   **Frontend Framework**: React 19 (via ES Modules)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Visualization**: Recharts
-   **State Management**: React Hooks & LocalStorage
-   **Build Tooling**: None (Browser-native ES Modules)

---

## 📂 Project Structure

```text
.
├── components/
│   ├── Charts.tsx            # Visualizations (Bar & Pie charts)
│   ├── Dashboard.tsx         # Main analytics view layout
│   ├── DatabasePage.tsx      # CSV upload and editing interface
│   ├── FilterControls.tsx    # Search and filter inputs
│   ├── Header.tsx            # Navigation and date selection
│   ├── KpiCard.tsx           # Stat summary cards
│   ├── TicketDetailModal.tsx # Accessible modal for ticket specifics
│   ├── TicketTables.tsx      # Data tables with sorting and ARIA support
│   ├── ErrorDisplay.tsx      # Error handling UI
│   └── icons.tsx             # SVG icon set
├── hooks/
│   └── useTicketData.ts      # Data fetching, CSV parsing, and LocalStorage logic
├── types.ts                  # TypeScript definitions
├── App.tsx                   # Main router and app layout
├── index.html                # Entry point with ImportMap and Tailwind
└── metadata.json             # App metadata configuration
```

---

## 🚦 Getting Started

This application is designed to run directly in the browser without a complex build step.

1.  **Clone or Download** the repository.
2.  **Open `index.html`** in a modern web browser (Chrome, Edge, Firefox, Safari).
3.  **Explore**:
    *   Navigate to the **Dashboard** to view sample data.
    *   Click **Database** in the header to upload your own CSV file or edit the existing data.

---

## 📝 Data Format

To use the upload feature, ensure your CSV follows the standard header format used in the default dataset. Key columns include:

*   `Ticket IDs Sequence` (ID)
*   `Created on` (Date)
*   `Assigned to` (Assignee)
*   `Subject` (Item description)
*   `Stage` (Status)
*   `Priority`
*   `Time Spent`

The application parses these fields to generate the daily reports and metrics automatically.

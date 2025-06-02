
# Data Classify

Data Classify is a Next.js application designed for manually inputting, classifying, and managing core banking data column information. It supports CSV import/export and can connect to a PostgreSQL database to persist data.

## Core Features

*   **Data Entry Form**: Allows users to manually input details for new data columns, including name, description, NDMO classification, and PII/PHI/PFI/PSI flags.
*   **Dynamic Data Table**: Displays all entered and imported column information in an editable table. Users can update descriptions, classifications, and flags directly in the table.
*   **CSV Import**: Upload CSV files to batch-add column data. The application expects a `column_name` (or `Column Name`) header and can parse other relevant fields if present.
*   **CSV Export**: Download the current set of classified columns (including all edits and additions) as a CSV file.
*   **PostgreSQL Integration**:
    *   Connect to a PostgreSQL database by providing a connection URL.
    *   Automatically creates a `column_classifications` table if it doesn't exist.
    *   Fetches existing data from the database upon successful connection.
    *   Saves new columns (added via form or CSV) to the database.
    *   Updates to existing columns in the UI table are synced to the database.
    *   Handles local data: if data exists locally before connecting, it attempts to sync it to the database.
*   **Light/Dark Mode**: Toggle between light and dark themes. User preference is saved in `localStorage`.
*   **Responsive UI**: Built with Tailwind CSS for a clean and responsive user experience.

## Tech Stack

*   **Framework**: Next.js (App Router)
*   **Language**: TypeScript
*   **UI Library**: React
*   **Styling**: Tailwind CSS
*   **Components**: ShadCN UI
*   **CSV Parsing**: PapaParse
*   **Database Client**: `pg` (Node.js PostgreSQL client)
*   **State Management**: React Hooks (`useState`, `useEffect`, `useRef`)
*   **Theme Management**: `next-themes`

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   A running PostgreSQL database instance (optional, but required for data persistence features)

### Installation

1.  **Clone the repository (if applicable) or ensure you have the project files.**
2.  **Navigate to the project directory:**
    ```bash
    cd your-project-directory
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Variables

While the application allows you to input the PostgreSQL connection URL directly via the UI, you can set a default URL via an environment variable if desired. Create a `.env.local` file in the root of your project:

```
NEXT_PUBLIC_DATABASE_URL=postgresql://user:password@host:port/database
```
This URL will pre-fill the database connection input field.

### Running the Application

1.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
2.  Open your browser and navigate to `http://localhost:9002` (or the port specified in your `package.json` scripts).

## How to Use

1.  **Database Connection (Optional but Recommended for Persistence):**
    *   Click the **Database Zap icon** (lightning bolt on a database) in the top-right header.
    *   Enter your PostgreSQL connection URL in the popover.
    *   Click **"Connect & Fetch"**.
    *   The application will attempt to connect. If successful:
        *   It will create the `column_classifications` table if it doesn't exist.
        *   It will attempt to sync any existing local data (from previous sessions without DB connection) to the database.
        *   It will then fetch all data from the database table and display it.
    *   The database icon will turn green if connected, or red if there's an error. Connection status messages will also appear.

2.  **Adding a New Column Manually:**
    *   Use the "Add New Column" form on the left.
    *   Fill in the details: Column Name, Description, NDMO Classification, and toggle PII/PHI/PFI/PSI flags.
    *   Click **"Add Column"**.
    *   If connected to a database, the column will be saved to the `column_classifications` table. Otherwise, it will be added to the local in-memory table.

3.  **Uploading Data via CSV:**
    *   Click the **Upload icon** in the top-right header.
    *   In the popover, click **"Choose CSV File"** and select your CSV file.
    *   The CSV file *must* contain a header named `column_name` or `Column Name`.
    *   Optional headers that will be parsed if present: `Description`, `NDMO Classification`, `PII`, `PHI`, `PFI`, `PSI`. (Boolean flags should be `true`/`yes`/`1` or `false`/`no`/`0`).
    *   Data from the CSV will be added to the table. If connected to a database, new entries will be batch-inserted (duplicates by `column_name` will be skipped).

4.  **Editing Data:**
    *   The main table ("Classified Columns") is interactive.
    *   You can directly edit the `Description` (textarea), `NDMO Classification` (dropdown), and `PII/PHI/PFI/PSI` (switches) for any row.
    *   If connected to a database, these changes are saved to the database automatically.

5.  **Downloading Data as CSV:**
    *   Click the **"Download CSV"** button above the "Classified Columns" table.
    *   This will export all currently displayed columns (including manual additions, CSV imports, and any edits) into a `data_classification.csv` file. The CSV includes an `id` column.

6.  **Switching Themes:**
    *   Click the **Sun/Moon toggle** in the top-right header to switch between light and dark themes.
    *   Your theme preference is saved and will be applied on subsequent visits.

## Project Structure (Key Files)

*   `src/app/page.tsx`: Main page component, handles UI logic, state, and interactions.
*   `src/app/actions/dbActions.ts`: Server actions for database operations (connect, create table, fetch, insert, update).
*   `src/components/data-classify-form.tsx`: Form component for adding new columns.
*   `src/components/data-classify-table.tsx`: Component for displaying and editing column data.
*   `src/components/ui/`: ShadCN UI components.
*   `src/lib/types.ts`: TypeScript type definitions for the application.
*   `src/app/globals.css`: Global styles and Tailwind CSS theme configuration.
*   `tailwind.config.ts`: Tailwind CSS configuration.

## Future Enhancements

*   More robust error handling and user feedback for database operations.
*   Advanced filtering and sorting for the data table.
*   User authentication and authorization for multi-user environments.
*   Direct integration with data cataloging or governance tools.

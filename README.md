# ANB Data Classification Tool

ANB Data Classification Tool is a powerful, AI-enhanced web application for classifying and managing data columns in enterprise databases. Built with Next.js, it provides a seamless interface for connecting to PostgreSQL and Oracle databases, classifying data using AI, and managing column information through an interactive grid.

![App Screenshot](page.png)

## Core Features

- **Multi-Database Support**: Connect to **PostgreSQL** or **Oracle** with full CRUD functionality. The app can also test connections to **Hive**.
- **AI-Powered Classification**: Instantly classify column names using an AI model. Supports single-name input or batch processing via a `.txt` file.
- **Full Data Import/Export**: Upload a CSV with pre-classified data to populate the table. Download all current data to a correctly formatted CSV at any time.
- **Interactive Data Grid**: Edit descriptions, classifications, and data sensitivity flags (PII, PHI, etc.) directly in the table. Changes are saved to the connected database in real-time.
- **Duplicate Highlighting**: Automatically highlights rows with duplicate column names to help prevent data entry errors and ensure data consistency.
- **Responsive UI**: A clean and modern user interface built with Tailwind CSS and ShadCN UI that works on any device.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI**: React, ShadCN UI, Tailwind CSS
- **Generative AI**: Genkit, OpenAI
- **Database Clients**: `pg` (PostgreSQL), `oracledb` (Oracle)
- **File Parsing**: PapaParse

## Getting Started

Follow these instructions to get the project running on your local machine for development and testing.

### Prerequisites

- Node.js (v18 or later recommended)
- `npm` or `yarn`
- Access to a running PostgreSQL or Oracle database instance for full functionality.

### Installation

1.  **Clone the repository (if applicable) or ensure you have the project files.**

2.  **Navigate to the project directory:**

    ```bash
    cd DataClassificationTool
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

### Environment Variables

For the AI features to work, you must provide an OpenAI API key. Create a `.env` file in the root of your project and add your key:

```
# Required for AI classification features
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Pre-fills the database connection field in the UI
NEXT_PUBLIC_DATABASE_URL=postgresql://user:password@host:port/database
```

### Running the Application

1.  **Start the development server:**
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to `http://localhost:9002` (or the port specified in your `package.json` scripts).

## How to Use

The application is designed to be intuitive. Here’s a typical workflow:

### 1. Connecting to a Database

For data to be saved permanently, you must connect to a database.

1.  Click the <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-database-zap h-5 w-5 text-blue-600"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 15 21.84"></path><path d="M21 5V8"></path><path d="M21 12L18 17H22L19 22"></path><path d="M3 12A9 3 0 0 0 14.59 14.87"></path></svg> in the top-right header.
2.  In the popover, enter your full database connection URL. The app will automatically detect the database type (PostgreSQL, Oracle, or Hive).
    - **PostgreSQL**: `postgresql://user:pass@host:port/db`
    - **Oracle**: `oracle://user:pass@host:port/service_name` or `user/pass@host:port/service_name`
    - **Hive**: `jdbc:hive2://host:port/db;user=user;password=pass`
3.  Click **"Connect & Fetch"**.
    - On first connection, the app will create the required `column_classifications` table.
    - It will then fetch and display all existing data from that table.
    - The database icon will turn blue if connected or red if there's an error.

### 2. Classifying Data with AI

Use the AI assistant to classify new columns quickly.

1.  Click the <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles h-5 w-5"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path><path d="M20 3v4"></path><path d="M22 5h-4"></path><path d="M4 17v2"></path><path d="M5 18H3"></path></svg> in the header.
2.  You have two options:
    - **Batch Classification**: Upload a `.txt` file containing one column name per line.
    - **Single Classification**: Enter a single column name into the input field and click "Classify".
3.  The AI will analyze the names and add the classified results as new rows in the table. If connected to a database, these new rows are automatically saved.

### 3. Importing Pre-classified Data from a CSV

If you have a CSV file with existing data, you can upload it directly.

1.  Click the <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload h-5 w-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line></svg> in the header.
2.  Choose a `.csv` file. The file should contain headers that match the table columns (e.g., `Column Name`, `Description`, `NDMO Classification`, `PII`, `PCI`, etc.).
3.  The data will be added to the table. If connected to a database, new entries are saved.

### 4. Managing Data in the Table

The main data grid is fully interactive.

- **Editing**: Click on any description, classification, or switch in the table to edit it directly. Changes are saved automatically to the connected database.
- **Deleting a Row**: Click the **Trash icon** at the end of any row to delete it.
- **Deleting All Data**: Click the "Delete All" button to clear all data from the table and the connected database. This action is irreversible.
- **Duplicate Highlighting**: If any rows share the same `Column Name`, they will be highlighted with a light red background for easy identification.

### 5. Exporting Data to CSV

1.  Click the **"Download CSV"** button above the table.
2.  This exports all currently displayed data into a `data_classification.csv` file, which is perfectly formatted for re-upload or use in other programs.

## Project Structure

- `src/app/page.tsx`: The main page component, handling all UI logic and state.
- `src/app/actions/dbActions.ts`: Server-side actions for all database operations across PostgreSQL and Oracle.
- `src/ai/flows/classify-column-flow.ts`: The Genkit AI flow for classifying column data.
- `src/pages/api/`: API routes that connect the frontend to the server actions and AI flows.
- `src/components/`: Reusable React components, including the data table and UI elements.
- `src/lib/types.ts`: Core TypeScript type definitions for the application.
- `src/app/globals.css`: Global styles and Tailwind CSS theme configuration.

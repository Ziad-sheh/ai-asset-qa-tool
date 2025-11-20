# AI-Powered Asset QA Tool

This project is a single-page, web-based tool for analyzing creative assets. It sends user-selected assets and reference files to Gemini for comparison, stores feedback rules and history in Firestore when available, and falls back to in-memory storage when Firebase credentials are not provided.

## Configuration

The application reads configuration from global variables that you can inject at runtime. Set these before loading the page (for example, via an inline script tag or server-side templating):

- `__firebase_config`: JSON string containing your Firebase web configuration.
- `__app_id` (optional): application identifier used to namespace Firestore collections.
- `__initial_auth_token` (optional): a Firebase custom token if you want to avoid anonymous auth.

If no Firebase configuration is provided, the app runs in local/mock mode and stores feedback/history in memory for the current session.

> **Legacy note:** `firebaseConfig.example.js` remains in the repo for reference but is no longer loaded automatically by `index.html`.

Run `./build.sh` to copy the application files into a `dist/` directory for deployment.

## Prerequisites

- **Node.js** 16 or later so you can run local servers with `npx`.
- **Firebase project** with **Cloud Firestore** enabled if you want cloud persistence. You can embed the project's web configuration in `__firebase_config` (or adapt `firebaseConfig.js` to set that global) and ensure your Firestore rules allow the tool to read and write data during testing.

## Running Locally

1. (Optional) install the `serve` package globally:
   ```bash
   npm install -g serve
   ```
2. Start a local server in this directory:
   ```bash
   npx serve .
   ```
3. Open the printed localhost URL in your browser. Any other static HTTP server works as well (e.g., `python3 -m http.server`).

## User Workflow

1. **Upload Assets** – select the images or videos to review.
2. **Upload References** – add reference PDFs or images that contain approved copy or style guides.
3. **Add Context** – enter notes or instructions in the provided text areas.
4. Click **Analyze Batch** to run the Gemini-powered analysis. Progress and results appear on the right side.
5. **Provide Feedback** – add rules in the **Human Feedback Loop** section so the AI remembers them for future analyses.

Past feedback rules and previous reviews appear below the analysis section so you can manage them at any time.

## Human Feedback & Firestore

Saved feedback rules are stored in the `humanFeedback` collection in Firestore. Every time the tool runs an analysis it fetches these rules and prepends them to the prompt sent to Gemini. You can undo or redo feedback changes, and each review report is saved in the `reviewHistory` collection.

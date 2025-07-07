# AI-Powered Asset QA Tool

This project is a simple web-based tool for analyzing assets using Firebase for storage and Firestore. The Firebase configuration is loaded from an external JavaScript file so that sensitive project keys are not committed to the repository.

## Configuration

1. Duplicate `firebaseConfig.example.js` and rename the copy to `firebaseConfig.js`.
2. Fill in your Firebase project credentials in `firebaseConfig.js`.
3. Deploy the `index.html`, the `src/` directory, and the new `firebaseConfig.js` to your hosting environment.

Run `./build.sh` to copy the application files into a `dist/` directory for deployment.

The `firebaseConfig.js` file is ignored by Git to prevent accidental commits of private keys.

## Prerequisites

- **Node.js** 16 or later so you can run local servers with `npx`.
- **Firebase project** with **Cloud Firestore** enabled. Copy the project's web configuration into `firebaseConfig.js` and ensure your Firestore rules allow the tool to read and write data during testing.

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

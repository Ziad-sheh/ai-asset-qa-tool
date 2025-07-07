# AI Asset QA Tool

This is a simple web-based tool for analyzing media assets using Firebase for storing feedback and history.

## Firebase configuration

1. Copy `firebaseConfig.example.js` to `firebaseConfig.js` in the project root.
2. Replace the placeholder values with your Firebase project credentials.
3. Ensure that `firebaseConfig.js` is not tracked in version control. The `.gitignore` file already excludes it.
4. Deploy both `index.html` and your `firebaseConfig.js` file together so the application can initialize Firebase.

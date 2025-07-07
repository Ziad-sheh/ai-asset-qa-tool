# AI Asset QA Tool

This single-page web app uses Firebase to store feedback and history for asset QA analysis. Provide your own Firebase project configuration by creating a `firebaseConfig.js` file in the project root based on the provided `firebaseConfig.example.js`.

```javascript
// firebaseConfig.js (not committed)
export const firebaseConfig = {
  apiKey: "<YOUR_API_KEY>",
  authDomain: "<YOUR_PROJECT>.firebaseapp.com",
  projectId: "<YOUR_PROJECT>",
  storageBucket: "<YOUR_PROJECT>.appspot.com",
  messagingSenderId: "<SENDER_ID>",
  appId: "<APP_ID>"
};
```

Place this file next to `index.html` before running the application.

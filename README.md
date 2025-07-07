# AI-Powered Asset QA Tool

This project is a simple web-based tool for analyzing assets using Firebase for storage and Firestore. The Firebase configuration is loaded from an external JavaScript file so that sensitive project keys are not committed to the repository.

## Configuration

1. Duplicate `firebaseConfig.example.js` and rename the copy to `firebaseConfig.js`.
2. Fill in your Firebase project credentials in `firebaseConfig.js`.
3. Deploy the `index.html` file along with the new `firebaseConfig.js` to your hosting environment.

The `firebaseConfig.js` file is ignored by Git to prevent accidental commits of private keys.

## Security Considerations

Storing API or Firebase keys in the browser exposes them to anyone with access to the site's JavaScript. Malicious users could view the keys in developer tools and abuse your Firebase project or API quotas. For production deployments, avoid embedding these secrets directly in `localStorage` or in a public JavaScript file.

Instead, run a small server-side proxy that holds the credentials in environment variables and forwards requests to the Gemini API or Firebase. The frontend can then call your proxy endpoint without ever seeing the real keys. Another option is to inject configuration on the server during deployment rather than storing it in the browser.

When the application loads, it first checks `localStorage` for a saved key. If none is found, it attempts to retrieve one from `/api/api-key`. You can implement this endpoint in your backend to return the key securely.

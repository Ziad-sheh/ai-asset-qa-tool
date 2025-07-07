# AI-Powered Asset QA Tool

This project is a simple web-based tool for analyzing assets using Firebase for storage and Firestore. The Firebase configuration is loaded from an external JavaScript file so that sensitive project keys are not committed to the repository.

## Configuration

1. Duplicate `firebaseConfig.example.js` and rename the copy to `firebaseConfig.js`.
2. Fill in your Firebase project credentials in `firebaseConfig.js`.
3. Deploy the `index.html` file along with the new `firebaseConfig.js` to your hosting environment.

The `firebaseConfig.js` file is ignored by Git to prevent accidental commits of private keys.

## License

This project is licensed under the [MIT License](LICENSE).

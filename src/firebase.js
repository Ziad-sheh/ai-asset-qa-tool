import { firebaseConfig } from '../firebaseConfig.js';

firebase.initializeApp(firebaseConfig);
export const db = firebase.firestore();

export async function saveFeedbackToFirebase(feedbackText) {
  const docRef = await db.collection('humanFeedback').add({
    text: feedbackText,
    created: firebase.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

export async function getFeedbackFromFirebase() {
  const snapshot = await db.collection('humanFeedback').orderBy('created').get();
  return snapshot.docs.map(doc => ({ id: doc.id, text: doc.data().text }));
}

export async function deleteFeedbackFromFirebase(id) {
  await db.collection('humanFeedback').doc(id).delete();
}

export async function saveToHistoryFirebase(item) {
  await db.collection('reviewHistory').add({
    ...item,
    created: firebase.firestore.FieldValue.serverTimestamp()
  });
}

export async function getHistoryFromFirebase() {
  const snapshot = await db.collection('reviewHistory').orderBy('created', 'desc').get();
  return snapshot.docs.map(doc => doc.data());
}

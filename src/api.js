import { getFeedbackFromFirebase } from './firebase.js';

export function setApiKey(key) {
  window.localStorage.setItem('GEMINI_API_KEY', key);
}

export function getApiKey() {
  return window.localStorage.getItem('GEMINI_API_KEY') || '';
}

export function getAssetPayloadPart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64Data = dataUrl.split(',')[1];
      resolve({ inlineData: { mimeType: file.type, data: base64Data } });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function getAnalysisForSingleAsset(mainAssetPart, referenceParts, referenceInfo, mainPrompt) {
  const feedbackArr = await getFeedbackFromFirebase();
  const humanFeedback = feedbackArr.map(f => f.text);

  let initialPrompt = `**Task:** You are an expert QA agent. Analyze the "Primary Asset" by comparing it to the "Reference Assets".`;
  initialPrompt += `\n\n**HIGHEST PRIORITY - PERMANENT HUMAN FEEDBACK:**\nYou MUST follow these rules above all else.\n${humanFeedback.length > 0 ? humanFeedback.map(f => `- ${f}`).join('\n') : 'No human feedback provided.'}`;
  initialPrompt += `\n\n**SECOND PRIORITY - UNIVERSAL QUALITY CHECK:**\nEven if copy matches the tracker, you MUST perform a quality check on all text from the Primary Asset for grammar, readability, and rendering errors (especially for Arabic text).`;
  initialPrompt += `\n\n**THIRD PRIORITY - CORE QA RULE:** The "Reference Assets" contain a master list of all approved copy.\n1.  **Perform OCR on ALL Reference Assets** to create a single "master list" of all approved text.\n2.  **Perform OCR on the Primary Asset** to extract its visible text. If it is a video, analyze all frames with text.\n3.  **For each piece of text found on the Primary Asset**, check if it exists in the "master list" and find its corresponding entry.\n4.  **In your report, always list the closest matching tracker copy for every asset copy (even if the asset copy does not match it perfectly).**`;
  initialPrompt += `\n\n**JSON Output Instructions:**\n1.  **keyPoints**: Address the 'User's General Request' and any VISUAL/STYLE comparisons.\n2.  **copyAnalysis**: For each piece of text you identified on the **Primary Asset**, create a corresponding entry.\n    - \`assetText\`: The text you extracted from the **Primary Asset**.\n    - \`confidenceScore\`: A number from 0.0 to 1.0 indicating your confidence in the accuracy of the extracted \`assetText\`.\n    - \`correspondingTrackerText\`: The closest matching line of text from the **Reference Assets** (tracker). If it doesn't match anything, state "Not found on tracker".\n    - \`trackerStatus\`: 'pass' if a corresponding tracker text was found and matches closely, 'fail' otherwise.\n    - \`qualityNote\`: A brief note on the quality check.`;
  initialPrompt += `\n\n**User's General Request (for style/visuals):**\n${mainPrompt || '(No specific request, focus on Core QA Rule)'}`;

  const jsonSchema = {
    type: 'OBJECT',
    properties: {
      overallVerdict: { type: 'STRING', enum: ['Approved', 'Needs Revision', 'Rejected'] },
      summary: { type: 'STRING' },
      keyPoints: {
        type: 'ARRAY',
        items: { type: 'OBJECT', properties: { point: { type: 'STRING' }, status: { type: 'STRING', enum: ['pass', 'fail', 'info'] } }, required: ['point', 'status'] }
      },
      copyAnalysis: {
        type: 'ARRAY',
        items: { type: 'OBJECT', properties: { assetText: { type: 'STRING' }, confidenceScore: { type: 'NUMBER' }, correspondingTrackerText: { type: 'STRING' }, trackerStatus: { type: 'STRING', enum: ['pass', 'fail'] }, qualityNote: { type: 'STRING' } }, required: ['assetText', 'confidenceScore', 'correspondingTrackerText', 'trackerStatus', 'qualityNote'] }
      }
    },
    required: ['overallVerdict', 'summary', 'keyPoints', 'copyAnalysis']
  };

  const parts = [];
  parts.push({ text: initialPrompt });
  if (referenceInfo) parts.push({ text: `\n\n--- Additional Style Notes ---\n${referenceInfo}` });
  parts.push({ text: `\n\n--- Reference Assets (Source of Truth for Copy & Style) ---` });
  parts.push(...referenceParts);
  parts.push({ text: `\n\n--- Primary Asset to Analyze ---` });
  parts.push(mainAssetPart);

  const payload = { contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: jsonSchema } };
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key not set. Please save your Gemini API key.');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

  if (!response.ok) {
    let errorText = `API Error: ${response.status}`;
    const errorBody = await response.text();
    try {
      const errorJson = JSON.parse(errorBody);
      if (errorJson?.error?.message) errorText += ` - ${errorJson.error.message}`;
    } catch {
      if (errorBody) errorText += ` - ${errorBody}`;
    }
    throw new Error(errorText);
  }

  const result = await response.json();
  if (result.candidates && result.candidates.length > 0) {
    return JSON.parse(result.candidates[0].content.parts[0].text);
  }
  throw new Error('Invalid response structure from API.');
}

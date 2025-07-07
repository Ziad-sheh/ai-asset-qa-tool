import { saveFeedbackToFirebase, getFeedbackFromFirebase, deleteFeedbackFromFirebase, saveToHistoryFirebase, getHistoryFromFirebase } from './firebase.js';
import { setApiKey, getApiKey, getAssetPayloadPart, getAnalysisForSingleAsset } from './api.js';

function sanitize(text) {
  return text ? text.replace(/[<>]/g, '') : '';
}

export function init() {
  const assetUpload = document.getElementById('asset-upload');
  const assetPreviews = document.getElementById('asset-previews');
  const assetPlaceholder = document.getElementById('asset-placeholder');
  const referenceAssetUpload = document.getElementById('reference-asset-upload');
  const referencePreviews = document.getElementById('reference-previews');
  const referencePlaceholder = document.getElementById('reference-placeholder');
  const copyInput = document.getElementById('copy-input');
  const referenceInfoInput = document.getElementById('reference-info-input');
  const analyzeButton = document.getElementById('analyze-button');
  const analysisOutput = document.getElementById('analysis-output');
  const analysisPlaceholder = document.getElementById('analysis-placeholder');
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notification-message');
  const humanFeedbackSection = document.getElementById('human-feedback-section');
  const humanFeedbackInput = document.getElementById('human-feedback-input');
  const saveFeedbackButton = document.getElementById('save-feedback-button');
  const activeFeedbackList = document.getElementById('active-feedback-list');
  const undoFeedbackButton = document.getElementById('undo-feedback-button');
  const redoFeedbackButton = document.getElementById('redo-feedback-button');
  const reviewHistoryList = document.getElementById('review-history-list');
  const historySearchInput = document.getElementById('history-search');
  const whyModal = document.getElementById('why-modal');
  const whyModalList = document.getElementById('why-modal-list');
  const whyModalClose = document.getElementById('why-modal-close');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveApiKeyBtn = document.getElementById('save-api-key-btn');
  const apiKeyStatus = document.getElementById('api-key-status');

  let assetsToReview = [];
  let referenceAssets = [];
  let historyData = [];
  let undoStack = [];
  let redoStack = [];

  function showNotification(message, isError = false) {
    notificationMessage.textContent = message;
    notification.className = `fixed top-5 right-5 text-white py-2 px-5 rounded-lg shadow-lg opacity-0 transform translate-y-[-20px] z-50 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
    notification.classList.remove('opacity-0', 'translate-y-[-20px]');
    notification.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
      notification.classList.remove('opacity-100', 'translate-y-0');
      notification.classList.add('opacity-0', 'translate-y-[-20px]');
    }, 4000);
  }

  function showWhyModal(points) {
    whyModalList.textContent = '';
    if (!points || points.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No details provided.';
      whyModalList.appendChild(li);
    } else {
      points.forEach(p => {
        const icon = p.status === 'pass' ? '✅' : p.status === 'fail' ? '❌' : 'ℹ️';
        const li = document.createElement('li');
        li.textContent = `${icon} ${sanitize(p.point)}`;
        whyModalList.appendChild(li);
      });
    }
    whyModal.classList.remove('hidden');
  }

  async function renderFeedbackList() {
    const feedbackList = await getFeedbackFromFirebase();
    activeFeedbackList.textContent = '';
    if (feedbackList.length === 0) {
      const p = document.createElement('p');
      p.className = 'text-gray-500 text-center text-sm';
      p.textContent = 'No human feedback rules saved yet.';
      activeFeedbackList.appendChild(p);
      return;
    }
    feedbackList.forEach(({ id, text }) => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between bg-gray-800 p-2 rounded-md';
      const msg = document.createElement('p');
      msg.className = 'text-sm text-cyan-200 flex-1 mr-2';
      msg.textContent = sanitize(text);
      const btn = document.createElement('button');
      btn.dataset.id = id;
      btn.dataset.text = text;
      btn.className = 'delete-feedback-btn flex-shrink-0 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full';
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>';
      item.appendChild(msg);
      item.appendChild(btn);
      activeFeedbackList.appendChild(item);
    });
    document.querySelectorAll('.delete-feedback-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const text = e.currentTarget.dataset.text;
        await deleteFeedbackFromFirebase(id);
        undoStack.push({ type: 'delete', text });
        redoStack = [];
        await renderFeedbackList();
        updateUndoRedoButtons();
      });
    });
  }

  saveFeedbackButton.addEventListener('click', async () => {
    const feedbackText = humanFeedbackInput.value.trim();
    if (!feedbackText) return showNotification('Feedback cannot be empty.', true);
    const id = await saveFeedbackToFirebase(feedbackText);
    undoStack.push({ type: 'add', id, text: feedbackText });
    redoStack = [];
    humanFeedbackInput.value = '';
    await renderFeedbackList();
    updateUndoRedoButtons();
    showNotification('Feedback saved in the cloud.');
  });

  function updateUndoRedoButtons() {
    undoFeedbackButton.disabled = undoStack.length === 0;
    redoFeedbackButton.disabled = redoStack.length === 0;
  }

  async function undoFeedbackAction() {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    if (action.type === 'add') {
      await deleteFeedbackFromFirebase(action.id);
      redoStack.push({ type: 'add', text: action.text });
    } else if (action.type === 'delete') {
      const newId = await saveFeedbackToFirebase(action.text);
      redoStack.push({ type: 'delete', id: newId, text: action.text });
    }
    await renderFeedbackList();
    updateUndoRedoButtons();
  }

  async function redoFeedbackAction() {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();
    if (action.type === 'add') {
      const newId = await saveFeedbackToFirebase(action.text);
      undoStack.push({ type: 'add', id: newId, text: action.text });
    } else if (action.type === 'delete') {
      await deleteFeedbackFromFirebase(action.id);
      undoStack.push({ type: 'delete', text: action.text });
    }
    await renderFeedbackList();
    updateUndoRedoButtons();
  }

  undoFeedbackButton.addEventListener('click', undoFeedbackAction);
  redoFeedbackButton.addEventListener('click', redoFeedbackAction);

  async function renderHistoryList(filter = '') {
    if (historyData.length === 0) {
      historyData = await getHistoryFromFirebase();
    }
    const historyList = filter ? historyData.filter(item => (item.assetName && item.assetName.toLowerCase().includes(filter.toLowerCase())) || (item.verdict && item.verdict.toLowerCase().includes(filter.toLowerCase()))) : historyData;
    reviewHistoryList.textContent = '';
    if (historyList.length === 0) {
      const p = document.createElement('p');
      p.className = 'text-gray-500 text-center text-sm';
      p.textContent = 'No past reviews found.';
      reviewHistoryList.appendChild(p);
      return;
    }
    historyList.forEach((item) => {
      const element = document.createElement('div');
      element.className = 'history-item flex flex-col bg-gray-800 p-2 rounded-md cursor-pointer hover:bg-gray-700';
      element.dataset.report = JSON.stringify(item.reportData);
      element.dataset.assetName = item.assetName;
      const verdictColor = { 'Approved': 'text-green-400', 'Needs Revision': 'text-yellow-400', 'Rejected': 'text-red-400' }[item.verdict] || 'text-gray-400';
      const top = document.createElement('div');
      top.className = 'flex justify-between items-start w-full';
      const left = document.createElement('div');
      left.className = 'flex-1';
      const nameP = document.createElement('p');
      nameP.className = 'text-sm font-medium text-purple-300 truncate';
      nameP.title = item.assetName;
      nameP.textContent = `Reviewed: ${sanitize(item.assetName)}`;
      const refsP = document.createElement('p');
      refsP.className = 'text-xs text-gray-400 truncate';
      const refs = (item.referenceNames || []).join(', ');
      refsP.title = refs;
      refsP.textContent = `Reference(s): ${sanitize(refs)}`;
      left.appendChild(nameP);
      left.appendChild(refsP);
      const right = document.createElement('div');
      right.className = 'flex items-center gap-2 ml-2';
      const verdictP = document.createElement('p');
      verdictP.className = `text-xs font-bold ${verdictColor} flex-shrink-0`;
      verdictP.textContent = item.verdict;
      const why = document.createElement('button');
      why.className = 'history-why-btn text-blue-400 underline text-xs flex-shrink-0';
      why.textContent = 'Why?';
      right.appendChild(verdictP);
      right.appendChild(why);
      top.appendChild(left);
      top.appendChild(right);
      const dateP = document.createElement('p');
      dateP.className = 'text-xs text-gray-500 w-full text-right mt-1';
      dateP.textContent = item.date;
      element.appendChild(top);
      element.appendChild(dateP);
      const whyBtn = why;
      whyBtn.dataset.points = JSON.stringify(item.reportData.keyPoints || []);
      whyBtn.addEventListener('click', (e) => { e.stopPropagation(); showWhyModal(JSON.parse(e.currentTarget.dataset.points)); });
      reviewHistoryList.appendChild(element);
    });
    document.querySelectorAll('.history-item').forEach(button => {
      button.addEventListener('click', (e) => {
        const reportData = JSON.parse(e.currentTarget.dataset.report);
        const assetName = e.currentTarget.dataset.assetName;
        analysisOutput.textContent = '';
        appendReportToDisplay({ assetName, reportData });
        showNotification(`Loaded report for ${assetName}`);
      });
    });
  }

  function handleFileUpload(event, fileList, previewContainer, placeholder) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (!fileList.some(f => f.name === file.name)) {
        fileList.push(file);
      }
    });
    renderPreviews(fileList, previewContainer, placeholder);
    event.target.value = '';
  }

  function handleDropUpload(event, fileList, previewContainer, placeholder) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    files.forEach(file => {
      if (!fileList.some(f => f.name === file.name)) {
        fileList.push(file);
      }
    });
    renderPreviews(fileList, previewContainer, placeholder);
  }

  function renderPreviews(fileList, previewContainer, placeholder) {
    previewContainer.textContent = '';
    if (fileList.length === 0) {
      previewContainer.appendChild(placeholder);
      return;
    }
    fileList.forEach((file, index) => {
      const reader = new FileReader();
      const thumb = document.createElement('div');
      thumb.className = 'thumbnail';
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '×';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        fileList.splice(index, 1);
        renderPreviews(fileList, previewContainer, placeholder);
      };
      if (file.type.startsWith('image/')) {
        reader.onload = e => {
          const img = document.createElement('img');
          img.src = e.target.result;
          thumb.appendChild(img);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        thumb.appendChild(video);
      } else if (file.type === 'application/pdf') {
        const wrapper = document.createElement('div');
        wrapper.className = 'w-full h-full bg-gray-700 flex items-center justify-center p-2';
        wrapper.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 2v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>';
        thumb.appendChild(wrapper);
      }
      thumb.appendChild(removeBtn);
      previewContainer.appendChild(thumb);
    });
  }

  async function handleBatchAnalysis() {
    if (assetsToReview.length === 0) return showNotification('Please upload at least one asset to check.', true);
    if (referenceAssets.length === 0) return showNotification('Please upload at least one reference asset.', true);
    analyzeButton.disabled = true;
    analyzeButton.textContent = 'Analyzing...';
    analysisPlaceholder.classList.add('hidden');
    analysisOutput.textContent = '';
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.className = 'h-full flex flex-col items-center justify-center text-center text-gray-500 py-16';
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    const loaderTextEl = document.createElement('p');
    loaderTextEl.id = 'loader-text';
    loaderTextEl.className = 'mt-4';
    loaderTextEl.textContent = 'Preparing analysis...';
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    const progressBarEl = document.createElement('div');
    progressBarEl.id = 'progress-bar';
    progressBarEl.className = 'progress-bar';
    progressContainer.appendChild(progressBarEl);
    loader.appendChild(spinner);
    loader.appendChild(loaderTextEl);
    loader.appendChild(progressContainer);
    analysisOutput.appendChild(loader);
    let completedCount = 0;
    const totalCount = assetsToReview.length;
    const loaderText = document.getElementById('loader-text');
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = '0%';
    try {
      const referenceParts = await Promise.all(referenceAssets.map(file => getAssetPayloadPart(file)));
      for (const asset of assetsToReview) {
        loaderText.textContent = `Analyzing asset ${completedCount + 1} of ${totalCount}: ${asset.name}`;
        try {
          const mainAssetPart = await getAssetPayloadPart(asset);
          const report = await getAnalysisForSingleAsset(mainAssetPart, referenceParts, referenceInfoInput.value.trim(), copyInput.value.trim());
          appendReportToDisplay({ assetName: asset.name, reportData: report });
          const historyItem = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            assetName: asset.name,
            referenceNames: referenceAssets.map(f => f.name),
            verdict: report.overallVerdict,
            reportData: report
          };
          await saveToHistoryFirebase(historyItem);
          historyData.push(historyItem);
        } catch (assetError) {
          console.error(`Error analyzing ${asset.name}:`, assetError);
          appendReportToDisplay({ assetName: asset.name, reportData: { error: true, summary: assetError.message } });
        } finally {
          completedCount++;
          const progress = Math.round((completedCount / totalCount) * 100);
          progressBar.style.width = `${progress}%`;
        }
      }
      humanFeedbackSection.classList.remove('hidden');
    } catch (error) {
      console.error('Batch analysis failed:', error);
      const errDiv = document.createElement('div');
      errDiv.className = 'text-red-400 p-4 bg-red-900/50 rounded-lg';
      const strong = document.createElement('strong');
      strong.textContent = 'Error:';
      errDiv.appendChild(strong);
      errDiv.appendChild(document.createElement('br'));
      errDiv.appendChild(document.createElement('br'));
      errDiv.appendChild(document.createTextNode(error.message));
      analysisOutput.appendChild(errDiv);
    } finally {
      const loaderElement = document.getElementById('loader');
      if (loaderElement) loaderElement.remove();
      analyzeButton.disabled = false;
      analyzeButton.textContent = 'Analyze Batch';
      await renderHistoryList();
    }
  }

  function appendReportToDisplay(item) {
    const loaderElement = document.getElementById('loader');
    if (loaderElement) loaderElement.style.display = 'none';
    const reportCard = document.createElement('details');
    reportCard.className = 'bg-gray-800 rounded-lg overflow-hidden';
    reportCard.open = true;
    const summary = document.createElement('summary');
    summary.className = 'p-4 cursor-pointer hover:bg-gray-700 flex justify-between items-center';
    const verdictColor = { 'Approved': 'text-green-400', 'Needs Revision': 'text-yellow-400', 'Rejected': 'text-red-400' }[item.reportData.overallVerdict];
    const title = document.createElement('h3');
    title.className = 'font-semibold text-lg';
    title.textContent = sanitize(item.assetName);
    const infoWrap = document.createElement('div');
    infoWrap.className = 'flex items-center gap-2';
    const verdictSpan = document.createElement('span');
    verdictSpan.className = `font-bold text-lg ${verdictColor}`;
    verdictSpan.textContent = item.reportData.overallVerdict || 'Error';
    const whyButton = document.createElement('button');
    whyButton.className = 'why-btn text-blue-400 underline text-sm';
    whyButton.textContent = 'Why?';
    infoWrap.appendChild(verdictSpan);
    infoWrap.appendChild(whyButton);
    summary.appendChild(title);
    summary.appendChild(infoWrap);
    const whyBtn = whyButton;
    whyBtn.dataset.points = JSON.stringify(item.reportData.keyPoints || []);
    whyBtn.addEventListener('click', (e) => { e.stopPropagation(); showWhyModal(JSON.parse(e.currentTarget.dataset.points)); });
    const content = document.createElement('div');
    content.className = 'p-4 border-t border-gray-700';
    if (item.reportData.error) {
      const p = document.createElement('p');
      p.className = 'text-red-400';
      p.textContent = sanitize(item.reportData.summary);
      content.appendChild(p);
    } else {
      content.appendChild(generateReportHTML(item.reportData));
    }
    reportCard.appendChild(summary);
    reportCard.appendChild(content);
    analysisOutput.appendChild(reportCard);
  }

  function generateReportHTML(data) {
    const icons = {
      pass: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      fail: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      info: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
    };
    const isArabic = (text) => {
      if (!text) return false;
      const arabicRegex = /[\u0600-\u06FF]/;
      return arabicRegex.test(text);
    };

    const container = document.createElement('div');
    container.className = 'space-y-4';
    const summaryP = document.createElement('p');
    summaryP.className = 'text-gray-400';
    summaryP.textContent = sanitize(data.summary);
    container.appendChild(summaryP);

    if (data.keyPoints && data.keyPoints.length > 0) {
      const section = document.createElement('div');
      section.className = 'space-y-3 pt-4';
      const h4 = document.createElement('h4');
      h4.className = 'text-lg font-semibold text-gray-300';
      h4.textContent = 'Style & Visual Analysis';
      section.appendChild(h4);
      data.keyPoints.forEach(item => {
        const row = document.createElement('div');
        row.className = 'flex items-start gap-3 p-3 rounded-md bg-gray-900/70';
        const iconWrap = document.createElement('div');
        iconWrap.innerHTML = icons[item.status] || icons['info'];
        const textP = document.createElement('p');
        textP.className = 'flex-1 text-gray-300';
        textP.textContent = sanitize(item.point);
        row.appendChild(iconWrap);
        row.appendChild(textP);
        section.appendChild(row);
      });
      container.appendChild(section);
    }

    if (data.copyAnalysis && data.copyAnalysis.length > 0) {
      const copySection = document.createElement('div');
      copySection.className = 'pt-4';
      const h4 = document.createElement('h4');
      h4.className = 'text-lg font-semibold text-gray-300 mb-3';
      h4.textContent = 'Copy-Specific Analysis';
      copySection.appendChild(h4);
      const space = document.createElement('div');
      space.className = 'space-y-3';
      data.copyAnalysis.forEach(item => {
        const isAssetArabic = isArabic(item.assetText);
        const assetDir = isAssetArabic ? 'rtl' : 'ltr';
        const assetAlign = isAssetArabic ? 'text-right' : 'text-left';
        const isTrackerArabic = isArabic(item.correspondingTrackerText);
        const trackerDir = isTrackerArabic ? 'rtl' : 'ltr';
        const trackerAlign = isTrackerArabic ? 'text-right' : 'text-left';
        const trackerContentWrap = document.createElement('div');
        if (item.trackerStatus === 'pass') {
          const p1 = document.createElement('p');
          p1.className = 'text-sm text-gray-500';
          p1.textContent = 'Matches Tracker Copy';
          const p2 = document.createElement('p');
          p2.className = `text-green-400 font-medium ${trackerAlign}`;
          p2.dir = trackerDir;
          p2.textContent = sanitize(item.correspondingTrackerText);
          trackerContentWrap.appendChild(p1);
          trackerContentWrap.appendChild(p2);
        } else {
          const p1 = document.createElement('p');
          p1.className = 'text-sm text-gray-500';
          p1.textContent = 'Closest Tracker Copy';
          const p2 = document.createElement('p');
          p2.className = `text-yellow-400 font-medium ${trackerAlign}`;
          p2.dir = trackerDir;
          p2.textContent = sanitize(item.correspondingTrackerText);
          trackerContentWrap.appendChild(p1);
          trackerContentWrap.appendChild(p2);
        }
        const qualityStatusIcon = item.qualityNote.toLowerCase().includes('fail') ? icons.fail : icons.pass;
        const confidenceColor = item.confidenceScore > 0.9 ? 'text-green-400' : item.confidenceScore > 0.7 ? 'text-yellow-400' : 'text-red-400';
        const row = document.createElement('div');
        row.className = 'flex items-start gap-4 p-3 rounded-md bg-gray-900/70';
        const iconWrap = document.createElement('div');
        iconWrap.innerHTML = icons[item.trackerStatus] || icons['info'];
        const flex1 = document.createElement('div');
        flex1.className = 'flex-1';
        const topRow = document.createElement('div');
        topRow.className = 'flex justify-between items-start';
        const left = document.createElement('div');
        const assetLabel = document.createElement('p');
        assetLabel.className = 'text-sm text-gray-500';
        assetLabel.textContent = 'Asset Copy';
        const assetText = document.createElement('p');
        assetText.className = `text-gray-200 font-medium mb-2 ${assetAlign}`;
        assetText.dir = assetDir;
        assetText.textContent = sanitize(item.assetText);
        left.appendChild(assetLabel);
        left.appendChild(assetText);
        const right = document.createElement('div');
        right.className = 'text-right ml-4';
        const confidenceLabel = document.createElement('p');
        confidenceLabel.className = 'text-sm text-gray-500';
        confidenceLabel.textContent = 'Confidence';
        const confidenceValue = document.createElement('p');
        confidenceValue.className = `font-bold ${confidenceColor}`;
        confidenceValue.textContent = `${(item.confidenceScore * 100).toFixed(0)}%`;
        right.appendChild(confidenceLabel);
        right.appendChild(confidenceValue);
        topRow.appendChild(left);
        topRow.appendChild(right);
        flex1.appendChild(topRow);
        flex1.appendChild(document.createElement('hr')).className = 'border-gray-700 my-2';
        flex1.appendChild(trackerContentWrap);
        const hr2 = document.createElement('hr');
        hr2.className = 'border-gray-700 my-2';
        flex1.appendChild(hr2);
        const qualityLabel = document.createElement('p');
        qualityLabel.className = 'text-sm text-gray-500';
        qualityLabel.textContent = 'Quality Note';
        const qualityRow = document.createElement('div');
        qualityRow.className = 'flex items-center gap-2';
        const qualIcon = document.createElement('span');
        qualIcon.innerHTML = qualityStatusIcon;
        const qualText = document.createElement('p');
        qualText.className = 'text-gray-300';
        qualText.textContent = sanitize(item.qualityNote);
        qualityRow.appendChild(qualIcon);
        qualityRow.appendChild(qualText);
        flex1.appendChild(qualityLabel);
        flex1.appendChild(qualityRow);
        row.appendChild(iconWrap);
        row.appendChild(flex1);
        space.appendChild(row);
      });
      copySection.appendChild(space);
      container.appendChild(copySection);
    }

    return container;
  }

  saveApiKeyBtn.onclick = () => {
    setApiKey(apiKeyInput.value.trim());
    apiKeyStatus.classList.remove('hidden');
    setTimeout(() => apiKeyStatus.classList.add('hidden'), 1500);
  };
  apiKeyInput.value = getApiKey();

  document.addEventListener('DOMContentLoaded', async () => {
    await renderFeedbackList();
    await renderHistoryList();
    historySearchInput.addEventListener('input', (e) => renderHistoryList(e.target.value.trim()));
    updateUndoRedoButtons();
  });
  assetUpload.addEventListener('change', (e) => handleFileUpload(e, assetsToReview, assetPreviews, assetPlaceholder));
  referenceAssetUpload.addEventListener('change', (e) => handleFileUpload(e, referenceAssets, referencePreviews, referencePlaceholder));
  assetPreviews.addEventListener('dragover', (e) => { e.preventDefault(); assetPreviews.classList.add('drag-highlight'); });
  assetPreviews.addEventListener('dragleave', () => assetPreviews.classList.remove('drag-highlight'));
  assetPreviews.addEventListener('drop', (e) => { assetPreviews.classList.remove('drag-highlight'); handleDropUpload(e, assetsToReview, assetPreviews, assetPlaceholder); });
  referencePreviews.addEventListener('dragover', (e) => { e.preventDefault(); referencePreviews.classList.add('drag-highlight'); });
  referencePreviews.addEventListener('dragleave', () => referencePreviews.classList.remove('drag-highlight'));
  referencePreviews.addEventListener('drop', (e) => { referencePreviews.classList.remove('drag-highlight'); handleDropUpload(e, referenceAssets, referencePreviews, referencePlaceholder); });
  analyzeButton.addEventListener('click', handleBatchAnalysis);
  whyModalClose.addEventListener('click', () => whyModal.classList.add('hidden'));
  whyModal.addEventListener('click', (e) => { if (e.target === whyModal) whyModal.classList.add('hidden'); });
}

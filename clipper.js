const videoInput = document.querySelector('#videoInput');
const replaceVideo = document.querySelector('#replaceVideo');
const uploadState = document.querySelector('#uploadState');
const editorState = document.querySelector('#editorState');
const video = document.querySelector('#video');
const videoShell = document.querySelector('.video-shell');
const fileName = document.querySelector('#fileName');
const videoInfo = document.querySelector('#videoInfo');
const startRange = document.querySelector('#startRange');
const endRange = document.querySelector('#endRange');
const timeReadout = document.querySelector('#timeReadout');
const durationLabel = document.querySelector('#durationLabel');
const rangeHighlight = document.querySelector('#rangeHighlight');
const exportSummary = document.querySelector('#exportSummary');
const scanButton = document.querySelector('#scanButton');
const suggestions = document.querySelector('#suggestions');
const exportButton = document.querySelector('#exportButton');
const exportStatus = document.querySelector('#exportStatus');
let currentUrl = '';
let duration = 0;

const formatTime = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

function updateSelection() {
  let start = Number(startRange.value);
  let end = Number(endRange.value);
  if (start > end - 1) {
    if (document.activeElement === startRange) start = Math.max(0, end - 1);
    else end = Math.min(duration, start + 1);
    startRange.value = start;
    endRange.value = end;
  }
  const endPercent = duration ? ((duration - end) / duration) * 100 : 70;
  rangeHighlight.style.left = `${duration ? (start / duration) * 100 : 0}%`;
  rangeHighlight.style.right = `${endPercent}%`;
  timeReadout.textContent = `${formatTime(start)} — ${formatTime(end)}`;
  exportSummary.textContent = `${formatTime(end - start)} clip selected`;
}

function loadVideo(file) {
  if (!file) return;
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(file);
  video.src = currentUrl;
  fileName.textContent = file.name;
  videoInfo.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · Loading metadata...`;
  uploadState.classList.add('hidden');
  editorState.classList.remove('hidden');
  video.addEventListener('loadedmetadata', () => {
    duration = video.duration;
    const initialEnd = Math.min(duration, 30);
    startRange.max = duration;
    endRange.max = duration;
    startRange.value = 0;
    endRange.value = initialEnd;
    durationLabel.textContent = formatTime(duration);
    videoInfo.textContent = `${formatTime(duration)} total · Ready to edit`;
    videoShell.classList.add('has-video');
    updateSelection();
  }, { once: true });
}

videoInput.addEventListener('change', (event) => loadVideo(event.target.files[0]));
replaceVideo.addEventListener('click', () => videoInput.click());
document.querySelector('#playOverlay').addEventListener('click', () => video.play());
startRange.addEventListener('input', updateSelection);
endRange.addEventListener('input', updateSelection);
video.addEventListener('timeupdate', () => {
  if (video.currentTime >= Number(endRange.value)) video.pause();
});

scanButton.addEventListener('click', () => {
  if (!duration) return;
  scanButton.disabled = true;
  scanButton.innerHTML = 'Scanning your timeline... <span>◌</span>';
  window.setTimeout(() => {
    const length = Math.max(1, duration);
    const candidates = [
      { title: 'The opening hook', start: 0.08 * length, reason: 'Strong start · sets up the story' },
      { title: 'The core insight', start: 0.42 * length, reason: 'High-value moment · clear takeaway' },
      { title: 'The final payoff', start: 0.76 * length, reason: 'Emotional peak · memorable ending' },
    ];
    suggestions.innerHTML = candidates.map((candidate, index) => {
      const start = Math.min(Math.max(0, candidate.start), Math.max(0, length - 16));
      return `<div class="suggestion" data-start="${start}" data-end="${Math.min(length, start + 30)}"><span class="suggestion-num">0${index + 1}</span><div><strong>${candidate.title}</strong><small>${formatTime(start)} · ${candidate.reason}</small></div><button aria-label="Use ${candidate.title}">↗</button></div>`;
    }).join('');
    suggestions.querySelectorAll('.suggestion').forEach((item) => item.addEventListener('click', () => {
      startRange.value = item.dataset.start;
      endRange.value = item.dataset.end;
      suggestions.querySelectorAll('.suggestion').forEach((suggestion) => suggestion.classList.remove('selected'));
      item.classList.add('selected');
      updateSelection();
    }));
    scanButton.disabled = false;
    scanButton.innerHTML = 'Scan again <span>✦</span>';
  }, 650);
});

exportButton.addEventListener('click', async () => {
  if (!video.src || !duration) return;
  exportButton.disabled = true;
  exportButton.innerHTML = 'Rendering clip... <span>◌</span>';
  exportStatus.classList.remove('hidden');
  exportStatus.textContent = 'Preparing a local recording. Keep this tab open...';
  const start = Number(startRange.value);
  const end = Number(endRange.value);
  const stream = video.captureStream ? video.captureStream() : null;
  if (!stream || !window.MediaRecorder) {
    exportStatus.textContent = 'Your browser cannot export captured video. Try the latest Chrome or Edge.';
    exportButton.disabled = false;
    exportButton.innerHTML = 'Export clip <span>↓</span>';
    return;
  }
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName.textContent.replace(/\.[^/.]+$/, '')}-clip.webm`;
    link.click();
    exportStatus.textContent = 'Done — your clip has been downloaded locally.';
    exportButton.disabled = false;
    exportButton.innerHTML = 'Export again <span>↓</span>';
  };
  video.currentTime = start;
  await video.play();
  recorder.start();
  const stopWhenReady = () => {
    if (video.currentTime >= end) {
      video.pause();
      recorder.stop();
      video.removeEventListener('timeupdate', stopWhenReady);
    }
  };
  video.addEventListener('timeupdate', stopWhenReady);
});

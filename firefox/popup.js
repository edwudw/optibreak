// popup.js
// Polyfill for browser API
if (typeof browser === "undefined") {
  var browser = chrome;
}

function formatTime(ms) {
  if (ms < 0) return 'Now!';
  const totalSeconds = Math.floor(ms / 1000);
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}m ${sec}s`;
}

let msRemaining = 0;
const timeDiv = document.getElementById('time');

function updateTime() {
  browser.runtime.sendMessage({ type: 'getTimeRemaining' }, (response) => {
    if (response && typeof response.msRemaining === 'number') {
      msRemaining = response.msRemaining;
      timeDiv.textContent = formatTime(msRemaining);
    } else {
      timeDiv.textContent = 'Unknown';
    }
  });
}

// Initial fetch
updateTime();

// Update every second
setInterval(() => {
  msRemaining -= 1000;
  if (msRemaining <= 0) {
    updateTime(); // Resync after alarm fires
  } else {
    timeDiv.textContent = formatTime(msRemaining);
  }
}, 1000);

document.getElementById('optionsBtn').addEventListener('click', () => {
  if (browser.runtime.openOptionsPage) {
    browser.runtime.openOptionsPage();
  } else {
    window.open('options.html');
  }
});

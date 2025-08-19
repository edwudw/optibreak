// popup.js

function formatTime(ms) {
  if (ms < 0) return 'Now!';
  const totalSeconds = Math.floor(ms / 1000);
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}m ${sec}s`;
}

const timeDiv = document.getElementById('time');
const statusDiv = document.getElementById('calendarStatus');
let isCurrentlyBusy = false; // New state variable to track if the user is busy
let msRemaining = 0;

function updatePopup() {
  chrome.runtime.sendMessage({ type: 'getPopupInfo' }, (response) => {
    if (chrome.runtime.lastError) {
      timeDiv.textContent = 'Error';
      statusDiv.textContent = 'Could not connect to extension.';
      console.error(chrome.runtime.lastError.message);
      return;
    }

    if (response && typeof response.msRemaining === 'number') {
      msRemaining = response.msRemaining;
      timeDiv.textContent = formatTime(msRemaining);
    } else {
      timeDiv.textContent = 'Unknown';
    }

    if (response && response.status) {
      const status = response.status;
      isCurrentlyBusy = status.isBusy; // Update the local busy state
      if (!status.isSignedIn) {
        statusDiv.textContent = 'Sign in via Options to sync calendar.';
      } else if (status.isBusy === null) {
        statusDiv.textContent = 'Checking calendar status...';
      } else if (status.isBusy) {
        statusDiv.textContent = 'In a meeting. Notifications are paused.';
      } else {
        statusDiv.textContent = 'No meetings. Notifications are active.';
      }
    } else {
      statusDiv.textContent = 'Could not get calendar status.';
    }

    // Update time display based on busy status
    if (isCurrentlyBusy) {
      timeDiv.textContent = 'Disabled';
    } else if (response && typeof response.msRemaining === 'number') {
      msRemaining = response.msRemaining;
      timeDiv.textContent = formatTime(msRemaining);
    } else {
      timeDiv.textContent = 'Unknown';
    }
  });
}

// Initial fetch
updatePopup();

// Update every second, but only if not busy
setInterval(() => {
  if (!isCurrentlyBusy) { // Only count down if not busy
    msRemaining -= 1000;
    if (msRemaining < -1000) { // Allow "Now!" for a bit, then re-sync with background
      updatePopup();
    } else {
      timeDiv.textContent = formatTime(msRemaining);
    }
  }
}, 1000);

document.getElementById('optionsBtn').addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open('options.html');
  }
});

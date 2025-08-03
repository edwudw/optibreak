// options.js

document.addEventListener('DOMContentLoaded', () => {
  const intervalInput = document.getElementById('interval');
  const status = document.getElementById('status');

  // Load saved interval
  chrome.storage.sync.get({ interval: 20 }, (data) => {
    intervalInput.value = data.interval;
  });

  document.getElementById('intervalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const interval = parseInt(intervalInput.value, 10);
    chrome.storage.sync.set({ interval }, () => {
      status.textContent = 'Saved!';
      setTimeout(() => status.textContent = '', 1000);
      chrome.runtime.sendMessage({ type: 'updateInterval', interval });
    });
  });
});

// background.js
// Polyfill for browser API
if (typeof browser === "undefined") {
  var browser = chrome;
}

const NOTIFICATION_ID = "eyecare-20-20-20";
let currentInterval = 20;
let lastAlarmTime = null;

function createAlarm(interval) {
  browser.alarms.clear("eyecareAlarm", () => {
    browser.alarms.create("eyecareAlarm", { periodInMinutes: interval });
    lastAlarmTime = Date.now();
  });
}

function initAlarmFromStorage() {
  browser.storage.sync.get({ interval: 20 }, (data) => {
    currentInterval = data.interval;
    createAlarm(currentInterval);
  });
}

browser.runtime.onInstalled.addListener(() => {
  initAlarmFromStorage();
});

browser.runtime.onStartup.addListener(() => {
  initAlarmFromStorage();
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "eyecareAlarm") {
    browser.notifications.create(NOTIFICATION_ID, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "OptiBreak Reminder",
      message: "Look away at something 20 feet away for 20 seconds!",
      priority: 2 // Ignored in Firefox, but safe for Chrome
    });
    lastAlarmTime = Date.now();
  }
});

// Listen for interval changes from options
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'updateInterval' && typeof msg.interval === 'number') {
    currentInterval = msg.interval;
    createAlarm(currentInterval);
    sendResponse({ success: true });
  } else if (msg.type === 'getTimeRemaining') {
    browser.alarms.get("eyecareAlarm", (alarm) => {
      let msRemaining = 0;
      if (alarm && alarm.scheduledTime) {
        msRemaining = alarm.scheduledTime - Date.now();
      }
      sendResponse({ msRemaining });
    });
    return true; // async response
  }
});

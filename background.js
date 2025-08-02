// background.js
const extpay = ExtPay('optibreak');
extpay.startBackground();

const NOTIFICATION_ID = "eyecare-20-20-20";
let currentInterval = 20;
let lastAlarmTime = null;

function createAlarm(interval) {
  chrome.alarms.clear("eyecareAlarm", () => {
    chrome.alarms.create("eyecareAlarm", { periodInMinutes: interval });
    lastAlarmTime = Date.now();
  });
}

function initAlarmFromStorage() {
  chrome.storage.sync.get({ interval: 20 }, (data) => {
    currentInterval = data.interval;
    createAlarm(currentInterval);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  extpay.getUser().then(user => {
      if (user.paid) {
          // User has paid, proceed with normal functionality
          initAlarmFromStorage();
      } else {
          extpay.openPaymentPage()
      }
  })
});

chrome.runtime.onStartup.addListener(() => {
  extpay.getUser().then(user => {
      if (user.paid) {
          // User has paid, proceed with normal functionality
          initAlarmFromStorage();
      } else {
          extpay.openPaymentPage()
      }
  })
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "eyecareAlarm") {
    chrome.notifications.create(NOTIFICATION_ID, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "OptiBreak Reminder",
      message: "Look away at something 20 feet away for 20 seconds!",
      priority: 2
    });
    lastAlarmTime = Date.now();
  }
});

// Listen for interval changes from options
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'updateInterval' && typeof msg.interval === 'number') {
    currentInterval = msg.interval;
    createAlarm(currentInterval);
    sendResponse({ success: true });
  } else if (msg.type === 'getTimeRemaining') {
    chrome.alarms.get("eyecareAlarm", (alarm) => {
      let msRemaining = 0;
      if (alarm && alarm.scheduledTime) {
        msRemaining = alarm.scheduledTime - Date.now();
      }
      sendResponse({ msRemaining });
    });
    return true; // async response
  }
});

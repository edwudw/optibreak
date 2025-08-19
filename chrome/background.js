// background.js
const NOTIFICATION_ID = "eyecare-20-20-20";
let currentInterval = 20;

// Google OAuth2 and Calendar API integration
const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
let accessToken = null;
let calendarStatus = {
  isBusy: null, // boolean or null if unknown/error
  isSignedIn: false,
  lastChecked: null // timestamp
};

function createAlarm(interval) {
  chrome.alarms.clear("eyecareAlarm", () => {
    chrome.alarms.create("eyecareAlarm", { periodInMinutes: interval });
  });
}

function init() {
  chrome.storage.sync.get({ interval: 20 }, (data) => {
    currentInterval = data.interval;
    createAlarm(currentInterval);
    checkCalendarStatus(); // Initial check on load
  });
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

function checkCalendarStatus(callback) {
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (chrome.runtime.lastError || !token) {
      accessToken = null;
      calendarStatus = { isBusy: false, isSignedIn: false, lastChecked: Date.now() };
      if (callback) callback(calendarStatus);
      return;
    }

    accessToken = token;
    calendarStatus.isSignedIn = true;

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 1 * 60 * 1000).toISOString(); // 1 minute window

    fetch(`${CALENDAR_API_URL}?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    .then(response => {
      if (response.status === 401) {
        // Token is invalid/expired, remove it from cache.
        chrome.identity.removeCachedAuthToken({ token: accessToken });
        accessToken = null;
        calendarStatus = { isBusy: false, isSignedIn: false, lastChecked: Date.now() };
        return null; // Stop promise chain
      }
      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (data && data.items) {
        const busyEvent = data.items.find(event => event.transparency !== 'transparent' && event.status === 'confirmed');
        calendarStatus.isBusy = !!busyEvent;
      }
    })
    .catch(error => {
      console.error("Error checking calendar status:", error);
      calendarStatus.isBusy = null; // Indicate error state
    })
    .finally(() => {
      calendarStatus.lastChecked = Date.now();
      if (callback) callback(calendarStatus);
    });
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "eyecareAlarm") {
    checkCalendarStatus((status) => {
      // Only show notification if not busy. This also covers the not-signed-in case.
      if (!status.isBusy) {
        chrome.notifications.clear(NOTIFICATION_ID, () => {
          chrome.notifications.create(NOTIFICATION_ID, {
            type: "basic",
            iconUrl: "icon128.png",
            title: "OptiBreak Reminder",
            message: "Look away at something 20 feet away for 20 seconds!",
            priority: 2,
            requireInteraction: true
          });
        });
      }
    });
  }
});

// Listen for interval changes from options
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'updateInterval' && typeof msg.interval === 'number') {
    currentInterval = msg.interval;
    createAlarm(currentInterval);
    sendResponse({ success: true });
  } else if (msg.type === 'getPopupInfo') {
    chrome.alarms.get("eyecareAlarm", (alarm) => {
      let msRemaining = 0;
      if (alarm && alarm.scheduledTime) {
        msRemaining = alarm.scheduledTime - Date.now();
      }
      // If status has never been checked or is older than a minute, re-check.
      if (!calendarStatus.lastChecked || (Date.now() - calendarStatus.lastChecked > 60000)) {
        checkCalendarStatus((status) => {
          sendResponse({ msRemaining, status });
        });
      } else {
        sendResponse({ msRemaining, status: calendarStatus });
      }
    });
    return true; // async response
  } else if (msg.type === 'userSignedIn') {
    // When the user signs in from the options page, immediately refresh the status.
    console.log("User signed in, checking calendar status immediately.");
    checkCalendarStatus(); // No callback needed, just update the state.
  }
  else if (msg.type === 'userSignedOut') {
    accessToken = null;
    calendarStatus = { isBusy: false, isSignedIn: false, lastChecked: Date.now() };
    console.log("User signed out, access token cleared.");
    sendResponse({ success: true });
  }
});

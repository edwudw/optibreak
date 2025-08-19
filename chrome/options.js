document.addEventListener('DOMContentLoaded', () => {
  // --- Interval Form Logic ---
  const intervalForm = document.getElementById('intervalForm');
  const intervalInput = document.getElementById('interval');
  const statusDiv = document.getElementById('status');

  // Saves options to chrome.storage
  function saveOptions(e) {
    e.preventDefault();
    const interval = parseInt(intervalInput.value, 10);
    chrome.storage.sync.set({
      interval: interval // Use 'interval' to match background.js
    }, () => {
      // Update status to let user know options were saved.
      statusDiv.textContent = 'Options saved.';
      // Notify the background script to update the alarm immediately
      chrome.runtime.sendMessage({ type: 'updateInterval', interval: interval });

      setTimeout(() => {
        statusDiv.textContent = '';
      }, 1500);
    });
  }

  // Restores options using the preferences stored in chrome.storage.
  function restoreOptions() {
    // Use a default value of '20' if nothing is stored.
    chrome.storage.sync.get({
      interval: 20 // Use 'interval' to match background.js
    }, (items) => {
      intervalInput.value = items.interval;
    });
  }

  intervalForm.addEventListener('submit', saveOptions);
  restoreOptions(); // Restore on load

  // --- Google Sign-In Logic ---
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  const googleSignOutBtn = document.getElementById('googleSignOutBtn');
  const googleStatusDiv = document.getElementById('googleStatus');

  // Updates the UI based on the user's sign-in state.
  function updateUIBasedOnSignInState() {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError || !token) {
            // Not signed in or token is invalid.
            googleStatusDiv.innerHTML = ''; // Clear status text
            googleSignInBtn.style.display = 'flex';
            googleSignOutBtn.style.display = 'none';
          } else {
            // User is signed in
            googleSignInBtn.style.display = 'none';
            googleSignOutBtn.style.display = 'flex';
          }
      });
  }

  googleSignInBtn.addEventListener('click', () => {
    // The 'interactive: true' flag will prompt the user to sign in.
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        console.error(chrome.runtime.lastError);
        googleStatusDiv.textContent = 'Sign-in failed. See console for details.';
        return;
      }
      updateUIBasedOnSignInState(); // Token acquired, update the UI.
      // Notify background script to immediately update its status
      chrome.runtime.sendMessage({ type: 'userSignedIn' });
    });
  });

  googleSignOutBtn.addEventListener('click', () => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (!token) {
        console.error("Sign-out error: No token found.");
        updateUIBasedOnSignInState();
        return;
      }

      // 1. Revoke the token on Google's servers.
      fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
        .catch(error => console.error("Error during token revocation fetch:", error))
        .finally(() => {
          // 2. Remove the token from the extension's local cache.
          chrome.identity.removeCachedAuthToken({ token: token }, () => {
            console.log("Token removed from cache.");

            // 3. Notify background script to clear its token.
            chrome.runtime.sendMessage({ type: 'userSignedOut' }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error notifying background script:", chrome.runtime.lastError.message);
              }
            });

            // 4. Update the UI to reflect the signed-out state.
            updateUIBasedOnSignInState();
          });
        });
    });
  });

  updateUIBasedOnSignInState(); // Check sign-in status when the options page loads.
});
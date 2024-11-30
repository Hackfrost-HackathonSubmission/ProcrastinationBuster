let timer = null;
let remainingTime = 0;
let isPaused = false;

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    isEnabled: true,
    focusMode: false,
    focusTimer: 25,
    breakTimer: 5,
    currentSession: null,
    blockedSites: [],
    stats: {
      dailyFocusTime: 0,
      distractions: 0,
      lastUpdate: new Date().toISOString(),
      focusSessions: [],
      streak: {
        current: 0,
        best: 0,
        lastDate: new Date().toISOString(),
      },
    },
  });

  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  chrome.action.setBadgeText({ text: "" });
});

async function clearAllBlockingRules() {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (existingRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map((rule) => rule.id),
      });
    }
  } catch (error) {
    console.error("Error clearing blocking rules:", error);
  }
}

function formatTime(seconds) {
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSecs = Math.floor(totalSeconds % 60);
  return `${minutes}:${remainingSecs.toString().padStart(2, "0")}`;
}

function createTimerAlarm(minutes) {
  chrome.alarms.create("timer", {
    when: Date.now() + minutes * 60 * 1000,
  });
}

function clearTimerAlarm() {
  chrome.alarms.clear("timer");
}

async function startTimer(minutes, isBreak = false) {
  remainingTime = Math.round(minutes * 60);
  isPaused = false;

  createTimerAlarm(minutes);

  await chrome.storage.sync.set({
    currentSession: {
      startTime: Date.now(),
      duration: minutes,
      isBreak: isBreak,
      isPaused: false,
      remainingTime: remainingTime,
    },
  });

  if (!isBreak) {
    await chrome.storage.sync.set({ focusMode: true });
  } else {
    await chrome.storage.sync.set({ focusMode: false });
    await clearAllBlockingRules();
  }

  updateBadge();
}

async function pauseTimer() {
  isPaused = true;
  clearTimerAlarm();

  const data = await chrome.storage.sync.get(["currentSession"]);
  if (data.currentSession) {
    const elapsed = Math.floor(
      (Date.now() - data.currentSession.startTime) / 1000
    );
    remainingTime = Math.round(
      Math.max(0, data.currentSession.duration * 60 - elapsed)
    );

    await chrome.storage.sync.set({
      currentSession: {
        ...data.currentSession,
        isPaused: true,
        remainingTime: remainingTime,
      },
    });
  }

  await clearAllBlockingRules();
}

async function resumeTimer() {
  const data = await chrome.storage.sync.get(["currentSession"]);
  if (data.currentSession && data.currentSession.isPaused) {
    isPaused = false;
    const minutes = Math.ceil(remainingTime / 60);

    await chrome.storage.sync.set({
      currentSession: {
        ...data.currentSession,
        startTime: Date.now(),
        duration: minutes,
        isPaused: false,
        remainingTime: remainingTime,
      },
    });

    createTimerAlarm(minutes);

    if (!data.currentSession.isBreak) {
      await updateBlockingRules();
    }
  }
}

function updateBadge() {
  chrome.storage.sync.get(["currentSession"], (data) => {
    if (data.currentSession) {
      const {
        startTime,
        duration,
        isPaused,
        remainingTime: storedRemaining,
      } = data.currentSession;
      let timeToDisplay;

      if (isPaused) {
        timeToDisplay = Math.round(storedRemaining);
      } else {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timeToDisplay = Math.round(Math.max(0, duration * 60 - elapsed));
      }

      const minutes = Math.floor(timeToDisplay / 60);
      const seconds = Math.floor(timeToDisplay % 60);
      const displayText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      chrome.action.setBadgeText({ text: displayText });
    }
  });
}

chrome.alarms.create("updateBadge", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "timer") {
    endTimer();
  } else if (alarm.name === "updateBadge") {
    updateBadge();
  }
});

async function endTimer() {
  clearTimerAlarm();

  try {
    await clearAllBlockingRules();

    const sessionData = await chrome.storage.sync.get(["currentSession"]);
    if (sessionData.currentSession && !sessionData.currentSession.isBreak) {
      const statsData = await chrome.storage.sync.get(["stats"]);
      const stats = statsData.stats || {};
      stats.dailyFocusTime += sessionData.currentSession.duration;
      await chrome.storage.sync.set({ stats });
    }

    await chrome.storage.sync.set({
      currentSession: null,
      focusMode: false,
    });

    await chrome.action.setBadgeText({ text: "" });

    chrome.notifications.create({
      type: "basic",
      iconUrl: "/icons/icon48.png",
      title: "Timer Complete!",
      message: "Great job! Take a break or start another session.",
      silent: true,
    });
  } catch (error) {
    console.error("Error in endTimer:", error);
  }
}

async function updateBlockingRules() {
  try {
    await clearAllBlockingRules();

    const data = await chrome.storage.sync.get([
      "isEnabled",
      "focusMode",
      "blockedSites",
      "currentSession",
    ]);

    const { isEnabled, focusMode, blockedSites, currentSession } = data;

    if (
      isEnabled &&
      focusMode &&
      blockedSites?.length &&
      currentSession &&
      !currentSession.isPaused &&
      !currentSession.isBreak
    ) {
      const rules = blockedSites.map((site, index) => ({
        id: index + 1,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/blocked.html" },
        },
        condition: {
          urlFilter: `*://*${site.replace(/^https?:\/\/(www\.)?/, "")}/*`,
          resourceTypes: ["main_frame"],
        },
      }));

      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules,
      });
    }
  } catch (error) {
    console.error("Error updating blocking rules:", error);
  }
}

chrome.runtime.onSuspend.addListener(() => {
  clearAllBlockingRules();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startTimer":
      startTimer(request.minutes, request.isBreak);
      sendResponse({ success: true });
      break;
    case "pauseTimer":
      pauseTimer();
      sendResponse({ success: true });
      break;
    case "resumeTimer":
      resumeTimer();
      sendResponse({ success: true });
      break;
    case "endTimer":
      endTimer();
      sendResponse({ success: true });
      break;
    case "getTimeRemaining":
      chrome.storage.sync.get(["currentSession"], (data) => {
        if (data.currentSession) {
          const {
            startTime,
            duration,
            isPaused,
            remainingTime: storedRemaining,
          } = data.currentSession;
          let remaining;

          if (isPaused) {
            remaining = Math.round(storedRemaining);
          } else {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            remaining = Math.round(Math.max(0, duration * 60 - elapsed));
          }

          sendResponse({
            remainingTime: remaining,
            isRunning: !isPaused,
            totalDuration: Math.round(duration * 60),
          });
        } else {
          sendResponse({
            remainingTime: 0,
            isRunning: false,
            totalDuration: 0,
          });
        }
      });
      return true;
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (
    namespace === "sync" &&
    (changes.currentSession ||
      changes.focusMode ||
      changes.blockedSites ||
      changes.isEnabled)
  ) {
    updateBlockingRules();
  }
});

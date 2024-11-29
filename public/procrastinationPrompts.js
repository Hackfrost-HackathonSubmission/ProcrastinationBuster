const prompts = [
  "Are you sure you want to visit this site?",
  "Stay focused! Do you really need to go here?",
  "Is this site helping you achieve your goals?",
];

chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    alert(randomPrompt);
    return { cancel: true };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

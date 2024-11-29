chrome.runtime.onInstalled.addListener(() => {
     console.log("Extension installed");
   });
   
   chrome.alarms.onAlarm.addListener((alarm) => {
     console.log("Alarm triggered:", alarm);
   });
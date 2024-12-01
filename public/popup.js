// popup.js
document.addEventListener("DOMContentLoaded", function () {
  const siteList = document.getElementById("siteList");

  // Get blocked sites from storage
  chrome.storage.local.get(["blockedSites"], function (result) {
    const sites = result.blockedSites || [];

    if (sites.length === 0) {
      siteList.innerHTML = '<div class="site-item">No sites blocked yet</div>';
      return;
    }

    siteList.innerHTML = sites
      .map(
        (site) => `
         <div class="site-item">
           <span>${site.url}</span>
           <span>${site.isActive ? "🚫 Active" : "⚪ Inactive"}</span>
         </div>
       `
      )
      .join("");
  });
});

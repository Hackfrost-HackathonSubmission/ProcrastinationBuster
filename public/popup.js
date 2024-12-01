// popup.js
document.addEventListener("DOMContentLoaded", async () => {
  const sitesList = document.getElementById("sitesList");
  const addSiteForm = document.getElementById("addSiteForm");
  const siteInput = document.getElementById("siteInput");

  // Load blocked sites
  const loadBlockedSites = async () => {
    const { blockedSites = [] } = await chrome.storage.local.get(
      "blockedSites"
    );
    sitesList.innerHTML = "";

    blockedSites.forEach((site) => {
      const siteElement = document.createElement("div");
      siteElement.className = "site-item";
      siteElement.innerHTML = `
                 <div class="site-url">
                     <input type="checkbox" 
                         ${site.isActive ? "checked" : ""} 
                         data-url="${site.url}"
                     >
                     <span>${site.url}</span>
                 </div>
                 <button class="remove-btn" data-url="${
                   site.url
                 }">Remove</button>
             `;
      sitesList.appendChild(siteElement);
    });

    // Add event listeners to checkboxes
    sitesList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", async (e) => {
        const url = e.target.dataset.url;
        const { blockedSites } = await chrome.storage.local.get("blockedSites");
        const updatedSites = blockedSites.map((site) =>
          site.url === url ? { ...site, isActive: e.target.checked } : site
        );
        await chrome.storage.local.set({ blockedSites: updatedSites });
      });
    });

    // Add event listeners to remove buttons
    sitesList.querySelectorAll(".remove-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const url = button.dataset.url;
        const { blockedSites } = await chrome.storage.local.get("blockedSites");
        const updatedSites = blockedSites.filter((site) => site.url !== url);
        await chrome.storage.local.set({ blockedSites: updatedSites });
        loadBlockedSites();
      });
    });
  };

  // Handle form submission
  addSiteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = siteInput.value
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "");

    const { blockedSites = [] } = await chrome.storage.local.get(
      "blockedSites"
    );
    if (!blockedSites.some((site) => site.url === url)) {
      blockedSites.push({
        url,
        isActive: true,
        createdAt: new Date(),
      });
      await chrome.storage.local.set({ blockedSites });
      siteInput.value = "";
      loadBlockedSites();
    }
  });

  // Initial load
  loadBlockedSites();
});

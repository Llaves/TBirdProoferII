// suggestions.js
// Reads the corrected HTML payload from storage (written by background.js)
// and populates the preview and raw textarea.

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await browser.storage.local.get("pendingSuggestions");
  const correctedHtml = stored.pendingSuggestions || "";

  // Clean up storage entry now that we have the value
  await browser.storage.local.remove("pendingSuggestions");

  // Render tracked-changes preview
  document.getElementById("preview").innerHTML = correctedHtml;

  // Populate raw textarea
  document.getElementById("rawBox").value = correctedHtml;

  // Copy corrected HTML to clipboard
  document.getElementById("btnCopyHtml").addEventListener("click", () => {
    navigator.clipboard.writeText(correctedHtml).then(() => {
      const msg = document.getElementById("copyMsg");
      msg.style.display = "inline";
      setTimeout(() => { msg.style.display = "none"; }, 2000);
    });
  });

  // Toggle raw HTML textarea visibility
  let rawVisible = false;
  document.getElementById("btnToggleRaw").addEventListener("click", () => {
    rawVisible = !rawVisible;
    const box = document.getElementById("rawBox");
    box.style.display = rawVisible ? "block" : "none";
    document.getElementById("btnToggleRaw").textContent =
      rawVisible ? "Hide raw HTML" : "Show raw HTML";
  });
});

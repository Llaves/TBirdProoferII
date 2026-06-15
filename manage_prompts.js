// manage_prompts.js
document.addEventListener('DOMContentLoaded', async () => {
const DEFAULT_PROMPT1 =
    "Check this email for spelling, punctuation, missing or incorrect words,and capitalization.";

  // --- Migration: convert any plain string prompts to objects ---
  function migratePrompts(prompts) {
    return prompts.map(p =>
      typeof p === "string"
        ? { text: p, mode: "diff" }  // default legacy prompts to diff mode
        : p
    );
  }

  var { savedPrompts = [], selectedPromptIndex = -1 } =
    await browser.storage.local.get(["savedPrompts", "selectedPromptIndex"]);

  if (savedPrompts.length === 0) {
    savedPrompts = [
      { text: DEFAULT_PROMPT1, mode: "diff" },
    ];
    selectedPromptIndex = 0;
    await browser.storage.local.set({ savedPrompts, selectedPromptIndex });
  } else {
    // Migrate if any entries are still plain strings
    const migrated = migratePrompts(savedPrompts);
    const needsSave = migrated.some((p, i) => p !== savedPrompts[i]);
    savedPrompts = migrated;
    if (needsSave) {
      await browser.storage.local.set({ savedPrompts });
    }
  }

  function refreshPromptDisplay() {
    const container = document.getElementById('promptsContainer');
    container.innerHTML = '';

    savedPrompts.forEach((prompt, index) => {
      const isDiff = prompt.mode !== "rewrite";

      const div = document.createElement('div');
      div.id = "prompt-container";
      div.className = index === selectedPromptIndex ? "selected" : "";

      div.innerHTML = `
        ${prompt.text}
        <br><br>
        <label style="display:inline-flex;align-items:center;gap:8px;margin-bottom:10px;cursor:pointer;font-size:0.9em;">
          <span style="color:${isDiff ? '#aaa' : '#333'}">Full rewrite</span>
          <span class="toggle-track" style="
            position:relative;display:inline-block;width:40px;height:22px;
            background:${isDiff ? '#4a90d9' : '#999'};
            border-radius:11px;transition:background 0.2s;flex-shrink:0;">
            <span class="toggle-thumb" style="
              position:absolute;top:3px;left:${isDiff ? '21px' : '3px'};
              width:16px;height:16px;border-radius:50%;
              background:#fff;transition:left 0.2s;"></span>
          </span>
          <span style="color:${isDiff ? '#333' : '#aaa'}">Changes only</span>
        </label>
        <br>
        <button id="selectPrompt${index}" style="margin-right:25px">Select</button>
        <button id="editPrompt${index}"   style="margin-right:25px">Edit</button>
        <button id="deletePrompt${index}">Delete</button>
      `;

      container.appendChild(div);

      // Toggle click handler
      div.querySelector('.toggle-track').addEventListener('click', async () => {
        savedPrompts[index].mode = savedPrompts[index].mode === "diff" ? "rewrite" : "diff";
        await browser.storage.local.set({ savedPrompts });
        refreshPromptDisplay();
      });

      document.getElementById(`selectPrompt${index}`).addEventListener("click", async () => {
        selectedPromptIndex = index;
        await browser.storage.local.set({ selectedPromptIndex: index });
        document.querySelectorAll("#prompt-container").forEach(d => d.className = "");
        document.getElementById(`selectPrompt${index}`).parentElement.className = "selected";
      });

      document.getElementById(`editPrompt${index}`).addEventListener("click", () => {
        const encodedPrompt = encodeURIComponent(prompt.text);
        browser.windows.create({
          url: `add_prompt.html?editIndex=${index}&prompt=${encodedPrompt}`,
          type: "popup",
          width: 700,
          height: 350
        });
      });

      document.getElementById(`deletePrompt${index}`).addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this prompt?")) {
          savedPrompts.splice(index, 1);
          await browser.storage.local.set({
            savedPrompts,
            selectedPromptIndex: savedPrompts.length > 0 ? 0 : -1
          });
          location.reload();
        }
      });
    });
  }

  refreshPromptDisplay();

  document.getElementById("newPromptButton").addEventListener("click", async () => {
    browser.windows.create({
      url: "add_prompt.html",
      type: "popup",
      width: 700,
      height: 350
    });
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'promptAdded' || message.action === 'promptEdited') {
      browser.storage.local.set({ selectedPromptIndex: message.selectedIndex }).then(() => {
        location.reload();
      });
    }
  });

});

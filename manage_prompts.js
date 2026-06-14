// manage_prompts.js
document.addEventListener('DOMContentLoaded', async () => {
  const DEFAULT_PROMPT1 =
    "You are a helpful assistant for proofreading emails. Please suggest changes to improve clarity, grammar, and tone. Provide two set of changes, one for a formal email, one for an informal one";
  const DEFAULT_PROMPT2 = 
    "Check this email for spelling, punctuation, missing or incorrect words,and capitalization.";
  const DEFAULT_PROMPT3 =
    "Check this email for spelling, punctuation, missing or incorrect words,and capitalization. After presenting the corrected text, list each change you have made with an explanation for the change ";

  var { savedPrompts = [], selectedPromptIndex = -1 } =
    await browser.storage.local.get(["savedPrompts", "selectedPromptIndex"]);

  if (savedPrompts.length === 0) {
    savedPrompts.push(DEFAULT_PROMPT1);
    savedPrompts.push(DEFAULT_PROMPT2);
    savedPrompts.push(DEFAULT_PROMPT3);
    selectedPromptIndex = 2;
    await browser.storage.local.set({ savedPrompts, selectedPromptIndex });
  }

  function refreshPromptDisplay() {
    const container = document.getElementById('promptsContainer');
    container.innerHTML = '';
    
    savedPrompts.forEach((prompt, index) => {
      const div = document.createElement('div');
      div.id = "prompt-container";
      div.className = index === selectedPromptIndex ? "selected" : "";
      
      div.innerHTML = `
        ${prompt}
        <br><br>
        <button id="selectPrompt${index}" style="margin-right:25px">Select</button>
        <button id="editPrompt${index}"   style="margin-right:25px">Edit</button>
        <button id="deletePrompt${index}">Delete</button>
      `;
      
      container.appendChild(div);
      
      document.getElementById(`selectPrompt${index}`).addEventListener("click", async () => {
        selectedPromptIndex = index;
        await browser.storage.local.set({ selectedPromptIndex: index });
        document.querySelectorAll("#prompt-container").forEach(d => d.className = "");
        document.getElementById(`selectPrompt${index}`).parentElement.className = "selected";
      });

      document.getElementById(`editPrompt${index}`).addEventListener("click", () => {
        const encodedPrompt = encodeURIComponent(prompt);
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

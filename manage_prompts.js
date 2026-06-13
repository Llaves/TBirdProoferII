// manage_prompts.js
document.addEventListener('DOMContentLoaded', async () => {
  const DEFAULT_PROMPT1 =
    "You are a helpful assistant for proofreading emails. Please suggest changes to improve clarity, grammar, and tone. Provide two set of changes, one for a formal email, one for an informal one";
  const DEFAULT_PROMPT2 = 
    "Check this email for spelling, punctuation, missing or incorrect words,and capitalization.";
  const DEFAULT_PROMPT3 =
  "Check this email for spelling, punctuation, missing or incorrect words,and capitalization. After presenting the corrected text, list each change you have made with an explanation for the change "

  // Get saved prompts
  var { savedPrompts = [], selectedPromptIndex = -1 } =
    await browser.storage.local.get(["savedPrompts", "selectedPromptIndex"]);

  // Ensure default prompt exists
  if (savedPrompts.length === 0) {
    savedPrompts.push(DEFAULT_PROMPT1);
    savedPrompts.push(DEFAULT_PROMPT2);
    savedPrompts.push(DEFAULT_PROMPT3);
    selectedPromptIndex = 2;
    await browser.storage.local.set({
      savedPrompts,
      selectedPromptIndex,
    });
  }

  // Function to refresh the prompts display
  function refreshPromptDisplay() {
    const container = document.getElementById('promptsContainer');
    container.innerHTML = ''; // Clear container
    
    savedPrompts.forEach((prompt, index) => {
      const div = document.createElement('div');
      div.id = "prompt-container";
      div.className = index === selectedPromptIndex ? "selected" : "";
      
      div.innerHTML = `
        ${prompt}
        <br><br>
        <button id="selectPrompt${index}" style="margin-right:25px">Select</button>
        <button id="deletePrompt${index}">Delete</button>
      `;
      
      container.appendChild(div);
      
      // Add listeners for this prompt
      document.getElementById(`selectPrompt${index}`).addEventListener("click", async () => {
        await browser.storage.local.set({ selectedPromptIndex: index });
        // Update visual selection
        document.querySelectorAll("#prompt-container").forEach(div => div.className = "");
        document.getElementById(`selectPrompt${index}`).parentElement.className = "selected";
      });
  
      document.getElementById(`deletePrompt${index}`).addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this prompt?")) {
          savedPrompts.splice(index, 1);
          await browser.storage.local.set({ 
            savedPrompts,
            selectedPromptIndex: savedPrompts.length > 0 ? 0 : -1
          });
          // Refresh the display
          location.reload();
        }
      });
    });
  }

  // Initial display of prompts
  refreshPromptDisplay();

  // Add event listener for the "New Prompt" button
  document.getElementById("newPromptButton").addEventListener("click", async () => {
    // Open the add prompt dialog
    browser.windows.create({
      url: "add_prompt.html",
      type: "popup",
      width: 700,
      height: 350
    });
  });
  
  // Listen for messages from the add prompt dialog
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'promptAdded') {
      // Reload the page to show new prompt
      location.reload();
    }
  });
  
  // Add listener to close window on loss of focus
  window.addEventListener('blur', () => {
    window.close();
  });
});

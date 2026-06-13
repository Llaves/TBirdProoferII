// add_prompt.js
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const newPromptText = document.getElementById('newPromptText');
  const saveButton = document.getElementById('saveButton');
  const cancelButton = document.getElementById('cancelButton');
  
  // Focus on the textarea when the dialog opens
  newPromptText.focus();
  
  // Save button handler
  saveButton.addEventListener('click', async () => {
    const promptText = newPromptText.value.trim();
    
    if (promptText) {
      // Get current saved prompts
      const { savedPrompts = [] } = await browser.storage.local.get('savedPrompts');
      
      // Add new prompt
      savedPrompts.push(promptText);
      
      // Save to storage
      await browser.storage.local.set({ savedPrompts });
      
      // Send message to parent window to refresh
      browser.runtime.sendMessage({ action: 'promptAdded' });
      
      // Close this window
      window.close();
    } else {
      alert('Please enter a prompt before saving.');
    }
  });
  
  // Cancel button handler
  cancelButton.addEventListener('click', () => {
    window.close();
  });
  
  // Close window on blur
  window.addEventListener('blur', () => {
    // Uncomment this if you want the window to auto-close when focus is lost
    // window.close();
  });
});

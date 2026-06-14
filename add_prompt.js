// add_prompt.js
document.addEventListener('DOMContentLoaded', () => {
  const newPromptText = document.getElementById('newPromptText');
  const saveButton = document.getElementById('saveButton');
  const cancelButton = document.getElementById('cancelButton');
  const dialogTitle = document.getElementById('dialogTitle');

  // Check if we're in edit mode by looking for URL params
  const params = new URLSearchParams(window.location.search);
  const editIndex = params.has('editIndex') ? parseInt(params.get('editIndex'), 10) : -1;
  const isEditMode = editIndex >= 0;

  if (isEditMode) {
    dialogTitle.textContent = 'Edit Prompt';
    newPromptText.value = decodeURIComponent(params.get('prompt'));
  }

  // Focus and place cursor at end of text
  newPromptText.focus();
  newPromptText.setSelectionRange(newPromptText.value.length, newPromptText.value.length);

  saveButton.addEventListener('click', async () => {
    const promptText = newPromptText.value.trim();
    
    if (!promptText) {
      alert('Please enter a prompt before saving.');
      return;
    }

    const { savedPrompts = [] } = await browser.storage.local.get('savedPrompts');

    if (isEditMode) {
      // Overwrite the existing prompt in place
      savedPrompts[editIndex] = promptText;
      await browser.storage.local.set({ savedPrompts });
      browser.runtime.sendMessage({ action: 'promptEdited', selectedIndex: editIndex });
    } else {
      // Append as a new prompt and select it
      savedPrompts.push(promptText);
      const selectedIndex = savedPrompts.length - 1;
      await browser.storage.local.set({ savedPrompts });
      browser.runtime.sendMessage({ action: 'promptAdded', selectedIndex });
    }

    window.close();
  });

  cancelButton.addEventListener('click', () => {
    window.close();
  });
});

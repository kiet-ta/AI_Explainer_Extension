document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('provider').addEventListener('change', toggleConfig);
});

function toggleConfig() {
  const provider = document.getElementById('provider').value;
  document.getElementById('gemini-config').style.display = provider === 'gemini' ? 'block' : 'none';
  document.getElementById('openai-config').style.display = provider === 'openai' ? 'block' : 'none';
}

function saveOptions() {
  const provider = document.getElementById('provider').value;
  const geminiKey = document.getElementById('geminiKey').value.trim();
  const openaiKey = document.getElementById('openaiKey').value.trim();
  const openaiModel = document.getElementById('openaiModel').value.trim() || 'gpt-3.5-turbo';

  const validationError = validateInputs({ provider, geminiKey, openaiKey });
  if (validationError) {
    showStatus(validationError, true);
    return;
  }

  chrome.storage.sync.set({ provider, geminiKey, openaiKey, openaiModel }, () => {
    showStatus('Đã lưu cài đặt!');
  });
}

function validateInputs({ provider, geminiKey, openaiKey }) {
  if (provider === 'gemini' && !geminiKey) {
    return 'Vui lòng nhập Gemini API Key.';
  }
  if (provider === 'openai' && !openaiKey) {
    return 'Vui lòng nhập OpenAI API Key.';
  }
  return null;
}

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = isError ? '#c62828' : 'green';
  setTimeout(() => { status.textContent = ''; }, 2500);
}

function restoreOptions() {
  chrome.storage.sync.get({
    provider: 'gemini',
    geminiKey: '',
    openaiKey: '',
    openaiModel: 'gpt-3.5-turbo'
  }, (items) => {
    document.getElementById('provider').value = items.provider;
    document.getElementById('geminiKey').value = items.geminiKey;
    document.getElementById('openaiKey').value = items.openaiKey;
    document.getElementById('openaiModel').value = items.openaiModel;
    toggleConfig();
  });
}

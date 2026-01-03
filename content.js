let selectedText = '';
let iconButton = null;
let modalContainer = null;
let shadowRoot = null;
let isLoading = false;

document.addEventListener('mouseup', handleSelection);
document.addEventListener('mousedown', (e) => {
  if (iconButton && !iconButton.contains(e.target)) {
    iconButton.style.display = 'none';
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modalContainer) {
    closeModal();
  }
});

function handleSelection(event) {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text.length > 0) {
    selectedText = text;
    showIcon(event.pageX, event.pageY);
  }
}

function showIcon(x, y) {
  if (!iconButton) {
    createIcon();
  }
  iconButton.style.left = `${x + 5}px`;
  iconButton.style.top = `${y + 5}px`;
  iconButton.style.display = 'block';
}

function createIcon() {
  iconButton = document.createElement('div');
  iconButton.innerText = '🔍 Explain';
  Object.assign(iconButton.style, {
    position: 'absolute',
    zIndex: '2147483647',
    background: '#0078d4',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.2)'
  });

  iconButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModal(selectedText);
    iconButton.style.display = 'none';
  });

  document.body.appendChild(iconButton);
}

function createModal() {
  modalContainer = document.createElement('div');
  modalContainer.style.all = 'initial';
  shadowRoot = modalContainer.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.35); z-index: 2147483647; display: flex; justify-content: center; align-items: center; }
    .modal-box { background: #ffffff; width: clamp(320px, 45vw, 450px); max-height: 80vh; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35); overflow: hidden; border: 1px solid rgba(226, 232, 240, 0.8); }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; color: white; }
    .header h3 { margin: 0; font-size: 16px; font-weight: 600; }
    .close-btn { background: rgba(255,255,255,0.2); border: none; border-radius: 999px; font-size: 16px; cursor: pointer; color: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease; }
    .close-btn:hover { background: rgba(255,255,255,0.35); }
    .content-area { padding: 16px; overflow-y: auto; flex-grow: 1; font-size: 14px; line-height: 1.6; color: #1f2937; background: #f8fafc; }
    .chat-area { border-top: 1px solid #e2e8f0; padding: 12px; display: flex; gap: 10px; background: #ffffff; }
    input { flex-grow: 1; padding: 10px 12px; border: 1px solid #cbd5f5; border-radius: 12px; outline: none; font-size: 14px; background: #f8fafc; transition: border 0.2s ease; }
    input:focus { border-color: #2563eb; background: #ffffff; }
    button { padding: 10px 18px; background: #2563eb; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; box-shadow: 0 8px 16px rgba(37, 99, 235, 0.25); transition: transform 0.1s ease; }
    button:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }
    .msg-user { text-align: right; color: #1d4ed8; margin: 8px 0; font-weight: 600; }
    .msg-ai { text-align: left; color: #0f172a; margin: 8px 0; padding: 10px 12px; background: white; border-radius: 12px; box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; }
    .message-block { margin-bottom: 12px; }
    .loading { color: #475569; font-style: italic; display: inline-flex; align-items: center; gap: 6px; }
    .loading::before { content: ''; width: 12px; height: 12px; border: 2px solid rgba(148, 163, 184, 0.4); border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .helper-text { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  shadowRoot.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'modal-overlay';
  wrapper.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="AI Explanation">
      <div class="header">
        <h3>AI Explanation</h3>
        <button class="close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="content-area" id="content"></div>
      <div class="chat-area">
        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
          <input type="text" id="chatInput" placeholder="Hỏi thêm..." aria-label="Nhập câu hỏi" />
          <span class="helper-text">Nhấn Enter để gửi</span>
        </div>
        <button id="sendBtn" aria-label="Send">Gửi</button>
      </div>
    </div>
  `;

  shadowRoot.appendChild(wrapper);
  document.body.appendChild(modalContainer);

  shadowRoot.querySelector('.close-btn').addEventListener('click', closeModal);
  shadowRoot.querySelector('#sendBtn').addEventListener('click', sendChat);
  shadowRoot.querySelector('#chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendChat();
    }
  });
}

function closeModal() {
  if (modalContainer) {
    modalContainer.remove();
    modalContainer = null;
    shadowRoot = null;
    isLoading = false;
  }
}

async function openModal(text) {
  if (!text) {
    alert('Vui lòng chọn đoạn văn bản để giải thích.');
    return;
  }

  if (modalContainer) closeModal();
  createModal();

  const contentDiv = shadowRoot.getElementById('content');
  contentDiv.innerHTML = `
    <div class="message-block">
      <div class="msg-user">${escapeHtml(text)}</div>
      <div class="loading">Đang giải thích...</div>
    </div>
  `;

  isLoading = true;
  toggleControls(true);

  chrome.runtime.sendMessage({ action: 'explain', text }, (response) => {
    handleResponse(response, contentDiv);
  });
}

function sendChat() {
  if (isLoading) return;

  const input = shadowRoot.getElementById('chatInput');
  const query = input.value.trim();
  if (!query) return;

  const contentDiv = shadowRoot.getElementById('content');
  contentDiv.innerHTML += `
    <div class="message-block">
      <div class="msg-user">${escapeHtml(query)}</div>
      <div class="loading">Đang trả lời...</div>
    </div>
  `;

  contentDiv.scrollTop = contentDiv.scrollHeight;
  input.value = '';

  isLoading = true;
  toggleControls(true);

  chrome.runtime.sendMessage({ action: 'chat', context: selectedText, query }, (response) => {
    handleResponse(response, contentDiv);
  });
}

function handleResponse(response, contentDiv) {
  const loading = shadowRoot.querySelector('.loading');
  if (loading) loading.remove();

  let messageHtml;
  if (response?.error) {
    messageHtml = `<div class="msg-ai" style="color:#dc2626;">Error: ${escapeHtml(response.error)}</div>`;
  } else {
    messageHtml = `<div class="msg-ai">${formatText(response.result)}</div>`;
  }

  const block = document.createElement('div');
  block.className = 'message-block';
  block.innerHTML = messageHtml;
  contentDiv.appendChild(block);
  contentDiv.scrollTop = contentDiv.scrollHeight;

  isLoading = false;
  toggleControls(false);
}

function toggleControls(disabled) {
  const button = shadowRoot?.getElementById('sendBtn');
  const input = shadowRoot?.getElementById('chatInput');
  if (button) button.disabled = disabled;
  if (input) input.disabled = disabled;
}

function formatText(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

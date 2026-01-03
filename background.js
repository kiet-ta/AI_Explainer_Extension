const DEFAULT_SETTINGS = {
  provider: 'gemini',
  geminiKey: '',
  openaiKey: '',
  openaiModel: 'gpt-3.5-turbo'
};

const SUPPORTED_ACTIONS = ['explain', 'chat'];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!SUPPORTED_ACTIONS.includes(request?.action)) {
    sendResponse?.({ error: 'Hành động không được hỗ trợ.' });
    return false;
  }

  handleAIRequest(request).then(sendResponse);
  return true; // Keep message channel open for async work
});

async function handleAIRequest(request) {
  const normalized = normalizeRequest(request);
  if (normalized.error) return { error: normalized.error };

  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  if (settings.provider === 'gemini') {
    if (!settings.geminiKey) return { error: 'Chưa cấu hình Gemini API Key.' };
    return callGemini(settings.geminiKey, normalized);
  }

  if (!settings.openaiKey) return { error: 'Chưa cấu hình OpenAI API Key.' };
  return callOpenAI(settings.openaiKey, settings.openaiModel, normalized);
}

function normalizeRequest(request) {
  const action = request?.action;
  const text = (request?.text || '').trim();
  const context = (request?.context || '').trim();
  const query = (request?.query || '').trim();

  if (action === 'explain' && !text) {
    return { error: 'Vui lòng chọn một đoạn văn bản để giải thích.' };
  }

  if (action === 'chat') {
    if (!context) return { error: 'Thiếu ngữ cảnh cuộc trò chuyện.' };
    if (!query) return { error: 'Vui lòng nhập câu hỏi để tiếp tục chat.' };
  }

  return { action, text, context, query };
}

async function callGemini(apiKey, request) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const promptText = buildGeminiPrompt(request);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9
        }
      })
    });

    if (!response.ok) {
      return { error: `Gemini HTTP ${response.status}: ${response.statusText}` };
    }

    const result = await response.json();
    if (result.error) return { error: result.error.message };

    const answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
    if (!answer) return { error: 'Không nhận được câu trả lời từ Gemini.' };
    return { result: answer };
  } catch (e) {
    return { error: e.toString() };
  }
}

function buildGeminiPrompt(request) {
  if (request.action === 'explain') {
    return `Giải thích ngắn gọn ý nghĩa của từ/đoạn văn sau bằng Tiếng Việt (nêu loại từ và ví dụ nếu có thể): "${request.text}"`;
  }

  return `Context: "${request.context}".\nUser Question: "${request.query}"\nAnswer in Vietnamese và giữ giọng giải thích dễ hiểu.`;
}

async function callOpenAI(apiKey, model, request) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const messages = buildOpenAIMessages(request);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      return { error: `OpenAI HTTP ${response.status}: ${response.statusText}` };
    }

    const result = await response.json();
    if (result.error) return { error: result.error.message };

    const answer = result.choices?.[0]?.message?.content?.trim();
    if (!answer) return { error: 'Không nhận được câu trả lời từ OpenAI.' };
    return { result: answer };
  } catch (e) {
    return { error: e.toString() };
  }
}

function buildOpenAIMessages(request) {
  if (request.action === 'explain') {
    return [
      { role: 'system', content: 'Bạn là một từ điển kiêm trợ lý giải thích từ vựng tiếng Việt.' },
      { role: 'user', content: `Giải thích ngắn gọn ý nghĩa của: "${request.text}" bằng Tiếng Việt.` }
    ];
  }

  return [
    { role: 'system', content: 'Bạn là trợ lý giải thích thân thiện, trả lời ngắn gọn bằng Tiếng Việt.' },
    { role: 'user', content: `Context: "${request.context}".\nQuestion: "${request.query}"` }
  ];
}

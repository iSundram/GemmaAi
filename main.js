// main.js - Transpiled from main.ts

const chatHistory = document.getElementById('chatHistory');
const input = document.getElementById('prompt');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');

const STORAGE_KEY = 'gemma_chat_history';
const WORKER_URL = "https://gemmaai.sundram5955a.workers.dev";

let messages = [];

// Initialize
function init() {
  loadMessages();
  renderHistory();
  
  // Event Listeners
  sendBtn.addEventListener('click', handleSend);
  clearBtn.addEventListener('click', clearHistory);
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  });
}

function loadMessages() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      messages = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse history', e);
      messages = [];
    }
  }
}

function saveMessages() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function renderHistory() {
  // Clear chat except for welcome message if empty
  if (messages.length === 0) {
    chatHistory.innerHTML = `
      <div class="welcome-message">
          <h2>How can I help you today?</h2>
          <p>Start a conversation with Gemma, your personal AI assistant.</p>
      </div>
    `;
    return;
  }

  chatHistory.innerHTML = '';
  messages.forEach(msg => appendMessageToUI(msg));
  scrollToBottom();
}

function appendMessageToUI(msg) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${msg.role}`;
  
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = msg.role === 'user' ? 'You' : 'Gemma';
  
  const content = document.createElement('div');
  content.className = 'message-content';
  
  if (msg.role === 'assistant') {
    // Use marked for AI responses
    content.innerHTML = marked.parse(msg.content);
  } else {
    // Plain text for user messages to prevent XSS
    content.textContent = msg.content;
  }
  
  msgDiv.appendChild(label);
  msgDiv.appendChild(content);
  chatHistory.appendChild(msgDiv);
}

function scrollToBottom() {
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleSend() {
  const text = input.value.trim();
  if (!text || sendBtn.disabled) return;

  // Add user message
  const userMsg = { role: 'user', content: text };
  messages.push(userMsg);
  
  // Clear input
  input.value = '';
  input.style.height = 'auto';
  
  // Update UI
  if (messages.length === 1) chatHistory.innerHTML = '';
  appendMessageToUI(userMsg);
  saveMessages();
  scrollToBottom();

  // Show loading
  const loadingDiv = showLoading();
  sendBtn.disabled = true;

  try {
    // Construct prompt with history
    const prompt = constructPrompt();
    
    const response = await fetch(WORKER_URL, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error("Worker Error");

    const data = await response.json();
    const aiText = data.result?.response ?? data.result?.choices?.[0]?.text;

    if (!aiText) throw new Error("Unexpected API response format");

    loadingDiv.remove();
    
    const assistantMsg = { role: 'assistant', content: aiText.trim() };
    messages.push(assistantMsg);
    appendMessageToUI(assistantMsg);
    saveMessages();
    scrollToBottom();
  } catch (error) {
    if (loadingDiv.parentNode) loadingDiv.remove();
    const errorMsg = { 
      role: 'assistant', 
      content: `**Error:** ${error instanceof Error ? error.message : 'Could not connect to Gemma.'}` 
    };
    appendMessageToUI(errorMsg);
  } finally {
    sendBtn.disabled = false;
  }
}

function constructPrompt() {
  let prompt = "You are Gemma, a helpful AI assistant. Answer clearly and use markdown for formatting.\n\n";
  
  const recentMessages = messages.slice(-10);
  
  recentMessages.forEach(msg => {
    const roleName = msg.role === 'user' ? 'User' : 'Assistant';
    prompt += `${roleName}: ${msg.content}\n`;
  });
  
  prompt += "Assistant:";
  return prompt;
}

function showLoading() {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message assistant loading-bubble';
  loadingDiv.innerHTML = `
    <div class="message-label">Gemma</div>
    <div class="loading-indicator">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
  chatHistory.appendChild(loadingDiv);
  scrollToBottom();
  return loadingDiv;
}

function clearHistory() {
  if (confirm('Clear all messages?')) {
    messages = [];
    saveMessages();
    renderHistory();
  }
}

// Run init
init();

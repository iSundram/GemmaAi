// Define external libraries
declare const marked: any;
declare const lucide: any;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface AIResponse {
  result?: {
    response?: string;
    choices?: Array<{
      text?: string;
    }>;
  };
}

// State
let sessions: Session[] = [];
let currentSessionId: string | null = null;

// DOM Elements
const chatHistory = document.getElementById('chatHistory') as HTMLElement;
const chatList = document.getElementById('chatList') as HTMLElement;
const input = document.getElementById('prompt') as HTMLTextAreaElement;
const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
const newChatBtn = document.getElementById('newChatBtn') as HTMLButtonElement;
const clearAllBtn = document.getElementById('clearAllBtn') as HTMLButtonElement;
const sidebar = document.getElementById('sidebar') as HTMLElement;
const sidebarToggle = document.getElementById('sidebarToggle') as HTMLButtonElement;
const sidebarOverlay = document.getElementById('sidebarOverlay') as HTMLElement;
const currentSessionTitle = document.getElementById('currentSessionTitle') as HTMLElement;
const scrollFab = document.getElementById('scrollFab') as HTMLButtonElement;

const SESSIONS_KEY = 'gemma_sessions';
const WORKER_URL = "https://gemmaai.sundram5955a.workers.dev";

// Initialize
function init() {
  loadSessions();
  
  if (sessions.length === 0) {
    createNewSession();
  } else {
    // Load last session
    currentSessionId = sessions[0].id;
    renderSidebar();
    renderChat();
  }

  // Event Listeners
  sendBtn.addEventListener('click', handleSend);
  newChatBtn.addEventListener('click', () => {
    createNewSession();
    if (window.innerWidth <= 768) closeSidebar();
  });
  
  clearAllBtn.addEventListener('click', () => {
    if (confirm('Delete all chat history?')) {
      sessions = [];
      saveSessions();
      createNewSession();
    }
  });

  sidebarToggle.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    sendBtn.disabled = input.value.trim() === '';
  });

  chatHistory.addEventListener('scroll', handleScroll);
  scrollFab.addEventListener('click', scrollToBottom);

  // Global click listener for copy buttons
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest('.copy-btn');
    if (copyBtn) {
      const code = copyBtn.getAttribute('data-code');
      if (code) {
        navigator.clipboard.writeText(decodeURIComponent(code)).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i data-lucide="check"></i><span>Copied!</span>';
          lucide.createIcons();
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            lucide.createIcons();
          }, 2000);
        });
      }
    }
  });
}

function loadSessions() {
  const saved = localStorage.getItem(SESSIONS_KEY);
  if (saved) {
    try {
      sessions = JSON.parse(saved);
      // Sort by updatedAt descending
      sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (e) {
      console.error('Failed to parse sessions', e);
      sessions = [];
    }
  }
}

function saveSessions() {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function createNewSession() {
  const newSession: Session = {
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [],
    updatedAt: Date.now()
  };
  sessions.unshift(newSession);
  currentSessionId = newSession.id;
  saveSessions();
  renderSidebar();
  renderChat();
}

function renderSidebar() {
  chatList.innerHTML = '';
  sessions.forEach(session => {
    const li = document.createElement('li');
    li.className = `chat-item ${session.id === currentSessionId ? 'active' : ''}`;
    li.innerHTML = `
      <i data-lucide="message-square"></i>
      <span>${session.title}</span>
    `;
    li.onclick = () => {
      currentSessionId = session.id;
      renderSidebar();
      renderChat();
      if (window.innerWidth <= 768) closeSidebar();
    };
    chatList.appendChild(li);
  });
  lucide.createIcons();
}

function renderChat() {
  const session = sessions.find(s => s.id === currentSessionId);
  if (!session) return;

  currentSessionTitle.textContent = session.title;
  
  if (session.messages.length === 0) {
    chatHistory.innerHTML = `
      <div class="welcome-screen">
          <div class="bot-avatar-large"><i data-lucide="bot"></i></div>
          <h2>How can I help you today?</h2>
          <p>Start a conversation with Gemma, your personal AI assistant.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  chatHistory.innerHTML = '';
  const container = document.createElement('div');
  chatHistory.appendChild(container);
  
  session.messages.forEach(msg => appendMessageToDOM(msg, container));
  scrollToBottom();
}

function appendMessageToDOM(msg: Message, container: HTMLElement) {
  const row = document.createElement('div');
  row.className = `message-row ${msg.role === 'user' ? 'user-message-row' : 'ai-message-row'}`;
  
  const avatar = document.createElement('div');
  avatar.className = `avatar ${msg.role === 'user' ? 'user' : 'ai'}`;
  avatar.innerHTML = msg.role === 'user' ? 'U' : '<i data-lucide="bot"></i>';
  
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'message-content-wrapper';
  
  const sender = document.createElement('div');
  sender.className = 'message-sender';
  sender.textContent = msg.role === 'user' ? 'You' : 'Gemma';
  
  const text = document.createElement('div');
  text.className = 'message-text';
  
  if (msg.role === 'assistant') {
    // Parse Markdown
    let html = marked.parse(msg.content);
    
    // Add Copy Buttons to code blocks
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    temp.querySelectorAll('pre').forEach(pre => {
      const code = pre.querySelector('code');
      const lang = code?.className.replace('language-', '') || 'code';
      const codeContent = code?.textContent || '';
      
      const wrapper = document.createElement('div');
      wrapper.className = 'code-container';
      
      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `
        <span>${lang}</span>
        <button class="copy-btn" data-code="${encodeURIComponent(codeContent)}">
          <i data-lucide="copy"></i>
          <span>Copy</span>
        </button>
      `;
      
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
    
    text.innerHTML = temp.innerHTML;
  } else {
    text.textContent = msg.content;
  }
  
  contentWrapper.appendChild(sender);
  contentWrapper.appendChild(text);
  row.appendChild(avatar);
  row.appendChild(contentWrapper);
  container.appendChild(row);
  
  lucide.createIcons();
}

async function handleSend() {
  const text = input.value.trim();
  if (!text || sendBtn.disabled) return;

  const session = sessions.find(s => s.id === currentSessionId);
  if (!session) return;

  // Update session title if first message
  if (session.messages.length === 0) {
    session.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
    renderSidebar();
  }

  const userMsg: Message = { role: 'user', content: text };
  session.messages.push(userMsg);
  session.updatedAt = Date.now();
  
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;

  if (session.messages.length === 1) chatHistory.innerHTML = '<div></div>';
  const container = chatHistory.querySelector('div') as HTMLElement;
  appendMessageToDOM(userMsg, container);
  saveSessions();
  scrollToBottom();

  const loadingDiv = showLoading(container);
  
  try {
    const prompt = constructPrompt(session.messages);
    const response = await fetch(WORKER_URL, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error("Worker Error");

    const data: AIResponse = await response.json();
    const aiText = data.result?.response ?? data.result?.choices?.[0]?.text;

    if (!aiText) throw new Error("Unexpected API response format");

    loadingDiv.remove();
    
    const assistantMsg: Message = { role: 'assistant', content: aiText.trim() };
    session.messages.push(assistantMsg);
    session.updatedAt = Date.now();
    appendMessageToDOM(assistantMsg, container);
    saveSessions();
    scrollToBottom();
  } catch (error) {
    loadingDiv.remove();
    const errorMsg: Message = { 
      role: 'assistant', 
      content: `**Error:** ${error instanceof Error ? error.message : 'Could not connect to Gemma.'}` 
    };
    appendMessageToDOM(errorMsg, container);
  } finally {
    sendBtn.disabled = false;
  }
}

function constructPrompt(messages: Message[]): string {
  let prompt = "You are Gemma, a helpful AI assistant. Answer clearly and use markdown for formatting.\n\n";
  const recent = messages.slice(-10);
  recent.forEach(msg => {
    prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
  });
  prompt += "Assistant:";
  return prompt;
}

function showLoading(container: HTMLElement) {
  const row = document.createElement('div');
  row.className = 'message-row ai-message-row loading-row';
  row.innerHTML = `
    <div class="avatar ai"><i data-lucide="bot"></i></div>
    <div class="message-content-wrapper">
      <div class="message-sender">Gemma</div>
      <div class="loading-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
  `;
  container.appendChild(row);
  lucide.createIcons();
  scrollToBottom();
  return row;
}

// UI Helpers
function toggleSidebar() {
  sidebar.classList.toggle('active');
  sidebarOverlay.classList.toggle('active');
}

function closeSidebar() {
  sidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
}

function scrollToBottom() {
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function handleScroll() {
  const isAtBottom = chatHistory.scrollHeight - chatHistory.scrollTop <= chatHistory.clientHeight + 100;
  if (isAtBottom) {
    scrollFab.classList.add('hidden');
  } else {
    scrollFab.classList.remove('hidden');
  }
}

// Run init
init();
lucide.createIcons();

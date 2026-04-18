// main.js - Comprehensive UI Logic

// State
let sessions = [];
let currentSessionId = null;
let isTyping = false;

// DOM Elements
const chatHistory = document.getElementById('chatHistory');
const chatList = document.getElementById('chatList');
const input = document.getElementById('prompt');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const currentSessionTitle = document.getElementById('currentSessionTitle');
const scrollFab = document.getElementById('scrollFab');

const SESSIONS_KEY = 'gemma_sessions';
const WORKER_URL = "https://gemmaai.sundram5955a.workers.dev";

// Initialize
function init() {
  // Configure Marked to use Highlight.js
  if (window.marked && window.hljs) {
    marked.setOptions({
      highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      },
      langPrefix: 'hljs language-',
      breaks: true,
      gfm: true
    });
  }

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
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    sendBtn.disabled = input.value.trim() === '';
  });

  chatHistory.addEventListener('scroll', handleScroll);
  scrollFab.addEventListener('click', () => scrollToBottom(true));

  // Global click listener for copy buttons
  document.addEventListener('click', (e) => {
    const target = e.target;
    const copyBtn = target.closest('.copy-btn');
    if (copyBtn) {
      const code = copyBtn.getAttribute('data-code');
      if (code) {
        navigator.clipboard.writeText(decodeURIComponent(code)).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i data-lucide="check"></i><span>Copied!</span>';
          copyBtn.style.color = '#10b981'; // Green color for success
          if (window.lucide) lucide.createIcons();
          
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.color = '';
            if (window.lucide) lucide.createIcons();
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
  const newSession = {
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
  input.focus();
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
  if (window.lucide) lucide.createIcons();
}

function renderChat() {
  const session = sessions.find(s => s.id === currentSessionId);
  if (!session) return;

  currentSessionTitle.textContent = session.title;
  
  if (session.messages.length === 0) {
    chatHistory.innerHTML = `
      <div class="welcome-screen">
          <div class="bot-avatar-large shadow-pulse"><i data-lucide="sparkles"></i></div>
          <h2>How can I help you today?</h2>
          <p>Experience smoother responses, better code rendering, and modern UI.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  chatHistory.innerHTML = '';
  const container = document.createElement('div');
  chatHistory.appendChild(container);
  
  session.messages.forEach(msg => appendMessageToDOM(msg, container, false));
  scrollToBottom(false);
}

function appendMessageToDOM(msg, container, animate = true) {
  const row = document.createElement('div');
  row.className = `message-row ${msg.role === 'user' ? 'user-message-row' : 'ai-message-row'}`;
  if (!animate) {
    row.style.animation = 'none';
    row.style.opacity = '1';
    row.style.transform = 'translateY(0)';
  }
  
  const avatar = document.createElement('div');
  avatar.className = `avatar ${msg.role === 'user' ? 'user' : 'ai'}`;
  avatar.innerHTML = msg.role === 'user' ? 'U' : '<i data-lucide="sparkles"></i>';
  
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'message-content-wrapper';
  
  const sender = document.createElement('div');
  sender.className = 'message-sender';
  sender.textContent = msg.role === 'user' ? 'You' : 'Gemma';
  
  const text = document.createElement('div');
  text.className = 'message-text';
  
  if (msg.role === 'assistant') {
    // Parse Markdown
    let html = msg.content;
    if (window.marked) {
      try {
        html = marked.parse(msg.content);
      } catch (e) {
        console.error("Marked parsing error", e);
      }
    }
    
    // Add Copy Buttons to code blocks
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    temp.querySelectorAll('pre').forEach(pre => {
      const code = pre.querySelector('code');
      let lang = 'text';
      
      if (code) {
        const classes = code.className.split(' ');
        const langClass = classes.find(c => c.startsWith('language-'));
        if (langClass) {
          lang = langClass.replace('language-', '');
        }
      }
      
      // We need the raw text for copying, not the highlighted HTML
      const rawCodeText = code ? code.innerText || code.textContent : pre.textContent;
      
      const wrapper = document.createElement('div');
      wrapper.className = 'code-container';
      
      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `
        <div class="code-header-left">
          <div class="mac-dots">
            <span class="mac-dot-red"></span>
            <span class="mac-dot-yellow"></span>
            <span class="mac-dot-green"></span>
          </div>
          <span>${lang}</span>
        </div>
        <button class="copy-btn" data-code="${encodeURIComponent(rawCodeText)}">
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
  
  if (window.lucide) lucide.createIcons();
}

async function handleSend() {
  if (isTyping) return;
  const text = input.value.trim();
  if (!text || sendBtn.disabled) return;

  const session = sessions.find(s => s.id === currentSessionId);
  if (!session) return;

  isTyping = true;
  
  // Update session title if first message
  if (session.messages.length === 0) {
    session.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
    renderSidebar();
  }

  const userMsg = { role: 'user', content: text };
  session.messages.push(userMsg);
  session.updatedAt = Date.now();
  
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;

  if (session.messages.length === 1) chatHistory.innerHTML = '<div></div>';
  const container = chatHistory.querySelector('div');
  appendMessageToDOM(userMsg, container, true);
  saveSessions();
  scrollToBottom(true);

  const loadingDiv = showLoading(container);
  
  try {
    const prompt = constructPrompt(session.messages);
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
    session.messages.push(assistantMsg);
    session.updatedAt = Date.now();
    appendMessageToDOM(assistantMsg, container, true);
    saveSessions();
    scrollToBottom(true);
  } catch (error) {
    if (loadingDiv) loadingDiv.remove();
    const errorMsg = { 
      role: 'assistant', 
      content: `**Error:** ${error instanceof Error ? error.message : 'Could not connect to Gemma.'}` 
    };
    appendMessageToDOM(errorMsg, container, true);
  } finally {
    isTyping = false;
    sendBtn.disabled = input.value.trim() === '';
    input.focus();
  }
}

function constructPrompt(messages) {
  let prompt = "You are Gemma, a helpful AI assistant. Answer clearly and use markdown for formatting.\n\n";
  const recent = messages.slice(-10);
  recent.forEach(msg => {
    prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
  });
  prompt += "Assistant:";
  return prompt;
}

function showLoading(container) {
  const row = document.createElement('div');
  row.className = 'message-row ai-message-row loading-row';
  row.innerHTML = `
    <div class="avatar ai"><i data-lucide="sparkles"></i></div>
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
  if (window.lucide) lucide.createIcons();
  scrollToBottom(true);
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

function scrollToBottom(smooth = false) {
  chatHistory.scrollTo({
    top: chatHistory.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
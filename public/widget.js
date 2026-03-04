// (function () {
//   // Get the script tag and chatbot ID
//   const script = document.currentScript || document.querySelector('script[data-chatbot-id]');
//   const chatbotId = script?.getAttribute('data-chatbot-id');

//   if (!chatbotId) {
//     console.error('Chatbot Widget: No chatbot ID provided');
//     return;
//   }

//   // Get origin from script src or use default
//   const scriptSrc = script?.src || '';
//   const origin = scriptSrc ? new URL(scriptSrc).origin : 'http://localhost:3000';

//   // State Management Keys
//   const KEY_CONVO = `cb_convo_${chatbotId}`;
//   const KEY_MSGS = `cb_msgs_${chatbotId}`;
//   const KEY_OPEN = `cb_open_${chatbotId}`;

//   // State
//   let config = null;
//   let visitorId = localStorage.getItem('chatbot_visitor_id');

//   // Load persisted state
//   let conversationId = sessionStorage.getItem(KEY_CONVO) || null;
//   let messages = JSON.parse(sessionStorage.getItem(KEY_MSGS)) || [];
//   let isOpen = sessionStorage.getItem(KEY_OPEN) === 'true';
//   let isLoading = false;

//   if (!visitorId) {
//     visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9);
//     localStorage.setItem('chatbot_visitor_id', visitorId);
//   }

//   // Save State Helper
//   function saveState() {
//     if (conversationId) sessionStorage.setItem(KEY_CONVO, conversationId);
//     sessionStorage.setItem(KEY_MSGS, JSON.stringify(messages));
//     sessionStorage.setItem(KEY_OPEN, isOpen);
//   }

//   // Track analytics event
//   async function trackEvent(eventType, metadata = {}) {
//     try {
//       await fetch(`${origin}/api/analytics/events`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           chatbotId: config?.id,
//           conversationId,
//           visitorId,
//           eventType,
//           pageUrl: window.location.href,
//           pageTitle: document.title,
//           metadata
//         })
//       });
//     } catch (e) {
//       // Silent fail for analytics
//     }
//   }

//   // Fetch chatbot config from Backend Proxy (Secure)
//   async function fetchConfig() {
//     try {
//       const response = await fetch(`${origin}/api/widget/config?embed_code=${chatbotId}`);
//       const data = await response.json();

//       if (data && !data.error) {
//         config = data;
//         initWidget();
//       } else {
//         console.error('Chatbot Widget: Chatbot not found or config error');
//       }
//     } catch (error) {
//       console.error('Chatbot Widget: Failed to fetch config', error);
//     }
//   }

//   // Create conversation
//   async function createConversation() {
//     try {
//       const response = await fetch(`${origin}/api/conversations/create`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           chatbotId: config.id,
//           visitorId,
//           pageUrl: window.location.href
//         })
//       });
//       const data = await response.json();
//       if (data.success) {
//         conversationId = data.conversation.id;
//         saveState();
//       }
//     } catch (error) {
//       console.error('Chatbot Widget: Failed to create conversation', error);
//     }
//   }

//   // Get styles based on config
//   function getStyles() {
//     const c = config || {};
//     const primaryColor = c.primary_color || '#3B82F6';
//     const secondaryColor = c.secondary_color || '#8B5CF6';
//     const position = c.widget_position || 'bottom-right';
//     const size = c.widget_size || 'medium';
//     const buttonShape = c.button_shape || 'circle';
//     const theme = c.theme || 'dark';
//     const headerStyle = c.header_style || 'solid';
//     const bubbleStyle = c.bubble_style || 'modern';
//     const fontFamily = c.font_family || 'Inter';
//     const widgetWidth = c.widget_width || 380;
//     const widgetHeight = c.widget_height || 520;

//     // Size configurations
//     const sizeConfig = {
//       small: { button: 50, width: 320, height: 450 },
//       medium: { button: 60, width: 380, height: 520 },
//       large: { button: 70, width: 420, height: 580 }
//     };
//     const sizeValues = sizeConfig[size] || sizeConfig.medium;

//     // Button border radius based on shape
//     const buttonRadius = buttonShape === 'circle' ? '50%' : buttonShape === 'rounded' ? '16px' : '8px';

//     // Bubble border radius based on style
//     const bubbleRadius = bubbleStyle === 'rounded' ? '20px' : bubbleStyle === 'square' ? '4px' : '16px';

//     // Header background based on style
//     let headerBg = primaryColor;
//     if (headerStyle === 'gradient') {
//       headerBg = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
//     } else if (headerStyle === 'transparent') {
//       headerBg = 'rgba(0, 0, 0, 0.3)';
//     }

//     // Theme colors
//     const isDark = theme === 'dark';
//     const bgPrimary = isDark ? '#111' : '#ffffff';
//     const bgSecondary = isDark ? '#0A0A0A' : '#f9fafb';
//     const bgInput = isDark ? '#1A1A1A' : '#f3f4f6';
//     const textPrimary = isDark ? '#e2e8f0' : '#1f2937';
//     const textSecondary = isDark ? '#94a3b8' : '#6b7280';
//     const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

//     // Position styles
//     const positionStyles = position === 'bottom-left'
//       ? 'left: 20px; right: auto;'
//       : 'right: 20px; left: auto;';
//     const panelPosition = position === 'bottom-left'
//       ? 'left: 0; right: auto;'
//       : 'right: 0; left: auto;';

//     // Load Google Font if needed
//     if (fontFamily !== 'System' && !document.querySelector(`link[href*="${fontFamily}"]`)) {
//       const fontLink = document.createElement('link');
//       fontLink.rel = 'stylesheet';
//       fontLink.href = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;500;600;700&display=swap`;
//       document.head.appendChild(fontLink);
//     }

//     const fontStack = fontFamily === 'System'
//       ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
//       : `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

//     return `
//       .chatbot-widget-container {
//         --primary: ${primaryColor};
//         --secondary: ${secondaryColor};
//         --bg-primary: ${bgPrimary};
//         --bg-secondary: ${bgSecondary};
//         --bg-input: ${bgInput};
//         --text-primary: ${textPrimary};
//         --text-secondary: ${textSecondary};
//         --border-color: ${borderColor};
//         position: fixed;
//         bottom: 20px;
//         ${positionStyles}
//         z-index: 999999;
//         font-family: ${fontStack};
//       }

//       .chatbot-button {
//         width: ${sizeValues.button}px;
//         height: ${sizeValues.button}px;
//         border-radius: ${buttonRadius};
//         background: var(--primary);
//         border: none;
//         cursor: pointer;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
//         transition: all 0.3s ease;
//       }

//       .chatbot-button:hover {
//         transform: scale(1.1);
//         box-shadow: 0 6px 30px rgba(0, 0, 0, 0.5);
//       }

//       .chatbot-button svg {
//         width: ${sizeValues.button * 0.45}px;
//         height: ${sizeValues.button * 0.45}px;
//         fill: white;
//         transition: transform 0.3s ease;
//       }

//       .chatbot-button.open svg {
//         transform: rotate(180deg);
//       }

//       .chatbot-panel {
//         position: absolute;
//         bottom: ${sizeValues.button + 15}px;
//         ${panelPosition}
//         width: ${sizeValues.width}px;
//         height: ${sizeValues.height}px;
//         background: var(--bg-primary);
//         border-radius: ${bubbleRadius};
//         box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
//         border: 1px solid var(--border-color);
//         display: flex;
//         flex-direction: column;
//         overflow: hidden;
//         opacity: 0;
//         transform: translateY(20px) scale(0.95);
//         pointer-events: none;
//         transition: all 0.3s ease;
//       }

//       .chatbot-panel.open {
//         opacity: 1;
//         transform: translateY(0) scale(1);
//         pointer-events: all;
//       }

//       .chatbot-header {
//         background: ${headerBg};
//         color: white;
//         padding: 16px 20px;
//         display: flex;
//         align-items: center;
//         gap: 12px;
//       }

//       .chatbot-header-icon {
//         width: 40px;
//         height: 40px;
//         background: rgba(255, 255, 255, 0.2);
//         border-radius: 10px;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//       }

//       .chatbot-header-icon svg {
//         width: 22px;
//         height: 22px;
//         fill: white;
//       }

//       .chatbot-header-info h3 {
//         margin: 0;
//         font-size: 16px;
//         font-weight: 600;
//         color: white;
//       }

//       .chatbot-header-info p {
//         margin: 2px 0 0;
//         font-size: 12px;
//         opacity: 0.8;
//         color: white;
//       }

//       .chatbot-messages {
//         flex: 1;
//         overflow-y: auto;
//         padding: 16px;
//         display: flex;
//         flex-direction: column;
//         gap: 12px;
//         background: var(--bg-secondary);
//       }

//       .chatbot-message {
//         max-width: 85%;
//         padding: 12px 16px;
//         border-radius: ${bubbleRadius};
//         font-size: 14px;
//         line-height: 1.5;
//         animation: messageIn 0.3s ease;
//       }

//       @keyframes messageIn {
//         from {
//           opacity: 0;
//           transform: translateY(10px);
//         }
//         to {
//           opacity: 1;
//           transform: translateY(0);
//         }
//       }

//       .chatbot-message.user {
//         align-self: flex-end;
//         background: var(--primary);
//         color: white;
//         border-bottom-right-radius: 4px;
//       }

//       .chatbot-message.bot {
//         align-self: flex-start;
//         background: var(--bg-input);
//         color: var(--text-primary);
//         border-bottom-left-radius: 4px;
//         border: 1px solid var(--border-color);
//       }

//       .chatbot-typing {
//         display: flex;
//         gap: 4px;
//         padding: 12px 16px;
//         background: var(--bg-input);
//         border-radius: ${bubbleRadius};
//         border-bottom-left-radius: 4px;
//         border: 1px solid var(--border-color);
//         align-self: flex-start;
//       }

//       .chatbot-typing span {
//         width: 8px;
//         height: 8px;
//         background: var(--text-secondary);
//         border-radius: 50%;
//         animation: typing 1.4s infinite;
//       }

//       .chatbot-typing span:nth-child(2) { animation-delay: 0.2s; }
//       .chatbot-typing span:nth-child(3) { animation-delay: 0.4s; }

//       @keyframes typing {
//         0%, 60%, 100% { transform: translateY(0); }
//         30% { transform: translateY(-6px); }
//       }

//       .chatbot-input-area {
//         padding: 16px;
//         background: var(--bg-primary);
//         border-top: 1px solid var(--border-color);
//         display: flex;
//         gap: 10px;
//       }

//       .chatbot-input {
//         flex: 1;
//         padding: 12px 16px;
//         border: 1px solid var(--border-color);
//         background: var(--bg-input);
//         color: var(--text-primary);
//         border-radius: 24px;
//         font-size: 14px;
//         outline: none;
//         transition: border-color 0.2s, box-shadow 0.2s;
//         font-family: inherit;
//       }

//       .chatbot-input::placeholder {
//         color: var(--text-secondary);
//       }

//       .chatbot-input:focus {
//         border-color: var(--primary);
//         box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
//       }

//       .chatbot-send {
//         width: 44px;
//         height: 44px;
//         border: none;
//         border-radius: 50%;
//         background: var(--primary);
//         cursor: pointer;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         transition: all 0.2s;
//       }

//       .chatbot-send:hover:not(:disabled) {
//         transform: scale(1.05);
//       }

//       .chatbot-send:disabled {
//         opacity: 0.5;
//         cursor: not-allowed;
//       }

//       .chatbot-send svg {
//         width: 20px;
//         height: 20px;
//         fill: white;
//       }

//       /* Scrollbar */
//       .chatbot-messages::-webkit-scrollbar {
//         width: 6px;
//       }
//       .chatbot-messages::-webkit-scrollbar-track {
//         background: transparent;
//       }
//       .chatbot-messages::-webkit-scrollbar-thumb {
//         background: var(--border-color);
//         border-radius: 3px;
//       }
//       .chatbot-messages::-webkit-scrollbar-thumb:hover {
//         background: var(--text-secondary);
//       }

//       @media (max-width: 480px) {
//         .chatbot-widget-container {
//           bottom: 10px;
//           right: 10px;
//           left: 10px;
//         }

//         .chatbot-panel {
//           width: calc(100vw - 20px);
//           height: calc(100vh - 100px);
//           bottom: ${sizeValues.button + 10}px;
//           right: 0;
//           left: 0;
//         }

//         .chatbot-button {
//           width: 50px;
//           height: 50px;
//         }
//       }
//     `;
//   }

//   // Inject styles
//   function injectStyles() {
//     const style = document.createElement('style');
//     style.textContent = getStyles();
//     document.head.appendChild(style);
//   }

//   // Create widget HTML
//   function createWidget() {
//     const container = document.createElement('div');
//     container.className = 'chatbot-widget-container';
//     container.innerHTML = `
//       <div class="chatbot-panel ${isOpen ? 'open' : ''}" id="chatbot-panel">
//         <div class="chatbot-header">
//           <div class="chatbot-header-icon">
//             <svg viewBox="0 0 24 24">
//               <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.4 0-2.74-.36-3.95-1.02l-.28-.17-2.91.86.86-2.91-.17-.28A7.937 7.937 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8zm4.25-5.84c-.23-.12-1.36-.67-1.57-.75s-.36-.12-.52.12-.6.75-.73.9-.27.17-.5.06c-.23-.12-.97-.36-1.85-1.14-.68-.61-1.14-1.36-1.28-1.59s-.01-.35.1-.47c.1-.1.23-.27.35-.4s.16-.23.23-.38.04-.29-.02-.4c-.06-.12-.52-1.26-.71-1.73-.19-.45-.38-.39-.52-.39h-.45c-.16 0-.4.06-.61.29s-.8.78-.8 1.9.82 2.21.93 2.36c.12.16 1.61 2.46 3.91 3.45.55.24.97.38 1.31.48.55.17 1.05.15 1.44.09.44-.07 1.36-.56 1.55-1.1s.19-.99.13-1.09c-.06-.1-.22-.16-.45-.28z"/>
//             </svg>
//           </div>
//           <div class="chatbot-header-info">
//             <h3>${config?.name || 'Chat Assistant'}</h3>
//             <p>${config?.header_subtitle || 'Powered by AI'}</p>
//           </div>
//         </div>
//         <div class="chatbot-messages" id="chatbot-messages">
//           ${config?.welcome_message ? `<div class="chatbot-message bot">${config.welcome_message}</div>` : ''}
//         </div>
//         <div class="chatbot-input-area">
//           <input 
//             type="text" 
//             class="chatbot-input" 
//             id="chatbot-input" 
//             placeholder="Type a message..."
//             autocomplete="off"
//           />
//           <button class="chatbot-send" id="chatbot-send">
//             <svg viewBox="0 0 24 24">
//               <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
//             </svg>
//           </button>
//         </div>
//       </div>
//       <button class="chatbot-button ${isOpen ? 'open' : ''}" id="chatbot-toggle">
//         <svg viewBox="0 0 24 24" id="chatbot-icon">
//           <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.4 0-2.74-.36-3.95-1.02l-.28-.17-2.91.86.86-2.91-.17-.28A7.937 7.937 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8z"/>
//         </svg>
//       </button>
//     `;
//     document.body.appendChild(container);

//     // Render restored messages
//     if (messages.length > 0) {
//       const messagesContainer = document.getElementById('chatbot-messages');
//       messages.forEach(msg => {
//         const div = document.createElement('div');
//         div.className = `chatbot-message ${msg.role === 'user' ? 'user' : 'bot'}`;
//         div.textContent = msg.content;
//         messagesContainer.appendChild(div);
//       });
//       // Scroll to bottom
//       setTimeout(() => {
//         messagesContainer.scrollTop = messagesContainer.scrollHeight;
//       }, 100);
//     }
//   }

//   // Setup event handlers
//   function setupEventHandlers() {
//     const toggle = document.getElementById('chatbot-toggle');
//     const panel = document.getElementById('chatbot-panel');
//     const input = document.getElementById('chatbot-input');
//     const sendBtn = document.getElementById('chatbot-send');

//     toggle.addEventListener('click', () => {
//       isOpen = !isOpen;
//       saveState();

//       panel.classList.toggle('open', isOpen);
//       toggle.classList.toggle('open', isOpen);

//       // Track widget open/close
//       trackEvent(isOpen ? 'widget_opened' : 'widget_closed');

//       if (isOpen && !conversationId) {
//         createConversation();
//       }

//       if (isOpen) {
//         setTimeout(() => input.focus(), 300);
//       }
//     });

//     sendBtn.addEventListener('click', sendMessage);
//     input.addEventListener('keypress', (e) => {
//       if (e.key === 'Enter' && !e.shiftKey) {
//         e.preventDefault();
//         sendMessage();
//       }
//     });
//   }

//   // Send message
//   async function sendMessage() {
//     const input = document.getElementById('chatbot-input');
//     const messagesContainer = document.getElementById('chatbot-messages');
//     const sendBtn = document.getElementById('chatbot-send');
//     const message = input.value.trim();

//     if (!message || isLoading || !conversationId) return;

//     isLoading = true;
//     sendBtn.disabled = true;
//     input.value = '';

//     // Add user message
//     const userMsg = document.createElement('div');
//     userMsg.className = 'chatbot-message user';
//     userMsg.textContent = message;
//     messagesContainer.appendChild(userMsg);

//     // Save to state
//     messages.push({ role: 'user', content: message });
//     saveState();

//     // Track message sent
//     trackEvent('message_sent', { messageLength: message.length });

//     // Add typing indicator
//     const typing = document.createElement('div');
//     typing.className = 'chatbot-typing';
//     typing.innerHTML = '<span></span><span></span><span></span>';
//     messagesContainer.appendChild(typing);

//     messagesContainer.scrollTop = messagesContainer.scrollHeight;

//     try {
//       const response = await fetch(`${origin}/api/chat`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           conversationId,
//           message,
//           embedCode: chatbotId
//         })
//       });

//       const data = await response.json();

//       // Remove typing indicator
//       typing.remove();

//       if (data.success && data.message) {
//         const botMsg = document.createElement('div');
//         botMsg.className = 'chatbot-message bot';
//         botMsg.textContent = data.message.content;
//         messagesContainer.appendChild(botMsg);
//         lastMessageId = data.message.id;

//         // Save to state
//         messages.push({ role: 'assistant', content: data.message.content });
//         saveState();

//         // Start polling if escalated to human support
//         if (data.isEscalated && !isPollingForHuman) {
//           isPollingForHuman = true;
//           startHumanSupportPolling();
//         }
//       } else {
//         const errorMsg = document.createElement('div');
//         errorMsg.className = 'chatbot-message bot';
//         errorMsg.textContent = 'Sorry, I encountered an error. Please try again.';
//         messagesContainer.appendChild(errorMsg);
//       }
//     } catch (error) {
//       typing.remove();
//       const errorMsg = document.createElement('div');
//       errorMsg.className = 'chatbot-message bot';
//       errorMsg.textContent = 'Sorry, I encountered an error. Please try again.';
//       messagesContainer.appendChild(errorMsg);
//     }

//     messagesContainer.scrollTop = messagesContainer.scrollHeight;
//     isLoading = false;
//     sendBtn.disabled = false;
//     input.focus();
//   }

//   // Poll for human support responses
//   let isPollingForHuman = false;
//   let lastMessageId = null;
//   let pollInterval = null;

//   function startHumanSupportPolling() {
//     if (pollInterval) return;

//     console.log('[Widget] Starting human support polling...');

//     pollInterval = setInterval(async () => {
//       if (!conversationId) return;

//       try {
//         const url = lastMessageId
//           ? `${origin}/api/widget/poll?conversationId=${conversationId}&lastMessageId=${lastMessageId}`
//           : `${origin}/api/widget/poll?conversationId=${conversationId}`;

//         const response = await fetch(url);
//         const data = await response.json();

//         if (data.success && data.messages && data.messages.length > 0) {
//           const messagesContainer = document.getElementById('chatbot-messages');

//           data.messages.forEach(msg => {
//             // Only show new messages we don't already have
//             if (msg.sender !== 'user') {
//               const msgDiv = document.createElement('div');
//               msgDiv.className = 'chatbot-message bot';

//               // Add agent badge for human agent messages
//               if (msg.sender_type === 'human_agent') {
//                 msgDiv.innerHTML = `
//                   <div style="font-size: 10px; opacity: 0.7; margin-bottom: 4px; color: #F97316;">
//                     👤 ${msg.agent_name || 'Support Agent'}
//                   </div>
//                   ${msg.content}
//                 `;
//               } else {
//                 msgDiv.textContent = msg.content;
//               }

//               messagesContainer.appendChild(msgDiv);
//               messages.push({ role: 'assistant', content: msg.content });
//               lastMessageId = msg.id;
//             }
//           });

//           messagesContainer.scrollTop = messagesContainer.scrollHeight;
//           saveState();
//         }

//         // Stop polling if resolved
//         if (data.supportStatus === 'resolved') {
//           console.log('[Widget] Conversation resolved, stopping poll');
//           stopHumanSupportPolling();
//         }
//       } catch (error) {
//         console.error('[Widget] Polling error:', error);
//       }
//     }, 5000); // Poll every 5 seconds
//   }

//   function stopHumanSupportPolling() {
//     if (pollInterval) {
//       clearInterval(pollInterval);
//       pollInterval = null;
//       isPollingForHuman = false;
//     }
//   }

//   // Initialize widget
//   function initWidget() {
//     injectStyles();
//     createWidget();
//     setupEventHandlers();

//     // Track page view
//     trackEvent('page_view');
//   }

//   // Start
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', fetchConfig);
//   } else {
//     fetchConfig();
//   }
// })();



(function () {
  // Get the script tag and chatbot ID
  const script = document.currentScript || document.querySelector('script[data-chatbot-id]');
  const chatbotId = script?.getAttribute('data-chatbot-id');

  if (!chatbotId) {
    console.error('Chatbot Widget: No chatbot ID provided');
    return;
  }

  // Get origin from script src or use default
  const scriptSrc = script?.src || '';
  const origin = scriptSrc ? new URL(scriptSrc).origin : 'http://localhost:3000';

  // State Management Keys
  const KEY_CONVO = `cb_convo_${chatbotId}`;
  const KEY_MSGS = `cb_msgs_${chatbotId}`;
  const KEY_OPEN = `cb_open_${chatbotId}`;

  // State
  let config = null;
  let visitorId = localStorage.getItem('chatbot_visitor_id');

  // Load persisted state
  let conversationId = sessionStorage.getItem(KEY_CONVO) || null;
  let messages = JSON.parse(sessionStorage.getItem(KEY_MSGS)) || [];
  let isOpen = sessionStorage.getItem(KEY_OPEN) === 'true';
  let isLoading = false;

  if (!visitorId) {
    visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatbot_visitor_id', visitorId);
  }

  // Save State Helper
  function saveState() {
    if (conversationId) sessionStorage.setItem(KEY_CONVO, conversationId);
    sessionStorage.setItem(KEY_MSGS, JSON.stringify(messages));
    sessionStorage.setItem(KEY_OPEN, isOpen);
  }

  // Track analytics event
  async function trackEvent(eventType, metadata = {}) {
    try {
      await fetch(`${origin}/api/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotId: config?.id,
          conversationId,
          visitorId,
          eventType,
          pageUrl: window.location.href,
          pageTitle: document.title,
          metadata
        })
      });
    } catch (e) {
      // Silent fail for analytics
    }
  }

  // Fetch chatbot config from Backend Proxy (Secure)
  async function fetchConfig() {
    try {
      const response = await fetch(`${origin}/api/widget/config?embed_code=${chatbotId}`);
      const data = await response.json();

      if (data && !data.error) {
        config = data;
        initWidget();
      } else {
        console.error('Chatbot Widget: Chatbot not found or config error');
      }
    } catch (error) {
      console.error('Chatbot Widget: Failed to fetch config', error);
    }
  }

  // Create conversation
  async function createConversation() {
    try {
      const response = await fetch(`${origin}/api/conversations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotId: config.id,
          visitorId,
          pageUrl: window.location.href
        })
      });
      const data = await response.json();
      if (data.success) {
        conversationId = data.conversation.id;
        saveState();
      }
    } catch (error) {
      console.error('Chatbot Widget: Failed to create conversation', error);
    }
  }

  // Get styles based on config
  function getStyles() {
    const c = config || {};
    const primaryColor = c.primary_color || '#3B82F6';
    const secondaryColor = c.secondary_color || '#8B5CF6';
    const position = c.widget_position || 'bottom-right';
    const size = c.widget_size || 'medium';
    const buttonShape = c.button_shape || 'circle';
    const theme = c.theme || 'dark';
    const headerStyle = c.header_style || 'solid';
    const bubbleStyle = c.bubble_style || 'modern';
    const fontFamily = c.font_family || 'Inter';
    const widgetWidth = c.widget_width || 380;
    const widgetHeight = c.widget_height || 520;

    // Size configurations
    const sizeConfig = {
      small: { button: 50, width: 340, height: 500 },
      medium: { button: 60, width: 480, height: 700 }, // Increased size
      large: { button: 70, width: 550, height: 750 }
    };
    const sizeValues = sizeConfig[size] || sizeConfig.medium;

    // Button border radius based on shape
    const buttonRadius = buttonShape === 'circle' ? '50%' : buttonShape === 'rounded' ? '16px' : '8px';

    // Bubble border radius based on style
    const bubbleRadius = bubbleStyle === 'rounded' ? '20px' : bubbleStyle === 'square' ? '4px' : '16px';

    // Header background based on style
    let headerBg = primaryColor;
    if (headerStyle === 'gradient') {
      headerBg = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
    } else if (headerStyle === 'transparent') {
      headerBg = 'rgba(0, 0, 0, 0.3)';
    }

    // Theme colors
    const isDark = theme === 'dark';
    const bgPrimary = isDark ? '#111' : '#ffffff';
    const bgSecondary = isDark ? '#0A0A0A' : '#f9fafb';
    const bgInput = isDark ? '#1A1A1A' : '#f3f4f6';
    const textPrimary = isDark ? '#e2e8f0' : '#1f2937';
    const textSecondary = isDark ? '#94a3b8' : '#6b7280';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    // Position styles
    const positionStyles = position === 'bottom-left'
      ? 'left: 20px; right: auto;'
      : 'right: 20px; left: auto;';
    const panelPosition = position === 'bottom-left'
      ? 'left: 0; right: auto;'
      : 'right: 0; left: auto;';

    // Load Google Font if needed
    if (fontFamily !== 'System' && !document.querySelector(`link[href*="${fontFamily}"]`)) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(fontLink);
    }

    const fontStack = fontFamily === 'System'
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      : `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

    return `
      .chatbot-widget-container {
        --primary: ${primaryColor};
        --secondary: ${secondaryColor};
        --bg-primary: ${bgPrimary};
        --bg-secondary: ${bgSecondary};
        --bg-input: ${bgInput};
        --text-primary: ${textPrimary};
        --text-secondary: ${textSecondary};
        --border-color: ${borderColor};
        position: fixed;
        bottom: 20px;
        ${positionStyles}
        z-index: 999999;
        font-family: ${fontStack};
      }
      
      .chatbot-button {
        width: ${sizeValues.button}px;
        height: ${sizeValues.button}px;
        border-radius: ${buttonRadius};
        background: var(--primary);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        transition: all 0.3s ease;
      }
      
      .chatbot-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(0, 0, 0, 0.5);
      }
      
      .chatbot-button svg {
        width: ${sizeValues.button * 0.45}px;
        height: ${sizeValues.button * 0.45}px;
        fill: white;
        transition: transform 0.3s ease;
      }
      
      .chatbot-button.open svg {
        transform: rotate(180deg);
      }
      
      .chatbot-panel {
        position: absolute;
        bottom: ${sizeValues.button + 15}px;
        ${panelPosition}
        width: min(${sizeValues.width}px, calc(100vw - 40px));
        height: min(${sizeValues.height}px, calc(100vh - ${sizeValues.button + 50}px));
        max-height: calc(100vh - ${sizeValues.button + 50}px);
        background: var(--bg-primary);
        border-radius: ${bubbleRadius};
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: all 0.3s ease;
      }
      
      .chatbot-panel.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }
      
      .chatbot-header {
        background: ${headerBg};
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      
      .chatbot-header-icon {
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .chatbot-header-icon svg {
        width: 22px;
        height: 22px;
        fill: white;
      }
      
      .chatbot-header-info h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: white;
      }
      
      .chatbot-header-info p {
        margin: 2px 0 0;
        font-size: 12px;
        opacity: 0.8;
        color: white;
      }
      
      .chatbot-panel a,
      .chatbot-panel a:visited {
        color: white !important;
        text-decoration: none;
        font-weight: 500;
        transition: opacity 0.2s;
      }

      .chatbot-panel a:hover {
        opacity: 0.8;
        text-decoration: underline;
      }
      
      .chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: var(--bg-secondary);
      }
      
      .chatbot-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: ${bubbleRadius};
        font-size: 14px;
        line-height: 1.5;
        animation: messageIn 0.3s ease;
        word-wrap: break-word;
      }
      
      @keyframes messageIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .chatbot-message.user {
        align-self: flex-end;
        background: var(--primary);
        color: white;
        border-bottom-right-radius: 4px;
      }
      
      .chatbot-message.bot {
        align-self: flex-start;
        background: var(--bg-input);
        color: var(--text-primary);
        border-bottom-left-radius: 4px;
        border: 1px solid var(--border-color);
      }
      
      .chatbot-typing {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background: var(--bg-input);
        border-radius: ${bubbleRadius};
        border-bottom-left-radius: 4px;
        border: 1px solid var(--border-color);
        align-self: flex-start;
      }
      
      .chatbot-typing span {
        width: 8px;
        height: 8px;
        background: var(--text-secondary);
        border-radius: 50%;
        animation: typing 1.4s infinite;
      }
      
      .chatbot-typing span:nth-child(2) { animation-delay: 0.2s; }
      .chatbot-typing span:nth-child(3) { animation-delay: 0.4s; }
      
      @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }
      
      .chatbot-input-area {
        padding: 16px;
        background: var(--bg-primary);
        border-top: 1px solid var(--border-color);
        display: flex;
        gap: 10px;
        flex-shrink: 0;
      }
      
      .chatbot-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid var(--border-color);
        background: var(--bg-input);
        color: var(--text-primary);
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        font-family: inherit;
      }
      
      .chatbot-input::placeholder {
        color: var(--text-secondary);
      }
      
      .chatbot-input:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }
      
      .chatbot-send {
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        background: var(--primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .chatbot-send:hover:not(:disabled) {
        transform: scale(1.05);
      }
      
      .chatbot-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .chatbot-send svg {
        width: 20px;
        height: 20px;
        fill: white;
      }
      
      /* Scrollbar */
      .chatbot-messages::-webkit-scrollbar {
        width: 6px;
      }
      .chatbot-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      .chatbot-messages::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 3px;
      }
      .chatbot-messages::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary);
      }
      
      .chatbot-footer {
        padding: 8px 12px;
        background: var(--bg-primary);
        border-top: 1px solid var(--border-color);
        font-size: 11px;
        text-align: center;
        color: white !important;
        border-bottom-left-radius: ${bubbleRadius};
        border-bottom-right-radius: ${bubbleRadius};
        flex-shrink: 0;
      }

      .chatbot-footer a,
      .chatbot-footer a:visited {
        color: #F97316 !important;
      }

      /* Tablet and smaller desktop screens */
      @media (max-width: 1024px) {
        .chatbot-panel {
          width: min(420px, calc(100vw - 40px));
          height: min(600px, calc(100vh - 100px));
        }
      }

      @media (max-width: 768px) {
        .chatbot-panel {
          width: min(380px, calc(100vw - 40px));
          height: min(550px, calc(100vh - 100px));
        }
      }

      /* Mobile devices */
      @media (max-width: 640px) {
        .chatbot-widget-container {
          bottom: 10px;
          right: 10px;
          left: 10px;
        }
        
        .chatbot-panel {
          width: calc(100vw - 20px);
          height: calc(100vh - 80px);
          max-height: calc(100vh - 80px);
          bottom: 70px;
          right: 0;
          left: 0;
        }
        
        .chatbot-button {
          width: 50px;
          height: 50px;
        }

        .chatbot-button svg {
          width: 22px;
          height: 22px;
        }
      }

      /* Small mobile devices */
      @media (max-width: 480px) {
        .chatbot-panel {
          width: calc(100vw - 20px);
          height: calc(100vh - 75px);
          max-height: calc(100vh - 75px);
        }

        .chatbot-header {
          padding: 12px 16px;
        }

        .chatbot-header-icon {
          width: 36px;
          height: 36px;
        }

        .chatbot-header-info h3 {
          font-size: 14px;
        }

        .chatbot-header-info p {
          font-size: 11px;
        }

        .chatbot-messages {
          padding: 12px;
          gap: 10px;
        }

        .chatbot-message {
          font-size: 13px;
          padding: 10px 14px;
        }

        .chatbot-input-area {
          padding: 12px;
        }

        .chatbot-footer {
          padding: 6px 10px;
          font-size: 10px;
        }
      }

      /* Short screens (landscape mobile) */
      @media (max-height: 600px) {
        .chatbot-panel {
          height: calc(100vh - 80px);
          max-height: calc(100vh - 80px);
        }
      }

      @media (max-height: 500px) {
        .chatbot-panel {
          height: calc(100vh - 70px);
          max-height: calc(100vh - 70px);
          bottom: 60px;
        }

        .chatbot-header {
          padding: 10px 16px;
        }

        .chatbot-messages {
          padding: 10px;
        }

        .chatbot-input-area {
          padding: 10px;
        }
      }

    `;
  }

  // Inject styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = getStyles();
    document.head.appendChild(style);
  }

  // Simple markdown to HTML converter (safe subset)
  function markdownToHtml(md) {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Lists
    html = html.replace(/^\s*[-*+] (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');

    // Newlines - after markdown patterns that rely on ^ or $
    html = html.replace(/\n/g, '<br>');
    // Auto-link Rivet|MRO if not already linked
    html = html.replace(/(?<!\[)Rivet\|MRO(?!\])/g, '<a href="https://rivetmro.com/" target="_blank" rel="noopener">Rivet|MRO</a>');

    return html;
  }

  // Create widget HTML
  function createWidget() {
    const container = document.createElement('div');
    container.className = 'chatbot-widget-container';
    container.innerHTML = `
      <div class="chatbot-panel ${isOpen ? 'open' : ''}" id="chatbot-panel">
        <div class="chatbot-header">
          <!-- <div class="chatbot-header-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.4 0-2.74-.36-3.95-1.02l-.28-.17-2.91.86.86-2.91-.17-.28A7.937 7.937 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8zm4.25-5.84c-.23-.12-1.36-.67-1.57-.75s-.36-.12-.52.12-.6.75-.73.9-.27.17-.5.06c-.23-.12-.97-.36-1.85-1.14-.68-.61-1.14-1.36-1.28-1.59s-.01-.35.1-.47c.1-.1.23-.27.35-.4s.16-.23.23-.38.04-.29-.02-.4c-.06-.12-.52-1.26-.71-1.73-.19-.45-.38-.39-.52-.39h-.45c-.16 0-.4.06-.61.29s-.8.78-.8 1.9.82 2.21.93 2.36c.12.16 1.61 2.46 3.91 3.45.55.24.97.38 1.31.48.55.17 1.05.15 1.44.09.44-.07 1.36-.56 1.55-1.1s.19-.99.13-1.09c-.06-.1-.22-.16-.45-.28z"/>
            </svg>
          </div> -->
          <div class="chatbot-header-info">
            <h3>${config?.name || 'Chat Assistant'}</h3>
            <p>${markdownToHtml(config?.header_subtitle || 'Powered by AI')}</p>
          </div>
        </div>
        <div class="chatbot-messages" id="chatbot-messages">
          ${config?.welcome_message ? `<div class="chatbot-message bot">${markdownToHtml(config.welcome_message)}</div>` : ''}
        </div>
        <div class="chatbot-input-area">
          <input 
            type="text" 
            class="chatbot-input" 
            id="chatbot-input" 
            placeholder="Type a message..."
            autocomplete="off"
          />
          <button class="chatbot-send" id="chatbot-send">
            <svg viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <div class="chatbot-footer">
          Want to develop your own customized chatbot?<br>
          Visit <a href="https://rivetmro.com/" target="_blank" rel="noopener noreferrer">Rivet|MRO</a> to get started.
        </div>
      </div>
      <button class="chatbot-button ${isOpen ? 'open' : ''}" id="chatbot-toggle">
        <svg viewBox="0 0 24 24" id="chatbot-icon">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.4 0-2.74-.36-3.95-1.02l-.28-.17-2.91.86.86-2.91-.17-.28A7.937 7.937 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8z"/>
        </svg>
      </button>
    `;
    document.body.appendChild(container);

    // Render restored messages
    if (messages.length > 0) {
      const messagesContainer = document.getElementById('chatbot-messages');
      messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `chatbot-message ${msg.role === 'user' ? 'user' : 'bot'}`;
        div.innerHTML = markdownToHtml(msg.content);
        messagesContainer.appendChild(div);
      });
      // Scroll to bottom
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }

  // Setup event handlers
  function setupEventHandlers() {
    const toggle = document.getElementById('chatbot-toggle');
    const panel = document.getElementById('chatbot-panel');
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');

    toggle.addEventListener('click', () => {
      isOpen = !isOpen;
      saveState();

      panel.classList.toggle('open', isOpen);
      toggle.classList.toggle('open', isOpen);

      // Track widget open/close
      trackEvent(isOpen ? 'widget_opened' : 'widget_closed');

      if (isOpen && !conversationId) {
        createConversation();
      }

      if (isOpen) {
        setTimeout(() => input.focus(), 300);
      }
    });

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Send message
  async function sendMessage() {
    const input = document.getElementById('chatbot-input');
    const messagesContainer = document.getElementById('chatbot-messages');
    const sendBtn = document.getElementById('chatbot-send');
    const message = input.value.trim();

    if (!message || isLoading || !conversationId) return;

    isLoading = true;
    sendBtn.disabled = true;
    input.value = '';

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chatbot-message user';
    userMsg.innerHTML = markdownToHtml(message);
    messagesContainer.appendChild(userMsg);

    // Save to state
    messages.push({ role: 'user', content: message });
    saveState();

    // Track message sent
    trackEvent('message_sent', { messageLength: message.length });

    // Add typing indicator
    const typing = document.createElement('div');
    typing.className = 'chatbot-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesContainer.appendChild(typing);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const response = await fetch(`${origin}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message,
          embedCode: chatbotId
        })
      });

      const data = await response.json();

      // Remove typing indicator
      typing.remove();

      if (data.success && data.message) {
        const botMsg = document.createElement('div');
        botMsg.className = 'chatbot-message bot';
        botMsg.innerHTML = markdownToHtml(data.message.content);
        messagesContainer.appendChild(botMsg);
        lastMessageId = data.message.id;

        // Save to state
        messages.push({ role: 'assistant', content: data.message.content });
        saveState();

        // Start polling if escalated to human support
        if (data.isEscalated && !isPollingForHuman) {
          isPollingForHuman = true;
          startHumanSupportPolling();
        }
      } else {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'chatbot-message bot';
        errorMsg.textContent = 'Sorry, I encountered an error. Please try again.';
        messagesContainer.appendChild(errorMsg);
      }
    } catch (error) {
      typing.remove();
      const errorMsg = document.createElement('div');
      errorMsg.className = 'chatbot-message bot';
      errorMsg.textContent = 'Sorry, I encountered an error. Please try again.';
      messagesContainer.appendChild(errorMsg);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Poll for human support responses
  let isPollingForHuman = false;
  let lastMessageId = null;
  let pollInterval = null;

  function startHumanSupportPolling() {
    if (pollInterval) return;

    console.log('[Widget] Starting human support polling...');

    pollInterval = setInterval(async () => {
      if (!conversationId) return;

      try {
        const url = lastMessageId
          ? `${origin}/api/widget/poll?conversationId=${conversationId}&lastMessageId=${lastMessageId}`
          : `${origin}/api/widget/poll?conversationId=${conversationId}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.messages && data.messages.length > 0) {
          const messagesContainer = document.getElementById('chatbot-messages');

          data.messages.forEach(msg => {
            // Only show new messages we don't already have
            if (msg.sender !== 'user') {
              const msgDiv = document.createElement('div');
              msgDiv.className = 'chatbot-message bot';

              // Add agent badge for human agent messages

              if (msg.sender_type === 'human_agent') {
                msgDiv.innerHTML = `
                  <div style="font-size: 10px; opacity: 0.7; margin-bottom: 4px; color: #F97316;">
                    👤 ${msg.agent_name || 'Support Agent'}
                  </div>
                  ${markdownToHtml(msg.content)}
                `;
              } else {
                msgDiv.innerHTML = markdownToHtml(msg.content);
              }

              messagesContainer.appendChild(msgDiv);
              messages.push({ role: 'assistant', content: msg.content });
              lastMessageId = msg.id;
            }
          });

          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          saveState();
        }

        // Stop polling if resolved
        if (data.supportStatus === 'resolved') {
          console.log('[Widget] Conversation resolved, stopping poll');
          stopHumanSupportPolling();
        }
      } catch (error) {
        console.error('[Widget] Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  function stopHumanSupportPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
      isPollingForHuman = false;
    }
  }

  // Initialize widget
  function initWidget() {
    injectStyles();
    createWidget();
    setupEventHandlers();

    // Track page view
    trackEvent('page_view');
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchConfig);
  } else {
    fetchConfig();
  }
})();

// LønnAI chat page - standalone AI assistant for wage calculations

import { mountAll } from '../js/icons.js';

export function renderLonnAI() {
  return `
    <div class="lonnai-page">
      <div class="lonnai-content">
        <h1 class="page-title">LønnAI</h1>

        <!-- Use the existing chatbox structure with standard IDs -->
        <section id="chatbox" class="chatbox-container lonnai-chatbox">
          <div class="chatbox-pill" id="chatboxPill">
            <div class="chatbox-pill-content">
              <div class="chatbox-icon-badge">
                <svg class="chatbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"></path>
                </svg>
              </div>
              <div class="chatbox-pill-text-container">
                <span class="chatbox-pill-text" id="chatboxPillPlaceholder">Hei! Jeg er LønnAI. Spør meg om alt som har med lønn å gjøre...</span>
                <div class="connection-status" id="connectionStatus" style="display: none;">
                  <div class="connection-indicator" id="connectionIndicator"></div>
                  <span class="connection-text" id="connectionText">Connecting...</span>
                </div>
              </div>
              <button class="chatbox-new-chat" id="chatboxNewChat" aria-label="Ny chat" style="display: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <button class="chatbox-close" id="chatboxClose" aria-label="Lukk chat" style="display: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Expanded content (shown after first message) -->
            <div class="chatbox-expanded-content" id="chatboxExpandedContent" style="display: none;">
              <div class="chatbox-log" id="chatboxLog">
                <!-- Chat messages will be populated here -->
              </div>
              <div class="chatbox-input-container">
                <textarea id="chatboxInput" class="chatbox-input" placeholder="Skriv en melding..." rows="1"></textarea>
                <button id="chatboxSend" class="chatbox-send-btn" aria-label="Send melding">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

export function afterMountLonnAI() {
  // Mount icons
  mountAll();

  // The chat should automatically work since we're using the standard IDs
  // and the chatbox is always initialized by the main app
}
// Chat functionality for the wage calculator
// Wrapped in IIFE to avoid global collisions
(function() {
    'use strict';
    
    let chatElements = null;
    let messages = [
        { role: 'system', content: 'You are a helpful wage-bot.' }
    ];
    let currentSession = null;
    
    // Initialize chat functionality when DOM is loaded
    function initChat() {
        // Get chat elements
        chatElements = {
            log: document.getElementById('log'),
            input: document.getElementById('input'),
            send: document.getElementById('send')
        };
        
        // Check if all elements exist
        if (!chatElements.log || !chatElements.input || !chatElements.send) {
            console.warn('Chat elements not found, chat functionality disabled');
            return;
        }
        
        // Set up event listeners
        chatElements.send.addEventListener('click', handleSendMessage);
        chatElements.input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSendMessage();
            }
        });
        
        // Initialize Supabase session
        initializeSession();
        
        console.log('Chat functionality initialized');
    }
    
    // Initialize Supabase session for authentication
    async function initializeSession() {
        try {
            // Check if Supabase is available
            if (typeof window.supa === 'undefined') {
                // Try to get from global supabase if supa is not available
                if (typeof window.supabase !== 'undefined' && window.CONFIG) {
                    window.supa = window.supabase.createClient(
                        window.CONFIG.supabase.url,
                        window.CONFIG.supabase.anonKey
                    );
                } else {
                    console.warn('Supabase not available, chat will work without authentication');
                    return;
                }
            }

            // Get current session
            const { data: { session }, error } = await window.supa.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                return;
            }

            currentSession = session;
            console.log('Chat session initialized:', session ? 'authenticated' : 'anonymous');

            // Set up auth state change listener
            window.supa.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event, session ? 'authenticated' : 'anonymous');
                currentSession = session;

                // Clear chat on sign out
                if (event === 'SIGNED_OUT') {
                    clearChatLog();
                }
            });

        } catch (error) {
            console.error('Error initializing chat session:', error);
        }
    }
    
    // Append message to chat log
    function appendMessage(role, text) {
        if (!chatElements.log) return;
        
        const messageElement = document.createElement('p');
        messageElement.innerHTML = `<strong>${role}:</strong> ${escapeHtml(text)}`;
        chatElements.log.appendChild(messageElement);
        chatElements.log.scrollTop = chatElements.log.scrollHeight;
    }
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Handle sending a message
    async function handleSendMessage() {
        const text = chatElements.input.value.trim();
        if (!text) return;
        
        // Disable send button during request
        chatElements.send.disabled = true;
        chatElements.send.textContent = 'Sending...';
        
        try {
            // Add user message to chat
            appendMessage('user', text);
            messages.push({ role: 'user', content: text });
            chatElements.input.value = '';
            
            // Send request to chat endpoint using authenticated request helper
            const response = await makeAuthenticatedRequest('/chat', {
                method: 'POST',
                body: JSON.stringify({ messages })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Handle response
            if (result.assistant) {
                appendMessage('assistant', result.assistant);
                messages.push({ role: 'assistant', content: result.assistant });
            } else if (result.system) {
                appendMessage('assistant', result.system);
                // Handle shift data if available
                if (result.shifts) {
                    console.log('Shifts data received:', result.shifts);
                    // TODO: Update wage calculator with shift data
                }
            } else if (result.error) {
                appendMessage('system', `Error: ${result.error}`);
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage('system', 'Sorry, there was an error sending your message. Please try again.');
        } finally {
            // Re-enable send button
            chatElements.send.disabled = false;
            chatElements.send.textContent = 'Send';
        }
    }
    
    // Clear chat log and shift data (for sign-out cleanup)
    function clearChatLog() {
        if (chatElements && chatElements.log) {
            chatElements.log.innerHTML = '';
            messages = [
                { role: 'system', content: 'You are a helpful wage-bot.' }
            ];
            console.log('Chat log cleared');
        }

        // Clear shift table if it exists (for wage calculator integration)
        clearShiftTable();
    }

    // Clear shift table data
    function clearShiftTable() {
        try {
            // Try to clear shift data from the wage calculator if it exists
            if (typeof window.app !== 'undefined' && window.app.clearShifts) {
                window.app.clearShifts();
                console.log('Shift table cleared via app.clearShifts()');
            } else {
                // Fallback: try to clear any visible shift table elements
                const shiftTable = document.querySelector('#shiftsTable tbody');
                if (shiftTable) {
                    shiftTable.innerHTML = '';
                    console.log('Shift table cleared via DOM manipulation');
                }

                // Clear any shift-related local storage
                if (typeof localStorage !== 'undefined') {
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.includes('shift') || key.includes('wage'))) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                    if (keysToRemove.length > 0) {
                        console.log('Cleared shift-related localStorage keys:', keysToRemove);
                    }
                }
            }
        } catch (error) {
            console.warn('Error clearing shift table:', error);
        }
    }
    
    // Helper function for making authenticated requests
    async function makeAuthenticatedRequest(url, options = {}) {
        // Refresh session to get latest token
        if (window.supa) {
            try {
                const { data: { session }, error } = await window.supa.auth.getSession();
                if (!error && session) {
                    currentSession = session;
                }
            } catch (error) {
                console.warn('Could not refresh session:', error);
            }
        }

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add authorization header if we have a session
        if (currentSession && currentSession.access_token) {
            headers['Authorization'] = `Bearer ${currentSession.access_token}`;
        }

        // Make the request
        return fetch(url, {
            ...options,
            headers
        });
    }

    // Update session when auth state changes
    function updateSession(session) {
        currentSession = session;
        console.log('Chat session updated:', session ? 'authenticated' : 'anonymous');
    }

    // Expose necessary functions to global scope
    window.chatModule = {
        clearChatLog: clearChatLog,
        clearShiftTable: clearShiftTable,
        updateSession: updateSession,
        makeAuthenticatedRequest: makeAuthenticatedRequest
    };
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }
    
})();

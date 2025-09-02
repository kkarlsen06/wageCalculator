/**
 * WebSocket Manager for Chat Communication
 * 
 * Handles WebSocket connections with automatic reconnection,
 * authentication, and fallback to HTTP/SSE.
 */

import { API_BASE } from './apiBase.js';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.connectionId = null;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.isConnecting = false;
    this.isDestroyed = false;
    this.messageQueue = [];
    this.pingInterval = null;
    this.token = null;
    
    // Event handlers
    this.onMessage = null;
    this.onConnectionChange = null;
    this.onError = null;
    
    // Connection states
    this.STATES = {
      DISCONNECTED: 'disconnected',
      CONNECTING: 'connecting',
      CONNECTED: 'connected',
      AUTHENTICATED: 'authenticated',
      ERROR: 'error'
    };
    
    this.state = this.STATES.DISCONNECTED;
  }
  
  /**
   * Initialize WebSocket connection
   */
  async connect(token) {
    if (this.isDestroyed || this.isConnecting) {
      return false;
    }
    
    this.token = token;
    this.isConnecting = true;
    this.setState(this.STATES.CONNECTING);
    
    try {
      const wsUrl = this.getWebSocketUrl();
      console.log('[WS] Connecting to:', wsUrl);
      
      // Use subprotocols to pass JWT: ["jwt", token]
      this.ws = new WebSocket(wsUrl, ['jwt', this.token]);
      this.setupEventHandlers();
      
      // Wait for connection or timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('[WS] Connection timeout');
          this.handleConnectionFailure();
          resolve(false);
        }, 10000); // 10 second timeout
        
        const originalOnOpen = this.ws.onopen;
        this.ws.onopen = (event) => {
          clearTimeout(timeout);
          if (originalOnOpen) originalOnOpen(event);
          resolve(true);
        };
        
        const originalOnError = this.ws.onerror;
        this.ws.onerror = (event) => {
          clearTimeout(timeout);
          if (originalOnError) originalOnError(event);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('[WS] Connection error:', error);
      this.handleConnectionFailure();
      return false;
    }
  }
  
  /**
   * Get WebSocket URL based on current API base
   */
  getWebSocketUrl() {
    if (!API_BASE) {
      return 'ws://localhost:3000/ws/chat';
    }
    
    // Convert HTTP(S) API base to WebSocket URL
    let wsUrl = API_BASE.replace(/^https?:\/\//, '');
    const protocol = API_BASE.startsWith('https://') ? 'wss://' : 'ws://';
    
    return `${protocol}${wsUrl}/ws/chat`;
  }
  
  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    if (!this.ws) return;
    
    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.setState(this.STATES.CONNECTED);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      // Authenticate immediately
      this.authenticate();
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[WS] Failed to parse message:', error, event.data);
      }
    };
    
    this.ws.onclose = (event) => {
      console.log('[WS] Connection closed:', event.code, event.reason);
      this.setState(this.STATES.DISCONNECTED);
      this.isAuthenticated = false;
      this.connectionId = null;
      this.stopPing();
      
      if (!this.isDestroyed && this.shouldReconnect(event.code)) {
        this.scheduleReconnect();
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('[WS] WebSocket error:', error);
      this.setState(this.STATES.ERROR);
      if (this.onError) {
        this.onError(error);
      }
    };
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(message) {
    switch (message.type) {
      case 'auth_success':
        console.log('[WS] Authentication successful');
        this.isAuthenticated = true;
        this.connectionId = message.connectionId;
        this.setState(this.STATES.AUTHENTICATED);
        this.startPing();
        this.processMessageQueue();
        break;
        
      case 'pong':
        // Keep-alive response, nothing to do
        break;
        
      case 'error':
        console.error('[WS] Server error:', message.message);
        if (this.onError) {
          this.onError(new Error(message.message));
        }
        break;
        
      default:
        // Forward chat messages to handler
        if (this.onMessage) {
          this.onMessage(message);
        }
    }
  }
  
  /**
   * Authenticate with the server
   */
  authenticate() {
    if (!this.token) {
      console.error('[WS] No token available for authentication');
      this.handleConnectionFailure();
      return;
    }
    
    this.send({
      type: 'auth',
      token: this.token
    });
  }
  
  /**
   * Send a chat message
   */
  sendChatMessage(messages, currentMonth, currentYear) {
    const message = {
      type: 'chat',
      messages,
      currentMonth,
      currentYear
    };
    
    if (this.isAuthenticated) {
      this.send(message);
    } else {
      // Queue message for later sending
      this.messageQueue.push(message);
      
      // Try to reconnect if not connected
      if (this.state === this.STATES.DISCONNECTED && this.token) {
        this.connect(this.token);
      }
    }
  }
  
  /**
   * Send a WebSocket message
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send message, WebSocket not ready:', message);
    }
  }
  
  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isAuthenticated) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }
  
  /**
   * Start ping interval for keep-alive
   */
  startPing() {
    this.stopPing(); // Clear any existing interval
    
    this.pingInterval = setInterval(() => {
      if (this.isAuthenticated) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }
  
  /**
   * Stop ping interval
   */
  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Determine if we should reconnect based on close code
   */
  shouldReconnect(code) {
    // Don't reconnect for authentication failures or intentional closures
    const noReconnectCodes = [4001, 4002, 1000]; // Auth failures, intentional close
    return !noReconnectCodes.includes(code) && this.reconnectAttempts < this.maxReconnectAttempts;
  }
  
  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect() {
    if (this.isDestroyed) return;
    
    this.reconnectAttempts++;
    
    console.log(`[WS] Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (!this.isDestroyed && this.token) {
        this.connect(this.token);
      }
    }, this.reconnectDelay);
    
    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      this.maxReconnectDelay
    );
  }
  
  /**
   * Handle connection failure
   */
  handleConnectionFailure() {
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.setState(this.STATES.ERROR);
    
    if (this.ws) {
      this.ws.close();
    }
  }
  
  /**
   * Set connection state and notify listeners
   */
  setState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      
      console.log(`[WS] State change: ${oldState} -> ${newState}`);
      
      if (this.onConnectionChange) {
        this.onConnectionChange(newState, oldState);
      }
    }
  }
  
  /**
   * Check if WebSocket is ready for chat
   */
  isReady() {
    return this.state === this.STATES.AUTHENTICATED;
  }
  
  /**
   * Get current connection state
   */
  getState() {
    return this.state;
  }
  
  /**
   * Disconnect and cleanup
   */
  disconnect() {
    console.log('[WS] Disconnecting');
    this.isDestroyed = true;
    this.messageQueue = [];
    this.stopPing();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setState(this.STATES.DISCONNECTED);
  }
  
  /**
   * Reset reconnection state (useful for manual reconnection)
   */
  resetReconnection() {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.isDestroyed = false;
  }
}

// Create singleton instance
export const wsManager = new WebSocketManager();
export default wsManager;

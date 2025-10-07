/**
 * Lazy WebSocket Client for Real-time Features
 * 
 * Provides on-demand WebSocket connections with:
 * - Lazy initialization (only connects when needed)
 * - Connection pooling and ref counting
 * - Auto-reconnect with jittered backoff
 * - Document visibility management
 * - Auth token handling
 * - Metrics and telemetry
 */

import { supabase } from '../supabase-client.js';
import { API_BASE } from '../lib/net/apiBase.js';

class LazyWebSocketClient {
  constructor() {
    this.ws = null;
    this.connectionId = null;
    this.isAuthenticated = false;
    this.isConnecting = false;
    this.isDestroyed = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.pingInterval = null;
    this.token = null;
    this._lastToken = null;
    this._authSubscription = null;
    this.messageQueue = [];
    
    // Connection states
    this.STATES = {
      DISCONNECTED: 'disconnected',
      CONNECTING: 'connecting', 
      CONNECTED: 'connected',
      AUTHENTICATED: 'authenticated',
      ERROR: 'error'
    };
    
    this.state = this.STATES.DISCONNECTED;
    
    // Channel management for ref counting
    this.channels = new Map(); // channelKey -> { subscribers: Set, handlers: Set }
    this.subscriberCount = 0;
    
    // Metrics
    this.metrics = {
      connectTime: null,
      disconnectTime: null,
      totalUptime: 0,
      connectionAttempts: 0,
      successfulConnections: 0,
      errors: 0
    };
    
    // Document visibility handling
    this.isDocumentVisible = !document.hidden;
    this.wasConnectedBeforeHidden = false;
    
    this._setupDocumentVisibilityHandling();
    this._setupAuthListener();
  }
  
  /**
   * Connect to WebSocket (lazy initialization)
   * Only creates connection if needed and not already connected
   */
  async connect() {
    if (this.isDestroyed || this.isConnecting || this.isAuthenticated) {
      return this.isAuthenticated;
    }
    
    // Don't connect if document is hidden
    if (!this.isDocumentVisible) {
      this._log('Skipping connection - document is hidden');
      return false;
    }
    
    this.metrics.connectionAttempts++;
    
    try {
      // Get fresh auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      this.token = token;
      this._lastToken = token;
      this.isConnecting = true;
      this._setState(this.STATES.CONNECTING);
      
      const wsUrl = this._getWebSocketUrl();
      this._log('Connecting to:', wsUrl);
      
      this.ws = new WebSocket(wsUrl, ['jwt', this.token]);
      this._setupEventHandlers();
      
      // Connection timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this._log('Connection timeout');
          this._handleConnectionFailure();
          resolve(false);
        }, 10000);
        
        const originalOnOpen = this.ws.onopen;
        this.ws.onopen = (event) => {
          clearTimeout(timeout);
          this.metrics.connectTime = Date.now();
          this.metrics.successfulConnections++;
          if (originalOnOpen) originalOnOpen(event);
          resolve(true);
        };
        
        const originalOnError = this.ws.onerror;
        this.ws.onerror = (event) => {
          clearTimeout(timeout);
          this.metrics.errors++;
          if (originalOnError) originalOnError(event);
          resolve(false);
        };
      });
    } catch (error) {
      this._logError('Connection error:', error);
      this.metrics.errors++;
      this._handleConnectionFailure();
      return false;
    }
  }
  
  /**
   * Disconnect WebSocket and cleanup
   */
  disconnect() {
    this._log('Disconnecting');
    
    if (this.metrics.connectTime) {
      this.metrics.disconnectTime = Date.now();
      this.metrics.totalUptime += this.metrics.disconnectTime - this.metrics.connectTime;
    }
    
    this.isDestroyed = true;
    this.messageQueue = [];
    this._stopPing();
    
    if (this._authSubscription) {
      try { 
        this._authSubscription.unsubscribe(); 
      } catch (_) {}
      this._authSubscription = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this._setState(this.STATES.DISCONNECTED);
    
    // Clear all channels
    this.channels.clear();
    this.subscriberCount = 0;
  }
  
  /**
   * Subscribe to a real-time channel
   * @param {string} channelKey - Unique channel identifier
   * @param {Object} options - Channel options
   * @param {Function} onMessage - Message handler
   * @returns {Function} - Unsubscribe function
   */
  subscribe(channelKey, options = {}, onMessage = null) {
    if (!channelKey) {
      throw new Error('Channel key is required');
    }
    
    // Get or create channel
    if (!this.channels.has(channelKey)) {
      this.channels.set(channelKey, {
        subscribers: new Set(),
        handlers: new Set(),
        options
      });
    }
    
    const channel = this.channels.get(channelKey);
    const subscriberId = Symbol('subscriber');
    
    // Add subscriber
    channel.subscribers.add(subscriberId);
    if (onMessage) {
      channel.handlers.add(onMessage);
    }
    
    this.subscriberCount++;
    this._log(`Subscribed to channel ${channelKey} (${this.subscriberCount} total subscribers)`);
    
    // Connect if first subscriber
    if (this.subscriberCount === 1) {
      this.connect().catch(err => {
        this._logError('Auto-connect failed:', err);
      });
    }
    
    // Return unsubscribe function
    return () => {
      if (channel.subscribers.has(subscriberId)) {
        channel.subscribers.delete(subscriberId);
        if (onMessage) {
          channel.handlers.delete(onMessage);
        }
        
        this.subscriberCount--;
        this._log(`Unsubscribed from channel ${channelKey} (${this.subscriberCount} total subscribers)`);
        
        // Remove channel if no subscribers
        if (channel.subscribers.size === 0) {
          this.channels.delete(channelKey);
        }
        
        // Disconnect if no subscribers
        if (this.subscriberCount === 0) {
          this._scheduleDisconnect();
        }
      }
    };
  }
  
  /**
   * Send a message to a specific channel
   */
  send(channelKey, message) {
    if (!this.isAuthenticated) {
      this._log('Queueing message - not authenticated yet');
      this.messageQueue.push({ channelKey, message });
      return;
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'channel_message',
        channel: channelKey,
        ...message
      };
      this.ws.send(JSON.stringify(payload));
    } else {
      this._log('Cannot send message - WebSocket not ready');
    }
  }
  
  /**
   * Get connection state
   */
  getState() {
    return this.state;
  }
  
  /**
   * Check if ready for real-time communication
   */
  isReady() {
    return this.state === this.STATES.AUTHENTICATED;
  }
  
  /**
   * Get metrics for debugging/monitoring
   */
  getMetrics() {
    const currentUptime = this.metrics.connectTime && !this.metrics.disconnectTime 
      ? Date.now() - this.metrics.connectTime 
      : 0;
      
    return {
      ...this.metrics,
      currentUptime,
      subscriberCount: this.subscriberCount,
      channelCount: this.channels.size,
      isConnected: this.isAuthenticated
    };
  }
  
  // Private methods
  
  _getWebSocketUrl() {
    if (!API_BASE) {
      return 'ws://localhost:3000/ws/realtime';
    }
    
    let wsUrl = API_BASE.replace(/^https?:\/\//, '');
    const protocol = API_BASE.startsWith('https://') ? 'wss://' : 'ws://';
    
    return `${protocol}${wsUrl}/ws/realtime`;
  }
  
  _setupEventHandlers() {
    if (!this.ws) return;
    
    this.ws.onopen = () => {
      this._log('Connected');
      this._setState(this.STATES.CONNECTED);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this._authenticate();
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this._handleMessage(message);
      } catch (error) {
        this._logError('Failed to parse message:', error, event.data);
      }
    };
    
    this.ws.onclose = (event) => {
      this._log('Connection closed:', event.code, event.reason);
      this._setState(this.STATES.DISCONNECTED);
      this.isAuthenticated = false;
      this.connectionId = null;
      this._stopPing();
      
      if (this.metrics.connectTime && !this.metrics.disconnectTime) {
        this.metrics.disconnectTime = Date.now();
        this.metrics.totalUptime += this.metrics.disconnectTime - this.metrics.connectTime;
      }
      
      if (!this.isDestroyed && this._shouldReconnect(event.code)) {
        this._scheduleReconnect();
      }
    };
    
    this.ws.onerror = (error) => {
      this._logError('WebSocket error:', error);
      this.metrics.errors++;
      this._setState(this.STATES.ERROR);
    };
  }
  
  _handleMessage(message) {
    switch (message.type) {
      case 'auth_success':
        this._log('Authentication successful');
        this.isAuthenticated = true;
        this.connectionId = message.connectionId;
        this._setState(this.STATES.AUTHENTICATED);
        this._startPing();
        this._processMessageQueue();
        break;
        
      case 'pong':
        // Keep-alive response
        break;
        
      case 'error':
        this._logError('Server error:', message.message);
        break;
        
      case 'channel_message':
        this._routeChannelMessage(message);
        break;
        
      default:
        this._log('Unhandled message type', message.type);
    }
  }
  
  _routeChannelMessage(message) {
    const channelKey = message.channel || 'default';
    const channel = this.channels.get(channelKey);
    
    if (channel) {
      channel.handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          this._logError(`Channel handler error for ${channelKey}:`, error);
        }
      });
    }
  }
  
  _authenticate() {
    if (!this.token) {
      this._logError('No token available for authentication');
      this._handleConnectionFailure();
      return;
    }
    
    this.ws.send(JSON.stringify({
      type: 'auth',
      token: this.token
    }));
  }
  
  _processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isAuthenticated) {
      const { channelKey, message } = this.messageQueue.shift();
      this.send(channelKey, message);
    }
  }
  
  _startPing() {
    this._stopPing();
    
    this.pingInterval = setInterval(() => {
      if (this.isAuthenticated && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }
  
  _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  _shouldReconnect(code) {
    const noReconnectCodes = [4001, 4002, 1000]; // Auth failures, intentional close
    return !noReconnectCodes.includes(code) && 
           this.reconnectAttempts < this.maxReconnectAttempts &&
           this.subscriberCount > 0 &&
           this.isDocumentVisible;
  }
  
  _scheduleReconnect() {
    if (this.isDestroyed || this.subscriberCount === 0) return;
    
    this.reconnectAttempts++;
    
    this._log(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (!this.isDestroyed && this.subscriberCount > 0 && this.isDocumentVisible) {
        this.connect().catch(err => {
          this._logError('Reconnection failed:', err);
        });
      }
    }, this.reconnectDelay);
    
    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      this.maxReconnectDelay
    );
  }
  
  _scheduleDisconnect() {
    // Disconnect after 1 second if no new subscribers
    setTimeout(() => {
      if (this.subscriberCount === 0 && !this.isDestroyed) {
        this.disconnect();
      }
    }, 1000);
  }
  
  _handleConnectionFailure() {
    this.isConnecting = false;
    this.isAuthenticated = false;
    this._setState(this.STATES.ERROR);
    
    if (this.ws) {
      this.ws.close();
    }
  }
  
  _setState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this._log(`State change: ${oldState} -> ${newState}`);
    }
  }
  
  _setupDocumentVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      this.isDocumentVisible = !document.hidden;
      
      if (document.hidden) {
        // Document became hidden
        if (this.isAuthenticated) {
          this.wasConnectedBeforeHidden = true;
          this._log('Document hidden - pausing connection');
          if (this.ws) {
            this.ws.close(4000, 'Document hidden');
          }
        }
      } else {
        // Document became visible
        if (this.wasConnectedBeforeHidden && this.subscriberCount > 0) {
          this._log('Document visible - resuming connection');
          this.wasConnectedBeforeHidden = false;
          this.connect().catch(err => {
            this._logError('Resume connection failed:', err);
          });
        }
      }
    });
  }
  
  _setupAuthListener() {
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const newToken = session?.access_token || null;
        if (newToken && newToken !== this._lastToken) {
          this._lastToken = newToken;
          this._reconnectWithToken(newToken);
        }
      });
      this._authSubscription = data?.subscription || null;
    } catch (error) {
      this._logError('Auth listener setup failed:', error);
    }
  }
  
  async _reconnectWithToken(token) {
    try {
      if (this.ws) {
        this.ws.close(4001, 'token_refresh');
        this.ws = null;
      }
      this.token = token;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      if (this.subscriberCount > 0) {
        await this.connect();
      }
    } catch (error) {
      this._logError('Token refresh reconnect failed:', error);
    }
  }
  
  _log(...args) {
    // Always log metrics in development
    const isDev = typeof location !== 'undefined' && 
                  (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    
    if (isDev) {
      console.log('[LazyWS]', ...args);
      
      // Log metrics for debugging in dev
      if (args[0] && args[0].includes('State change')) {
        const metrics = this.getMetrics();
        console.log('[LazyWS Metrics]', metrics);
      }
    }
  }
  
  _logError(...args) {
    console.error('[LazyWS]', ...args);
    
    // Always track errors in metrics
    this.metrics.errors++;
    
    const isDev = typeof location !== 'undefined' && 
                  (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    
    if (isDev) {
      const metrics = this.getMetrics();
      console.error('[LazyWS Error Metrics]', metrics);
    }
  }
}

// Create singleton instance
export const realtimeClient = new LazyWebSocketClient();

/**
 * Hook-like function for subscribing to real-time channels
 * Usage: const unsubscribe = useRealtimeChannel('updates', {}, handleMessage);
 */
export function useRealtimeChannel(channelKey, options = {}, onMessage = null) {
  return realtimeClient.subscribe(channelKey, options, onMessage);
}

export default realtimeClient;

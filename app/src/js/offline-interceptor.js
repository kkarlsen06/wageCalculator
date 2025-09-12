/*
  Offline Fetch Interceptor for Shift Mutations
  - Intercepts fetch calls to shift APIs
  - Queues requests when offline or network errors occur
  - Registers background sync for automatic retry
  - Handles idempotency and de-duplication
*/

import offlineQueue from './offline-queue.js';

class OfflineFetchInterceptor {
    constructor() {
        this.originalFetch = window.fetch;
        this.isRegistered = false;
        this.swRegistration = null;
        this.retryAttempts = new Map(); // Track retry attempts for fallback
        this.maxRetries = 3;
        this.retryDelay = 5000; // Start with 5s
    }

    async init(swRegistration = null) {
        if (this.isRegistered) return;
        
        this.swRegistration = swRegistration;
        this.setupFetchInterceptor();
        this.setupOnlineListener();
        this.isRegistered = true;
        
        console.log('[OfflineInterceptor] Initialized with SW registration:', !!swRegistration);
    }

    isShiftMutation(url, method) {
        if (method === 'GET') return false;
        
        // Check for shift API endpoints (both POST, PUT, DELETE operations)
        const shiftPatterns = [
            '/shifts',
            '/employee-shifts'
        ];
        
        return shiftPatterns.some(pattern => url.includes(pattern));
    }

    isOnline() {
        return navigator.onLine !== false;
    }

    async getAuthHeaders() {
        try {
            if (window.supa) {
                const { data: { session } } = await window.supa.auth.getSession();
                if (session) {
                    return { 'Authorization': `Bearer ${session.access_token}` };
                }
            }
            
            // Fallback: check for stored token in localStorage
            const token = localStorage.getItem('sb-access-token') || localStorage.getItem('access_token');
            if (token) {
                return { 'Authorization': `Bearer ${token}` };
            }
        } catch (error) {
            console.warn('[OfflineInterceptor] Failed to get auth headers:', error);
        }
        
        return {};
    }

    generateIdempotencyKey() {
        // Include client session info for better uniqueness across sessions
        const sessionId = sessionStorage.getItem('session_id') || localStorage.getItem('client_session_id') || 'unknown';
        return 'idem-' + Date.now() + '-' + sessionId.substring(0, 8) + '-' + Math.random().toString(36).substring(2, 9);
    }

    async handleOfflineRequest(url, options) {
        try {
            // Parse body for clientId if already present, otherwise add one
            let body = options.body;
            let parsedBody = null;
            let clientId = null;

            if (body && typeof body === 'string') {
                try {
                    parsedBody = JSON.parse(body);
                    clientId = parsedBody.clientId || this.generateIdempotencyKey();
                    parsedBody.clientId = clientId;
                    body = JSON.stringify(parsedBody);
                } catch (e) {
                    // If body is not JSON, add clientId as header
                    clientId = this.generateIdempotencyKey();
                }
            } else {
                clientId = this.generateIdempotencyKey();
            }

            // Get required auth headers
            const authHeaders = await this.getAuthHeaders();
            const headersNeeded = {
                'Content-Type': 'application/json',
                'Idempotency-Key': clientId,
                ...authHeaders
            };

            // Add to offline queue
            const queueResult = await offlineQueue.addToQueue(
                options.method,
                url,
                parsedBody || (body ? { rawBody: body } : null),
                headersNeeded
            );

            console.log('[OfflineInterceptor] Queued request:', { url, method: options.method, queueId: queueResult.id });

            // Register background sync if available
            if (this.swRegistration && 'sync' in this.swRegistration) {
                try {
                    await this.swRegistration.sync.register('shift-sync');
                    console.log('[OfflineInterceptor] Registered background sync');
                } catch (syncError) {
                    console.warn('[OfflineInterceptor] Failed to register sync:', syncError);
                    this.scheduleRetryFallback();
                }
            } else {
                console.log('[OfflineInterceptor] Background sync not available, using fallback');
                this.scheduleRetryFallback();
            }

            // Show user notification
            this.showOfflineNotification();

            // Return a successful-looking response for the UI
            return new Response(JSON.stringify({ 
                success: true, 
                offline: true, 
                clientId,
                message: 'Lagret lokalt - synces når du er online' 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('[OfflineInterceptor] Failed to handle offline request:', error);
            throw error;
        }
    }

    showOfflineNotification() {
        // Try multiple notification methods
        if (window.showToast) {
            window.showToast('Lagret lokalt — synces når du er online', 'info');
        } else if (window.ErrorHelper && window.ErrorHelper.showSuccess) {
            window.ErrorHelper.showSuccess('Lagret lokalt — synces når du er online');
        } else if (window.alert) {
            // Fallback to alert if no other notification system
            window.alert('Lagret lokalt — synces når du er online');
        } else {
            console.log('[OfflineInterceptor] Shift queued for sync when online');
        }
    }

    scheduleRetryFallback() {
        // Exponential backoff retry for browsers without background sync
        const attemptKey = 'fallback-retry';
        const currentAttempts = this.retryAttempts.get(attemptKey) || 0;
        
        if (currentAttempts >= this.maxRetries) {
            console.log('[OfflineInterceptor] Max retry attempts reached');
            return;
        }

        const delay = this.retryDelay * Math.pow(2, currentAttempts); // Exponential backoff
        this.retryAttempts.set(attemptKey, currentAttempts + 1);

        setTimeout(async () => {
            if (this.isOnline()) {
                await this.processOfflineQueue();
                this.retryAttempts.delete(attemptKey);
            } else {
                this.scheduleRetryFallback();
            }
        }, delay);
    }

    setupFetchInterceptor() {
        const self = this;
        
        window.fetch = async function(url, options = {}) {
            const method = options.method || 'GET';
            
            // Check if this is a shift mutation request
            if (self.isShiftMutation(url, method)) {
                console.log('[OfflineInterceptor] Intercepting shift request:', { url, method });
                
                // Check if we're online first
                if (!self.isOnline()) {
                    console.log('[OfflineInterceptor] Offline detected, queuing request');
                    return self.handleOfflineRequest(url, options);
                }
                
                // Try the request, handle network errors and server issues
                try {
                    const response = await self.originalFetch.call(window, url, options);
                    
                    // Check for various types of failures that warrant queuing
                    if (!response.ok) {
                        // Network issues (no response) or server errors (5xx)
                        if (response.status === 0 || response.status >= 500) {
                            console.log('[OfflineInterceptor] Server error detected, queuing request');
                            return self.handleOfflineRequest(url, options);
                        }
                        // 408 Request Timeout, 429 Too Many Requests - queue and retry
                        if (response.status === 408 || response.status === 429) {
                            console.log('[OfflineInterceptor] Timeout/rate limit detected, queuing request');
                            return self.handleOfflineRequest(url, options);
                        }
                        // For 4xx client errors (except auth), don't queue - return the error
                        if (response.status >= 400 && response.status < 500 && response.status !== 401) {
                            console.log('[OfflineInterceptor] Client error, not queuing:', response.status);
                            return response;
                        }
                    }
                    
                    return response;
                } catch (networkError) {
                    // Network failure: TypeError, fetch abort, DNS failure, etc.
                    if (networkError.name === 'TypeError' || networkError.name === 'AbortError' || 
                        networkError.message.includes('fetch') || networkError.message.includes('network')) {
                        console.log('[OfflineInterceptor] Network error caught, queuing request:', networkError.message);
                        return self.handleOfflineRequest(url, options);
                    }
                    // Re-throw non-network errors
                    throw networkError;
                }
            }
            
            // For non-shift requests, use original fetch
            return self.originalFetch.call(window, url, options);
        };
    }

    setupOnlineListener() {
        window.addEventListener('online', () => {
            console.log('[OfflineInterceptor] Device came online, processing queue');
            this.processOfflineQueue();
            this.retryAttempts.clear(); // Reset retry attempts
        });
    }

    async processOfflineQueue() {
        try {
            const queuedItems = await offlineQueue.getAllQueued();
            
            if (queuedItems.length === 0) {
                console.log('[OfflineInterceptor] No queued items to process');
                return;
            }

            console.log(`[OfflineInterceptor] Processing ${queuedItems.length} queued items`);

            let processedCount = 0;
            let failedCount = 0;

            for (const item of queuedItems) {
                try {
                    const success = await this.processQueuedItem(item);
                    if (success) {
                        processedCount++;
                    } else {
                        failedCount++;
                    }
                } catch (error) {
                    console.error('[OfflineInterceptor] Failed to process queued item:', error, item);
                    failedCount++;
                    
                    // If it's an auth error, stop processing
                    if (error.status === 401) {
                        console.log('[OfflineInterceptor] Auth error, stopping queue processing');
                        break;
                    }
                }
            }

            // Show completion feedback
            if (processedCount > 0) {
                const message = processedCount === 1 ? 
                    'Offline endring synkronisert' : 
                    `${processedCount} offline endringer synkronisert`;
                    
                if (window.showToast) {
                    window.showToast(message, 'success');
                } else if (window.ErrorHelper && window.ErrorHelper.showSuccess) {
                    window.ErrorHelper.showSuccess(message);
                }
            }

            console.log(`[OfflineInterceptor] Queue processing complete: ${processedCount} processed, ${failedCount} failed`);

    async processQueuedItem(item) {
        try {
            const { method, url, body, headersNeeded } = item;
            const headers = JSON.parse(headersNeeded);
            
            // Refresh auth token if needed
            const authHeaders = await this.getAuthHeaders();
            Object.assign(headers, authHeaders);

            let requestBody = null;
            if (body) {
                const parsedBody = JSON.parse(body);
                if (parsedBody.rawBody) {
                    requestBody = parsedBody.rawBody;
                } else {
                    requestBody = JSON.stringify(parsedBody);
                }
            }

            console.log('[OfflineInterceptor] Sending queued request:', { method, url });
            
            const response = await this.originalFetch.call(window, url, {
                method,
                headers,
                body: requestBody
            });

            // Handle response
            if (response.ok || response.status === 409 || response.status === 422) { 
                // 200-299 = success, 409 = conflict (duplicate), 422 = validation error but processed
                console.log('[OfflineInterceptor] Queued request succeeded:', response.status);
                await offlineQueue.deleteFromQueue(item.id);
                
                // Notify app to refresh data if available
                if (window.app) {
                    if (window.app.loadShifts) {
                        window.app.loadShifts();
                    }
                    if (window.app.fetchAndDisplayEmployeeShifts) {
                        window.app.fetchAndDisplayEmployeeShifts();
                    }
                    // Refresh the UI to show updated data
                    if (window.app.refreshUI) {
                        window.app.refreshUI();
                    }
                }
                
                return true; // Success
            } else if (response.status === 401) {
                console.log('[OfflineInterceptor] Auth required, stopping sync');
                const error = new Error('Authentication required');
                error.status = 401;
                throw error;
            } else if (response.status >= 400 && response.status < 500) {
                // Client error - don't retry, remove from queue
                console.warn('[OfflineInterceptor] Client error, removing from queue:', response.status);
                const errorText = await response.text().catch(() => '');
                console.warn('[OfflineInterceptor] Error details:', errorText);
                await offlineQueue.deleteFromQueue(item.id);
                return false; // Don't retry
            } else {
                console.warn('[OfflineInterceptor] Queued request failed, will retry:', response.status);
                // Keep item in queue for retry
                return false;
            }
        } catch (error) {
            console.error('[OfflineInterceptor] Error processing queued item:', error);
            throw error;
        }
    }

    async getQueueStatus() {
        const count = await offlineQueue.getQueueCount();
        return { queuedItems: count };
    }
}

// Singleton instance
const offlineInterceptor = new OfflineFetchInterceptor();

// Export for global access
if (typeof window !== 'undefined') {
    window.OfflineFetchInterceptor = OfflineFetchInterceptor;
    window.offlineInterceptor = offlineInterceptor;
}

export default offlineInterceptor;
export { OfflineFetchInterceptor };
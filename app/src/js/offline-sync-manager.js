/*
  Offline Sync Manager
  - Coordinates offline functionality and service worker registration
  - Handles periodic background sync registration
  - Implements fallback mechanisms for unsupported browsers
  - Manages message passing between main thread and service worker
*/

import offlineInterceptor from './offline-interceptor.js';

class OfflineSyncManager {
    constructor() {
        this.swRegistration = null;
        this.isInitialized = false;
        this.supportsBackgroundSync = false;
        this.supportsPeriodicBackgroundSync = false;
        this.messageHandlers = new Map();
        this.fallbackTimerId = null;
    }

    async init() {
        if (this.isInitialized) return;

        console.log('[OfflineSyncManager] Initializing...');
        
        try {
            // Register service worker
            await this.registerServiceWorker();
            
            // Check for background sync support
            this.checkBackgroundSyncSupport();
            
            // Initialize offline interceptor
            await offlineInterceptor.init(this.swRegistration);
            
            // Setup message handling
            this.setupMessageHandling();
            
            // Setup periodic sync
            await this.setupPeriodicSync();
            
            // Setup fallback mechanisms
            this.setupFallbacks();
            
            this.isInitialized = true;
            console.log('[OfflineSyncManager] Initialized successfully');
            
        } catch (error) {
            console.error('[OfflineSyncManager] Initialization failed:', error);
            // Initialize fallbacks even if SW fails
            this.setupFallbacks();
            this.isInitialized = true;
        }
    }

    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[OfflineSyncManager] Service Worker not supported');
            return;
        }

        try {
            this.swRegistration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });

            console.log('[OfflineSyncManager] Service Worker registered:', this.swRegistration.scope);

            // Handle updates
            this.swRegistration.addEventListener('updatefound', () => {
                console.log('[OfflineSyncManager] Service Worker update found');
            });

            // Wait for SW to be ready
            await navigator.serviceWorker.ready;

        } catch (error) {
            console.error('[OfflineSyncManager] Service Worker registration failed:', error);
            throw error;
        }
    }

    checkBackgroundSyncSupport() {
        this.supportsBackgroundSync = 
            this.swRegistration && 
            'sync' in this.swRegistration;

        this.supportsPeriodicBackgroundSync = 
            this.swRegistration && 
            'periodicSync' in this.swRegistration;

        console.log('[OfflineSyncManager] Background sync support:', {
            backgroundSync: this.supportsBackgroundSync,
            periodicBackgroundSync: this.supportsPeriodicBackgroundSync
        });
    }

    setupMessageHandling() {
        // Handle messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'SHIFT_SYNC_COMPLETE':
                    this.handleSyncComplete();
                    break;
                case 'SHIFTS_REFRESHED':
                    this.handleShiftsRefreshed();
                    break;
                case 'GET_AUTH_TOKEN':
                    this.handleAuthTokenRequest(event);
                    break;
                case 'GET_API_BASE':
                    this.handleApiBaseRequest(event);
                    break;
                default:
                    console.log('[OfflineSyncManager] Unknown message type:', type);
            }
        });
    }

    async handleAuthTokenRequest(event) {
        try {
            let token = null;
            
            if (window.supa) {
                const { data: { session } } = await window.supa.auth.getSession();
                if (session) {
                    token = session.access_token;
                }
            }
            
            // Fallback to localStorage
            if (!token) {
                token = localStorage.getItem('sb-access-token') || 
                       localStorage.getItem('access_token');
            }
            
            event.ports[0].postMessage({ token });
        } catch (error) {
            console.error('[OfflineSyncManager] Failed to get auth token:', error);
            event.ports[0].postMessage({ token: null });
        }
    }

    async handleApiBaseRequest(event) {
        try {
            const apiBase = window.CONFIG?.apiBase || 
                           window.location.origin + '/api' ||
                           null;
            
            event.ports[0].postMessage({ apiBase });
        } catch (error) {
            console.error('[OfflineSyncManager] Failed to get API base:', error);
            event.ports[0].postMessage({ apiBase: null });
        }
    }

    handleSyncComplete() {
        console.log('[OfflineSyncManager] Sync completed, refreshing data');
        
        // Reload shifts in the app
        if (window.app && window.app.loadShifts) {
            window.app.loadShifts();
        }
        
        // Show success notification
        if (window.showToast) {
            window.showToast('Offline endringer synkronisert', 'success');
        }
        
        // Clear fallback timer since sync worked
        if (this.fallbackTimerId) {
            clearTimeout(this.fallbackTimerId);
            this.fallbackTimerId = null;
        }
    }

    handleShiftsRefreshed() {
        console.log('[OfflineSyncManager] Background refresh completed');
        
        // Reload shifts in the app
        if (window.app && window.app.loadShifts) {
            window.app.loadShifts();
        }
    }

    async setupPeriodicSync() {
        if (!this.supportsPeriodicBackgroundSync) {
            console.log('[OfflineSyncManager] Periodic background sync not supported');
            return;
        }

        try {
            // Request permission first
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
            
            if (status.state === 'granted') {
                await this.swRegistration.periodicSync.register('shifts-refresh', {
                    minInterval: 6 * 60 * 60 * 1000 // 6 hours
                });
                console.log('[OfflineSyncManager] Periodic sync registered for shifts-refresh');
            } else {
                console.log('[OfflineSyncManager] Periodic sync permission not granted:', status.state);
            }
        } catch (error) {
            console.warn('[OfflineSyncManager] Failed to register periodic sync:', error);
        }
    }

    setupFallbacks() {
        console.log('[OfflineSyncManager] Setting up fallbacks');
        
        // Online event listener for manual queue processing
        window.addEventListener('online', () => {
            console.log('[OfflineSyncManager] Device came online (fallback)');
            this.processFallbackQueue();
        });

        // Visibility change listener for when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                console.log('[OfflineSyncManager] App became visible and online (fallback)');
                this.processFallbackQueue();
            }
        });

        // Page load listener
        window.addEventListener('load', () => {
            if (navigator.onLine) {
                console.log('[OfflineSyncManager] Page loaded and online (fallback)');
                this.processFallbackQueue();
            }
        });
    }

    async processFallbackQueue() {
        try {
            // Use the offline interceptor's queue processing
            if (offlineInterceptor && offlineInterceptor.processOfflineQueue) {
                await offlineInterceptor.processOfflineQueue();
            }
        } catch (error) {
            console.error('[OfflineSyncManager] Fallback queue processing failed:', error);
        }
    }

    async triggerSync() {
        if (this.supportsBackgroundSync) {
            try {
                await this.swRegistration.sync.register('shift-sync');
                console.log('[OfflineSyncManager] Manual sync triggered');
            } catch (error) {
                console.error('[OfflineSyncManager] Failed to trigger manual sync:', error);
                await this.processFallbackQueue();
            }
        } else {
            console.log('[OfflineSyncManager] Using fallback for manual sync');
            await this.processFallbackQueue();
        }
    }

    async getQueueStatus() {
        if (offlineInterceptor && offlineInterceptor.getQueueStatus) {
            return await offlineInterceptor.getQueueStatus();
        }
        return { queuedItems: 0 };
    }

    // Utility method for manual testing
    async testOfflineMode() {
        console.log('[OfflineSyncManager] Testing offline mode...');
        
        // Temporarily override navigator.onLine
        const originalOnLine = navigator.onLine;
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false
        });

        try {
            // Make a test request that should be queued
            const testUrl = `${window.CONFIG?.apiBase || ''}/shifts`;
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    test: true,
                    shift_date: '2023-01-01',
                    start_time: '09:00',
                    end_time: '17:00'
                })
            });

            console.log('[OfflineSyncManager] Test request response:', response.status);
            
        } finally {
            // Restore original online status
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: originalOnLine
            });
        }
    }
}

// Singleton instance
const offlineSyncManager = new OfflineSyncManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => offlineSyncManager.init());
} else {
    // DOM is already ready
    offlineSyncManager.init();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.OfflineSyncManager = OfflineSyncManager;
    window.offlineSyncManager = offlineSyncManager;
}

export default offlineSyncManager;
export { OfflineSyncManager };
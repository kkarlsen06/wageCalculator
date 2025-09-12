# Offline Sync Implementation for Shift Mutations

## Overview

This implementation provides robust offline support for shift add/edit/delete operations using Background Sync with comprehensive fallbacks. The system ensures no data loss and prevents duplicate submissions while providing a seamless user experience.

## Architecture

### Components

1. **IndexedDB Queue Storage** (`app/src/js/offline-queue.js`)
   - Manages offline queue with "wc-offline" database
   - Object stores: `shiftQueue` (mutations) and `meta` (versioning)
   - CRUD operations for queue management

2. **Fetch Interceptor** (`app/src/js/offline-interceptor.js`)
   - Intercepts shift-related API calls (POST/PUT/DELETE to `/shifts` and `/employee-shifts`)
   - Handles offline queuing and automatic retry with exponential backoff
   - Generates unique client IDs for idempotency

3. **Service Worker** (`app/public/service-worker.js`)
   - Background sync event handler for `shift-sync` tag
   - Periodic background sync for `shifts-refresh` (6-hour intervals)
   - Authentication and API communication from background context

4. **Sync Manager** (`app/src/js/offline-sync-manager.js`)
   - Coordinates all offline functionality
   - Service worker registration and message passing
   - Fallback mechanisms for unsupported browsers
   - Auto-initialization on app bootstrap

## Key Features

### Background Sync
- Registers `shift-sync` for mutation queue processing
- Registers `shifts-refresh` for periodic data refresh (6 hours)
- Handles authentication token retrieval from main thread
- Processes queue in FIFO order with proper error handling

### Data Consistency & De-duplication
- Each mutation gets a unique `clientId` for idempotency
- Server should handle duplicate `clientId`s as no-ops
- 409 (Conflict) responses treated as successful (duplicate resolved)
- Queue items removed only on successful processing

### Fallback Mechanisms
- Online event listeners for manual queue processing
- Visibility change detection for app focus events
- Exponential backoff retry (5s → 15s → 60s) for unsupported browsers
- Graceful degradation when Background Sync unavailable

### Authentication Handling
- Supports Supabase session tokens via `window.supa`
- Fallback to localStorage token storage
- 401 responses stop queue processing (user needs re-auth)
- Token refresh on each sync attempt

## Files Changed

### New Files:
- `app/src/js/offline-queue.js` - IndexedDB wrapper utility
- `app/src/js/offline-interceptor.js` - Fetch interception and queuing
- `app/src/js/offline-sync-manager.js` - Main coordination layer
- `OFFLINE_SYNC_IMPLEMENTATION.md` - This documentation

### Modified Files:
- `app/public/service-worker.js` - Added sync event handlers and queue processing
- `app/src/kalkulator.js` - Added offline sync manager import

## API Integration Points

### Intercepted Endpoints:
- `POST ${apiBase}/shifts` - Create personal planner shift
- `PUT ${apiBase}/shifts/:id` - Update personal planner shift  
- `DELETE ${apiBase}/shifts/:id` - Delete personal planner shift
- `DELETE ${apiBase}/shifts/outside-month/:month` - Bulk delete shifts
- `POST ${apiBase}/employee-shifts` - Create employee shift
- `PUT ${apiBase}/employee-shifts/:id` - Update employee shift
- `DELETE ${apiBase}/employee-shifts/:id` - Delete employee shift

### Authentication:
The system sources auth tokens from:
1. `window.supa.auth.getSession()` (primary)
2. `localStorage.getItem('sb-access-token')` (fallback)
3. `localStorage.getItem('access_token')` (fallback)

### Idempotency Implementation:
- Each request gets a unique `clientId` added to request body
- Server should check for existing operations with the same `clientId`
- Recommended server implementation: ignore requests with known `clientId`s

## Testing Instructions

### Basic Offline Flow Test:
1. Open Chrome DevTools → Network tab
2. Set throttling to "Offline"
3. Navigate to `/shift-add` and create a new shift
4. Verify notification: "Lagret lokalt — synces når du er online"
5. Check DevTools → Application → IndexedDB → wc-offline → shiftQueue for queued item
6. Set network back to "Online"
7. Check Console for sync processing logs
8. Verify shift appears in app data and queue is cleared

### Background Sync Test:
1. Go offline and create multiple shifts
2. Close the browser tab completely
3. Go back online (ensure device connectivity changes)
4. Reopen the app
5. Check DevTools → Application → Service Workers for "shift-sync" events
6. Verify all queued shifts were processed and appear in the app

### Periodic Sync Test (Desktop Chrome):
1. Enable `chrome://flags/#enable-desktop-pwas-periodic-background-sync`
2. Install app as PWA (if supported)
3. Leave app closed for several hours
4. Check Console for periodic refresh logs
5. Verify fresh data loads when app reopens

### Fallback Mechanisms Test:
1. Open app in Firefox or Safari (limited Background Sync support)
2. Go offline, create shifts, verify queuing
3. Go online, verify automatic processing via online event
4. Test app focus detection by switching tabs while offline

### Authentication Error Test:
1. Go offline, create shifts
2. Clear localStorage auth tokens while offline
3. Go online
4. Verify sync stops with auth error and re-registers for retry

### DevTools Debugging:
- **Console**: Look for `[OfflineInterceptor]`, `[sw]`, and `[OfflineSyncManager]` logs
- **Application → Storage → IndexedDB**: Check `wc-offline` database content
- **Application → Service Workers**: Verify registration and sync events
- **Network**: Monitor queued requests being replayed

## Browser Support

### Full Support (Background Sync):
- Chrome 49+
- Edge 79+
- Opera 36+

### Partial Support (Fallback Only):
- Firefox (online event fallback)
- Safari (online event fallback)
- IE 11+ (if supported by base app)

### Periodic Background Sync:
- Chrome 80+ (desktop PWAs with flag enabled)
- Limited mobile support (requires PWA installation)

## Troubleshooting

### Common Issues:

1. **Sync not triggering**: Check service worker registration in DevTools
2. **Auth errors**: Verify token availability and validity
3. **Queue not clearing**: Check for network errors or server issues
4. **Duplicate shifts**: Ensure server implements `clientId` de-duplication

### Debug Tools:

```javascript
// Check queue status
await window.offlineQueue.getQueueCount()

// Manual sync trigger
await window.offlineSyncManager.triggerSync()

// Test offline mode
await window.offlineSyncManager.testOfflineMode()

// Queue inspection
await window.offlineQueue.getAllQueued()
```

## Production Considerations

1. **Server Idempotency**: Implement `clientId` checking on shift endpoints
2. **Rate Limiting**: Consider batch processing for large queues  
3. **Storage Limits**: IndexedDB has browser-specific size limits
4. **Error Monitoring**: Log sync failures for debugging
5. **User Communication**: Clear offline status indicators in UI

## Future Enhancements

1. **Conflict Resolution**: Handle server-side changes during offline period
2. **Optimistic UI**: Show queued changes immediately in interface
3. **Batch Operations**: Group multiple mutations into single requests
4. **Progressive Sync**: Sync high-priority changes first
5. **Storage Cleanup**: Automatic cleanup of old queue entries
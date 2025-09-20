# Real-time WebSocket Architecture

## Overview

The application uses a lazy-loading WebSocket client for real-time features. WebSocket connections are only established when features that require real-time communication are actively being used.

## Key Components

### LazyWebSocketClient (`/src/realtime/client.js`)

The main WebSocket client that provides:

- **Lazy initialization**: Only connects when needed
- **Reference counting**: Multiple components can subscribe; connection maintained as long as subscribers exist
- **Auto-reconnection**: Exponential backoff with jitter on connection failures
- **Document visibility handling**: Pauses/resumes connection based on tab visibility
- **Auth integration**: Refreshes JWT tokens automatically via Supabase
- **Metrics**: Connection telemetry for debugging and monitoring

### Connection Lifecycle

1. **Connection Request**: First subscriber triggers lazy connection
2. **Authentication**: JWT token passed via WebSocket subprotocol
3. **Channel Subscription**: Components subscribe to specific channels (e.g., 'live_feed')
4. **Message Routing**: Incoming messages routed to appropriate channel handlers
5. **Cleanup**: Last subscriber cleanup triggers disconnection (with 1s delay)

### Usage Patterns

#### Basic Channel Subscription
```javascript
import { useRealtimeChannel } from '/src/realtime/client.js';

// Subscribe to a channel
const unsubscribe = useRealtimeChannel('updates', {}, (message) => {
  console.log('Received:', message);
});

// Clean up when done
unsubscribe();
```

#### Sending Messages
```javascript
import { realtimeClient } from '/src/realtime/client.js';

realtimeClient.send('updates', {
  type: 'user_message',
  content: 'Hello world'
});
```

## Integration Points

### Adding New Features
To add real-time features:

1. Subscribe to a channel when the feature becomes active
2. Handle incoming messages for your feature
3. Unsubscribe when the feature is no longer active

Example:
```javascript
// In your feature activation code
const unsubscribe = useRealtimeChannel('live_feed', {}, handleLiveFeedMessage);

// In your feature cleanup code
unsubscribe();
```

## Document Visibility Handling

The client automatically handles browser tab visibility:

- **Tab Hidden**: Closes WebSocket connection
- **Tab Visible**: Re-establishes connection if subscribers exist
- **Data Loss Protection**: Message queue maintained during visibility transitions

## Metrics & Debugging

In development environments, the client logs detailed metrics:

- Connection attempts and successes
- Total uptime
- Error counts
- Subscriber counts
- Channel counts

Access metrics programmatically:
```javascript
const metrics = realtimeClient.getMetrics();
console.log(metrics);
```

## Server-Side Requirements

The WebSocket server must:

1. Accept JWT tokens via WebSocket subprotocol: `['jwt', token]`
2. Send `auth_success` message with `connectionId` on successful auth
3. Route messages by channel using `{ type: 'channel_message', channel: 'channelKey', ... }`
4. Respond to `ping` messages with `pong`

## Migration from Eager Loading

**Before**: WebSocket connected on app startup
**After**: WebSocket connects only when real-time features are used

Benefits:
- Reduced resource usage for users not using real-time features
- Faster initial page loads
- Better connection management (auto-disconnect when not needed)
- Improved mobile experience (respect device sleep/battery optimization)

## Troubleshooting

### Connection Issues
1. Check browser network tab for WebSocket connections
2. Verify JWT token validity
3. Check server WebSocket endpoint availability
4. Review console logs for LazyWS messages

### Memory Leaks
1. Ensure all subscribers call their unsubscribe function
2. Check metrics for unexpected subscriber counts
3. Verify channel cleanup in component unmount/cleanup code

### Performance
1. Monitor connection uptime in metrics
2. Check for excessive reconnection attempts
3. Verify document visibility handling works correctly

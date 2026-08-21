# Relay API Documentation

Base URL: `https://frontend-task-chatapp.onrender.com/api`
WebSocket URL: `https://frontend-task-chatapp.onrender.com`

All endpoints except `/auth/login` and `/health` require a Bearer token in the `Authorization` header.

## Authentication & Users

### POST /auth/login
Log in or register a user. If the phone number is new, a new user is created.

**Request**
```json
{
  "phone": "+15551234567",
  "name": "Ada Lovelace"
}
```

**Response** (200 OK)
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "user_123",
    "name": "Ada Lovelace",
    "phone": "+15551234567"
  }
}
```

### GET /auth/me
Get the current authenticated user's profile.

**Response** (200 OK)
```json
{
  "id": "user_123",
  "name": "Ada Lovelace",
  "phone": "+15551234567"
}
```

### GET /users/search
Search for users by name or phone.

**Query Parameters**
- `q` (required): Search term.

**Response** (200 OK)
```json
{
  "users": [
    {
      "id": "user_456",
      "name": "Bob Smith",
      "phone": "+15550000000"
    }
  ]
}
```

## Conversations

### GET /conversations
List the conversations the current user is part of.

**Response** (200 OK)
```json
{
  "conversations": [
    {
      "id": "conv_1",
      "isGroup": false,
      "participants": [
        { "id": "user_123", "name": "Ada Lovelace" },
        { "id": "user_456", "name": "Bob Smith" }
      ],
      "lastMessage": {
        "text": "Hello!",
        "createdAt": "2026-08-22T00:00:00Z"
      }
    }
  ]
}
```

### POST /conversations
Start a direct conversation with another user.

**Request**
```json
{
  "userId": "user_456"
}
```

**Response** (200 OK)
```json
{
  "id": "conv_1",
  "isGroup": false,
  "participants": [...]
}
```

### GET /conversations/{id}/messages
Get message history for a conversation.

**Query Parameters**
- `limit` (optional): Number of messages to return.
- `before` (optional): Cursor for pagination.

**Response** (200 OK)
```json
{
  "messages": [
    {
      "id": "msg_1",
      "conversationId": "conv_1",
      "senderId": "user_456",
      "text": "Hello!",
      "createdAt": "2026-08-22T00:00:00Z"
    }
  ],
  "nextCursor": "msg_0"
}
```

### POST /messages
Send a message in a conversation.

**Request**
```json
{
  "conversationId": "conv_1",
  "text": "Hello there!"
}
```

**Response** (200 OK)
```json
{
  "id": "msg_2",
  "conversationId": "conv_1",
  "senderId": "user_123",
  "text": "Hello there!",
  "createdAt": "2026-08-22T00:01:00Z"
}
```

## Group Management

### POST /conversations/group
Create a group conversation. The creator automatically becomes an admin.

**Request**
```json
{
  "name": "Project Team",
  "participantIds": ["user_456", "user_789"]
}
```

**Response** (200 OK)
```json
{
  "id": "conv_2",
  "isGroup": true,
  "name": "Project Team",
  "admins": ["user_123"],
  "participants": [...]
}
```

*(Additional endpoints like add/remove participants, promote admins, and rename groups are supported as per the OpenAPI spec with similar request/response structures.)*

## WebSockets
WebSocket events are available for real-time updates via Socket.IO.

**Events**
- `message:new`: Emitted when a new message is received.
- `conversation:updated`: Emitted when a group changes.

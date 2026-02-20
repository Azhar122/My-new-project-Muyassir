# Services Layer

This folder contains API service functions that communicate with the backend.

## Files

### api.ts
Axios instance with:
- Base URL configuration
- Auth token interceptor (auto-attaches JWT)
- 401 error handling (clears token on unauthorized)

### auth.ts
Authentication functions:
- `login(email, password)` - Returns user + token
- `register(data)` - Creates account
- `logout()` - Clears stored token
- `getCurrentUser()` - Gets authenticated user info

### services.ts
Service listing functions:
- `getServices(filters)` - List with filters (type, city, price)
- `getService(id)` - Single service details
- `getProviderListings()` - Provider's own services

### contracts.ts
Contract management:
- `createContract(data)` - Student creates request
- `providerAccept(id)` - Provider accepts
- `providerReject(id)` - Provider rejects
- `studentConfirm(id)` - Student confirms
- `cancelContract(id)` - Cancel contract
- `makePayment(data)` - Process payment

### chat.ts
Messaging functions:
- `getConversations()` - List all chats
- `createConversation(participantId)` - Start new chat
- `getMessages(conversationId)` - Get chat messages
- `sendMessage(conversationId, content)` - Send message

## Adding New Services

1. Create new file: `newfeature.ts`
2. Import api: `import api from './api'`
3. Export functions that call api endpoints
4. Add TypeScript types in `/types/index.ts`

## Example

```typescript
import api from './api';

export const newService = {
  getData: async () => {
    const response = await api.get('/new-endpoint');
    return response.data;
  },
  
  postData: async (data: DataType) => {
    const response = await api.post('/new-endpoint', data);
    return response.data;
  },
};
```

# Firestore MCP Server

A Model Context Protocol (MCP) server that provides secure, permission-controlled access to Firebase Firestore. This server allows AI assistants and other MCP clients to interact with Firestore databases through a standardized interface.

## Features

### Core Functionality
- 🔐 **Granular Permissions**: Control access at the collection and operation level
- 📄 **Full CRUD Operations**: Create, read, update, and delete documents
- 🔍 **Advanced Queries**: Support for filtering, ordering, and limiting results
- 📁 **Subcollection Support**: Work with nested collections and documents
- 🔄 **Batch Operations**: Execute multiple operations atomically
- 💾 **Transactions**: Ensure data consistency with transactional operations
- 🎯 **Field Value Operations**: Atomic increments, array operations, and server timestamps

### Security & Control
- ✅ Collection-level access control
- 🛡️ Operation-specific permissions (read, write, delete, query)
- 🔒 Default deny with explicit allow rules
- 📋 Conditional permissions (coming soon)

## Installation

### Using npm/yarn/pnpm

```bash
npm install mcp-firestore
# or
yarn add mcp-firestore
# or
pnpm add mcp-firestore
```

### From Source

```bash
git clone https://github.com/yourusername/mcp-firestore.git
cd mcp-firestore
pnpm install
pnpm build
```

## Configuration

### Environment Variables

Create a `.env` file with your Firestore configuration:

```env
# Required
FIRESTORE_PROJECT_ID=your-project-id

# Optional - for authentication
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

### Permission Configuration

Create a `permissions.json` file to control access:

```json
{
  "collections": [
    {
      "collectionId": "users",
      "operations": ["read", "write", "query"]
    },
    {
      "collectionId": "posts",
      "operations": ["read", "query"]
    }
  ],
  "defaultAllow": false
}
```

## Usage

### Starting the Server

```bash
# With default permissions
mcp-firestore

# With custom permissions file
mcp-firestore --config permissions.json

# With full access (development only)
mcp-firestore --full-access

# With read-only access to specific collections
mcp-firestore --read-only --collections users,posts
```

### Claude Desktop Integration

Add to your Claude Desktop configuration:

```json
{
  "servers": {
    "firestore": {
      "command": "mcp-firestore",
      "args": ["--config", "path/to/permissions.json"],
      "env": {
        "FIRESTORE_PROJECT_ID": "your-project-id"
      }
    }
  }
}
```

## Available Tools

### Basic Operations

1. **firestore-list-collections**
   - List all accessible collections
   ```json
   {}
   ```

2. **firestore-get-collection**
   - Get all documents from a collection
   ```json
   {
     "collectionId": "users"
   }
   ```

3. **firestore-get-document**
   - Get a specific document
   ```json
   {
     "collectionId": "users",
     "documentId": "user123"
   }
   ```

4. **firestore-create-document**
   - Create a new document
   ```json
   {
     "collectionId": "users",
     "documentId": "user123",
     "data": {
       "name": "John Doe",
       "email": "john@example.com"
     }
   }
   ```

5. **firestore-update-document**
   - Update an existing document
   ```json
   {
     "collectionId": "users",
     "documentId": "user123",
     "data": {
       "name": "Jane Doe"
     }
   }
   ```

6. **firestore-delete-document**
   - Delete a document
   ```json
   {
     "collectionId": "users",
     "documentId": "user123"
   }
   ```

### Query Operations

7. **firestore-query-collection**
   - Query documents with filters
   ```json
   {
     "collectionId": "users",
     "filters": [
       {
         "field": "age",
         "operator": ">",
         "value": 18
       }
     ],
     "orderBy": {
       "field": "createdAt",
       "direction": "desc"
     },
     "limit": 10
   }
   ```

### Subcollection Operations

8. **firestore-list-subcollections**
   - List subcollections of a document
   ```json
   {
     "documentPath": "users/user123"
   }
   ```

9. **firestore-get-collection-by-path**
   - Get documents from a subcollection
   ```json
   {
     "collectionPath": "users/user123/orders"
   }
   ```

10. **firestore-create-document-by-path**
    - Create a document in a subcollection
    ```json
    {
      "collectionPath": "users/user123/orders",
      "data": {
        "item": "Widget",
        "quantity": 2
      }
    }
    ```

### Batch Operations

11. **firestore-batch-write**
    - Execute multiple write operations atomically
    ```json
    {
      "operations": [
        {
          "type": "create",
          "collectionPath": "products",
          "documentId": "product1",
          "data": { "name": "Widget" }
        },
        {
          "type": "update",
          "documentPath": "inventory/product1",
          "data": { "count": 100 }
        }
      ]
    }
    ```

12. **firestore-batch-read**
    - Read multiple documents in one operation
    ```json
    {
      "documentPaths": [
        "users/user1",
        "users/user2",
        "products/product1"
      ]
    }
    ```

13. **firestore-transaction**
    - Execute a transaction with reads and conditional writes
    ```json
    {
      "reads": ["products/product1"],
      "operations": [
        {
          "type": "update",
          "documentPath": "products/product1",
          "data": { "stock": 99 }
        }
      ],
      "conditionScript": "return readResults['products/product1'].data.stock > 0;"
    }
    ```

### Field Value Operations

14. **firestore-increment-field**
    - Atomically increment a numeric field
    ```json
    {
      "documentPath": "stats/daily",
      "field": "visitCount",
      "incrementBy": 1
    }
    ```

15. **firestore-array-union**
    - Add elements to an array without duplicates
    ```json
    {
      "documentPath": "users/user123",
      "field": "tags",
      "elements": ["premium", "verified"]
    }
    ```

16. **firestore-server-timestamp**
    - Set fields to server timestamp
    ```json
    {
      "documentPath": "users/user123",
      "fields": ["lastLogin", "modifiedAt"]
    }
    ```

## Resources

The server also provides MCP resources for direct access to Firestore data:

- `firestore://collections` - List all collections
- `firestore://collection/{collectionId}` - Access collection data
- `firestore://collection/{collectionId}/document/{documentId}` - Access document data
- `firestore://path/{path}` - Access any path (collections or documents)

## Examples

### Basic CRUD Operations

```javascript
// Create a new user
await client.callTool("firestore-create-document", {
  collectionId: "users",
  documentId: "user123",
  data: {
    name: "John Doe",
    email: "john@example.com",
    createdAt: new Date().toISOString()
  }
});

// Update user data
await client.callTool("firestore-update-document", {
  collectionId: "users",
  documentId: "user123",
  data: {
    lastLogin: new Date().toISOString()
  }
});

// Query active users
await client.callTool("firestore-query-collection", {
  collectionId: "users",
  filters: [
    { field: "status", operator: "==", value: "active" }
  ],
  orderBy: { field: "createdAt", direction: "desc" },
  limit: 10
});
```

### Working with Subcollections

```javascript
// Create an order for a user
await client.callTool("firestore-create-document-by-path", {
  collectionPath: "users/user123/orders",
  data: {
    items: ["widget1", "widget2"],
    total: 99.99,
    status: "pending"
  }
});

// Get all orders for a user
await client.callTool("firestore-get-collection-by-path", {
  collectionPath: "users/user123/orders"
});
```

### Batch Operations

```javascript
// Atomic updates across multiple documents
await client.callTool("firestore-batch-write", {
  operations: [
    {
      type: "update",
      documentPath: "products/widget1",
      data: { stock: 95 }
    },
    {
      type: "create",
      collectionPath: "orders",
      data: {
        product: "widget1",
        quantity: 5,
        userId: "user123"
      }
    },
    {
      type: "update",
      documentPath: "users/user123",
      data: { orderCount: 1 }
    }
  ]
});
```

### Field Value Operations

```javascript
// Increment a counter
await client.callTool("firestore-increment-field", {
  documentPath: "stats/global",
  field: "totalOrders",
  incrementBy: 1
});

// Add tags without duplicates
await client.callTool("firestore-array-union", {
  documentPath: "products/widget1",
  field: "tags",
  elements: ["bestseller", "featured"]
});

// Set server timestamp
await client.callTool("firestore-server-timestamp", {
  documentPath: "logs/access",
  fields: ["timestamp", "lastModified"]
});
```

## Security Best Practices

1. **Use Minimal Permissions**: Only grant access to collections and operations that are necessary
2. **Default Deny**: Set `defaultAllow: false` in production environments
3. **Service Account Security**: Protect your service account credentials
4. **Environment Variables**: Never commit credentials to version control
5. **Audit Access**: Regularly review permission configurations

## Development

### Running Tests

```bash
pnpm test
pnpm test:coverage
```

### Building

```bash
pnpm build
```

### Docker

```bash
# Build image
docker build -t mcp-firestore .

# Run container
docker run -e FIRESTORE_PROJECT_ID=your-project mcp-firestore
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account
   - Check that the service account has necessary Firestore permissions

2. **Permission Denied**
   - Verify collection is listed in permissions configuration
   - Check that the operation is allowed for the collection

3. **Connection Issues**
   - Confirm project ID is correct
   - Check network connectivity to Firestore

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Built on the [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic.
# Firestore MCP Testing Guide

This guide provides instructions for testing the Firestore MCP server both during development and in production environments.

## Test Environment Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create a `.env.test` file for testing:

```env
FIRESTORE_PROJECT_ID=your-test-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/test-service-account.json
```

### 3. Setup Firestore Emulator (Optional)

For local testing without connecting to a real Firestore instance:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize emulator
firebase init emulators

# Start emulator
firebase emulators:start --only firestore
```

Update your test environment to use the emulator:

```env
FIRESTORE_EMULATOR_HOST=localhost:8080
```

## Running Tests

### Unit Tests

Run all unit tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

Generate coverage report:

```bash
pnpm test:coverage
```

### Integration Tests

To test the server with a real Firestore instance:

1. Start the test server:
```bash
pnpm build
node dist/index.js --config test-permissions.json
```

2. Run integration tests:
```bash
# In a separate terminal
node test/integration/test-client.js
```

## Manual Testing

### Using the MCP Inspector

1. Install the MCP Inspector:
```bash
npm install -g @modelcontextprotocol/inspector
```

2. Start the server:
```bash
pnpm build
mcp-inspector node dist/index.js
```

3. Use the inspector UI to test individual tools

### Testing Individual Tools

Create test scripts for specific tools:

```javascript
// test-scripts/test-create.js
import { Client } from '@modelcontextprotocol/client';

const client = new Client({
  name: 'test-client',
  version: '1.0.0'
});

// Connect to server
await client.connect({
  command: 'node',
  args: ['dist/index.js']
});

// Test create document
const result = await client.callTool('firestore-create-document', {
  collectionId: 'test-collection',
  documentId: 'test-doc',
  data: {
    name: 'Test Document',
    created: new Date().toISOString()
  }
});

console.log('Create result:', result);
```

## Test Scenarios

### 1. Basic CRUD Operations

Test creating, reading, updating, and deleting documents:

```javascript
// Create
await testCreateDocument();

// Read
await testGetDocument();
await testGetCollection();

// Update
await testUpdateDocument();

// Delete
await testDeleteDocument();
```

### 2. Permission Testing

Test different permission configurations:

```javascript
// Test with full access
await testWithFullAccess();

// Test with read-only access
await testWithReadOnlyAccess();

// Test with collection-specific permissions
await testWithRestrictedPermissions();

// Test permission denial
await testPermissionDenial();
```

### 3. Query Operations

Test complex queries:

```javascript
// Test filtering
await testQueryWithFilters();

// Test ordering
await testQueryWithOrdering();

// Test pagination
await testQueryWithLimit();

// Test compound queries
await testCompoundQueries();
```

### 4. Subcollection Operations

Test nested collection operations:

```javascript
// Create subcollection document
await testCreateSubcollectionDocument();

// Query subcollection
await testQuerySubcollection();

// List subcollections
await testListSubcollections();
```

### 5. Batch Operations

Test atomic operations:

```javascript
// Test batch write
await testBatchWrite();

// Test batch read
await testBatchRead();

// Test transactions
await testTransaction();

// Test transaction with conditions
await testConditionalTransaction();
```

### 6. Field Value Operations

Test atomic field updates:

```javascript
// Test increment
await testIncrementField();

// Test array operations
await testArrayUnion();
await testArrayRemove();

// Test server timestamp
await testServerTimestamp();
```

## Performance Testing

### Load Testing

Create scripts to test server performance:

```javascript
// load-test.js
const iterations = 1000;
const concurrency = 10;

async function loadTest() {
  const promises = [];
  
  for (let i = 0; i < concurrency; i++) {
    promises.push(runTestIterations(iterations / concurrency));
  }
  
  const start = Date.now();
  await Promise.all(promises);
  const duration = Date.now() - start;
  
  console.log(`Completed ${iterations} operations in ${duration}ms`);
  console.log(`Throughput: ${iterations / (duration / 1000)} ops/sec`);
}
```

### Memory Testing

Monitor memory usage during extended operations:

```javascript
// memory-test.js
const heapUsed = process.memoryUsage().heapUsed;
console.log(`Initial memory: ${heapUsed / 1024 / 1024} MB`);

// Run operations
await runExtendedTest();

const finalHeapUsed = process.memoryUsage().heapUsed;
console.log(`Final memory: ${finalHeapUsed / 1024 / 1024} MB`);
console.log(`Memory increase: ${(finalHeapUsed - heapUsed) / 1024 / 1024} MB`);
```

## Error Testing

### Testing Error Handling

Test various error scenarios:

```javascript
// Test invalid collection ID
await testInvalidCollection();

// Test non-existent document
await testNonExistentDocument();

// Test invalid query parameters
await testInvalidQuery();

// Test permission errors
await testPermissionErrors();

// Test network errors
await testNetworkErrors();
```

## Test Data Management

### Setting Up Test Data

Create scripts to populate test data:

```javascript
// setup-test-data.js
async function setupTestData() {
  // Create test users
  for (let i = 0; i < 10; i++) {
    await client.callTool('firestore-create-document', {
      collectionId: 'users',
      documentId: `user${i}`,
      data: {
        name: `Test User ${i}`,
        email: `user${i}@test.com`,
        status: i % 2 === 0 ? 'active' : 'inactive'
      }
    });
  }
  
  // Create test products
  // ... more test data setup
}
```

### Cleaning Up Test Data

Clean up after tests:

```javascript
// cleanup-test-data.js
async function cleanupTestData() {
  // Delete test collections
  const collections = ['users', 'products', 'orders'];
  
  for (const collection of collections) {
    const docs = await client.callTool('firestore-get-collection', {
      collectionId: collection
    });
    
    for (const doc of docs.content[0].text) {
      await client.callTool('firestore-delete-document', {
        collectionId: collection,
        documentId: doc.id
      });
    }
  }
}
```

## Debugging

### Enable Debug Logging

Set environment variable for verbose logging:

```bash
DEBUG=mcp:* pnpm start
```

### Using Chrome DevTools

Debug the Node.js process:

```bash
node --inspect dist/index.js
```

Then open `chrome://inspect` in Chrome.

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Firestore MCP

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: pnpm install
      
    - name: Run tests
      run: pnpm test
      
    - name: Build
      run: pnpm build
      
    - name: Integration tests
      run: pnpm test:integration
      env:
        FIRESTORE_PROJECT_ID: ${{ secrets.FIRESTORE_PROJECT_ID }}
        GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.FIREBASE_CREDENTIALS }}
```

## Best Practices

1. **Isolate Test Data**: Use separate collections or projects for testing
2. **Clean Up**: Always clean up test data after tests
3. **Mock External Services**: Use mocks for external dependencies
4. **Test Edge Cases**: Include tests for error conditions and edge cases
5. **Performance Benchmarks**: Establish baseline performance metrics
6. **Security Testing**: Test permission boundaries thoroughly
7. **Documentation**: Keep test documentation up to date

## Troubleshooting Test Issues

### Common Test Failures

1. **Authentication Errors**
   - Check service account permissions
   - Verify credentials path
   - Ensure project ID is correct

2. **Timeout Errors**
   - Increase test timeouts
   - Check network connectivity
   - Verify Firestore emulator is running

3. **Permission Errors**
   - Review test permission configuration
   - Check collection access rules
   - Verify operation permissions

4. **Data Consistency**
   - Ensure test data is properly cleaned up
   - Check for race conditions
   - Use unique identifiers for test data
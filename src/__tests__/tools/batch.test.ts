import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBatchTools } from '../../tools/batch.js';
import { FirestoreClient } from '../../firestore/client.js';
import { PermissionManager } from '../../permissions/manager.js';

// Mock dependencies
jest.mock('../../firestore/client.js');
jest.mock('../../permissions/manager.js');

describe('Batch Tools', () => {
  let server: McpServer;
  let firestoreClient: FirestoreClient;
  let permissionManager: PermissionManager;
  let registeredTools: Map<string, any>;
  let mockBatch: any;
  
  beforeEach(() => {
    // Create mocks
    mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };
    
    firestoreClient = {
      firestore: {
        batch: jest.fn(() => mockBatch),
        collection: jest.fn(() => ({
          doc: jest.fn((id?: string) => ({
            id: id || 'generated-id',
            path: `test/${id || 'generated-id'}`
          }))
        })),
        doc: jest.fn((path: string) => ({
          id: path.split('/').pop(),
          path
        })),
        runTransaction: jest.fn()
      }
    } as any;
    
    permissionManager = {
      hasPermission: jest.fn().mockReturnValue(true)
    } as any;
    
    // Create a mock server that captures tool registrations
    registeredTools = new Map();
    server = {
      tool: jest.fn((name, description, schema, handler) => {
        registeredTools.set(name, { description, schema, handler });
      })
    } as any;
    
    // Register the tools
    registerBatchTools(server, firestoreClient, permissionManager);
  });
  
  describe('firestore-batch-write', () => {
    let batchWriteTool: any;
    
    beforeEach(() => {
      batchWriteTool = registeredTools.get('firestore-batch-write');
    });
    
    it('should be registered with correct metadata', () => {
      expect(batchWriteTool).toBeDefined();
      expect(batchWriteTool.description).toBe('Execute multiple write operations in a single atomic batch');
    });
    
    it('should execute create operations', async () => {
      const operations = [
        {
          type: 'create',
          collectionPath: 'users',
          documentId: 'user1',
          data: { name: 'John' }
        },
        {
          type: 'create',
          collectionPath: 'users',
          data: { name: 'Jane' }
        }
      ];
      
      const result = await batchWriteTool.handler({ operations });
      
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.operationCount).toBe(2);
    });
    
    it('should execute mixed operations', async () => {
      const operations = [
        {
          type: 'update',
          documentPath: 'users/user1',
          data: { age: 30 }
        },
        {
          type: 'delete',
          documentPath: 'users/user2'
        }
      ];
      
      const result = await batchWriteTool.handler({ operations });
      
      expect(mockBatch.update).toHaveBeenCalledTimes(1);
      expect(mockBatch.delete).toHaveBeenCalledTimes(1);
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
    });
    
    it('should check permissions for all operations', async () => {
      (permissionManager.hasPermission as jest.Mock) = jest.fn((collection, operation) => {
        return collection !== 'restricted';
      });
      
      const operations = [
        {
          type: 'create',
          collectionPath: 'restricted',
          data: { secret: 'data' }
        }
      ];
      
      const result = await batchWriteTool.handler({ operations });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });
  
  describe('firestore-batch-read', () => {
    let batchReadTool: any;
    
    beforeEach(() => {
      batchReadTool = registeredTools.get('firestore-batch-read');
    });
    
    it('should be registered with correct metadata', () => {
      expect(batchReadTool).toBeDefined();
      expect(batchReadTool.description).toBe('Read multiple documents in a single operation');
    });
    
    it('should read multiple documents', async () => {
      const mockDocs: Record<string, any> = {
        'users/user1': { exists: true, data: () => ({ name: 'John' }) },
        'users/user2': { exists: false }
      };
      
      (firestoreClient.firestore.doc as jest.Mock) = jest.fn((path: string) => ({
        get: jest.fn().mockResolvedValue(mockDocs[path])
      }));
      
      const result = await batchReadTool.handler({
        documentPaths: ['users/user1', 'users/user2']
      });
      
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      
      expect(response).toEqual([
        {
          path: 'users/user1',
          exists: true,
          data: { name: 'John' }
        },
        {
          path: 'users/user2',
          exists: false,
          data: null
        }
      ]);
    });
  });
  
  describe('firestore-transaction', () => {
    let transactionTool: any;
    
    beforeEach(() => {
      transactionTool = registeredTools.get('firestore-transaction');
    });
    
    it('should be registered with correct metadata', () => {
      expect(transactionTool).toBeDefined();
      expect(transactionTool.description).toBe('Execute a transaction with read and write operations');
    });
    
    it('should execute transaction with reads and writes', async () => {
      const mockTransaction = {
        get: jest.fn((docRef) => Promise.resolve({
          exists: true,
          data: () => ({ value: 100 })
        })),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      };
      
      (firestoreClient.firestore.runTransaction as jest.Mock) = jest.fn(async (callback) => {
        return await callback(mockTransaction);
      });
      
      const result = await transactionTool.handler({
        reads: ['counters/counter1'],
        operations: [
          {
            type: 'update',
            documentPath: 'counters/counter1',
            data: { value: 101 }
          }
        ]
      });
      
      expect(result.isError).toBeUndefined();
      expect(mockTransaction.get).toHaveBeenCalled();
      expect(mockTransaction.update).toHaveBeenCalled();
    });
    
    it('should evaluate conditions in transactions', async () => {
      const mockTransaction = {
        get: jest.fn((docRef) => Promise.resolve({
          exists: true,
          data: () => ({ balance: 50 })
        })),
        update: jest.fn()
      };
      
      (firestoreClient.firestore.runTransaction as jest.Mock) = jest.fn(async (callback) => {
        return await callback(mockTransaction);
      });
      
      const result = await transactionTool.handler({
        reads: ['users/user1'],
        operations: [
          {
            type: 'update',
            documentPath: 'users/user1',
            data: { balance: 40 }
          }
        ],
        conditionScript: 'return readResults["users/user1"].data.balance >= 10;'
      });
      
      expect(result.isError).toBeUndefined();
      expect(mockTransaction.update).toHaveBeenCalled();
    });
    
    it('should fail when condition is not met', async () => {
      const mockTransaction = {
        get: jest.fn((docRef) => Promise.resolve({
          exists: true,
          data: () => ({ balance: 5 })
        })),
        update: jest.fn()
      };
      
      (firestoreClient.firestore.runTransaction as jest.Mock) = jest.fn(async (callback) => {
        return await callback(mockTransaction);
      });
      
      const result = await transactionTool.handler({
        reads: ['users/user1'],
        operations: [
          {
            type: 'update',
            documentPath: 'users/user1',
            data: { balance: -5 }
          }
        ],
        conditionScript: 'return readResults["users/user1"].data.balance >= 10;'
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Transaction condition failed');
      expect(mockTransaction.update).not.toHaveBeenCalled();
    });
  });
});
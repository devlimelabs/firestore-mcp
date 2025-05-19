import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerReadTools } from '../../tools/read.js';
import { FirestoreClient } from '../../firestore/client.js';
import { PermissionManager } from '../../permissions/manager.js';

// Mock dependencies
jest.mock('../../firestore/client.js');
jest.mock('../../permissions/manager.js');

describe('Read Tools', () => {
  let server: McpServer;
  let firestoreClient: FirestoreClient;
  let permissionManager: PermissionManager;
  let registeredTools: Map<string, any>;
  
  beforeEach(() => {
    // Create mocks
    firestoreClient = new FirestoreClient({}) as jest.Mocked<FirestoreClient>;
    permissionManager = new PermissionManager({ collections: [], defaultAllow: false }) as jest.Mocked<PermissionManager>;
    
    // Create a mock server that captures tool registrations
    registeredTools = new Map();
    server = {
      tool: jest.fn((name, description, schema, handler) => {
        registeredTools.set(name, { description, schema, handler });
      })
    } as any;
    
    // Register the tools
    registerReadTools(server, firestoreClient, permissionManager);
  });
  
  describe('firestore-list-collections', () => {
    let listCollectionsTool: any;
    
    beforeEach(() => {
      listCollectionsTool = registeredTools.get('firestore-list-collections');
    });
    
    it('should be registered with correct metadata', () => {
      expect(listCollectionsTool).toBeDefined();
      expect(listCollectionsTool.description).toBe('List Firestore collections');
    });
    
    it('should return collections when user has permission', async () => {
      // Mock the dependencies
      (firestoreClient.getCollections as jest.Mock) = jest.fn().mockResolvedValue(['users', 'products', 'orders']);
      (permissionManager.hasPermission as jest.Mock) = jest.fn((collection) => collection !== 'orders');
      
      // Call the handler
      const result = await listCollectionsTool.handler({});
      
      expect(result.content[0].text).toBe(JSON.stringify(['users', 'products'], null, 2));
      expect(result.isError).toBeUndefined();
    });
    
    it('should handle errors', async () => {
      // Mock an error
      (firestoreClient.getCollections as jest.Mock) = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
      // Call the handler
      const result = await listCollectionsTool.handler({});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing collections: Connection failed');
    });
  });
  
  describe('firestore-get-collection', () => {
    let getCollectionTool: any;
    
    beforeEach(() => {
      getCollectionTool = registeredTools.get('firestore-get-collection');
    });
    
    it('should be registered with correct metadata', () => {
      expect(getCollectionTool).toBeDefined();
      expect(getCollectionTool.description).toBe('Get documents from a Firestore collection');
    });
    
    it('should return documents when user has permission', async () => {
      const mockDocuments = [
        { id: 'doc1', data: { name: 'Test 1' } },
        { id: 'doc2', data: { name: 'Test 2' } }
      ];
      
      (permissionManager.hasPermission as jest.Mock) = jest.fn().mockReturnValue(true);
      (firestoreClient.getCollection as jest.Mock) = jest.fn().mockResolvedValue(mockDocuments);
      
      const result = await getCollectionTool.handler({ collectionId: 'users' });
      
      expect(result.content[0].text).toBe(JSON.stringify(mockDocuments, null, 2));
      expect(result.isError).toBeUndefined();
    });
    
    it('should deny access when user lacks permission', async () => {
      (permissionManager.hasPermission as jest.Mock) = jest.fn().mockReturnValue(false);
      
      const result = await getCollectionTool.handler({ collectionId: 'private' });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Access denied to collection: private');
    });
  });
  
  describe('firestore-get-document', () => {
    let getDocumentTool: any;
    
    beforeEach(() => {
      getDocumentTool = registeredTools.get('firestore-get-document');
    });
    
    it('should be registered with correct metadata', () => {
      expect(getDocumentTool).toBeDefined();
      expect(getDocumentTool.description).toBe('Get a document from Firestore');
      expect(getDocumentTool.schema).toHaveProperty('collectionId');
      expect(getDocumentTool.schema).toHaveProperty('documentId');
    });
    
    it('should return document when it exists and user has permission', async () => {
      const mockDocument = { id: 'doc1', data: { name: 'Test Document' } };
      
      (permissionManager.hasPermission as jest.Mock) = jest.fn().mockReturnValue(true);
      (firestoreClient.getDocument as jest.Mock) = jest.fn().mockResolvedValue(mockDocument);
      
      const result = await getDocumentTool.handler({ 
        collectionId: 'users', 
        documentId: 'doc1' 
      });
      
      expect(result.content[0].text).toBe(JSON.stringify(mockDocument, null, 2));
      expect(result.isError).toBeUndefined();
    });
    
    it('should return error when document does not exist', async () => {
      (permissionManager.hasPermission as jest.Mock) = jest.fn().mockReturnValue(true);
      (firestoreClient.getDocument as jest.Mock) = jest.fn().mockResolvedValue(null);
      
      const result = await getDocumentTool.handler({ 
        collectionId: 'users', 
        documentId: 'nonexistent' 
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Document nonexistent not found in collection users');
    });
  });
});
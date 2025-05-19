import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { FirestoreClient } from '../../firestore/client.js';
import { Firestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Mock firebase-admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(() => ({})),
  cert: jest.fn(() => ({}))
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => {
    const mockCollection = jest.fn();
    const mockDoc = jest.fn();
    
    return {
      collection: mockCollection,
      doc: mockDoc,
      listCollections: jest.fn(() => Promise.resolve([
        { id: 'collection1' },
        { id: 'collection2' }
      ])),
      batch: jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn(() => Promise.resolve())
      })),
      runTransaction: jest.fn()
    };
  })
}));

// Mock fs
jest.mock('fs');

describe('FirestoreClient', () => {
  let client: FirestoreClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    client = new FirestoreClient({
      projectId: 'test-project'
    });
  });
  
  describe('initialize', () => {
    it('should initialize without credentials', async () => {
      await client.initialize();
      expect(client.firestore).toBeDefined();
    });
    
    it('should initialize with credential path', async () => {
      // Mock the file read
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        projectId: 'test-project',
        privateKey: 'test-key',
        clientEmail: 'test@example.com'
      }));
      
      const clientWithCreds = new FirestoreClient({
        projectId: 'test-project',
        credentialPath: './test-creds.json'
      });
      
      await clientWithCreds.initialize();
      expect(clientWithCreds.firestore).toBeDefined();
      expect(fs.readFileSync).toHaveBeenCalledWith('./test-creds.json', 'utf8');
    });
  });
  
  describe('getCollections', () => {
    it('should return collection IDs', async () => {
      await client.initialize();
      const collections = await client.getCollections();
      
      expect(collections).toEqual(['collection1', 'collection2']);
    });
  });
  
  describe('getDocument', () => {
    it('should return document data when exists', async () => {
      await client.initialize();
      
      const mockDoc = {
        exists: true,
        id: 'doc1',
        data: () => ({ field1: 'value1' })
      };
      
      const mockGet = jest.fn(() => Promise.resolve(mockDoc));
      const mockDocRef = { get: mockGet };
      const mockDoc2 = jest.fn(() => mockDocRef);
      const mockCollection = jest.fn(() => ({ doc: mockDoc2 }));
      
      (client.firestore.collection as jest.Mock) = mockCollection;
      
      const result = await client.getDocument('testCollection', 'doc1');
      
      expect(result).toEqual({
        id: 'doc1',
        data: { field1: 'value1' }
      });
    });
    
    it('should return null when document does not exist', async () => {
      await client.initialize();
      
      const mockDoc = {
        exists: false
      };
      
      const mockGet = jest.fn(() => Promise.resolve(mockDoc));
      const mockDocRef = { get: mockGet };
      const mockDoc2 = jest.fn(() => mockDocRef);
      const mockCollection = jest.fn(() => ({ doc: mockDoc2 }));
      
      (client.firestore.collection as jest.Mock) = mockCollection;
      
      const result = await client.getDocument('testCollection', 'doc1');
      
      expect(result).toBeNull();
    });
  });
  
  describe('subcollection methods', () => {
    it('should get subcollections', async () => {
      await client.initialize();
      
      const mockListCollections = jest.fn(() => Promise.resolve([
        { id: 'subcol1' },
        { id: 'subcol2' }
      ]));
      
      const mockDocRef = { listCollections: mockListCollections };
      const mockDoc = jest.fn(() => mockDocRef);
      
      (client.firestore.doc as jest.Mock) = mockDoc;
      
      const result = await client.getSubcollections('users/user1');
      
      expect(result).toEqual(['subcol1', 'subcol2']);
      expect(mockDoc).toHaveBeenCalledWith('users/user1');
    });
  });
});
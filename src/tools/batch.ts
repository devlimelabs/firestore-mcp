import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FirestoreClient } from "../firestore/client.js";
import { PermissionManager } from "../permissions/manager.js";

// Type definitions for batch operations
const batchWriteOperation = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    collectionPath: z.string(),
    documentId: z.string().optional(),
    data: z.record(z.any())
  }),
  z.object({
    type: z.literal("update"),
    documentPath: z.string(),
    data: z.record(z.any())
  }),
  z.object({
    type: z.literal("delete"),
    documentPath: z.string()
  })
]);

const batchReadOperation = z.object({
  documentPath: z.string()
});

export function registerBatchTools(
  server: McpServer,
  firestoreClient: FirestoreClient,
  permissionManager: PermissionManager
) {
  // Batch write tool
  server.tool(
    "firestore-batch-write",
    "Execute multiple write operations in a single atomic batch",
    {
      operations: z.array(batchWriteOperation).describe("Array of write operations to execute")
    },
    async ({ operations }) => {
      // Check permissions for all operations
      for (const operation of operations) {
        let path: string;
        let requiredPermission: 'write' | 'delete';
        
        switch (operation.type) {
          case 'create':
            path = operation.collectionPath;
            requiredPermission = 'write';
            break;
          case 'update':
            path = operation.documentPath;
            requiredPermission = 'write';
            break;
          case 'delete':
            path = operation.documentPath;
            requiredPermission = 'delete';
            break;
        }
        
        const pathParts = path.split('/');
        const rootCollection = pathParts[0];
        
        if (!permissionManager.hasPermission(rootCollection, requiredPermission)) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Access denied for ${operation.type} operation on path: ${path}`
            }]
          };
        }
      }
      
      try {
        const batch = firestoreClient.firestore.batch();
        const results: any[] = [];
        
        for (const operation of operations) {
          switch (operation.type) {
            case 'create': {
              const collectionRef = firestoreClient.firestore.collection(operation.collectionPath);
              const docRef = operation.documentId 
                ? collectionRef.doc(operation.documentId)
                : collectionRef.doc();
              batch.set(docRef, operation.data);
              results.push({ 
                type: 'create', 
                id: docRef.id, 
                path: `${operation.collectionPath}/${docRef.id}` 
              });
              break;
            }
            case 'update': {
              const docRef = firestoreClient.firestore.doc(operation.documentPath);
              batch.update(docRef, operation.data);
              results.push({ 
                type: 'update', 
                path: operation.documentPath 
              });
              break;
            }
            case 'delete': {
              const docRef = firestoreClient.firestore.doc(operation.documentPath);
              batch.delete(docRef);
              results.push({ 
                type: 'delete', 
                path: operation.documentPath 
              });
              break;
            }
          }
        }
        
        // Commit the batch
        await batch.commit();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              operationCount: operations.length,
              operations: results
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error executing batch write: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Batch read tool
  server.tool(
    "firestore-batch-read",
    "Read multiple documents in a single operation",
    {
      documentPaths: z.array(z.string()).describe("Array of document paths to read")
    },
    async ({ documentPaths }) => {
      // Check permissions for all documents
      for (const documentPath of documentPaths) {
        const pathParts = documentPath.split('/');
        const rootCollection = pathParts[0];
        
        if (!permissionManager.hasPermission(rootCollection, 'read')) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Access denied to read document: ${documentPath}`
            }]
          };
        }
      }
      
      try {
        const results = await Promise.all(
          documentPaths.map(async (path) => {
            const docRef = firestoreClient.firestore.doc(path);
            const doc = await docRef.get();
            
            return {
              path,
              exists: doc.exists,
              data: doc.exists ? doc.data() : null
            };
          })
        );
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error executing batch read: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Transaction tool
  server.tool(
    "firestore-transaction",
    "Execute a transaction with read and write operations",
    {
      reads: z.array(z.string()).describe("Document paths to read in the transaction"),
      operations: z.array(batchWriteOperation).describe("Write operations to execute based on read data"),
      conditionScript: z.string().optional().describe("JavaScript condition to evaluate before committing (optional)")
    },
    async ({ reads, operations, conditionScript }) => {
      // Check permissions
      for (const readPath of reads) {
        const pathParts = readPath.split('/');
        const rootCollection = pathParts[0];
        
        if (!permissionManager.hasPermission(rootCollection, 'read')) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Access denied to read document: ${readPath}`
            }]
          };
        }
      }
      
      // Check write permissions
      for (const operation of operations) {
        let path: string;
        let requiredPermission: 'write' | 'delete';
        
        switch (operation.type) {
          case 'create':
            path = operation.collectionPath;
            requiredPermission = 'write';
            break;
          case 'update':
            path = operation.documentPath;
            requiredPermission = 'write';
            break;
          case 'delete':
            path = operation.documentPath;
            requiredPermission = 'delete';
            break;
        }
        
        const pathParts = path.split('/');
        const rootCollection = pathParts[0];
        
        if (!permissionManager.hasPermission(rootCollection, requiredPermission)) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Access denied for ${operation.type} operation on path: ${path}`
            }]
          };
        }
      }
      
      try {
        const result = await firestoreClient.firestore.runTransaction(async (transaction) => {
          // Read phase
          const readResults: Record<string, any> = {};
          for (const readPath of reads) {
            const docRef = firestoreClient.firestore.doc(readPath);
            const doc = await transaction.get(docRef);
            readResults[readPath] = {
              exists: doc.exists,
              data: doc.exists ? doc.data() : null
            };
          }
          
          // Evaluate condition if provided
          if (conditionScript) {
            try {
              // Create a safe evaluation context
              const evalCondition = new Function('readResults', conditionScript);
              const shouldProceed = evalCondition(readResults);
              
              if (!shouldProceed) {
                throw new Error('Transaction condition failed');
              }
            } catch (error) {
              throw new Error(`Condition evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          
          // Write phase
          const writeResults: any[] = [];
          
          for (const operation of operations) {
            switch (operation.type) {
              case 'create': {
                const collectionRef = firestoreClient.firestore.collection(operation.collectionPath);
                const docRef = operation.documentId 
                  ? collectionRef.doc(operation.documentId)
                  : collectionRef.doc();
                transaction.set(docRef, operation.data);
                writeResults.push({ 
                  type: 'create', 
                  id: docRef.id, 
                  path: `${operation.collectionPath}/${docRef.id}` 
                });
                break;
              }
              case 'update': {
                const docRef = firestoreClient.firestore.doc(operation.documentPath);
                transaction.update(docRef, operation.data);
                writeResults.push({ 
                  type: 'update', 
                  path: operation.documentPath 
                });
                break;
              }
              case 'delete': {
                const docRef = firestoreClient.firestore.doc(operation.documentPath);
                transaction.delete(docRef);
                writeResults.push({ 
                  type: 'delete', 
                  path: operation.documentPath 
                });
                break;
              }
            }
          }
          
          return {
            readResults,
            writeResults
          };
        });
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              transaction: result
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error executing transaction: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
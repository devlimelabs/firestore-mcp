import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FirestoreClient } from "../firestore/client.js";
import { PermissionManager } from "../permissions/manager.js";
import * as admin from "firebase-admin";

export function registerFieldValueTools(
  server: McpServer,
  firestoreClient: FirestoreClient,
  permissionManager: PermissionManager
) {
  // Field value increment tool
  server.tool(
    "firestore-increment-field",
    "Atomically increment a numeric field value",
    {
      documentPath: z.string().describe("Full path to the document"),
      field: z.string().describe("Field name to increment"),
      incrementBy: z.number().describe("Amount to increment by (can be negative)")
    },
    async ({ documentPath, field, incrementBy }) => {
      // Extract collection name for permission check
      const pathParts = documentPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'write')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to update document: ${documentPath}`
          }]
        };
      }
      
      try {
        const docRef = firestoreClient.firestore.doc(documentPath);
        await docRef.update({
          [field]: admin.firestore.FieldValue.increment(incrementBy)
        });
        
        // Get the updated document
        const doc = await docRef.get();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              path: documentPath,
              field: field,
              incrementedBy: incrementBy,
              newValue: doc.data()?.[field]
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error incrementing field: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Array union tool
  server.tool(
    "firestore-array-union",
    "Add elements to an array field without duplicates",
    {
      documentPath: z.string().describe("Full path to the document"),
      field: z.string().describe("Array field name"),
      elements: z.array(z.any()).describe("Elements to add to the array")
    },
    async ({ documentPath, field, elements }) => {
      // Extract collection name for permission check
      const pathParts = documentPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'write')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to update document: ${documentPath}`
          }]
        };
      }
      
      try {
        const docRef = firestoreClient.firestore.doc(documentPath);
        await docRef.update({
          [field]: admin.firestore.FieldValue.arrayUnion(...elements)
        });
        
        // Get the updated document
        const doc = await docRef.get();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              path: documentPath,
              field: field,
              addedElements: elements,
              newArray: doc.data()?.[field]
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error updating array: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Array remove tool
  server.tool(
    "firestore-array-remove",
    "Remove elements from an array field",
    {
      documentPath: z.string().describe("Full path to the document"),
      field: z.string().describe("Array field name"),
      elements: z.array(z.any()).describe("Elements to remove from the array")
    },
    async ({ documentPath, field, elements }) => {
      // Extract collection name for permission check
      const pathParts = documentPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'write')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to update document: ${documentPath}`
          }]
        };
      }
      
      try {
        const docRef = firestoreClient.firestore.doc(documentPath);
        await docRef.update({
          [field]: admin.firestore.FieldValue.arrayRemove(...elements)
        });
        
        // Get the updated document
        const doc = await docRef.get();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              path: documentPath,
              field: field,
              removedElements: elements,
              newArray: doc.data()?.[field]
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error updating array: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Server timestamp tool
  server.tool(
    "firestore-server-timestamp",
    "Set a field to the server timestamp",
    {
      documentPath: z.string().describe("Full path to the document"),
      fields: z.array(z.string()).describe("Field names to set to server timestamp")
    },
    async ({ documentPath, fields }) => {
      // Extract collection name for permission check
      const pathParts = documentPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'write')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to update document: ${documentPath}`
          }]
        };
      }
      
      try {
        const docRef = firestoreClient.firestore.doc(documentPath);
        const updateData: Record<string, any> = {};
        
        fields.forEach(field => {
          updateData[field] = admin.firestore.FieldValue.serverTimestamp();
        });
        
        await docRef.update(updateData);
        
        // Get the updated document
        const doc = await docRef.get();
        const docData = doc.data();
        const timestampValues: Record<string, any> = {};
        
        fields.forEach(field => {
          timestampValues[field] = docData?.[field];
        });
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              path: documentPath,
              timestampFields: timestampValues
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error setting server timestamp: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Delete field tool
  server.tool(
    "firestore-delete-field",
    "Delete specific fields from a document",
    {
      documentPath: z.string().describe("Full path to the document"),
      fields: z.array(z.string()).describe("Field names to delete")
    },
    async ({ documentPath, fields }) => {
      // Extract collection name for permission check
      const pathParts = documentPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'write')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to update document: ${documentPath}`
          }]
        };
      }
      
      try {
        const docRef = firestoreClient.firestore.doc(documentPath);
        const updateData: Record<string, any> = {};
        
        fields.forEach(field => {
          updateData[field] = admin.firestore.FieldValue.delete();
        });
        
        await docRef.update(updateData);
        
        // Get the updated document
        const doc = await docRef.get();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              path: documentPath,
              deletedFields: fields,
              remainingData: doc.data()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error deleting fields: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Atomic field operations in batch/transaction
  server.tool(
    "firestore-field-value-batch",
    "Execute multiple field value operations in a batch",
    {
      operations: z.array(z.discriminatedUnion("type", [
        z.object({
          type: z.literal("increment"),
          documentPath: z.string(),
          field: z.string(),
          incrementBy: z.number()
        }),
        z.object({
          type: z.literal("arrayUnion"),
          documentPath: z.string(),
          field: z.string(),
          elements: z.array(z.any())
        }),
        z.object({
          type: z.literal("arrayRemove"),
          documentPath: z.string(),
          field: z.string(),
          elements: z.array(z.any())
        }),
        z.object({
          type: z.literal("serverTimestamp"),
          documentPath: z.string(),
          fields: z.array(z.string())
        }),
        z.object({
          type: z.literal("deleteField"),
          documentPath: z.string(),
          fields: z.array(z.string())
        })
      ])).describe("Array of field value operations to execute")
    },
    async ({ operations }) => {
      // Check permissions for all operations
      for (const operation of operations) {
        const pathParts = operation.documentPath.split('/');
        const rootCollection = pathParts[0];
        
        if (!permissionManager.hasPermission(rootCollection, 'write')) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Access denied to update document: ${operation.documentPath}`
            }]
          };
        }
      }
      
      try {
        const batch = firestoreClient.firestore.batch();
        const results: any[] = [];
        
        for (const operation of operations) {
          const docRef = firestoreClient.firestore.doc(operation.documentPath);
          
          switch (operation.type) {
            case 'increment':
              batch.update(docRef, {
                [operation.field]: admin.firestore.FieldValue.increment(operation.incrementBy)
              });
              results.push({
                type: 'increment',
                path: operation.documentPath,
                field: operation.field,
                incrementBy: operation.incrementBy
              });
              break;
              
            case 'arrayUnion':
              batch.update(docRef, {
                [operation.field]: admin.firestore.FieldValue.arrayUnion(...operation.elements)
              });
              results.push({
                type: 'arrayUnion',
                path: operation.documentPath,
                field: operation.field,
                elements: operation.elements
              });
              break;
              
            case 'arrayRemove':
              batch.update(docRef, {
                [operation.field]: admin.firestore.FieldValue.arrayRemove(...operation.elements)
              });
              results.push({
                type: 'arrayRemove',
                path: operation.documentPath,
                field: operation.field,
                elements: operation.elements
              });
              break;
              
            case 'serverTimestamp':
              const timestampUpdate: Record<string, any> = {};
              operation.fields.forEach(field => {
                timestampUpdate[field] = admin.firestore.FieldValue.serverTimestamp();
              });
              batch.update(docRef, timestampUpdate);
              results.push({
                type: 'serverTimestamp',
                path: operation.documentPath,
                fields: operation.fields
              });
              break;
              
            case 'deleteField':
              const deleteUpdate: Record<string, any> = {};
              operation.fields.forEach(field => {
                deleteUpdate[field] = admin.firestore.FieldValue.delete();
              });
              batch.update(docRef, deleteUpdate);
              results.push({
                type: 'deleteField',
                path: operation.documentPath,
                fields: operation.fields
              });
              break;
          }
        }
        
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
            text: `Error executing field value batch: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
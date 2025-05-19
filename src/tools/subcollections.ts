import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FirestoreClient } from "../firestore/client.js";
import { PermissionManager } from "../permissions/manager.js";

export function registerSubcollectionTools(
  server: McpServer,
  firestoreClient: FirestoreClient,
  permissionManager: PermissionManager
) {
  // List subcollections tool
  server.tool(
    "firestore-list-subcollections",
    "List subcollections of a document",
    {
      documentPath: z.string().describe("Full path to the document (e.g., 'users/userId1')")
    },
    async ({ documentPath }) => {
      try {
        const collections = await firestoreClient.getSubcollections(documentPath);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(collections, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error listing subcollections of ${documentPath}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get collection by path tool
  server.tool(
    "firestore-get-collection-by-path",
    "Get documents from a collection using full path (supports subcollections)",
    {
      collectionPath: z.string().describe("Full path to the collection (e.g., 'users/userId1/orders')")
    },
    async ({ collectionPath }) => {
      // Extract collection name for permission check
      const pathParts = collectionPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'read')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to collection: ${collectionPath}`
          }]
        };
      }
      
      try {
        const documents = await firestoreClient.getCollectionByPath(collectionPath);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(documents, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error getting collection ${collectionPath}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Get document by path tool
  server.tool(
    "firestore-get-document-by-path",
    "Get a document using full path (supports subcollections)",
    {
      documentPath: z.string().describe("Full path to the document (e.g., 'users/userId1/orders/orderId1')")
    },
    async ({ documentPath }) => {
      // Extract collection name for permission check
      const pathParts = documentPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'read')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to document: ${documentPath}`
          }]
        };
      }
      
      try {
        const document = await firestoreClient.getDocumentByPath(documentPath);
        
        if (!document) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Document not found: ${documentPath}`
            }]
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(document, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error getting document ${documentPath}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Create document by path tool
  server.tool(
    "firestore-create-document-by-path",
    "Create a document in a collection using full path (supports subcollections)",
    {
      collectionPath: z.string().describe("Full path to the collection (e.g., 'users/userId1/orders')"),
      data: z.record(z.any()).describe("Document data to create"),
      documentId: z.string().optional().describe("Optional document ID. If not provided, one will be generated")
    },
    async ({ collectionPath, data, documentId }) => {
      // Extract collection name for permission check
      const pathParts = collectionPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'write')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to create document in: ${collectionPath}`
          }]
        };
      }
      
      try {
        const document = await firestoreClient.createDocumentByPath(collectionPath, data, documentId);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(document, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error creating document in ${collectionPath}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Update document by path tool
  server.tool(
    "firestore-update-document-by-path",
    "Update a document using full path (supports subcollections)",
    {
      documentPath: z.string().describe("Full path to the document (e.g., 'users/userId1/orders/orderId1')"),
      data: z.record(z.any()).describe("Document data to update")
    },
    async ({ documentPath, data }) => {
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
        const document = await firestoreClient.updateDocumentByPath(documentPath, data);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(document, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error updating document ${documentPath}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Delete document by path tool
  server.tool(
    "firestore-delete-document-by-path",
    "Delete a document using full path (supports subcollections)",
    {
      documentPath: z.string().describe("Full path to the document (e.g., 'users/userId1/orders/orderId1')")
    },
    async ({ documentPath }) => {
      // Extract collection name for permission check
      const pathParts = documentPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'delete')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to delete document: ${documentPath}`
          }]
        };
      }
      
      try {
        const result = await firestoreClient.deleteDocumentByPath(documentPath);
        
        return {
          content: [{
            type: "text",
            text: `Successfully deleted document ${documentPath}`
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error deleting document ${documentPath}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Query collection by path tool
  server.tool(
    "firestore-query-collection-by-path",
    "Query documents in a collection using full path (supports subcollections)",
    {
      collectionPath: z.string().describe("Full path to the collection (e.g., 'users/userId1/orders')"),
      filters: z.array(z.object({
        field: z.string().describe("Field path to filter on"),
        operator: z.enum(["==", "!=", ">", ">=", "<", "<=", "array-contains", "in", "array-contains-any", "not-in"])
          .describe("Operator for comparison"),
        value: z.any().optional().describe("Value to compare against")
      })).describe("Array of filter conditions"),
      limit: z.number().optional().describe("Maximum number of results to return"),
      orderBy: z.object({
        field: z.string().describe("Field to order by"),
        direction: z.enum(["asc", "desc"]).describe("Sort direction")
      }).optional().describe("Order specification")
    },
    async ({ collectionPath, filters, limit, orderBy }) => {
      // Extract collection name for permission check
      const pathParts = collectionPath.split('/');
      const rootCollection = pathParts[0];
      
      if (!permissionManager.hasPermission(rootCollection, 'query')) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Access denied to query collection: ${collectionPath}`
          }]
        };
      }
      
      try {
        const documents = await firestoreClient.queryCollectionByPath(
          collectionPath,
          filters,
          limit,
          orderBy
        );
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(documents, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error querying collection ${collectionPath}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirestoreClient } from "../firestore/client.js";
import { PermissionManager } from "../permissions/manager.js";

export function registerSubcollectionResources(
  server: McpServer,
  firestoreClient: FirestoreClient,
  permissionManager: PermissionManager
) {
  // Register subcollection resource template
  server.resource(
    "subcollection",
    new ResourceTemplate("firestore://path/{path}",  {
      list: undefined
    }),
    async (uri, { path }) => {
      // Extract path components
      const fullPath = path as string;
      const pathParts = fullPath.split('/');
      const rootCollection = pathParts[0];
      
      // Check permissions
      if (!permissionManager.hasPermission(rootCollection, 'read')) {
        throw new Error(`Access denied to path: ${fullPath}`);
      }
      
      try {
        // Determine if this is a collection or document path
        const isCollection = pathParts.length % 2 === 1;
        
        if (isCollection) {
          // Get collection documents
          const documents = await firestoreClient.getCollectionByPath(fullPath);
          
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify(documents, null, 2),
              mimeType: "application/json"
            }]
          };
        } else {
          // Get single document
          const document = await firestoreClient.getDocumentByPath(fullPath);
          
          if (!document) {
            throw new Error(`Document not found: ${fullPath}`);
          }
          
          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify(document, null, 2),
              mimeType: "application/json"
            }]
          };
        }
      } catch (error) {
        console.error(`Error reading path ${fullPath}:`, error);
        throw new Error(`Failed to read path ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
import { initializeServer } from './init';
import { DocumentManager } from './documentManager';

// Only start the server if this file is run directly
if (require.main === module) {
  initializeServer();
}

// Export classes for testing
export { DocumentManager };

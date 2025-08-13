import { DocumentManager } from './documentManager';
import { initializeServer } from './init';

// Only start the server if this file is run directly
if (require.main === module) {
  initializeServer();
}

// Export classes for testing
export { DocumentManager };

// Node-only filesystem paths. Browser logic stays in model/presentation modules.
export { resolve, join, relative, extname as extension } from 'node:path';
export { fileURLToPath as fromFileUrl } from 'node:url';

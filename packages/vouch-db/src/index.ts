// @percival/vouch-db — PostgreSQL + Drizzle ORM for Vouch

export { db, pool } from './connection';
export * from './schema/index';
export { encryptSecret, decryptSecret, hasEncryptionKey } from './crypto/envelope';

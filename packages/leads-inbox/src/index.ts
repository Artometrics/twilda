export { createReceiver, readCapped } from "./receiver";
export { createInbox, renderInbox, toCsv, csvCell, escapeHtml, INBOX_CSP } from "./inbox";
export { KvStore, FirestoreStore, MemoryStore, parseStored, type KvLike, type FirestoreLike } from "./store";
export { canonical, hmacHex, safeEqual, signRecord, verifyRecord, newId } from "./sign";
export { validateLead, isSafeEmail, isSingleLine, kindOf, cleanPage, FIELD_KINDS, FIELD_MAX, MAX_PAYLOAD_CHARS } from "./validate";
export type { InboxConfig, LeadRecord, LeadStore, ReceiverConfig, StoredLead } from "./types";

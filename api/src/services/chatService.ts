import { config } from "../config";
import { chatRepository } from "../repositories/chatRepository";
import type { ChatMessage, Device } from "../types";

/** Persisted chat with an in-memory recent cache for fast joins. */
class ChatService {
  private cache: ChatMessage[] = [];

  /** Load recent history once at boot. */
  init() {
    this.cache = chatRepository.recent(config.chatHistoryLimit);
  }

  history(): ChatMessage[] {
    return this.cache;
  }

  add(args: { visitorId: string; device: Device; city: string; text: string; name?: string }): ChatMessage | null {
    const text = args.text.slice(0, 400).trim();
    if (!text) return null;
    // prefer the name the visitor gave us: keep letters/numbers/space/._-, cap length
    const given = (args.name || "").replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 24);
    const tag = args.city || "Guest";
    const msg = chatRepository.insert({
      visitorId: args.visitorId,
      name: given || `${tag}·${args.visitorId.slice(-3)}`,
      text,
      device: args.device,
      city: args.city,
      ts: Date.now(),
    });
    this.cache.push(msg);
    if (this.cache.length > config.chatHistoryLimit) this.cache.shift();
    return msg;
  }

  clearCache() {
    this.cache = [];
  }
}

export const chatService = new ChatService();

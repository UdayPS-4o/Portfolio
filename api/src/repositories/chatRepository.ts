import { getDb } from "../db";
import type { ChatMessage, Device } from "../types";

interface ChatRow {
  id: number;
  visitor_id: string;
  name: string;
  text: string;
  device: string;
  city: string;
  created_at: number;
}

const toMessage = (r: ChatRow): ChatMessage => ({
  id: r.id,
  visitorId: r.visitor_id,
  name: r.name,
  text: r.text,
  device: (r.device as Device) || "pc",
  city: r.city || "",
  ts: r.created_at,
});

export const chatRepository = {
  insert(msg: Omit<ChatMessage, "id">): ChatMessage {
    const info = getDb()
      .prepare(
        `INSERT INTO chat_messages (visitor_id, name, text, device, city, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(msg.visitorId, msg.name, msg.text, msg.device, msg.city, msg.ts);
    return { ...msg, id: Number(info.lastInsertRowid) };
  },

  recent(limit = 40): ChatMessage[] {
    const rows = getDb()
      .prepare(`SELECT * FROM chat_messages ORDER BY id DESC LIMIT ?`)
      .all(limit) as ChatRow[];
    return rows.reverse().map(toMessage);
  },
};

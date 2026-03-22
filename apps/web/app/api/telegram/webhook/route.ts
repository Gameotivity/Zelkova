// ---------------------------------------------------------------------------
// POST /api/telegram/webhook — Handle Telegram Bot updates
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  handleStart,
  handleLink,
  handlePortfolio,
  handleAgents,
  handleReport,
  handleHelp,
} from "./commands";

// ---------------------------------------------------------------------------
// Zod schemas for Telegram update
// ---------------------------------------------------------------------------

const telegramUserSchema = z.object({
  id: z.number(),
  first_name: z.string().optional(),
  username: z.string().optional(),
});

const telegramMessageSchema = z.object({
  message_id: z.number(),
  from: telegramUserSchema.optional(),
  chat: z.object({ id: z.number() }),
  text: z.string().optional(),
});

const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: telegramMessageSchema.optional(),
});

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = telegramUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid update" },
      { status: 400 },
    );
  }

  const update = parsed.data;
  const message = update.message;

  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id.toString();
  const text = message.text.trim();
  const username = message.from?.username;

  if (text === "/start") {
    await handleStart(chatId);
  } else if (text.startsWith("/link")) {
    const code = text.replace("/link", "").trim();
    await handleLink(chatId, code, username);
  } else if (text === "/portfolio") {
    await handlePortfolio(chatId);
  } else if (text === "/agents") {
    await handleAgents(chatId);
  } else if (text === "/report") {
    await handleReport(chatId);
  } else if (text === "/help") {
    await handleHelp(chatId);
  }

  return NextResponse.json({ ok: true });
}

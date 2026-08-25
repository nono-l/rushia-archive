import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export type Profile = {
  userId: string;
  nickname: string | null;
  accountName: string | null;
  image: string | null;
};

const MAX_NICK = 24;

function cleanNick(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Auth required: current user's app-local nickname + account fallback. */
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const users = await sql<{ name: string; image: string | null }>`
      select name, image from "user" where id = ${context.userId} limit 1
    `;
    const profiles = await sql<{ nickname: string }>`
      select nickname from profiles where user_id = ${context.userId} limit 1
    `;
    const accountName =
      users[0]?.name?.trim() ||
      (context.userId === "dev-user" ? "Dev User" : null);
    return {
      userId: context.userId,
      nickname: profiles[0]?.nickname ?? null,
      accountName,
      image: users[0]?.image ?? null,
    } satisfies Profile;
  });

/**
 * Auth required: set or clear app-local nickname.
 * Empty string clears nickname (falls back to linked account name).
 */
export const setNickname = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("invalid input");
    const raw = (input as { nickname?: unknown }).nickname;
    if (typeof raw !== "string") throw new Error("nickname is required");
    const nickname = cleanNick(raw);
    if (nickname.length > MAX_NICK) {
      throw new Error(`ニックネームは${MAX_NICK}文字以内です`);
    }
    // block obvious control chars
    if (/[\u0000-\u001f\u007f]/.test(nickname)) {
      throw new Error("使えない文字が含まれています");
    }
    return { nickname };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (!data.nickname) {
      await sql`delete from profiles where user_id = ${context.userId}`;
      return { nickname: null as string | null };
    }
    await sql`
      insert into profiles (user_id, nickname, updated_at)
      values (${context.userId}, ${data.nickname}, now())
      on conflict (user_id) do update
        set nickname = excluded.nickname,
            updated_at = now()
    `;
    return { nickname: data.nickname };
  });

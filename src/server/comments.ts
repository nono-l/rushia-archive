import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export type CommentRow = {
  id: string;
  entryId: string;
  userId: string;
  parentId: string | null;
  body: string;
  authorName: string;
  authorImage: string | null;
  createdAt: string;
};

type DbComment = {
  id: string;
  entry_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  author_name: string;
  author_image: string | null;
  created_at: Date | string;
};

function mapRow(r: DbComment): CommentRow {
  const created =
    r.created_at instanceof Date
      ? r.created_at.toISOString()
      : String(r.created_at);
  return {
    id: r.id,
    entryId: r.entry_id,
    userId: r.user_id,
    parentId: r.parent_id,
    body: r.body,
    authorName: r.author_name,
    authorImage: r.author_image,
    createdAt: created,
  };
}

const MAX_BODY = 2000;

function cleanBody(raw: string): string {
  return raw.replace(/\r\n/g, "\n").trim();
}

async function resolveAuthor(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
): Promise<{ authorName: string; authorImage: string | null }> {
  const [users, profiles] = await Promise.all([
    sql<{ name: string; image: string | null }>`
      select name, image from "user" where id = ${userId} limit 1
    `,
    sql<{ nickname: string }>`
      select nickname from profiles where user_id = ${userId} limit 1
    `,
  ]);
  const account =
    users[0]?.name?.trim() ||
    (userId === "dev-user" ? "Dev User" : "名無しさん");
  const nick = profiles[0]?.nickname?.trim();
  return {
    authorName: nick || account,
    authorImage: users[0]?.image ?? null,
  };
}

/** Public: list all comments for an archive entry (flat; client builds the tree). */
export const listComments = createServerFn({ method: "GET" })
  .validator((entryId: unknown) => {
    if (typeof entryId !== "string" || !entryId.trim()) {
      throw new Error("entryId is required");
    }
    return entryId.trim();
  })
  .handler(async ({ data: entryId }) => {
    const sql = await getSql();
    const rows = await sql<DbComment>`
      select id, entry_id, user_id, parent_id, body, author_name, author_image, created_at
      from comments
      where entry_id = ${entryId}
      order by created_at asc
    `;
    return rows.map(mapRow);
  });

/** Auth required: post a root comment or a reply. */
export const addComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("invalid input");
    const o = input as Record<string, unknown>;
    const entryId = typeof o.entryId === "string" ? o.entryId.trim() : "";
    const body = typeof o.body === "string" ? cleanBody(o.body) : "";
    const parentId =
      o.parentId == null || o.parentId === ""
        ? null
        : typeof o.parentId === "string"
          ? o.parentId
          : null;
    if (!entryId) throw new Error("entryId is required");
    if (!body) throw new Error("コメントを入力してください");
    if (body.length > MAX_BODY) throw new Error(`コメントは${MAX_BODY}文字以内です`);
    return { entryId, body, parentId };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();

    if (data.parentId) {
      const parents = await sql<{ id: string; entry_id: string }>`
        select id, entry_id from comments where id = ${data.parentId} limit 1
      `;
      const parent = parents[0];
      if (!parent) throw new Error("返信先が見つかりません");
      if (parent.entry_id !== data.entryId) {
        throw new Error("返信先がこの投稿に属していません");
      }
    }

    const { authorName, authorImage } = await resolveAuthor(
      sql,
      context.userId,
    );

    const id = randomUUID();
    const rows = await sql<DbComment>`
      insert into comments (id, entry_id, user_id, parent_id, body, author_name, author_image)
      values (
        ${id},
        ${data.entryId},
        ${context.userId},
        ${data.parentId},
        ${data.body},
        ${authorName},
        ${authorImage}
      )
      returning id, entry_id, user_id, parent_id, body, author_name, author_image, created_at
    `;
    return mapRow(rows[0]!);
  });

/** Auth required: delete own comment (children cascade). */
export const deleteComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("invalid input");
    const id = (input as { id?: unknown }).id;
    if (typeof id !== "string" || !id) throw new Error("id is required");
    return { id };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      delete from comments
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) throw new Error("削除できませんでした");
    return { ok: true as const, id: rows[0].id };
  });

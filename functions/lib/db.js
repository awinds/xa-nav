export async function all(db, sql, params = []) {
  const result = await db.prepare(sql).bind(...params).all();
  return result?.results || [];
}

export async function first(db, sql, params = []) {
  const result = await db.prepare(sql).bind(...params).all();
  return result?.results?.[0] || null;
}

export async function run(db, sql, params = []) {
  await db.prepare(sql).bind(...params).run();
}

export async function upsert(db, sql, params = []) {
  return db.prepare(sql).bind(...params).run();
}

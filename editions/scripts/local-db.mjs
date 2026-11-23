import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export class LocalDB {
  constructor(filename = ":memory:") {
    this.sqlite = new DatabaseSync(filename);
    const journal = JSON.parse(
      readFileSync(
        new URL("../drizzle/meta/_journal.json", import.meta.url),
        "utf8",
      ),
    );
    this.sqlite.exec(
      "PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS _local_migrations(name TEXT PRIMARY KEY)",
    );
    for (const { tag } of journal.entries) {
      if (
        this.sqlite
          .prepare("SELECT name FROM _local_migrations WHERE name=?")
          .get(tag)
      )
        continue;
      this.sqlite.exec("BEGIN");
      try {
        this.sqlite.exec(
          readFileSync(
            fileURLToPath(
              new URL("../drizzle/" + tag + ".sql", import.meta.url),
            ),
            "utf8",
          ),
        );
        this.sqlite.prepare("INSERT INTO _local_migrations VALUES(?)").run(tag);
        this.sqlite.exec("COMMIT");
      } catch (e) {
        this.sqlite.exec("ROLLBACK");
        throw e;
      }
    }
  }
  prepare(sql) {
    const stmt = this.sqlite.prepare(sql);
    return {
      bind: (...args) => ({
        first: () => stmt.get(...args) || null,
        all: () => ({ results: stmt.all(...args) }),
        run: () => ({ meta: stmt.run(...args) }),
      }),
    };
  }
  batch(stmts) {
    this.sqlite.exec("BEGIN");
    try {
      const results = stmts.map((s) => s.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (e) {
      this.sqlite.exec("ROLLBACK");
      throw e;
    }
  }
}

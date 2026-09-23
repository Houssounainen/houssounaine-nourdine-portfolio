import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("lib/chat.ts", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const chat = {};
vm.runInNewContext(outputText, { exports: chat, AbortSignal });

const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const message = (number, values = {}) => ({
  id: id(number), author_id: id(9999), author_name: "Membre test", body: `Message ${number}`,
  created_at: "2026-09-22T10:00:00.000Z", deleted_at: null, ...values,
});

function fakeClient(responses) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table };
      calls.push(call);
      const query = {};
      for (const method of ["select", "order", "limit", "or", "in", "eq", "insert", "update", "single", "maybeSingle", "abortSignal", "is"]) {
        query[method] = (...args) => { (call[method] ??= []).push(args); return query; };
      }
      query.then = resolve => {
        assert.ok(responses.length, "Unexpected extra database request");
        return Promise.resolve(responses.shift()).then(resolve);
      };
      return query;
    },
  };
}

assert.equal(chat.validateChatBody("  Bonjour\n  "), "Bonjour");
assert.throws(() => chat.validateChatBody(" \n\t "), /CHAT_INVALID_BODY/);
assert.throws(() => chat.validateChatBody("a".repeat(2001)), /CHAT_INVALID_BODY/);
assert.equal(chat.validateChatBody("a".repeat(2000)).length, 2000);

const ordered = chat.mergeChatMessages([message(3), message(1)], [message(2), message(1)]);
assert.deepEqual(Array.from(ordered, row => row.id), [id(1), id(2), id(3)], "Tied timestamps remain ordered and duplicates collapse");
const removed = message(1, { body: "", deleted_at: "2026-09-22T11:00:00Z" });
assert.equal(chat.mergeChatMessages([removed], [message(1)])[0].body, "", "A delayed response cannot restore removed content");
assert.equal(chat.mergeChatMessages([message(1)], [removed])[0].body, "");
const reconciled = chat.reconcileChatMessages([message(1), message(2), message(3)], [id(1), id(2)], [message(2)]);
assert.deepEqual(Array.from(reconciled, row => row.id), [id(2), id(3)], "Remove unavailable rows while preserving a concurrent arrival");
assert.throws(() => chat.chatCursor({ id: "bad),id.gt.0", created_at: message(1).created_at }, "lt"), /CHAT_INVALID_CURSOR/);
assert.throws(() => chat.chatCursor({ id: id(1), created_at: "now(),id.gt.0" }, "gt"), /CHAT_INVALID_CURSOR/);

const pageClient = fakeClient([{ data: Array.from({ length: 51 }, (_, i) => message(51 - i)), error: null }]);
const page = await chat.loadChatPage(pageClient, message(52));
assert.equal(page.messages.length, 50);
assert.equal(page.hasMore, true);
assert.equal(page.messages[0].id, id(2));
assert.equal(page.messages[49].id, id(51));

const catchUpClient = fakeClient([
  { data: [removed], error: null },
  { data: Array.from({ length: 500 }, (_, i) => message(i + 2)), error: null },
  { data: [message(502)], error: null },
]);
const catchUp = await chat.synchronizeChat(catchUpClient, [message(1)]);
assert.equal(catchUp.messages.length, 502, "Catch up beyond one API page after reconnection");
assert.equal(catchUp.messages[0].deleted_at, removed.deleted_at, "Refresh removals made while disconnected");
assert.equal(catchUp.messages.at(-1).id, id(502));

const retryClient = fakeClient([
  { data: null, error: { code: "23505", message: "duplicate key" } },
  { data: message(1), error: null },
]);
assert.equal((await chat.sendChatMessage(retryClient, id(1), "Message 1", id(9999))).id, id(1));
assert.equal(retryClient.calls.filter(call => call.insert).length, 1, "An ambiguous send recovers the same message");
assert.deepEqual(JSON.parse(JSON.stringify(retryClient.calls[0].insert[0][0])), { id: id(1), body: "Message 1" }, "The client cannot supply author or timestamp");

const deniedClient = fakeClient([
  { data: null, error: { code: "42501", message: "denied" } },
  { data: null, error: null },
]);
await assert.rejects(chat.sendChatMessage(deniedClient, id(1), "Bonjour", id(9999)), error => error.code === "42501");
const alreadyRemoved = fakeClient([{ data: null, error: null }, { data: removed, error: null }]);
assert.equal((await chat.removeChatMessage(alreadyRemoved, id(1))).deleted_at, removed.deleted_at);
assert.match(chat.chatErrorMessage({ message: "CHAT_RATE_LIMIT" }), /deux secondes/);
console.log("Chat tests passed: validation, ordering, pagination, reconnect, removals and idempotent sends.");

import PostalMime from "postal-mime";
import { Parser } from "htmlparser2";
import { fail, field, first, limitedBytes, limitedText, now, run, publicUrl } from "./core.js";

const addressPattern = /^[a-z0-9-]{4,60}@inbound\.postmarkapp\.com$/;
const lower = value => typeof value === "string" ? value.trim().toLowerCase() : "";
export const hostedMail = env => addressPattern.test(lower(env.POSTMARK_INBOUND_ADDRESS)) && (env.POSTMARK_WEBHOOK_SECRET || "").length >= 24;
export function forwardingAddress(env, feed) {
  const base = feed.mail_base || (hostedMail(env) && lower(env.POSTMARK_INBOUND_ADDRESS));
  return base && feed.mail_alias ? base.replace("@", "+" + feed.mail_alias + "@") : "";
}
const digest = async text => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), b => b.toString(16).padStart(2,"0")).join("");
function htmlText(html) {
  const parts = [];
  let hidden = 0;
  const omit = new Set(["style","script","head","template"]);
  const block = new Set(["p","div","li","br","h1","h2","h3","tr","blockquote"]);
  const parser = new Parser({
    onopentag(name) { if (omit.has(name)) hidden++; if (!hidden && block.has(name)) parts.push("\n"); },
    ontext(value) { if (!hidden) parts.push(value); },
    onclosetag(name) { if (omit.has(name)) hidden = Math.max(0,hidden-1); if (!hidden && block.has(name)) parts.push("\n"); },
  });
  parser.end(html);
  return parts.join("").replace(/\n[ \t]*\n(?:[ \t]*\n)+/g,"\n\n");
}
async function saveMail(db, slug, subject, text, messageId) {
  subject = String(subject || "Untitled email").trim().slice(0,240) || "Untitled email";
  text = typeof text === "string" ? text.replace(/\r\n?/g,"\n").replace(/\u0000/g,"").trim() : "";
  if (!text) fail("This message has no readable text. Paste the newsletter text instead.");
  if (text.length > 120000) fail("This email exceeds 120,000 characters. Import a shorter selection.",413);
  const fingerprint = await digest(messageId ? "id:"+messageId : "text:"+subject+"\n"+text);
  await run(db, "INSERT OR IGNORE INTO private_mail(id,edition,digest,subject,body,received) SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM private_mail WHERE edition=?)<200",
    crypto.randomUUID(),slug,fingerprint,subject,text,now(),slug);
  const stored = await first(db,"SELECT id FROM private_mail WHERE edition=? AND digest=?",slug,fingerprint);
  if (!stored) fail("The private inbox is full. Remove a saved email before importing another.",409);
  return stored.id;
}
const mailPath = (slug,id) => "/studio/mail?edition="+encodeURIComponent(slug)+(id ? "&message="+encodeURIComponent(id) : "");
export async function uploadMail(db, slug, request) {
  const raw = await limitedBytes(request, 2*1024*1024);
  let parsed;
  try { parsed = await PostalMime.parse(raw, {maxNestingDepth:30}); }
  catch { fail("Could not read this .eml file. Paste the message text instead."); }
  const id = await saveMail(db,slug,parsed.subject,parsed.text?.trim() || htmlText(parsed.html || ""),parsed.messageId);
  return {redirect:mailPath(slug,id)};
}
export async function mailAction(env, feed, op, data) {
  const slug = feed.slug, db = env.DB;
  if (op === "mail-connect") {
    const custom = data.mode === "custom";
    const base = custom ? lower(data.base) : null;
    const password = custom ? field(data.password,128,true) : "";
    if (custom && (!addressPattern.test(base) || !/^[A-Za-z0-9_-]{24,128}$/.test(password))) fail("Enter a Postmark inbound address and a 24–128 character password using letters, digits, hyphens or underscores.");
    if (!custom && !hostedMail(env)) fail("Hosted forwarding is not connected.",503);
    await run(db,"UPDATE editions SET mail_base=?,mail_alias=?,mail_password_hash=? WHERE slug=?",base,crypto.randomUUID().replaceAll("-","").slice(0,24),custom ? await digest(password) : null,slug);
    return {redirect:mailPath(slug)};
  }
  if (op === "mail-disable") {
    await run(db,"UPDATE editions SET mail_alias=NULL,mail_base=NULL,mail_password_hash=NULL WHERE slug=?",slug);
    return {redirect:mailPath(slug)};
  }
  if (op === "mail-paste") {
    const id = await saveMail(db,slug,field(data.subject,240),data.body);
    return {redirect:mailPath(slug,id)};
  }
  const msg = await first(db,"SELECT id FROM private_mail WHERE edition=? AND id=?",slug,field(data.id,64,true));
  if (!msg) fail("Email unavailable.",404);
  if (op === "mail-delete") {
    await run(db,"DELETE FROM private_mail WHERE edition=? AND id=?",slug,msg.id);
    return {redirect:mailPath(slug)};
  }
  if (op !== "mail-brief") fail("Unknown mail action.",404);
  const id = "mail-"+msg.id;
  // A forward can never populate public copy or model evidence.
  const title = field(data.title,240,true), note = field(data.note,1500,true);
  await run(db,"INSERT OR IGNORE INTO stories(id,edition,url,source,original_title,title,note,state,created_at) SELECT ?,?,?,?,?,?,?,'draft',? WHERE (SELECT count(*) FROM stories WHERE edition=?)<3000",
    id,slug,publicUrl(data.url),field(data.source,120,true),title,title,note,now(),slug);
  if (!await first(db,"SELECT id FROM stories WHERE edition=? AND id=?",slug,id)) fail("That link already exists or the edition is full.",409);
  return {redirect:"/studio?edition="+slug+"&filter=draft"};
}

export async function receiveMail(env,req,slug) {
  const db = env.DB;
  const dest = slug ? await first(db,"SELECT slug,mail_alias,mail_base,mail_password_hash FROM editions WHERE slug=?",slug) : null;
  const expected = slug ? dest?.mail_base && dest.mail_password_hash : hostedMail(env) && await digest(env.POSTMARK_WEBHOOK_SECRET);
  if (!expected) fail("Inbound route unavailable.",403);
  let credentials="";
  try { const header=req.headers.get("authorization") || ""; if (header.startsWith("Basic ")) credentials=atob(header.slice(6)); } catch {}
  if (!credentials.startsWith("editions:") || await digest(credentials.slice(9)) !== expected) fail("Inbound authentication failed.",403);
  if (!/^application\/json\b/i.test(req.headers.get("content-type") || "")) fail("Expected a Postmark JSON delivery.",415);
  const raw=await limitedText(req,4*1024*1024);
  let data;
  try {data=JSON.parse(raw);} catch {fail("Invalid mail payload.");}
  const recipient=lower(data?.OriginalRecipient);
  const alias=/^[a-z0-9-]+\+([a-f0-9]{24})@inbound\.postmarkapp\.com$/.exec(recipient)?.[1];
  if (!alias) fail("Unknown forwarding address.",403);
  const feed=dest || await first(db,"SELECT slug,mail_base,mail_alias FROM editions WHERE mail_alias=? AND mail_base IS NULL",alias);
  if (!feed || forwardingAddress(env,feed)!==recipient) fail("Unknown forwarding address.",403);
  const messageId=field(data.MessageID,500,true);
  const body=typeof data.TextBody==="string" && data.TextBody.trim() ? data.TextBody : htmlText(typeof data.HtmlBody==="string" ? data.HtmlBody : "");
  await saveMail(db,feed.slug,data.Subject,body,messageId);
  return {received:true};
}

import { Header } from "@/components/header";
import { EditorInbox } from "@/components/editor-inbox";
import { isEditor } from "@/lib/editorial/server";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Editor inbox | MEDIA / MACHINE",
  robots: { index: false, follow: false },
};
export default async function EditorPage() {
  const authenticated = await isEditor();
  const connection = authenticated
    ? {
        database:
          !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
          !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        summaries: !!process.env.OPENAI_API_KEY,
        email:
          !!process.env.RESEND_API_KEY &&
          !!process.env.RESEND_WEBHOOK_SECRET &&
          !!process.env.INBOUND_EMAIL_ADDRESS &&
          !!process.env.INBOUND_ALLOWED_SENDERS,
        address: process.env.INBOUND_EMAIL_ADDRESS || "",
        autoPublish: process.env.AUTO_PUBLISH !== "false",
      }
    : undefined;
  return (
    <>
      <Header />
      <EditorInbox authenticated={authenticated} connection={connection} />
    </>
  );
}

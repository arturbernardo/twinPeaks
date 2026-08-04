import ChatPanel from "@/components/chat/ChatPanel";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Talk to the digital twin</h1>
        <p className="text-sm text-muted-foreground">
          The agent queries the data through tools — every 🔧 chip is a real, auditable query, not a guess.
        </p>
      </div>
      <ChatPanel />
    </div>
  );
}

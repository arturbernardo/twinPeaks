import ChatPanel from "@/components/chat/ChatPanel";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Converse com o gêmeo digital</h1>
        <p className="text-sm text-muted-foreground">
          O agente consulta os dados por ferramentas — cada chip 🔧 é uma consulta real e auditável, não um chute.
        </p>
      </div>
      <ChatPanel />
    </div>
  );
}

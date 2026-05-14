"use client";

import { ReactNode } from "react";
import { useParams } from "next/navigation";
import InboxList from "@/components/features/messages/InboxList";

export default function MessagesLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const activeId = (params?.conversationId as string) || null;

  return (
    <div className="min-h-screen bg-neutral-900">
      <main className="max-w-7xl mx-auto pl-4 md:pl-16 pr-0 pt-16 md:pt-24 pb-24 md:pb-0">
        <div className="flex h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-neutral-800">
          {/* Inbox list — always visible on desktop, hidden on mobile when a conversation is open */}
          <aside
            className={`
              w-full md:w-80 lg:w-96 shrink-0 border-r border-neutral-800 bg-neutral-950/50
              ${activeId ? "hidden md:flex" : "flex"}
              flex-col
            `}
          >
            <InboxList activeConversationId={activeId} />
          </aside>

          {/* Content pane — empty state, or conversation when one is selected */}
          <section
            className={`
              flex-1 flex flex-col bg-neutral-900
              ${activeId ? "flex" : "hidden md:flex"}
            `}
          >
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}

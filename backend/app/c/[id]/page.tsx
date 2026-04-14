import { ChatClient } from "@/app/c/[id]/chat-client";

type Props = { params: Promise<{ id: string }> };

export default async function ConversationPage(props: Props) {
  const { id } = await props.params;
  return <ChatClient conversationId={id} />;
}

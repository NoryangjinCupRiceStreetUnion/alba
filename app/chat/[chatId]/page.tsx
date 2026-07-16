import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ChatRoomClient from "./ChatRoomClient"

export default async function ChatRoomPage({ params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { chatId } = await params

  return <ChatRoomClient chatId={chatId} />
}

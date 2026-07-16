import { auth, signOut } from "@/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function Page() {
  const session = await auth()
  const user = session?.user

  return (
    <div className="relative flex min-h-screen flex-col items-center px-6 justify-center overflow-hidden bg-[#090b11] text-white">
      <div className="w-full h-[300px] bg-white rounded-2xl mt-6">
        <img src="/test.png" alt="" />
      </div>

      <div className="mt-6 flex flex-col items-left w-full space-y-2 text-left">
        <h2 className="text-2xl font-bold  text-white">상품명</h2>
        <span className="text-lg font-bold  text-white">1일 / 2,000   1주 /  10,000원</span>
      </div>
      <Button className="mt-6 w-[300px]">대여하기</Button>
    </div>
  )
}


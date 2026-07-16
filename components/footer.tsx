import Link from "next/link"

export default function Footer() {
    return (
        <footer className="w-full border-t border-border/40 bg-card py-12 text-muted-foreground transition-all duration-300">
            <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    {/* Brand Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="logo" className="h-6" />
                        </div>
                        <p className="text-xs leading-relaxed max-w-xs">
                            동작구 노량진 이웃들과 함께하는 쉽고 안전한 공유 대여 플랫폼. 안 쓰는 물건으로 소소한 수익을 얻고, 필요한 물건은 저렴하게 빌려 써보세요.
                        </p>
                    </div>


                    {/* Links Section 1 */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">서비스</h4>
                        <ul className="space-y-2.5 text-xs">
                            <li>
                                <Link href="/" className="hover:text-foreground transition-colors">
                                    물건 탐색하기
                                </Link>
                            </li>
                            <li>
                                <Link href="/upload" className="hover:text-foreground transition-colors">
                                    대여 물건 등록
                                </Link>
                            </li>
                            <li>
                                <Link href="/item" className="hover:text-foreground transition-colors">
                                    전체 물품
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Links Section 2 */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">로컬 정보</h4>
                        <ul className="space-y-2.5 text-xs">
                            <li>
                                <span className="hover:text-foreground transition-colors cursor-pointer">
                                    동작구 컵밥거리 상인연합회
                                </span>
                            </li>
                            <li>
                                <span className="hover:text-foreground transition-colors cursor-pointer">
                                    노량진1동 주민센터 연계
                                </span>
                            </li>
                            <li>
                                <span className="hover:text-foreground transition-colors cursor-pointer">
                                    동작 청년 공유 네트워크
                                </span>
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="mt-12 border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px]">
                    <span>&copy; {new Date().getFullYear()} Noryangjin Cup-Rice Street Union. All rights reserved.</span>
                    <div className="flex gap-4">
                        <span className="hover:text-foreground cursor-pointer transition-colors">이용약관</span>
                        <span className="hover:text-foreground cursor-pointer transition-colors">개인정보처리방침</span>
                        <span className="hover:text-foreground cursor-pointer transition-colors">고객 피드백</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
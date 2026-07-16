"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin, Flame, Filter, ArrowUpDown, MessageCircle, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BatteryProgress from "@/components/bat";

type ItemCard = {
  id: string;
  name: string;
  description: string;
  region: string;
  dailyPrice: number;
  weeklyPrice?: number | null;
  tradeMethod: "MEET" | "DELIVER";
  status?: string;
  images?: Array<{ url: string }>;
  owner?: {
    nickname?: string | null;
    name?: string | null;
    trustBattery?: number | null;
  };
};

type TrendItem = {
  rank: number;
  rankChange: number;
  name: string;
  count: number;
  score: number;
};

const SLOGANS = [
  ["잠시 쉬는 물건이,", "쏠쏠한 대여 수익이 되도록."],
  ["급하게 필요한 물건,", "굳이 사지 말고 빌려 쓰세요."],
];

const TREND_ITEMS: TrendItem[] = [
  { rank: 1, rankChange: 2, name: "아이패드", count: 128, score: 230 },
  { rank: 2, rankChange: -1, name: "전동드릴", count: 94, score: 185 },
  { rank: 3, rankChange: 0, name: "노이즈캔슬링 헤드폰", count: 88, score: 160 },
];

export default function Page() {
  const slogan = SLOGANS[0];
  const [items, setItems] = useState<ItemCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tradeFilter, setTradeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("latest");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("all");

  useEffect(() => {
    async function loadItems() {
      try {
        const res = await fetch("/api/items?limit=50");
        if (!res.ok) throw new Error("failed");
        const payload = await res.json();
        setItems(payload.data ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const next = items.filter((item) => {
      const matchesQuery =
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase());
      const matchesTrade = tradeFilter === "all" || item.tradeMethod === tradeFilter;
      const matchesRegion = selectedRegion === "all" || item.region.includes(selectedRegion);
      return matchesQuery && matchesTrade && matchesRegion;
    });

    return next.sort((a, b) => {
      if (sortOrder === "priceAsc") return a.dailyPrice - b.dailyPrice;
      if (sortOrder === "priceDesc") return b.dailyPrice - a.dailyPrice;
      return b.name.localeCompare(a.name);
    });
  }, [items, query, tradeFilter, selectedRegion, sortOrder]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute top-20 left-[10%] -z-10 h-96 w-96 rounded-full bg-indigo-500/10 opacity-60 blur-[120px]" />
      <div className="absolute top-80 right-[15%] -z-10 h-[450px] w-[450px] rounded-full bg-purple-500/10 opacity-50 blur-[130px]" />

      <section className="mx-auto max-w-7xl px-6 pt-16 pb-12 text-center">

        <h1 className="mx-auto flex max-w-3xl flex-col gap-2 text-4xl font-black leading-tight sm:text-5xl">
          <span>{slogan[0]}</span>
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent  decoration-indigo-500/30 underline-offset-8">
            {slogan[1]}
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          필요한 순간에만 빌리고, 쓰지 않는 물건은 수익으로 연결하는 지역 기반 대여 플랫폼입니다.
        </p>

        <div className="mx-auto mt-10 max-w-2xl">
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-md transition duration-300 group-hover:opacity-40" />
            <div className="relative flex items-center rounded-2xl border border-border/80 bg-card px-4 py-2 shadow-lg">
              <Search className="mr-3 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="어떤 물건을 빌리고 싶으세요?"
                className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              {query ? (
                <button onClick={() => setQuery("")} className="mr-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
                  지우기
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-2xl px-6 pb-24">
        <div className="mb-8 grid gap-6">

          <Card className="border-indigo-500/20 bg-indigo-500/5">
            <CardContent className="flex h-full flex-col justify-between p-6">
              <div>
                <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-500">
                  <PackageOpen className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold">내 물건도 바로 올리기</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  잠깐 쓰는 물건을 등록하면 이웃과 안전하게 대여 요청을 주고받을 수 있습니다.
                </p>
              </div>
              <div className="mt-6 flex gap-2">
                <Link href="/upload" className="flex-1">
                  <Button className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-500">등록하기</Button>
                </Link>
                <Link href="/chat" className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl">
                    <MessageCircle className="mr-2 h-4 w-4" /> 채팅
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-border/40 pb-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                showFilters ? "bg-accent text-foreground" : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Filter className="h-3.5 w-3.5" /> 상세 필터
            </button>
            <div className="flex rounded-lg border border-border/60 bg-card p-0.5 text-xs">
              {[
                { value: "all", label: "전체" },
                { value: "MEET", label: "직거래" },
                { value: "DELIVER", label: "택배" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTradeFilter(option.value)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${tradeFilter === option.value ? "bg-accent font-bold text-foreground" : "text-muted-foreground"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-border/60 bg-card p-0.5 text-xs">
              {[
                { value: "all", label: "전체 지역" },
                { value: "노량진동", label: "노량진동" },
                { value: "상도동", label: "상도동" },
                { value: "대방동", label: "대방동" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedRegion(option.value)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${selectedRegion === option.value ? "bg-accent font-bold text-foreground" : "text-muted-foreground"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="cursor-pointer bg-transparent font-semibold text-foreground focus:outline-none">
              <option value="latest">최신 등록순</option>
              <option value="priceAsc">대여가 낮은순</option>
              <option value="priceDesc">대여가 높은순</option>
            </select>
          </div>
        </div>

        {showFilters ? (
          <div className="mb-8 grid gap-6 rounded-2xl border border-border/80 bg-card p-5 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider">거래 방식</h4>
              <div className="flex gap-2">
                {[
                  { value: "all", label: "전체" },
                  { value: "MEET", label: "직거래" },
                  { value: "DELIVER", label: "택배" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTradeFilter(option.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${tradeFilter === option.value ? "border-indigo-600 bg-indigo-600 text-white" : "border-border bg-background"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider">지역</h4>
              <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="all">전체 지역</option>
                <option value="노량진동">노량진동</option>
                <option value="상도동">상도동</option>
                <option value="대방동">대방동</option>
              </select>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-dashed border-border/80 bg-accent/20 p-12 text-center text-sm text-muted-foreground">
            목록을 불러오는 중입니다...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-3xl border border-dashed border-border/80 bg-accent/20 p-12 text-center">
            <p className="text-3xl">🔍</p>
            <h3 className="mt-4 text-base font-bold">조건에 맞는 물건이 없습니다</h3>
            <p className="mt-2 text-xs text-muted-foreground">다른 검색어로 다시 찾아보세요.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Link key={item.id} href={`/item/${item.id}`} className="group overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5">
                <div className="relative aspect-video overflow-hidden bg-accent/30">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">

                  </div>
                  {item.images?.[0]?.url ? (
                    <img
                      src={item.images[0].url}
                      alt={item.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  ) : null}
                  <div className="absolute left-3 top-3 flex gap-1">
                    <Badge className={item.tradeMethod === "MEET" ? "bg-indigo-600" : "bg-purple-600"}>{item.tradeMethod === "MEET" ? "직거래" : "택배"}</Badge>
                    <Badge variant="secondary">대여가능</Badge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5 text-left">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{item.region}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold leading-snug">{item.name}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">{item.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground">1일 대여료</p>
                      <p className="text-base font-black">{item.dailyPrice.toLocaleString()}원</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

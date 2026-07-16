/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from 'react';
import css from './page.module.css';
import { Search } from 'lucide-react';

const TEXTS = [
    [
        "잠시 쉬는 물건이,",
        "쏠쏠한 수익이 되도록."
    ],
    [
        "물건이 필요한데,",
        "사기는 싫을 때."
    ]
];

export default function Page() {
    const [text, setText] = useState(TEXTS[0]);
    const [query, setQuery] = useState("");

    useEffect(() => setText(TEXTS[Math.random() > 0.5 ? 0 : 1]), []);

    const handleSearch = async () => {
        console.log(query);
    };

    return <div className={css.container}>
        <div className={css.hero}>
            <span className={css.title}>{text[0]}</span>
            <span className={css.title} style={{ "color": "AccentColor", "textDecoration": "underline" }}>{text[1]}</span>
        </div>
        <div className={css.searchBox}>
            <div className={css.search}>
                <input
                    type="text"
                    placeholder='검색어 입력'
                    value={query}
                    onChange={({ currentTarget }) => setQuery(currentTarget.value)}
                    onKeyDown={({ key }) => key === "Enter" && handleSearch()}
                />
                <button onClick={handleSearch}>
                    <Search size={27} />
                </button>
            </div>
            <div className={css.suggests}>
                <button>
                    전동드릴
                </button>
                <button>
                    엄마
                </button>
            </div>
        </div>
    </div>;
}

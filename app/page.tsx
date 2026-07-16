"use client";

import InOutAnimation from '@/components/InOutAnimation';
import css from './page.module.css';

export default function Page() {
    return (
        <div className={css.container}>
            <div className={css.hero}>
                <InOutAnimation animate className={css.header}>
                    <span>잠시 쉬고 있는 물건,&nbsp;</span>
                    <span style={{ "color": "#005a8a" }}>필요한 사람에게.</span>
                </InOutAnimation>
            </div>
            <div className={css.hero}>
                
            </div>
        </div>
    )
}

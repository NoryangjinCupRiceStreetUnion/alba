import { animated, easings, useSpringValue } from "@react-spring/web";
import React, { useEffect } from "react"

type Props = {
    className?: string,
    style?: Record<string, string | number>,
    animate: boolean,
    children: React.ReactNode;
    delay?: number;

    onAnimateEnd?: () => unknown;
}

export default function InOutAnimation(props: Props) {
    const { className, style, animate, children, delay, onAnimateEnd } = props;

    const opacity = useSpringValue(0, {
        "config": {
            "duration": 480,
            "easing": easings.easeOutCubic
        },
        delay
    });
    const translateY = useSpringValue(15, {
        "config": {
            "duration": 480,
            "easing": easings.easeOutBack
        },
        delay
    });

    useEffect(() => {
        if (animate) {
            Promise.all([
                opacity.start(1),
                translateY.start(0)
            ]).then(onAnimateEnd);
        } else {
            Promise.all([
                opacity.start(0),
                translateY.start(10)
            ]).then(onAnimateEnd);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animate]);

    return <animated.div style={{
        ...style,
        opacity,
        "transform": translateY.to(v => `translateY(${v}px)`)
    }} className={className}>
        {children}
    </animated.div>
}

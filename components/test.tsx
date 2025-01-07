'use client';

import { useEffect } from "react";

export default function Test() {
    const loadExample = async () => {
        const wasm = await import(`wasm_backend`);
        wasm.greet();
    };

    useEffect(() => {
        loadExample();
    }, []);

    return (
        <p>fugapiyo</p>
    );
}

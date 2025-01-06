'use client';

import { greet } from "wasm_backend";

export default function Test() {
    greet();
    return (
        <div>test</div>
    );
}

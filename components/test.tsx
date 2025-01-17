"use client";
import { useEffect, useState } from "react";
import { ECFGWrapper } from "wasm_backend";

export default function Test() {
  const [s, setS] = useState<boolean>(false);
  const loadExample = () => {
    const terminals = ["+", "*", "i", "(", ")"];
    const nonTerminals = ["E", "T", "F"];
    const productions = [
      { lhs: "E", rhs: ["T", "\\{", "+", "T", "\\}"] },
      { lhs: "T", rhs: ["F", "\\{", "*", "F", "\\}"] },
      { lhs: "F", rhs: ["(", "E", ")", "\\|", "i"] },
    ];
    const startSymbol = "E";

    // コンストラクタ呼び出し時にJsValueがRust側に渡され、RustでVec<String>などに変換
    const ecfgWrapper = new ECFGWrapper(
      terminals,
      nonTerminals,
      productions,
      startSymbol,
    );

    console.log("is_ell1:", ecfgWrapper.is_ell1());

    // 例: calculate_nullable
    const symbols = ["\\{", "E", "\\}"];
    const isNullable = ecfgWrapper.calculate_nullable(symbols);
    console.log("Nullable?", isNullable);

    return isNullable;
  };

  useEffect(() => {
    const s = loadExample();
    setS(s);
  }, []);

  return (
    <div>
      {s && <p>yes!!</p>}
      {!s && <p>no!!</p>}
    </div>
  );
}

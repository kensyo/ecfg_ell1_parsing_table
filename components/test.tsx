import { ECFGWrapper } from "wasm_backend";

export default async function Test() {
    const loadExample = async () => {
        // const wasm = await import(`wasm_backend`);
        // wasm.greet();
        const terminals = ["+", "*", "i", "(", ")"];
        const nonTerminals = ["E", "T", "F"];
        const productions = [
            { lhs: "E", rhs: ["T", "\\{", "+", "T", "\\}"] },
            { lhs: "T", rhs: ["F", "\\{", "*", "F", "\\}"] },
            { lhs: "F", rhs: ["(", "E", ")", "\\|", "i"] },
        ];
        const startSymbol = "E";

        // コンストラクタ呼び出し時にJsValueがRust側に渡され、RustでVec<String>などに変換
        const ecfgWrapper = new ECFGWrapper(terminals, nonTerminals, productions, startSymbol);

        console.log("is_ell1:", ecfgWrapper.is_ell1());

        // 例: calculate_nullable
        const symbols = ["\\{", "E", "\\}"];
        const isNullable = ecfgWrapper.calculate_nullable(symbols);
        console.log("Nullable?", isNullable);

        return isNullable
    };

    const hoge = await loadExample();

    let moji = "";
    if (hoge) {
        moji = "yes";
    } else {
        moji = "no";
    }

    return (
        <p>{moji}</p>
    );
}

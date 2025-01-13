use serde_wasm_bindgen;
use wasm_bindgen::prelude::*;
use ll1_checker::ECFG;
use serde::Deserialize;

/// productions用の中間型 ( { lhs: string, rhs: string[] } に相当 )
#[derive(Deserialize)]
struct Production {
    lhs: String,
    rhs: Vec<String>,
}

#[wasm_bindgen]
pub struct ECFGWrapper {
    inner: ECFG,
}

#[wasm_bindgen]
impl ECFGWrapper {
    /// JS 側から引数を受け取るコンストラクタ
    /// terminals: string[] (JS配列)
    /// non_terminals: string[] (JS配列)
    /// productions: Production[] (JS側では {lhs, rhs}のオブジェクト配列)
    /// start_symbol: &str (文字列)
    #[wasm_bindgen(constructor)]
    pub fn new(
        terminals: JsValue,
        non_terminals: JsValue,
        productions: JsValue,
        start_symbol: &str,
    ) -> ECFGWrapper {
        // JsValue -> Vec<String> への変換
        let terminals: Vec<String> =
            serde_wasm_bindgen::from_value(terminals).expect("Failed to deserialize 'terminals'");

        let non_terminals: Vec<String> = serde_wasm_bindgen::from_value(non_terminals)
            .expect("Failed to deserialize 'non_terminals'");

        // JsValue -> Vec<Production> への変換 (Production は自前定義の struct)
        let productions: Vec<Production> = serde_wasm_bindgen::from_value(productions)
            .expect("Failed to deserialize 'productions'");

        // ECFG::new() に渡すための型に変換
        // つまり (String, Vec<String>) のタプル列に直す
        let productions_for_ecfg = productions
            .into_iter()
            .map(|p| (p.lhs, p.rhs))
            .collect::<Vec<(String, Vec<String>)>>();

        let inner = ECFG::new(terminals, non_terminals, productions_for_ecfg, start_symbol.to_string());

        ECFGWrapper { inner }
    }

    /// たとえば is_ell1() をそのままエクスポート
    #[wasm_bindgen]
    pub fn is_ell1(&self) -> bool {
        self.inner.is_ell1()
    }

    /// 以下、他のメソッドも同様にラップ
    #[wasm_bindgen]
    pub fn calculate_nullable(&self, symbols: JsValue) -> bool {
        let vec: Vec<String> =
            serde_wasm_bindgen::from_value(symbols).expect("Failed to parse symbols from JsValue");
        self.inner.calculate_nullable(&vec)
    }

    /// 例: first_set を返す
    #[wasm_bindgen]
    pub fn calculate_first_set(&self, symbols: JsValue) -> JsValue {
        let vec: Vec<String> =
            serde_wasm_bindgen::from_value(symbols).expect("Failed to parse symbols from JsValue");
        let set = self.inner.calculate_first_set(&vec);
        // HashSet<String> -> JsValue に変換 (これも serde_wasm_bindgen など使用)
        serde_wasm_bindgen::to_value(&set).unwrap()
    }

    /// 以下、同様に全 pub メソッドをラップする
    #[wasm_bindgen]
    pub fn calculate_follow_set(&self, sym: &str) -> JsValue {
        let set = self.inner.calculate_follow_set(&sym.to_string());
        serde_wasm_bindgen::to_value(&set).unwrap()
    }

    #[wasm_bindgen]
    pub fn calculate_director_set(&self, sym: &str) -> JsValue {
        let map = self.inner.calculate_director_set(&sym.to_string());
        serde_wasm_bindgen::to_value(&map).unwrap()
    }
}

// use wasm_bindgen::prelude::*;
// use ll1_checker::ECFG;

// // When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// // allocator.
// #[cfg(feature = "wee_alloc")]
// #[global_allocator]
// static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
//
// #[wasm_bindgen]
// extern {
//     fn alert(s: &str);
// }
//
// #[wasm_bindgen]
// pub fn greet() {
//     alert("Hello!!");
// }

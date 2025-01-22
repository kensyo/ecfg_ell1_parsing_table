"use client";

import { useEffect, useState } from "react";
import {
  useForm,
  FieldErrors,
  useFieldArray,
  Controller,
  useWatch,
} from "react-hook-form";
import { FormItem } from "./ui/form";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { CustomizedInputTags } from "./ui/customized-input-tags";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ECFGWrapper } from "@/wasm_backend/pkg/wasm_backend";

// shadcn/ui のテーブルコンポーネント
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// 変更点: Badge の import
import { Badge } from "@/components/ui/badge";

// -------------------------------------
// 型定義
// -------------------------------------
type Production = {
  lhs: string; // 単一の文字列
  rhs: string[]; // 複数タグの配列
};

type ECFG = {
  terminals: string[];
  nonTerminals: string[];
  productions: Production[];
  startSymbol: string;
  // ↓ ここで wasm の各メソッド用の引数をフォームに追加
  forNullable: string[];
  forFirstSet: string[];
  forFollowSet: string; // ← Select用, "__none__" なら未選択
  forDirectorSet: string; // ← 同上
};

// Rust/wasm のメソッド結果をまとめて格納する型
type WasmResults = {
  isELL1: boolean;
  isNullable: boolean;
  firstSet: string[];
  followSet: string[];
  directorEntries: Array<[string[], string[]]>; // ディレクタセット (キー配列, 値配列)
};

const SPECIAL_STR = ["\\|", "\\(", "\\)", "\\{", "\\}"];

// 変更点: 配列の文字列を Badge で並べるヘルパー関数 (最小限の追加)
function renderBadges(items: string[], asSet: boolean = false) {
  return (
    <>
      {items.length !== 0 ? (
        items.map((str, i) => {
          const is_special = SPECIAL_STR.includes(str);
          return (
            <Badge
              key={`${str}-${i}`}
              variant={is_special ? "default" : "secondary"}
              className="mx-1 rounded-md px-1"
            >
              {is_special ? str.slice(1, 2) : str}
            </Badge>
          );
        })
      ) : (
        <p>{asSet ? "∅" : "ε"}</p>
      )}
    </>
  );
}

export default function ECFGForm() {
  // -------------------------------------
  // useForm & State
  // -------------------------------------
  const {
    control,
    handleSubmit,
    setValue,
    getValues, // ← 変更点: 現在のフォーム状態を取得
    reset, // ← 変更点: フォーム値を上書き
    formState: { errors },
  } = useForm<ECFG>({
    defaultValues: {
      terminals: [],
      nonTerminals: [],
      productions: [{ lhs: "", rhs: [] }],
      startSymbol: "",
      forNullable: [],
      forFirstSet: [],
      forFollowSet: "__none__",
      forDirectorSet: "__none__",
    },
  });
  const [formData, setFormData] = useState<ECFG | null>(null);

  // Rust/wasm メソッドの結果をまとめるステート
  const [wasmResults, setWasmResults] = useState<WasmResults | null>(null);

  // -------------------------------------
  // Field Array: productions
  // -------------------------------------
  const { fields, append, remove } = useFieldArray({
    name: "productions",
    control,
  });

  // -------------------------------------
  // useWatchをコンポーネントのトップレベルで呼び出す
  // -------------------------------------
  const productions = useWatch({ control, name: "productions" });
  const nonTerminals = useWatch({ control, name: "nonTerminals" }) || [];

  // === 変更点: 複数セーブデータを管理するためのステート
  const [saveName, setSaveName] = useState(""); // 保存名を入力する欄
  const [saveList, setSaveList] = useState<string[]>([]); // localStorage にあるセーブ一覧
  const [selectedLoadName, setSelectedLoadName] = useState(""); // 選択中のロード名

  // -------------------------------------
  // productions が変化するたび、NonTerminals & Terminals を再計算
  // -------------------------------------
  useEffect(() => {
    if (!productions) return;

    // === NonTerminals: 全LHS を収集 ===
    const lhsSet = new Set<string>();
    productions.forEach((prod) => {
      if (prod.lhs) {
        lhsSet.add(prod.lhs);
      }
    });
    setValue("nonTerminals", Array.from(lhsSet));

    // === Terminals: 全シンボル( LHS + RHS ) から NonTerminals + 特殊記号 を除外
    const specialTokens = new Set(["\\{", "\\}", "\\|", "\\(", "\\)"]);
    const allSymbols = new Set<string>();
    productions.forEach((prod) => {
      if (prod.lhs) {
        allSymbols.add(prod.lhs);
      }
      prod.rhs.forEach((sym) => {
        allSymbols.add(sym);
      });
    });

    for (const nt of lhsSet) {
      allSymbols.delete(nt);
    }
    for (const st of specialTokens) {
      allSymbols.delete(st);
    }
    setValue("terminals", Array.from(allSymbols));
  }, [productions, setValue]);

  // -------------------------------------
  // Submit handlers
  // -------------------------------------
  const onValid = (data: ECFG) => {
    setFormData(data);

    const ecfg = new ECFGWrapper(
      data.terminals,
      data.nonTerminals,
      data.productions,
      data.startSymbol,
    );

    const isELL1 = ecfg.is_ell1();
    const isNullable = ecfg.calculate_nullable(data.forNullable);
    const firstSetRaw = ecfg.calculate_first_set(data.forFirstSet);

    let followSetRaw: string[] = [];
    if (data.forFollowSet !== "__none__") {
      followSetRaw = ecfg.calculate_follow_set(data.forFollowSet);
    }

    let directorMap: Map<string[], string[]> = new Map();
    if (data.forDirectorSet !== "__none__") {
      directorMap = ecfg.calculate_director_set(data.forDirectorSet);
    }

    let directorEntries: Array<[string[], string[]]> = [];
    if (directorMap && typeof directorMap.entries === "function") {
      directorEntries = Array.from(directorMap.entries());
    }

    console.log("isELL1 =>", isELL1);
    console.log("isNullable =>", isNullable);
    console.log("firstSet =>", firstSetRaw);
    console.log("followSet =>", followSetRaw);
    console.log("directorSet =>", directorMap);

    setWasmResults({
      isELL1,
      isNullable,
      firstSet: firstSetRaw,
      followSet: followSetRaw,
      directorEntries,
    });
  };

  const onInvalid = (errors: FieldErrors<ECFG>) => {
    console.error("Validation errors:", errors);
  };

  // -------------------------------------
  // 変更点: 複数のセーブデータ (localStorage) を扱う機能
  // -------------------------------------
  // localStorage に一覧を更新
  const refreshSaveList = () => {
    const newList: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("myECFGData_")) {
        newList.push(key.replace("myECFGData_", ""));
      }
    }
    setSaveList(newList);
  };

  useEffect(() => {
    // 初回マウントで一覧読み込み
    refreshSaveList();
  }, []);

  // セーブ
  const handleSave = () => {
    if (!saveName) {
      alert("Please enter a save name.");
      return;
    }
    const data = getValues();
    localStorage.setItem(`myECFGData_${saveName}`, JSON.stringify(data));
    alert(`Saved as "${saveName}"`);
    setSaveName("");
    refreshSaveList();
  };

  // ロード
  const handleLoad = () => {
    if (!selectedLoadName) {
      alert("Please select a saved data name from the list.");
      return;
    }
    const raw = localStorage.getItem(`myECFGData_${selectedLoadName}`);
    if (!raw) {
      alert(`No data found for "${selectedLoadName}"`);
      return;
    }
    const parsed = JSON.parse(raw) as ECFG;
    // フォーム値を上書き
    reset(parsed);
    alert(`Loaded data: "${selectedLoadName}"`);
  };

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} className="space-y-3">
      {/* 1) NonTerminal symbols (auto-generated by productions) */}
      <FormItem>
        <Label>NonTerminal symbols (auto-generated by productions)</Label>
        <Controller
          name="nonTerminals"
          control={control}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              disabled
              onChange={() => {
                // 手動編集不可
              }}
            />
          )}
        />
      </FormItem>

      {/* 2) Terminal symbols (auto-generated by productions) */}
      <FormItem>
        <Label>Terminal symbols (auto-generated by productions)</Label>
        <Controller
          name="terminals"
          control={control}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              disabled
              onChange={() => {
                // 手動編集不可
              }}
            />
          )}
        />
      </FormItem>

      {/* 3) productions (手動編集) */}
      <FormItem>
        <Label>Productions</Label>
        {errors.productions && (
          <span className="px-2 text-sm text-red-500">
            {"The symbol in LHS must not be empty."}
          </span>
        )}
        {fields.map((fieldItem, index) => (
          <div key={fieldItem.id} className="mb-4 flex items-center gap-2">
            <div>
              {errors.productions && errors.productions[index]?.lhs && (
                <span className="px-2 text-sm text-red-500">{"*"}</span>
              )}
            </div>
            <div className="flex-1" style={{ flexBasis: "15%" }}>
              <Controller
                name={`productions.${index}.lhs`}
                rules={{
                  required: "The symbol in LHS must not be empty.",
                }}
                control={control}
                render={({ field }) => (
                  <CustomizedInputTags
                    maxTags={1}
                    {...field}
                    // LHS は単一タグなので配列にして渡す
                    value={field.value ? [field.value] : []}
                    onChange={(newValue) => {
                      if (typeof newValue === "function") {
                        field.onChange("");
                      } else {
                        field.onChange(newValue[0] || "");
                      }
                    }}
                  />
                )}
              />
            </div>

            <span className="font-bold">→</span>

            <div className="flex-1" style={{ flexBasis: "75%" }}>
              <Controller
                name={`productions.${index}.rhs`}
                control={control}
                render={({ field }) => (
                  <CustomizedInputTags
                    {...field}
                    value={field.value}
                    onChange={(newValue) => {
                      if (typeof newValue === "function") {
                        field.onChange([]);
                      } else {
                        field.onChange(newValue);
                      }
                    }}
                  />
                )}
              />
            </div>

            <Button
              type="button"
              onClick={() => remove(index)}
              className="bg-red-500 text-white"
            >
              Remove
            </Button>
          </div>
        ))}

        <Button
          type="button"
          onClick={() => append({ lhs: "", rhs: [] })}
          className="mt-4 bg-green-500 text-white"
        >
          Add Production
        </Button>
      </FormItem>

      {/* 4) Start symbol (NonTerminals から選択) */}
      <FormItem>
        <Label>Start symbol</Label>
        {errors.startSymbol && (
          <span className="px-2 text-sm text-red-500">
            {errors.startSymbol.message}
          </span>
        )}
        <Controller
          name="startSymbol"
          rules={{
            required: "Start symbol is required.",
          }}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Choose NonTerminal" />
              </SelectTrigger>
              <SelectContent>
                {nonTerminals.map((nt) => (
                  <SelectItem key={nt} value={nt}>
                    {nt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormItem>

      {/* 5) forNullable, forFirstSet, forFollowSet, forDirectorSet */}
      <FormItem>
        <Label>forNullable: string[]</Label>
        {errors.forNullable && (
          <span className="px-2 text-sm text-red-500">
            {errors.forNullable.message}
          </span>
        )}
        <Controller
          name="forNullable"
          control={control}
          rules={{
            validate: (value, { nonTerminals, terminals }) => {
              for (const symbol of value) {
                if (
                  !(
                    nonTerminals.includes(symbol) ||
                    terminals.includes(symbol) ||
                    SPECIAL_STR.includes(symbol)
                  )
                ) {
                  return `"${symbol}" is neither a terminal nor a non terminal.`;
                }
              }
              return true;
            },
          }}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormItem>

      <FormItem>
        <Label>forFirstSet: string[]</Label>
        {errors.forFirstSet && (
          <span className="px-2 text-sm text-red-500">
            {errors.forFirstSet.message}
          </span>
        )}
        <Controller
          name="forFirstSet"
          control={control}
          rules={{
            validate: (value, { nonTerminals, terminals }) => {
              for (const symbol of value) {
                if (
                  !(
                    nonTerminals.includes(symbol) ||
                    terminals.includes(symbol) ||
                    SPECIAL_STR.includes(symbol)
                  )
                ) {
                  return `"${symbol}" is neither a terminal nor a non terminal.`;
                }
              }
              return true;
            },
          }}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormItem>

      <FormItem>
        <Label>forFollowSet: string (Select)</Label>
        <Controller
          name="forFollowSet"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="(not selected)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="__none__" value="__none__">
                  (not selected)
                </SelectItem>
                {nonTerminals.map((nt) => (
                  <SelectItem key={nt} value={nt}>
                    {nt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormItem>

      <FormItem>
        <Label>forDirectorSet: string (Select)</Label>
        <Controller
          name="forDirectorSet"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="(not selected)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="__none__" value="__none__">
                  (not selected)
                </SelectItem>
                {nonTerminals.map((nt) => (
                  <SelectItem key={nt} value={nt}>
                    {nt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormItem>

      {/* Submit ボタン */}
      <Button type="submit" className="mt-4 bg-blue-500 px-4 py-2 text-white">
        Submit
      </Button>

      {/*
        変更点: 複数セーブデータ対応
        SaveName: テキスト入力
        Save: ボタン
        Loadのセレクト + ボタン
      */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* セーブ名 (saveName) 入力 */}
        <div>
          <Label htmlFor="saveName">Save Name</Label>
          <input
            id="saveName"
            className="ml-2 border px-2 py-1"
            placeholder="myGrammar1"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
          />
        </div>
        {/* セーブボタン */}
        <Button type="button" onClick={handleSave} className="bg-gray-500">
          Save
        </Button>

        {/* ロードセレクト */}
        <div>
          <Label>Load data:</Label>
          <select
            className="ml-2 border px-2 py-1"
            value={selectedLoadName}
            onChange={(e) => setSelectedLoadName(e.target.value)}
          >
            <option value="">(choose a save)</option>
            {saveList.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {/* ロードボタン */}
        <Button type="button" onClick={handleLoad} className="bg-gray-500">
          Load
        </Button>
      </div>

      {/* 送信後のフォームデータ */}
      {formData && (
        <pre className="mt-4 rounded border p-2">
          {JSON.stringify(formData, null, 2)}
        </pre>
      )}

      {/* Rust/wasm メソッド結果の表示 */}
      {wasmResults && (
        <div className="mt-4 space-y-4 rounded border p-2">
          <Table>
            <TableCaption>
              Rust/wasm メソッド実行結果 (入力値と出力の対応)
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/6">Target</TableHead>
                <TableHead className="w-1/6">Input</TableHead>
                <TableHead className="w-4/6">Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Row1: isELL1 (入力なし) */}
              <TableRow>
                <TableCell>isELL(1)</TableCell>
                <TableCell>N/A</TableCell>
                <TableCell>{String(wasmResults.isELL1)}</TableCell>
              </TableRow>

              {/* Row2: forNullable */}
              <TableRow>
                <TableCell>Nullable</TableCell>
                <TableCell>
                  {formData?.forNullable
                    ? renderBadges(formData.forNullable)
                    : "empty string"}
                </TableCell>
                <TableCell>{String(wasmResults.isNullable)}</TableCell>
              </TableRow>

              {/* Row3: forFirstSet */}
              <TableRow>
                <TableCell>FirstSet</TableCell>
                <TableCell>
                  {formData?.forFirstSet
                    ? renderBadges(formData.forFirstSet)
                    : null}
                </TableCell>
                <TableCell>
                  {renderBadges(wasmResults.firstSet, true)}
                </TableCell>
              </TableRow>

              {/* Row4: forFollowSet */}
              <TableRow>
                <TableCell>FollowSet</TableCell>
                <TableCell>
                  {formData?.forFollowSet === "__none__"
                    ? "(not selected)"
                    : renderBadges([formData?.forFollowSet || ""])}
                </TableCell>
                <TableCell>
                  {renderBadges(wasmResults.followSet, true)}
                </TableCell>
              </TableRow>

              {/* Row5: directorSet → subtable for the output */}
              <TableRow>
                <TableCell>DirectorSet</TableCell>
                <TableCell>
                  {formData?.forDirectorSet === "__none__"
                    ? "(not selected)"
                    : renderBadges([formData?.forDirectorSet || ""])}
                </TableCell>
                <TableCell>
                  {wasmResults.directorEntries.length === 0 ? (
                    <div>(empty or not selected)</div>
                  ) : (
                    <Table>
                      <TableCaption>
                        directorSet (Map&lt;string[], string[]&gt;)
                      </TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>RHS</TableHead>
                          <TableHead>Result Set</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wasmResults.directorEntries.map(([k, v], i) => (
                          <TableRow key={i}>
                            <TableCell>{renderBadges(k)}</TableCell>
                            <TableCell>{renderBadges(v, true)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </form>
  );
}

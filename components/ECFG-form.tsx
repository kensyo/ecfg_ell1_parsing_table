"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useForm,
  FieldErrors,
  useFieldArray,
  Controller,
  useWatch,
  useFormContext,
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

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { defaultECFG } from "./core-contents";

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

type WasmResults = {
  isELL1: boolean;
  isNullable: boolean;
  firstSet: string[];
  followSet: string[];
  directorEntries: Array<[string[], string[]]>; // ディレクタセット (キー配列, 値配列)
};

// セーブデータ: { name, updatedAt, data }
interface SaveData {
  name: string;
  updatedAt: number;
  data: ECFG;
}

const SPECIAL_STR = ["\\|", "\\(", "\\)", "\\{", "\\}"];

/**
 * Badge表示のためのヘルパー
 */
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
  // 初期フォーム状態を定義
  // -------------------------------------
  // const defaultECFG: ECFG = {
  //   terminals: [],
  //   nonTerminals: [],
  //   productions: [{ lhs: "", rhs: [] }],
  //   startSymbol: "",
  //   forNullable: [],
  //   forFirstSet: [],
  //   forFollowSet: "__none__",
  //   forDirectorSet: "__none__",
  // };

  // フォーム内容が等しいかざっくり判定
  function isECFGEqual(a: ECFG, b: ECFG): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  // ロード中のデータを localStorage から取り出すヘルパー
  function getCurrentLoadedData(): ECFG | null {
    if (!currentLoadedKey) return null;
    const raw = localStorage.getItem(currentLoadedKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SaveData;
      return parsed.data;
    } catch {
      return null;
    }
  }

  // -------------------------------------
  // useForm & State
  // -------------------------------------
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    resetField,
    formState: { errors },
  } = useFormContext<ECFG>();

  const [formData, setFormData] = useState<ECFG | null>(null);
  const [wasmResults, setWasmResults] = useState<WasmResults | null>(null);

  // Field Array
  const { fields, append, remove } = useFieldArray({
    name: "productions",
    control,
  });

  // useWatch
  const productions = useWatch({ control, name: "productions" });
  const nonTerminals = useWatch({ control, name: "nonTerminals" }) || [];

  // セーブデータ一覧を表示用
  interface SaveItem {
    key: string; // localStorage のキー
    name: string; // ユーザーが指定した名前
    updatedAt: number;
  }
  const [saveList, setSaveList] = useState<SaveItem[]>([]);

  // UI: セーブ名入力
  const [saveName, setSaveName] = useState("");

  // UI: ロード/削除用に選択中のキー
  const [selectedKey, setSelectedKey] = useState("");

  // 現在ロード中のキー & 名前 → 上書きセーブに使う
  const [currentLoadedKey, setCurrentLoadedKey] = useState("");
  const [currentLoadedName, setCurrentLoadedName] = useState("");

  // -------------------------------------
  // productions 変化時に NonTerminals & Terminals を再計算
  // -------------------------------------
  useEffect(() => {
    if (!productions) return;
    const lhsSet = new Set<string>();
    productions.forEach((p) => {
      if (p.lhs) lhsSet.add(p.lhs);
    });
    setValue("nonTerminals", Array.from(lhsSet));

    const specialTokens = new Set(["\\{", "\\}", "\\|", "\\(", "\\)"]);
    const allSymbols = new Set<string>();
    productions.forEach((p) => {
      if (p.lhs) allSymbols.add(p.lhs);
      p.rhs.forEach((sym) => allSymbols.add(sym));
    });

    for (const nt of lhsSet) allSymbols.delete(nt);
    for (const st of specialTokens) allSymbols.delete(st);
    setValue("terminals", Array.from(allSymbols));
  }, [productions, setValue]);

  // -------------------------------------
  // フォーム送信
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

    console.log({
      isELL1,
      isNullable,
      firstSetRaw,
      followSetRaw,
      directorMap,
    });

    setWasmResults({
      isELL1,
      isNullable,
      firstSet: firstSetRaw,
      followSet: followSetRaw,
      directorEntries,
    });
  };
  const onInvalid = (errs: FieldErrors<ECFG>) => {
    console.error("Validation errors:", errs);
  };

  // -------------------------------------
  // localStorage からセーブ一覧を読み込み & 更新
  // -------------------------------------
  const refreshSaveList = useCallback(() => {
    const arr: SaveItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("myECFGData_")) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as SaveData;
          arr.push({
            key: k,
            name: parsed.name,
            updatedAt: parsed.updatedAt,
          });
        } catch (e) {
          console.warn("Failed to parse storage item", k, e);
        }
      }
    }
    // updatedAt 降順でソート
    arr.sort((a, b) => b.updatedAt - a.updatedAt);
    setSaveList(arr);
  }, []);

  useEffect(() => {
    refreshSaveList();
  }, [refreshSaveList]);

  // -------------------------------------
  // 新規セーブ
  // -------------------------------------
  const handleNewSave = () => {
    if (!saveName) {
      alert("セーブ名を入力してください。");
      return;
    }
    const data = getValues();
    const now = Date.now();
    // 新規キー (同名でも別キー)
    const newKey = `myECFGData_${now}`;
    const obj: SaveData = {
      name: saveName,
      updatedAt: now,
      data,
    };
    localStorage.setItem(newKey, JSON.stringify(obj));
    alert(`新規セーブ: "${saveName}" (key=${newKey})`);
    setSaveName("");

    // 新規セーブ後、そのデータをロード中にする
    setCurrentLoadedKey(newKey);
    setCurrentLoadedName(saveName);

    refreshSaveList();
  };

  // -------------------------------------
  // 上書きセーブ (ロード中のキーがある場合のみ)
  // -------------------------------------
  const handleOverwriteSave = () => {
    if (!currentLoadedKey) {
      alert("ロード中のセーブデータがありません (上書き不可)。");
      return;
    }
    const raw = localStorage.getItem(currentLoadedKey);
    if (!raw) {
      alert("ロード中のキーが見つかりません。削除された可能性があります。");
      setCurrentLoadedKey("");
      setCurrentLoadedName("");
      refreshSaveList();
      return;
    }
    try {
      const oldObj = JSON.parse(raw) as SaveData;
      const newData = getValues();
      const now = Date.now();
      const updated: SaveData = {
        name: oldObj.name, // セーブ名は変えない
        updatedAt: now,
        data: newData,
      };
      localStorage.setItem(currentLoadedKey, JSON.stringify(updated));
      alert(`上書きしました: ${oldObj.name} (key=${currentLoadedKey})`);

      // 更新時刻が変わったので一覧再読み込み
      refreshSaveList();
    } catch (e) {
      alert("上書きに失敗しました。パースエラー?");
      console.error(e);
    }
  };

  // -------------------------------------
  // 新規データ (フォーム初期化 & ロード状態を解除)
  // 何もロードしていない or ロード中 => 変更があれば確認
  // -------------------------------------
  const handleNewData = () => {
    // 1) 何もロードしていない状態
    if (!currentLoadedKey) {
      // フォームが初期状態と異なる場合は確認
      if (!isECFGEqual(getValues(), defaultECFG)) {
        if (
          !confirm(
            "フォームが初期状態ではありません。変更を破棄して新規データを作成しますか？",
          )
        ) {
          return;
        }
      }
    } else {
      // 2) 何かしらロード中のデータがある場合
      const loaded = getCurrentLoadedData();
      if (loaded && !isECFGEqual(getValues(), loaded)) {
        if (
          !confirm(
            "ロード済みのデータから変更があります。破棄して新規データを作成しますか？",
          )
        ) {
          return;
        }
      }
    }

    reset(defaultECFG);
    setCurrentLoadedKey("");
    setCurrentLoadedName("");
  };

  // -------------------------------------
  // ロード
  // -------------------------------------
  const handleLoad = () => {
    if (!selectedKey) {
      alert("ロードするセーブを選択してください。");
      return;
    }

    // 1) 何もロードしていない状態
    if (!currentLoadedKey) {
      if (!isECFGEqual(getValues(), defaultECFG)) {
        if (
          !confirm(
            "フォームが初期状態ではありません。変更を破棄してロードしますか？",
          )
        ) {
          return;
        }
      }
    } else {
      // 2) ロード中のデータがある状態
      const loaded = getCurrentLoadedData();
      if (loaded && !isECFGEqual(getValues(), loaded)) {
        if (
          !confirm(
            "ロード済みデータから変更があります。破棄してロードしますか？",
          )
        ) {
          return;
        }
      }
    }

    const raw = localStorage.getItem(selectedKey);
    if (!raw) {
      alert("選択されたキーが見つかりません。削除された可能性があります。");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as SaveData;
      const ecfgData = parsed.data;

      // 同様に、Select系は一度初期化してから リセット
      reset({
        ...ecfgData,
        startSymbol: "",
        forFollowSet: "__none__",
        forDirectorSet: "__none__",
      });
      setTimeout(() => {
        resetField("startSymbol", { defaultValue: ecfgData.startSymbol });
        resetField("forFollowSet", { defaultValue: ecfgData.forFollowSet });
        resetField("forDirectorSet", { defaultValue: ecfgData.forDirectorSet });
      }, 0);

      // ロード状態
      setCurrentLoadedKey(selectedKey);
      setCurrentLoadedName(parsed.name);
      alert(`ロードしました: ${parsed.name} (key=${selectedKey})`);
    } catch (e) {
      alert("ロード失敗 (JSONパースエラー?)");
      console.error(e);
    }
  };

  // -------------------------------------
  // 削除
  // -------------------------------------
  const handleDelete = () => {
    if (!selectedKey) {
      alert("削除するセーブを選択してください。");
      return;
    }
    localStorage.removeItem(selectedKey);
    alert(`削除しました: key=${selectedKey}`);
    // もしロード中のデータを消したらロード状態をクリア
    if (selectedKey === currentLoadedKey) {
      setCurrentLoadedKey("");
      setCurrentLoadedName("");
    }
    setSelectedKey("");
    refreshSaveList();
  };

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} className="space-y-3">
      {/* ★ 現在ロード中のデータ表示 */}
      {currentLoadedKey && (
        <p className="rounded bg-muted px-2 py-1 text-sm text-muted-foreground">
          現在ロード中: <strong>{currentLoadedName}</strong> (key=
          {currentLoadedKey})
        </p>
      )}

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
            The symbol in LHS must not be empty.
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

      {/* 4) Start symbol */}
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
            <Select value={field.value} onValueChange={field.onChange}>
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
            validate: (vals, { nonTerminals, terminals }) => {
              for (const symbol of vals) {
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
            validate: (vals, { nonTerminals, terminals }) => {
              for (const symbol of vals) {
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
            <Select value={field.value} onValueChange={field.onChange}>
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
            <Select value={field.value} onValueChange={field.onChange}>
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

      {/* Submit */}
      <Button type="submit" className="mt-4 bg-blue-500 px-4 py-2 text-white">
        Submit
      </Button>

      {/*
        3 つのボタン:
        1) 新規セーブ
        2) 上書きセーブ
        3) 新規データ
      */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* 新規セーブ */}
        <div>
          <Label>Save Name</Label>
          <input
            className="ml-2 border px-2 py-1"
            placeholder="例: MyGrammar"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
          />
        </div>
        <Button type="button" onClick={handleNewSave} className="bg-gray-500">
          新規セーブ
        </Button>

        {/* 上書きセーブ (ロード中のみ押せる) */}
        <Button
          type="button"
          onClick={handleOverwriteSave}
          disabled={!currentLoadedKey}
          className="bg-yellow-500 text-black"
        >
          上書きセーブ
        </Button>

        {/* 新規データ */}
        <Button type="button" onClick={handleNewData} className="bg-gray-300">
          新規データ
        </Button>
      </div>

      {/*
        ロード/削除
        リストは updatedAt 降順
      */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Label>Load / Delete:</Label>
        <select
          className="border px-2 py-1"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
        >
          <option value="">(choose a save)</option>
          {saveList.map((item) => (
            <option key={item.key} value={item.key}>
              {item.name} (updated {new Date(item.updatedAt).toLocaleString()})
            </option>
          ))}
        </select>
        <Button type="button" onClick={handleLoad} className="bg-blue-300">
          Load
        </Button>
        <Button type="button" onClick={handleDelete} className="bg-red-400">
          Delete
        </Button>
      </div>

      {/* 送信後のフォームデータ (デバッグ表示) */}
      {formData && (
        <pre className="mt-4 rounded border p-2">
          {JSON.stringify(formData, null, 2)}
        </pre>
      )}

      {/* Rust/wasm結果 */}
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
              {/* Row1: isELL1 */}
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

              {/* Row5: directorSet */}
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

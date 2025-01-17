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
};

export default function ECFGForm() {
  // -------------------------------------
  // useForm & State
  // -------------------------------------
  const { control, handleSubmit, setValue } = useForm<ECFG>({
    defaultValues: {
      terminals: [],
      nonTerminals: [],
      productions: [{ lhs: "", rhs: [] }],
      startSymbol: "",
    },
  });
  const [formData, setFormData] = useState<ECFG | null>(null);

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
      // LHS
      if (prod.lhs) {
        allSymbols.add(prod.lhs);
      }
      // RHS
      prod.rhs.forEach((sym) => {
        allSymbols.add(sym);
      });
    });

    // 除外
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
    console.log("Form data:", data);
  };
  const onInvalid = (errors: FieldErrors<ECFG>) => {
    console.error("Validation errors:", errors);
  };

  // -------------------------------------
  // Render
  // -------------------------------------
  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)}>
      {/* 1) NonTerminal symbols (自動生成 & 編集不可) */}
      <FormItem>
        <Label>NonTerminal symbols</Label>
        <Controller
          name="nonTerminals"
          control={control}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              placeholder="(auto-generated)"
              disabled
              onChange={() => {
                // 手動編集不可
              }}
            />
          )}
        />
      </FormItem>

      {/* 2) Terminal symbols (自動生成 & 編集不可) */}
      <FormItem>
        <Label>Terminal symbols</Label>
        <Controller
          name="terminals"
          control={control}
          render={({ field }) => (
            <CustomizedInputTags
              {...field}
              value={field.value}
              placeholder="(auto-generated)"
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
        {fields.map((fieldItem, index) => (
          <div key={fieldItem.id} className="mb-4 flex items-center gap-2">
            {/* LHS (単一タグ) */}
            <div className="flex-1" style={{ flexBasis: "15%" }}>
              <Controller
                name={`productions.${index}.lhs`}
                control={control}
                render={({ field }) => (
                  <CustomizedInputTags
                    maxTags={1}
                    {...field}
                    // LHS は単一タグなので配列にして渡す
                    value={field.value ? [field.value] : []}
                    placeholder="Enter LHS symbol"
                    onChange={(newValue) => {
                      // もし newValue が関数の場合は1文字列だけにする
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

            {/* RHS (複数タグ) */}
            <div className="flex-1" style={{ flexBasis: "75%" }}>
              <Controller
                name={`productions.${index}.rhs`}
                control={control}
                render={({ field }) => (
                  <CustomizedInputTags
                    {...field}
                    value={field.value}
                    placeholder="Enter RHS symbols"
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
        <Controller
          name="startSymbol"
          control={control}
          render={({ field }) => (
            <select {...field} className="rounded border px-2 py-1">
              <option value="">(select a start symbol)</option>
              {nonTerminals.map((nt) => (
                <option key={nt} value={nt}>
                  {nt}
                </option>
              ))}
            </select>
          )}
        />
      </FormItem>

      <button
        type="submit"
        className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
      >
        Submit
      </button>

      {formData && (
        <pre className="mt-4 rounded border p-2">
          {JSON.stringify(formData, null, 2)}
        </pre>
      )}
    </form>
  );
}

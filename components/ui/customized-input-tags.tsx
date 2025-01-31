"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import AutoResizeInput from "../auto-resize-input";

type InputProps = React.ComponentProps<"input">;

type InputTagsProps = Omit<InputProps, "value" | "onChange"> & {
  value: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  maxTags?: number;
};

/**
 * タグを自由な位置に追加できる InputTags コンポーネント
 */
const CustomizedInputTags = React.forwardRef<HTMLInputElement, InputTagsProps>(
  ({ className, value, onChange, maxTags, ...props }, forwardedRef) => {
    // ユニークキー生成用カウンター
    const keyCounterRef = React.useRef(0);

    // 各入力欄の文字列（タグ数 + 1 個）
    const [inputValues, setInputValues] = React.useState<string[]>(() =>
      Array(value.length + 1).fill(""),
    );

    // タグ表示用キー
    const [keys, setKeys] = React.useState<string[]>(() =>
      value.map(() => {
        keyCounterRef.current++;
        return `tag-${Date.now()}-${Math.random()}-${keyCounterRef.current}`;
      }),
    );

    // すべての input 要素の参照管理
    const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

    // IME合成中かどうか
    const [isComposing, setIsComposing] = React.useState(false);

    // フォーカスさせたいインデックスを記憶
    const [focusIndex, setFocusIndex] = React.useState<number | null>(null);

    /**
     * ref セット時のヘルパー
     */
    const setInputRef = (el: HTMLInputElement | null, i: number) => {
      inputRefs.current[i] = el;
      if (i === 0 && typeof forwardedRef === "function") {
        forwardedRef(el);
      } else if (i === 0 && forwardedRef && "current" in forwardedRef) {
        (forwardedRef as React.RefObject<HTMLInputElement | null>).current = el;
      }
    };

    /**
     * 外部で `value` が変わったら keys と inputValues を同期
     */
    React.useEffect(() => {
      if (value.length > keys.length) {
        const diff = value.length - keys.length;
        setKeys((oldKeys) => {
          const newKeys = [...oldKeys];
          for (let i = 0; i < diff; i++) {
            keyCounterRef.current++;
            newKeys.push(
              `tag-${Date.now()}-${Math.random()}-${keyCounterRef.current}`,
            );
          }
          return newKeys;
        });
        setInputValues((oldValues) => [...oldValues, ...Array(diff).fill("")]);
      } else if (value.length < keys.length) {
        setKeys((oldKeys) => oldKeys.slice(0, value.length));
        setInputValues((oldValues) => oldValues.slice(0, value.length + 1));
      }
    }, [value, keys]);

    /**
     * タグを index に挿入
     */
    const addTagAtIndex = (tag: string, index: number) => {
      if (!tag) return;
      if (maxTags !== undefined && value.length >= maxTags) {
        return;
      }

      const newValue = [...value.slice(0, index), tag, ...value.slice(index)];
      onChange(newValue);

      setKeys((oldKeys) => {
        const copy = [...oldKeys];
        keyCounterRef.current++;
        copy.splice(
          index,
          0,
          `tag-${Date.now()}-${Math.random()}-${keyCounterRef.current}`,
        );
        return copy;
      });

      setInputValues((oldValues) => {
        const copy = [...oldValues];
        copy.splice(index, 0, "");
        return copy;
      });
    };

    /**
     * タグを index で削除
     */
    const removeTag = (index: number) => {
      const newValue = value.filter((_, i) => i !== index);
      onChange(newValue);

      setKeys((oldKeys) => oldKeys.filter((_, i) => i !== index));
      setInputValues((oldValues) => {
        const copy = [...oldValues];
        // タグ i を削除するときは i+1 番目の inputValues も削除
        const removeIndex = index + 1;
        if (removeIndex < copy.length) {
          copy.splice(removeIndex, 1);
        } else {
          copy.pop();
        }
        return copy;
      });
    };

    /**
     * キー操作
     */
    const handleKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
      index: number,
    ) => {
      const currentValue = inputValues[index];
      const selectionStart = e.currentTarget.selectionStart;
      const selectionEnd = e.currentTarget.selectionEnd;
      if (selectionStart == null || selectionEnd == null) return;

      // Enter: IME中でなければタグ追加
      if (e.key === "Enter" && !isComposing) {
        e.preventDefault();
        const trimmed = currentValue.trim();
        if (trimmed !== "") {
          // タグを追加
          addTagAtIndex(trimmed, index);
          // 追加後、次の入力欄を空にしておく（既存のロジック）
          setInputValues((oldValues) => {
            const copy = [...oldValues];
            if (index + 1 < copy.length) {
              copy[index + 1] = "";
            }
            return copy;
          });
          // ★ 追加後は次の入力欄へフォーカスを移す
          setFocusIndex(index + 1);
        }
        return;
      }

      // Backspace: カーソル先頭なら前のタグ削除
      if (
        e.key === "Backspace" &&
        index > 0 &&
        selectionStart === 0 &&
        selectionEnd === 0
      ) {
        e.preventDefault();
        // 前のタグを削除
        removeTag(index - 1);
        // 削除後は「前のタグの位置」にフォーカスを戻す例
        setFocusIndex(index - 1);
        return;
      }

      // ← 左キー: 左端なら前の入力へ
      if (
        e.key === "ArrowLeft" &&
        selectionStart === 0 &&
        selectionEnd === 0 &&
        index > 0
      ) {
        e.preventDefault();
        const prevInput = inputRefs.current[index - 1];
        if (prevInput) {
          prevInput.focus();
          const len = inputValues[index - 1].length;
          prevInput.setSelectionRange(len, len);
        }
        return;
      }

      // → 右キー: 右端なら次の入力へ
      if (
        e.key === "ArrowRight" &&
        selectionStart === currentValue.length &&
        selectionEnd === currentValue.length &&
        index < inputValues.length - 1
      ) {
        e.preventDefault();
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(0, 0);
        }
        return;
      }
    };

    /**
     * 入力変更
     */
    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      index: number,
    ) => {
      const inputVal = e.target.value;
      setInputValues((oldValues) => {
        const copy = [...oldValues];
        copy[index] = inputVal;
        return copy;
      });
    };

    /**
     * IME開始/終了
     */
    const handleCompositionStart = () => {
      setIsComposing(true);
    };
    const handleCompositionEnd = () => {
      setIsComposing(false);
    };

    /**
     * 特定のタグ用にバッジの色を変えるためのヘルパー
     */
    const getBadgeVariant = (tag: string) => {
      // 特別視するタグ
      const specialTags = ["\\{", "\\|", "\\}", "\\(", "\\)"];
      if (specialTags.includes(tag)) {
        return "default";
      }
      return "secondary";
    };

    /**
     * 特別タグの表示変換
     */
    const getDisplayText = (tag: string) => {
      const mapping: Record<string, string> = {
        "\\{": "{",
        "\\|": "|",
        "\\}": "}",
        "\\(": "(",
        "\\)": ")",
      };
      return mapping[tag] || tag;
    };

    // ★ focusIndex がセットされるたびに、その位置の input にフォーカス＆カーソル位置を再設定
    React.useEffect(() => {
      if (focusIndex != null) {
        if (focusIndex >= 0 && focusIndex < inputRefs.current.length) {
          const el = inputRefs.current[focusIndex];
          if (el) {
            el.focus();
            // カーソルを末尾にしたい場合は以下を使用
            const len = inputValues[focusIndex]?.length ?? 0;
            el.setSelectionRange(len, len);
          }
        }
        // フォーカスを当て終わったらリセット
        setFocusIndex(null);
      }
    }, [focusIndex, inputValues, value]);

    return (
      <div
        className={cn(
          "min-h-10 flex w-full flex-wrap gap-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950",
          className,
        )}
      >
        {value.map((tag, i) => (
          <React.Fragment key={`${keys[i]}-${i}`}>
            {/** タグ i の直前の入力欄 */}
            <AutoResizeInput
              defaultWidth={1}
              ref={(el) => setInputRef(el, i)}
              className="px-0 outline-none placeholder:text-neutral-500 dark:bg-neutral-950 dark:placeholder:text-neutral-400"
              value={inputValues[i] ?? ""}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              {...props}
            />
            {/** タグ本体 */}
            <Badge variant={getBadgeVariant(tag)} className="rounded-md px-1">
              {getDisplayText(tag)}
            </Badge>
          </React.Fragment>
        ))}

        {/** 最後の入力欄 */}
        <AutoResizeInput
          ref={(el) => setInputRef(el, value.length)}
          className="flex-1 outline-none placeholder:text-neutral-500 dark:bg-neutral-950 dark:placeholder:text-neutral-400"
          value={inputValues[value.length] ?? ""}
          onChange={(e) => handleChange(e, value.length)}
          onKeyDown={(e) => handleKeyDown(e, value.length)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          {...props}
        />
      </div>
    );
  },
);

CustomizedInputTags.displayName = "CustomizedInputTags";

export { CustomizedInputTags };

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
    // 変更1: ランダムに加えてキー用カウンターも使う
    // ただし、コードを最小限に変えたいので、Date.now() + Math.random() 自体は維持
    const keyCounterRef = React.useRef(0);

    // 各入力欄の文字列
    const [inputValues, setInputValues] = React.useState<string[]>(() =>
      Array(value.length + 1).fill(""),
    );

    // タグ表示用キー
    // 変更2: 初期生成時にも suffix をつけて衝突を回避
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
            // ここも最小限の変更で安定度を高める
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
          addTagAtIndex(trimmed, index);
          setInputValues((oldValues) => {
            const copy = [...oldValues];
            if (index + 1 < copy.length) {
              copy[index + 1] = "";
            }
            return copy;
          });
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
        removeTag(index - 1);
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
      // ここで「特別視するタグ」を定義
      const specialTags = ["\\{", "\\|", "\\}", "\\(", "\\)"];
      if (specialTags.includes(tag)) {
        return "default";
      }
      return "secondary";
    };

    /**
     * 特別タグの表示
     */
    const getDisplayText = (tag: string) => {
      // もし内部には "\{" とかが入ってる想定なら map で変換する
      const mapping: Record<string, string> = {
        "\\{": "{",
        "\\|": "|",
        "\\}": "}",
        "\\(": "(",
        "\\)": ")",
      };

      if (mapping[tag]) {
        return mapping[tag];
      }
      return tag;
    };

    return (
      <div
        className={cn(
          "min-h-10 flex w-full flex-wrap gap-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950",
          className,
        )}
      >
        {value.map((tag, i) => (
          // 変更3: key をさらに i と結合する
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

            {/** タグ */}
            <Badge variant={getBadgeVariant(tag)} className="rounded-md px-1">
              {getDisplayText(tag)}
            </Badge>
          </React.Fragment>
        ))}

        {/** 最後の入力欄 */}
        <input
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

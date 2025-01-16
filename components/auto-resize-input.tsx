import React, { useState, useRef, useEffect, useCallback } from "react";

type ResizableInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const YOHAKU = 0;
const DEFAULT_W = 15;

const ResizableInput: React.FC<ResizableInputProps> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputWidth, setInputWidth] = useState(DEFAULT_W); // 初期幅を設定

  const updateWidth = useCallback(() => {
    if (inputRef.current) {
      const tempSpan = document.createElement("span");
      tempSpan.style.visibility = "hidden";
      tempSpan.style.whiteSpace = "pre";
      tempSpan.style.font = getComputedStyle(inputRef.current).font;
      tempSpan.textContent = inputRef.current.value || props.placeholder || "";

      document.body.appendChild(tempSpan);
      const textWidth = tempSpan.offsetWidth + YOHAKU; // 適度な余白を追加
      document.body.removeChild(tempSpan);

      setInputWidth(Math.max(DEFAULT_W, textWidth)); // 最小幅を50pxに設定
    }
  }, [props.placeholder]); // `updateWidth` 内で参照している値を依存配列に含める

  useEffect(() => {
    updateWidth();
  }, [props.value, updateWidth]); // `updateWidth` を依存配列に含める

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (props.onChange) props.onChange(e); // ユーザーが渡した onChange を呼び出す
    updateWidth();
  };

  return (
    <input
      {...props}
      ref={inputRef}
      style={{
        ...props.style,
        width: `${inputWidth}px`,
      }}
      onChange={handleInputChange}
    />
  );
};

export default ResizableInput;

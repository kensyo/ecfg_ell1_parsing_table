import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

type ResizableInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  yohaku?: number;
  defaultW?: number;
};

const AutoResizeInput = forwardRef<HTMLInputElement, ResizableInputProps>(
  (props, ref) => {
    const defaultW = props.defaultW || 15;
    const yohaku = props.yohaku || 0;
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputWidth, setInputWidth] = useState(defaultW);

    const updateWidth = useCallback(() => {
      if (inputRef.current) {
        const tempSpan = document.createElement("span");
        tempSpan.style.visibility = "hidden";
        tempSpan.style.whiteSpace = "pre";
        tempSpan.style.font = getComputedStyle(inputRef.current).font;
        tempSpan.textContent =
          inputRef.current.value || props.placeholder || "";

        document.body.appendChild(tempSpan);
        const textWidth = tempSpan.offsetWidth + yohaku;
        document.body.removeChild(tempSpan);

        setInputWidth(Math.max(defaultW, textWidth));
      }
    }, [props.placeholder, defaultW, yohaku]);

    useEffect(() => {
      updateWidth();
    }, [props.value, updateWidth]);

    const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (
      e,
    ) => {
      if (props.onChange) props.onChange(e);
      updateWidth();
    };

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

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
  },
);

AutoResizeInput.displayName = "AutoResizeInput";

export default AutoResizeInput;

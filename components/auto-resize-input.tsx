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
  defaultWidth?: number;
};

const AutoResizeInput = forwardRef<HTMLInputElement, ResizableInputProps>(
  (props, ref) => {
    const { defaultWidth = 15, yohaku = 0, ...rest } = props;
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputWidth, setInputWidth] = useState(defaultWidth);

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

        setInputWidth(Math.max(defaultWidth, textWidth));
      }
    }, [props.placeholder, defaultWidth, yohaku]);

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
        {...rest}
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

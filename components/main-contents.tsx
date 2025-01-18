"use client";
import ECFGForm from "@/components/ECFG-form";
import { CustomizedInputTags } from "@/components/ui/customized-input-tags";
import { useState } from "react";
import { InputTags } from "./ui/input-tags";

export default function MainContents() {
  // const [values, setValues] = useState<string[]>([]);
  return (
    <div>
      <ECFGForm />
      {/* <p>{values.join(", ")}</p> */}
      {/* <InputTags */}
      {/*   value={values} */}
      {/*   onChange={(data) => { */}
      {/*     setValues(data); */}
      {/*   }} */}
      {/*   className="max-w-[1000px]" */}
      {/* /> */}
    </div>
  );
}

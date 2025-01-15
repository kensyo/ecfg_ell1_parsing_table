// "use client";
//
// import { useState } from "react";
// import { Combobox } from "@/components/ui/combobox"; // shadcn/ui の Combobox
// import { Badge } from "@/components/ui/badge"; // shadcn/ui の Badge
// import { X } from "lucide-react"; // アイコン
//
// const movies = [
//   "Inception",
//   "Forrest Gump",
//   "Pulp Fiction",
//   "Interstellar",
//   "Tenet",
// ];
//
// export default function MultiSelectExample() {
//   const [selectedMovies, setSelectedMovies] = useState<string[]>([]);
//
//   const handleSelect = (movie: string) => {
//     // 重複チェックしてなければ追加
//     if (!selectedMovies.includes(movie)) {
//       setSelectedMovies((prev) => [...prev, movie]);
//     }
//   };
//
//   const handleRemove = (movie: string) => {
//     setSelectedMovies((prev) => prev.filter((m) => m !== movie));
//   };
//
//   return (
//     <div className="mx-auto max-w-sm p-4">
//       {/* Combobox の onSelect 等でアイテムが選ばれたときに handleSelect を呼ぶ */}
//       <Combobox
//         placeholder="映画を選択..."
//         items={movies}
//         // onInputChange 等でフィルタリングを行う例
//         onSelect={handleSelect}
//       />
//
//       <div className="mt-4 flex flex-wrap gap-2">
//         {selectedMovies.map((movie) => (
//           <Badge
//             key={movie}
//             variant="secondary"
//             className="flex items-center gap-1"
//           >
//             {movie}
//             <button onClick={() => handleRemove(movie)}>
//               <X className="size-3" />
//             </button>
//           </Badge>
//         ))}
//       </div>
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import { FieldErrors, useFieldArray, useForm } from "react-hook-form";
import { FormItem } from "./ui/form";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

type ECFG = {
  terminals: string[];
  nonTerminals: string[];
  productions: { lhs: string; rhs: string[] }[];
  startSymbol: string;
};

export default function ECFGForm() {
  const { register, control, handleSubmit } = useForm<ECFG>();
  const [formData, setFormData] = useState<ECFG | null>(null);

  const { fields } = useFieldArray({
    name: "productions",
    control,
  });

  const onValid = (data: ECFG) => {
    setFormData(data);
  };

  const onInvalid = (data: FieldErrors) => {
    console.error(data);
  };

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)}>
      <FormItem>
        <Label>Terminal symbols</Label>
        <Input {...register("terminals")} disabled />
      </FormItem>
      <FormItem>
        <Label>NonTerminal symbols</Label>
        <Input {...register("terminals")} disabled />
      </FormItem>
      <FormItem>
        <Label>Productions</Label>
        <Input {...register("terminals")} disabled />
      </FormItem>
      <FormItem>
        <Label>Start symbol</Label>
        <Input {...register("terminals")} disabled />
      </FormItem>
    </form>
  );
}

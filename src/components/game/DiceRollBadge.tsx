import { Dices } from "lucide-react";
import { diceRollStyle } from "@/lib/gameText";

export default function DiceRollBadge({ roll }: Readonly<{ roll: number }>) {
  const style = diceRollStyle(roll);

  return (
    <span
      title="D20 dice roll determines action success: 1 = Critical failure, 20 = Critical success"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded-full border text-xs font-bold tracking-widest cursor-help ${style}`}
    >
      <Dices size={12} /> D20: {roll}
    </span>
  );
}

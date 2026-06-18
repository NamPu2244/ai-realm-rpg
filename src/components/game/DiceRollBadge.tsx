import { Dices } from "lucide-react";
import { diceRollStyle } from "@/lib/gameText";

export default function DiceRollBadge({ roll }: Readonly<{ roll: number }>) {
  const style = diceRollStyle(roll);

  return (
    <span
      title="ผลทอยเต๋า D20 ใช้ตัดสินความสำเร็จของการกระทำ: 1 = ล้มเหลวขั้นวิกฤต, 20 = สำเร็จขั้นวิกฤต"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded-full border text-xs font-bold tracking-widest cursor-help ${style}`}
    >
      <Dices size={12} /> D20: {roll}
    </span>
  );
}

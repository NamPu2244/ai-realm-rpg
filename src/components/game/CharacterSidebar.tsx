import { PlayerStatus, WorldConfig } from "@/store/useGameStore";

interface CharacterSidebarProps {
  worldConfig: WorldConfig | null;
  currentObjective: string;
  playerStatus: PlayerStatus;
  hpPercent: number;
  isLowHp: boolean;
  livesLeft: number;
}

export default function CharacterSidebar({
  worldConfig,
  currentObjective,
  playerStatus,
  hpPercent,
  isLowHp,
  livesLeft,
}: Readonly<CharacterSidebarProps>) {
  return (
    <div
      className={`w-80 bg-neutral-950 p-6 overflow-y-auto flex flex-col gap-8 border-l transition-colors duration-500 ${isLowHp ? "border-red-900/30" : "border-neutral-800"}`}
    >
      <div className="space-y-3">
        <h2
          title="ข้อมูลตัวละครและฉากหลังที่คุณสร้างไว้ตอนเริ่มเกม"
          className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
        >
          Character
        </h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          {worldConfig?.character || "ไม่มีข้อมูลตัวละคร"}
        </p>
        <p className="text-xs text-neutral-600 leading-relaxed">
          {worldConfig?.genre}
        </p>
      </div>

      {currentObjective && (
        <div className="space-y-3">
          <h2
            title="เป้าหมายปัจจุบันที่ AI กำหนดให้ในเนื้อเรื่อง อาจเปลี่ยนไปตามสถานการณ์"
            className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
          >
            Objective
          </h2>
          <p className="text-sm text-amber-300/90 leading-relaxed">
            🎯 {currentObjective}
          </p>
        </div>
      )}

      <div className="space-y-5">
        <h2
          title="Level และ EXP ของตัวละคร เมื่อ EXP สะสมครบ 100 จะเลื่อนเลเวล"
          className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
        >
          Progression
        </h2>
        <div>
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="text-amber-400">Level {playerStatus.level}</span>
            <span>EXP: {playerStatus.exp}/100</span>
          </div>
          <div className="w-full bg-neutral-900 rounded-full h-2.5 border border-neutral-800">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (playerStatus.exp / 100) * 100)}%`,
              }}
            ></div>
          </div>
        </div>
        <div
          title="จำนวนชีวิตที่เหลือ หากตัวละครตายและชีวิตหมด เกมจะจบลง"
          className="flex justify-between text-sm font-medium cursor-help"
        >
          <span className="text-pink-400">Lives</span>
          <span>{"❤️".repeat(Math.max(0, livesLeft))}</span>
        </div>
      </div>

      <div className="space-y-5">
        <h2
          title="HP (พลังชีวิต) และ Mana (พลังเวทมนตร์) ของตัวละคร หาก HP เหลือ 0 ตัวละครจะเสียชีวิต"
          className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 cursor-help"
        >
          Vitals
        </h2>
        <div>
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="text-red-400">HP</span>
            <span>
              {playerStatus.hp} / {playerStatus.max_hp}
            </span>
          </div>
          <div
            className={`w-full bg-neutral-900 rounded-full h-2.5 border ${isLowHp ? "border-red-800/50" : "border-neutral-800"}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${isLowHp ? "bg-red-600 animate-pulse" : "bg-red-500"}`}
              style={{ width: `${hpPercent}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="text-blue-400">Mana</span>
            <span>
              {playerStatus.mana} / {playerStatus.max_mana}
            </span>
          </div>
          <div className="w-full bg-neutral-900 rounded-full h-2.5 border border-neutral-800">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${playerStatus.max_mana > 0 ? (playerStatus.mana / playerStatus.max_mana) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
      <div>
        <h2
          title="สถานะและเอฟเฟกต์ที่ติดตัวละครอยู่ในขณะนี้ เช่น บาดเจ็บ, ถูกวางยาพิษ, ได้รับพร"
          className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 mb-3 cursor-help"
        >
          Conditions
        </h2>
        <div className="flex flex-wrap gap-2">
          {playerStatus.status_effects.length > 0 ? (
            playerStatus.status_effects.map((effect, i) => (
              <span
                key={i}
                className={`px-2 py-1 text-xs bg-yellow-900/30 border rounded ${effect.includes("บาดแผล") || effect.includes("เลือด") || effect.includes("ไหม้") ? "text-red-400 border-red-700/50" : "text-yellow-500 border-yellow-700/50"}`}
              >
                {effect}
              </span>
            ))
          ) : (
            <span className="text-sm text-neutral-600 italic">
              ร่างกายปกติ
            </span>
          )}
        </div>
      </div>
      <div>
        <h2
          title="ทักษะพิเศษที่ตัวละครเรียนรู้หรือได้รับมาระหว่างการเดินทาง"
          className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 mb-3 cursor-help"
        >
          Skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {playerStatus.skills.length > 0 ? (
            playerStatus.skills.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-purple-900/30 border border-purple-700/50 text-purple-300 rounded"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-sm text-neutral-600 italic">
              ยังไม่มีทักษะพิเศษ
            </span>
          )}
        </div>
      </div>
      <div className="flex-1">
        <h2
          title="ไอเทมและอุปกรณ์ที่ตัวละครพกติดตัวอยู่ในขณะนี้"
          className="text-xs font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2 mb-3 cursor-help"
        >
          Inventory
        </h2>
        <ul className="space-y-2">
          {playerStatus.inventory.length > 0 ? (
            playerStatus.inventory.map((item, i) => (
              <li
                key={i}
                className="text-sm bg-neutral-900/50 px-3 py-2 border border-neutral-800 rounded text-neutral-300"
              >
                {item}
              </li>
            ))
          ) : (
            <li className="text-sm text-neutral-600 italic">
              กระเป๋าว่างเปล่า
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

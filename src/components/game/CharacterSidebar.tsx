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
      className={`w-80 bg-stone-950/40 p-5 overflow-y-auto flex flex-col gap-4 border-l transition-colors duration-500 ${isLowHp ? "border-red-900/30" : "border-amber-900/20"}`}
    >
      <div className="space-y-3 bg-stone-900/40 border border-amber-900/20 rounded-xl p-4 shadow-sm">
        <h2
          title="ข้อมูลตัวละครและฉากหลังที่คุณสร้างไว้ตอนเริ่มเกม"
          className="text-xs font-bold text-amber-400/70 uppercase tracking-widest border-b border-amber-900/20 pb-2 cursor-help"
        >
          🧙 Character
        </h2>
        <p className="text-xs text-amber-50/70 leading-relaxed">
          {worldConfig?.character || "ไม่มีข้อมูลตัวละคร"}
        </p>
        <p className="text-xs text-amber-100/30 leading-relaxed">
          {worldConfig?.genre}
        </p>
      </div>

      {currentObjective && (
        <div className="space-y-3 bg-gradient-to-br from-amber-950/30 to-stone-900/40 border border-amber-700/30 rounded-xl p-4 shadow-sm">
          <h2
            title="เป้าหมายปัจจุบันที่ AI กำหนดให้ในเนื้อเรื่อง อาจเปลี่ยนไปตามสถานการณ์"
            className="text-xs font-bold text-amber-400/70 uppercase tracking-widest border-b border-amber-900/20 pb-2 cursor-help"
          >
            🎯 Objective
          </h2>
          <p className="text-sm text-amber-200/90 leading-relaxed">
            {currentObjective}
          </p>
        </div>
      )}

      <div className="space-y-5 bg-stone-900/40 border border-amber-900/20 rounded-xl p-4 shadow-sm">
        <h2
          title="Level และ EXP ของตัวละคร เมื่อ EXP สะสมครบ 100 จะเลื่อนเลเวล"
          className="text-xs font-bold text-amber-400/70 uppercase tracking-widest border-b border-amber-900/20 pb-2 cursor-help"
        >
          ⭐ Progression
        </h2>
        <div>
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="text-amber-400">Level {playerStatus.level}</span>
            <span className="text-amber-50/70">EXP: {playerStatus.exp}/100</span>
          </div>
          <div className="w-full bg-stone-950/60 rounded-full h-2.5 border border-amber-900/20 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
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

      <div className="space-y-5 bg-stone-900/40 border border-amber-900/20 rounded-xl p-4 shadow-sm">
        <h2
          title="HP (พลังชีวิต) และ Mana (พลังเวทมนตร์) ของตัวละคร หาก HP เหลือ 0 ตัวละครจะเสียชีวิต"
          className="text-xs font-bold text-amber-400/70 uppercase tracking-widest border-b border-amber-900/20 pb-2 cursor-help"
        >
          ❤️ Vitals
        </h2>
        <div>
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="text-rose-400">HP</span>
            <span className="text-amber-50/70">
              {playerStatus.hp} / {playerStatus.max_hp}
            </span>
          </div>
          <div
            className={`w-full bg-stone-950/60 rounded-full h-2.5 border overflow-hidden ${isLowHp ? "border-red-800/50" : "border-amber-900/20"}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${isLowHp ? "bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]" : "bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]"}`}
              style={{ width: `${hpPercent}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="text-sky-400">Mana</span>
            <span className="text-amber-50/70">
              {playerStatus.mana} / {playerStatus.max_mana}
            </span>
          </div>
          <div className="w-full bg-stone-950/60 rounded-full h-2.5 border border-amber-900/20 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-600 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.4)]"
              style={{
                width: `${playerStatus.max_mana > 0 ? (playerStatus.mana / playerStatus.max_mana) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
      <div className="bg-stone-900/40 border border-amber-900/20 rounded-xl p-4 shadow-sm">
        <h2
          title="สถานะและเอฟเฟกต์ที่ติดตัวละครอยู่ในขณะนี้ เช่น บาดเจ็บ, ถูกวางยาพิษ, ได้รับพร"
          className="text-xs font-bold text-amber-400/70 uppercase tracking-widest border-b border-amber-900/20 pb-2 mb-3 cursor-help"
        >
          ✨ Conditions
        </h2>
        <div className="flex flex-wrap gap-2">
          {playerStatus.status_effects.length > 0 ? (
            playerStatus.status_effects.map((effect, i) => (
              <span
                key={i}
                className={`px-2.5 py-1 text-xs bg-yellow-900/20 border rounded-full ${effect.includes("บาดแผล") || effect.includes("เลือด") || effect.includes("ไหม้") ? "text-red-400 border-red-700/40" : "text-yellow-400 border-yellow-700/40"}`}
              >
                {effect}
              </span>
            ))
          ) : (
            <span className="text-sm text-amber-100/30 italic">
              ร่างกายปกติ
            </span>
          )}
        </div>
      </div>
      <div className="bg-stone-900/40 border border-amber-900/20 rounded-xl p-4 shadow-sm">
        <h2
          title="ทักษะพิเศษที่ตัวละครเรียนรู้หรือได้รับมาระหว่างการเดินทาง"
          className="text-xs font-bold text-amber-400/70 uppercase tracking-widest border-b border-amber-900/20 pb-2 mb-3 cursor-help"
        >
          🔮 Skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {playerStatus.skills.length > 0 ? (
            playerStatus.skills.map((skill, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-xs bg-purple-900/20 border border-purple-700/40 text-purple-300 rounded-full"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-sm text-amber-100/30 italic">
              ยังไม่มีทักษะพิเศษ
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 bg-stone-900/40 border border-amber-900/20 rounded-xl p-4 shadow-sm">
        <h2
          title="ไอเทมและอุปกรณ์ที่ตัวละครพกติดตัวอยู่ในขณะนี้"
          className="text-xs font-bold text-amber-400/70 uppercase tracking-widest border-b border-amber-900/20 pb-2 mb-3 cursor-help"
        >
          🎒 Inventory
        </h2>
        <ul className="space-y-2">
          {playerStatus.inventory.length > 0 ? (
            playerStatus.inventory.map((item, i) => (
              <li
                key={i}
                className="text-sm bg-stone-950/40 px-3 py-2 border border-amber-900/20 rounded-lg text-amber-50/80 hover:border-amber-700/40 transition-colors"
              >
                {item}
              </li>
            ))
          ) : (
            <li className="text-sm text-amber-100/30 italic">
              กระเป๋าว่างเปล่า
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

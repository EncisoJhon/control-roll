'use client';

interface KeypadProps {
  onKeyPress: (key: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  loading: boolean;
}

export default function Keypad({ onKeyPress, onClear, onSubmit, loading }: KeypadProps) {
  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs select-none">
      {buttons.map((btn) => (
        <button
          key={btn}
          type="button"
          disabled={loading}
          onClick={() => {
            if (btn === 'C') onClear();
            else if (btn === 'OK') onSubmit();
            else onKeyPress(btn);
          }}
          className={`h-14 rounded-2xl text-xl font-bold transition-all active:scale-95 flex items-center justify-center shadow-md ${
            btn === 'OK'
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
              : btn === 'C'
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/50'
          }`}
        >
          {btn}
        </button>
      ))}
    </div>
  );
}
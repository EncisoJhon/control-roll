'use client';

import { useState } from 'react';
import Keypad from '@/components/Keypad';

export default function KioskPage() {
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [activeInput, setActiveInput] = useState<'dni' | 'pin'>('dni');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (val: string) => {
    if (activeInput === 'dni' && dni.length < 8) setDni((prev) => prev + val);
    if (activeInput === 'pin' && pin.length < 4) setPin((prev) => prev + val);
  };

  const handleClear = () => {
    setDni('');
    setPin('');
    setActiveInput('dni');
  };

  const handleSubmit = async () => {
    if (dni.length < 8 || pin.length < 4) return;
    setLoading(true);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, pin }),
      });

      const data = await res.json();
      setResult(data);
      handleClear();

      // Desaparece y reinicia pantalla a los 3 segundos
      setTimeout(() => setResult(null), 3000);
    } catch {
      setResult({ error: 'Error de conexión' });
      setTimeout(() => setResult(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      {/* Modal flotante de confirmación temporal */}
      {result && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className={`p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl ${result.error ? 'bg-rose-600' : 'bg-emerald-600'}`}>
            <h2 className="text-2xl font-black mb-1">{result.error ? 'Error' : `¡${result.type}!`}</h2>
            <p className="text-lg font-medium">{result.employee || result.error}</p>
            {result.shiftHours !== undefined && (
              <div className="mt-4 bg-black/25 p-3 rounded-xl text-sm space-y-1">
                <p>Jornada hoy: <b>{result.shiftHours} h</b></p>
                <p>Acumulado semana: <b>{result.weeklyHours} / {result.targetHours} h</b></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cabecera del terminal */}
      <header className="text-center mb-6">
        <h1 className="text-2xl font-black tracking-widest text-emerald-400">CONTROL ROLL</h1>
        <p className="text-slate-400 text-xs mt-1">Terminal Fijo de Asistencia</p>
      </header>

      {/* Visores de entrada */}
      <div className="w-full max-w-xs space-y-3 mb-6">
        <div
          onClick={() => setActiveInput('dni')}
          className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
            activeInput === 'dni' ? 'border-emerald-500 bg-slate-900 shadow-md' : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <span className="text-xs text-slate-400 block font-medium">DNI</span>
          <span className="text-xl font-mono tracking-widest">{dni || '--------'}</span>
        </div>

        <div
          onClick={() => setActiveInput('pin')}
          className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
            activeInput === 'pin' ? 'border-emerald-500 bg-slate-900 shadow-md' : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <span className="text-xs text-slate-400 block font-medium">PIN (4 DÍGITOS)</span>
          <span className="text-xl font-mono tracking-widest">{'•'.repeat(pin.length) || '----'}</span>
        </div>
      </div>

      {/* Componente Keypad importado */}
      <Keypad onKeyPress={handleKeyPress} onClear={handleClear} onSubmit={handleSubmit} loading={loading} />
    </main>
  );
}
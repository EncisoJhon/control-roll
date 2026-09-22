'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import LiveTable, { RecordItem } from '@/components/LiveTable';

export default function AdminPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados del formulario para nuevo colaborador
  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [targetHours, setTargetHours] = useState('40');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    const { data } = await supabase
      .from('attendances')
      .select('id, clock_in, clock_out, total_hours, employees(full_name, dni_or_code, weekly_target_hours)')
      .order('clock_in', { ascending: false });

    if (data) setRecords(data as any);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setErrorMsg('El PIN debe tener exactamente 4 dígitos');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          dni_or_code: dni,
          pin,
          weekly_target_hours: parseFloat(targetHours),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      setFullName('');
      setDni('');
      setPin('');
      setShowModal(false);
      alert('¡Colaborador registrado exitosamente!');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = 'Colaborador,DNI,Entrada,Salida,Horas\n';
    const rows = records
      .map(
        (r) =>
          `"${r.employees?.full_name}","${r.employees?.dni_or_code}","${r.clock_in}","${r.clock_out || 'En Planta'}","${r.total_hours || 0}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_control_roll_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const enPlanta = records.filter(
    (r) => !r.clock_out && new Date(r.clock_in).toDateString() === new Date().toDateString()
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera con Botones */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Control Roll — Consola Administrativa</h1>
            <p className="text-slate-500 text-sm">Monitoreo de asistencia y gestión de colaboradores</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>+</span> Nuevo Colaborador
            </button>
            <button
              onClick={exportCSV}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
            >
              Exportar a Excel (.CSV)
            </button>
          </div>
        </div>

        {/* Modal de Registro */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
              <h2 className="text-xl font-black text-slate-800 mb-1">Registrar Nuevo Colaborador</h2>
              <p className="text-xs text-slate-400 mb-4">Ingresa los datos personales y define su clave PIN de 4 dígitos para marcar.</p>

              {errorMsg && (
                <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Rivera Palacios"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase">DNI / Código</label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      placeholder="8 dígitos"
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      className="w-full mt-1 p-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase">PIN (4 dígitos)</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full mt-1 p-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-emerald-500 font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase">Meta Semanal (Horas)</label>
                  <input
                    type="number"
                    value={targetHours}
                    onChange={(e) => setTargetHours(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-emerald-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-md cursor-pointer"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase">Personal en Planta Hoy</span>
            <p className="text-3xl font-black text-emerald-600 mt-1">{enPlanta}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Registros Recientes</span>
            <p className="text-3xl font-black text-slate-800 mt-1">{records.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase">Base de Datos</span>
            <p className="text-sm font-semibold text-slate-600 mt-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Supabase PostgreSQL
            </p>
          </div>
        </div>

        {/* Tabla en vivo */}
        <LiveTable records={records} />
      </div>
    </main>
  );
}
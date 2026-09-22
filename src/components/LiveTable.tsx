'use client';

export interface RecordItem {
  id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  employees: {
    full_name: string;
    dni_or_code: string;
    weekly_target_hours: number;
  };
}

export default function LiveTable({ records }: { records: RecordItem[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Colaborador</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Entrada</th>
              <th className="p-4">Salida</th>
              <th className="p-4">Horas Jornada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  No hay registros de asistencia disponibles.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">
                    {r.employees?.full_name}
                    <span className="block text-xs text-slate-400 font-mono">
                      DNI: {r.employees?.dni_or_code}
                    </span>
                  </td>
                  <td className="p-4">
                    {!r.clock_out ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        En Planta
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Finalizado
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600">
                    {new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4 text-slate-600">
                    {r.clock_out
                      ? new Date(r.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--'}
                  </td>
                  <td className="p-4 font-bold text-slate-800">
                    {r.total_hours ? `${r.total_hours} h` : '--'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, Clock, Plus, Download, Edit2, Trash2, CalendarPlus, CheckCircle, AlertCircle 
} from 'lucide-react';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'tu-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Employee {
  id: string;
  full_name: string;
  dni_or_code: string;
  pin_hash: string;
  weekly_target_hours: number;
  is_active: boolean;
}

interface Attendance {
  id: string;
  employee_id: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  employees?: Employee;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'attendances' | 'employees'>('attendances');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modales
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState<boolean>(false);

  // Formulario Empleado
  const [empForm, setEmpForm] = useState({
    full_name: '',
    dni_or_code: '',
    pin_hash: '',
    weekly_target_hours: 28,
  });

  // Formulario Asistencia Manual (Registro Olvidado)
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    clock_in: '',
    clock_out: '',
  });

  const fetchData = async () => {
    setLoading(true);
    // 1. Obtener empleados
    const { data: emps } = await supabase
      .from('employees')
      .select('*')
      .order('full_name');
    if (emps) setEmployees(emps);

    // 2. Obtener asistencias con datos de empleado
    const { data: atts } = await supabase
      .from('attendances')
      .select('*, employees(*)')
      .order('clock_in', { ascending: false });
    if (atts) setAttendances(atts as Attendance[]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Formato completo de fecha y hora local: DD/MM/AAAA HH:mm:ss
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // --- ACCIONES DE COLABORADORES ---
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      // Editar
      await supabase
        .from('employees')
        .update({
          full_name: empForm.full_name,
          dni_or_code: empForm.dni_or_code,
          pin_hash: empForm.pin_hash,
          weekly_target_hours: Number(empForm.weekly_target_hours),
        })
        .eq('id', editingEmployee.id);
    } else {
      // Crear nuevo
      await supabase.from('employees').insert([
        {
          full_name: empForm.full_name,
          dni_or_code: empForm.dni_or_code,
          pin_hash: empForm.pin_hash,
          weekly_target_hours: Number(empForm.weekly_target_hours),
          is_active: true,
        },
      ]);
    }
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    setEmpForm({ full_name: '', dni_or_code: '', pin_hash: '', weekly_target_hours: 28 });
    fetchData();
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${name}? Se borrarán también sus registros.`)) return;
    await supabase.from('attendances').delete().eq('employee_id', id);
    await supabase.from('employees').delete().eq('id', id);
    fetchData();
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpForm({
      full_name: emp.full_name,
      dni_or_code: emp.dni_or_code,
      pin_hash: emp.pin_hash,
      weekly_target_hours: emp.weekly_target_hours || 28,
    });
    setShowEmployeeModal(true);
  };

  // --- REGISTRO MANUAL DE ASISTENCIA OLVIDADA ---
  const handleSaveManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.employee_id || !manualForm.clock_in) {
      alert('Selecciona un empleado y al menos la hora de entrada.');
      return;
    }

    let calculatedHours = 0;
    if (manualForm.clock_in && manualForm.clock_out) {
      const diffMs = new Date(manualForm.clock_out).getTime() - new Date(manualForm.clock_in).getTime();
      calculatedHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      if (calculatedHours < 0) {
        alert('La fecha de salida debe ser posterior a la de entrada.');
        return;
      }
    }

    await supabase.from('attendances').insert([
      {
        employee_id: manualForm.employee_id,
        clock_in: new Date(manualForm.clock_in).toISOString(),
        clock_out: manualForm.clock_out ? new Date(manualForm.clock_out).toISOString() : null,
        total_hours: calculatedHours > 0 ? calculatedHours : null,
      },
    ]);

    setShowManualAttendanceModal(false);
    setManualForm({ employee_id: '', clock_in: '', clock_out: '' });
    fetchData();
  };

  // Exportar a CSV con fecha y hora completa
  const exportToCSV = () => {
    const headers = ['Colaborador', 'DNI', 'Entrada Completa', 'Salida Completa', 'Horas'];
    const rows = attendances.map((a) => [
      `"${a.employees?.full_name || 'Desconocido'}"`,
      `"${a.employees?.dni_or_code || ''}"`,
      `"${formatDateTime(a.clock_in)}"`,
      `"${formatDateTime(a.clock_out)}"`,
      a.total_hours || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `asistencias_control_roll_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
{/* ENCABEZADO */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <img 
            src="/logo-inmutec.png" 
            alt="Logo Inmutec" 
            className="h-14 w-auto object-contain"
          />
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Multiservicios Inmutec Control Roll Admin
            </h1>
            <p className="text-sm text-slate-500">
              Gestión global de colaboradores, asistencias y regularizaciones
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEditingEmployee(null);
              setEmpForm({ full_name: '', dni_or_code: '', pin_hash: '', weekly_target_hours: 28 });
              setShowEmployeeModal(true);
            }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-800 transition"
          >
            <Plus className="w-4 h-4" /> Nuevo Colaborador
          </button>

          <button
            onClick={() => setShowManualAttendanceModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition"
          >
            <CalendarPlus className="w-4 h-4" /> Regularizar Asistencia
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="max-w-7xl mx-auto mt-6 flex gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('attendances')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold border-b-2 transition ${
            activeTab === 'attendances'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" /> Historial de Asistencias ({attendances.length})
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-semibold border-b-2 transition ${
            activeTab === 'employees'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> Gestión de Colaboradores ({employees.length})
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto mt-6">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Cargando información...</div>
        ) : activeTab === 'attendances' ? (
          /* TABLA DE ASISTENCIAS CON FECHA COMPLETA */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Colaborador</th>
                    <th className="py-4 px-6">Estado</th>
                    <th className="py-4 px-6">Entrada (Fecha y Hora)</th>
                    <th className="py-4 px-6">Salida (Fecha y Hora)</th>
                    <th className="py-4 px-6">Horas Jornada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendances.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">{att.employees?.full_name || 'Desconocido'}</div>
                        <div className="text-xs text-slate-400">DNI: {att.employees?.dni_or_code || '--'}</div>
                      </td>
                      <td className="py-4 px-6">
                        {att.clock_out ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Finalizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <AlertCircle className="w-3 h-3" /> En Planta
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-700">{formatDateTime(att.clock_in)}</td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-700">{formatDateTime(att.clock_out)}</td>
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {att.total_hours ? `${att.total_hours} h` : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TABLA DE COLABORADORES (EDITAR / ELIMINAR) */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Nombre Completo</th>
                    <th className="py-4 px-6">DNI / Código</th>
                    <th className="py-4 px-6">Clave PIN</th>
                    <th className="py-4 px-6">Meta Semanal</th>
                    <th className="py-4 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-semibold text-slate-800">{emp.full_name}</td>
                      <td className="py-4 px-6 font-mono text-slate-600">{emp.dni_or_code}</td>
                      <td className="py-4 px-6 font-mono text-slate-600">{emp.pin_hash}</td>
                      <td className="py-4 px-6 font-semibold text-indigo-600">{emp.weekly_target_hours || 28} h</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CREAR / EDITAR COLABORADOR */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingEmployee ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
            </h2>
            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={empForm.full_name}
                  onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Ej: Jhon Ever Enciso Carbajal"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">DNI / Código</label>
                  <input
                    type="text"
                    required
                    value={empForm.dni_or_code}
                    onChange={(e) => setEmpForm({ ...empForm, dni_or_code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="61289620"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Clave PIN</label>
                  <input
                    type="text"
                    required
                    value={empForm.pin_hash}
                    onChange={(e) => setEmpForm({ ...empForm, pin_hash: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="1010"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Horas Semanales Meta</label>
                <input
                  type="number"
                  value={empForm.weekly_target_hours}
                  onChange={(e) => setEmpForm({ ...empForm, weekly_target_hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="28"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGULARIZAR ASISTENCIA OLVIDADA */}
      {showManualAttendanceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Cargar Marcación Olvidada</h2>
            <p className="text-xs text-slate-500 mb-4">Ingresa manualmente los horarios de entrada y salida del empleado.</p>
            <form onSubmit={handleSaveManualAttendance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Colaborador</label>
                <select
                  required
                  value={manualForm.employee_id}
                  onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  <option value="">Selecciona un colaborador...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.dni_or_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fecha y Hora Entrada</label>
                <input
                  type="datetime-local"
                  required
                  value={manualForm.clock_in}
                  onChange={(e) => setManualForm({ ...manualForm, clock_in: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fecha y Hora Salida</label>
                <input
                  type="datetime-local"
                  value={manualForm.clock_out}
                  onChange={(e) => setManualForm({ ...manualForm, clock_out: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowManualAttendanceModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                >
                  Registrar Asistencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Users, Clock, Plus, Download, Edit2, Trash2, CalendarPlus, 
  CheckCircle, AlertCircle, Filter, Calendar, RefreshCw, Printer 
} from 'lucide-react';

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

  // Filtros
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [selectedWeek, setSelectedWeek] = useState<string>('ALL');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('ALL');

  // Modales
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [showAttendanceModal, setShowAttendanceModal] = useState<boolean>(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);

  // Formularios
  const [empForm, setEmpForm] = useState({
    full_name: '',
    dni_or_code: '',
    pin_hash: '',
    weekly_target_hours: 28,
  });

  const [attForm, setAttForm] = useState({
    employee_id: '',
    clock_in: '',
    clock_out: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: emps } = await supabase.from('employees').select('*').order('full_name');
    if (emps) setEmployees(emps);

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

  // Formato completo fecha y hora
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

  // Convertidor de decimales a "X h Y min"
  const formatHoursAndMinutes = (decimalHours: number | null) => {
    if (decimalHours === null || decimalHours === undefined) return '--';
    const totalMinutes = Math.round(decimalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0 && mins === 0) return '0 min';
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} h`;
    return `${hours} h ${mins} min`;
  };

  // Conversor para input type datetime-local (YYYY-MM-DDTHH:mm)
  const toLocalISOString = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Semana natural (lunes a domingo)
  const getNaturalWeekOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; 
    return Math.floor((day + firstDayOfWeek - 1) / 7) + 1;
  };

  // Filtros reactivos
  const filteredAttendances = useMemo(() => {
    return attendances.filter((att) => {
      if (!att.clock_in) return false;
      const attDate = new Date(att.clock_in);
      
      if (selectedEmployeeId !== 'ALL' && att.employee_id !== selectedEmployeeId) {
        return false;
      }

      const yearMonth = `${attDate.getFullYear()}-${String(attDate.getMonth() + 1).padStart(2, '0')}`;
      if (yearMonth !== selectedMonth) {
        return false;
      }

      if (selectedWeek !== 'ALL') {
        const weekNum = String(getNaturalWeekOfMonth(attDate));
        if (weekNum !== selectedWeek) return false;
      }

      if (selectedDayOfWeek !== 'ALL') {
        if (String(attDate.getDay()) !== selectedDayOfWeek) return false;
      }

      return true;
    });
  }, [attendances, selectedEmployeeId, selectedMonth, selectedWeek, selectedDayOfWeek]);

  // Horas acumuladas
  const totalHoursInFilter = useMemo(() => {
    return filteredAttendances.reduce((acc, curr) => acc + (Number(curr.total_hours) || 0), 0);
  }, [filteredAttendances]);

  const currentTargetEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  const targetHours = currentTargetEmployee ? Number(currentTargetEmployee.weekly_target_hours || 28) : 28;
  const targetToCompare = selectedWeek === 'ALL' ? targetHours * 4 : targetHours;

  // --- ACCIONES EMPLEADOS ---
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
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
    if (!confirm(`¿Estás seguro de eliminar a ${name}? Se borrarán también todas sus asistencias registradas.`)) return;
    await supabase.from('attendances').delete().eq('employee_id', id);
    await supabase.from('employees').delete().eq('id', id);
    fetchData();
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpForm({
      full_name: emp.full_name,
      dni_or_code: emp.dni_or_code,
      pin_hash: emp.pin_hash,
      weekly_target_hours: emp.weekly_target_hours || 28,
    });
    setShowEmployeeModal(true);
  };

  // --- ACCIONES ASISTENCIAS (CRUD DIRECTO) ---
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attForm.employee_id || !attForm.clock_in) {
      alert('Selecciona un colaborador y la hora de entrada.');
      return;
    }

    let calculatedHours = 0;
    if (attForm.clock_in && attForm.clock_out) {
      const diffMs = new Date(attForm.clock_out).getTime() - new Date(attForm.clock_in).getTime();
      calculatedHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      if (calculatedHours < 0) {
        alert('La hora de salida no puede ser anterior a la de entrada.');
        return;
      }
    }

    if (editingAttendance) {
      await supabase
        .from('attendances')
        .update({
          employee_id: attForm.employee_id,
          clock_in: new Date(attForm.clock_in).toISOString(),
          clock_out: attForm.clock_out ? new Date(attForm.clock_out).toISOString() : null,
          total_hours: calculatedHours > 0 ? calculatedHours : null,
        })
        .eq('id', editingAttendance.id);
    } else {
      await supabase.from('attendances').insert([
        {
          employee_id: attForm.employee_id,
          clock_in: new Date(attForm.clock_in).toISOString(),
          clock_out: attForm.clock_out ? new Date(attForm.clock_out).toISOString() : null,
          total_hours: calculatedHours > 0 ? calculatedHours : null,
        },
      ]);
    }

    setShowAttendanceModal(false);
    setEditingAttendance(null);
    setAttForm({ employee_id: '', clock_in: '', clock_out: '' });
    fetchData();
  };

  const openEditAttendance = (att: Attendance) => {
    setEditingAttendance(att);
    setAttForm({
      employee_id: att.employee_id,
      clock_in: toLocalISOString(att.clock_in),
      clock_out: toLocalISOString(att.clock_out),
    });
    setShowAttendanceModal(true);
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!confirm('¿Deseas eliminar este registro de asistencia?')) return;
    await supabase.from('attendances').delete().eq('id', id);
    fetchData();
  };

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['Colaborador', 'DNI', 'Entrada Completa', 'Salida Completa', 'Horas Decimal', 'Tiempo Formateado'];
    const rows = filteredAttendances.map((a) => [
      `"${a.employees?.full_name || 'Desconocido'}"`,
      `"${a.employees?.dni_or_code || ''}"`,
      `"${formatDateTime(a.clock_in)}"`,
      `"${formatDateTime(a.clock_out)}"`,
      a.total_hours || 0,
      `"${formatHoursAndMinutes(a.total_hours)}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_asistencias_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 print:p-0 print:bg-white">
      {/* ENCABEZADO CON BRANDING INMUTEC */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none">
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
              Gestión global de colaboradores, asistencias completas y regularizaciones
            </p>
          </div>
        </div>

        {/* BOTONERA (Oculta al imprimir) */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            onClick={fetchData}
            title="Refrescar datos en vivo"
            className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

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
            onClick={() => {
              setEditingAttendance(null);
              setAttForm({ employee_id: '', clock_in: '', clock_out: '' });
              setShowAttendanceModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition"
          >
            <CalendarPlus className="w-4 h-4" /> Regularizar Asistencia
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition"
          >
            <Download className="w-4 h-4" /> CSV
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-800 transition"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* PESTAÑAS (Ocultas al imprimir) */}
      <div className="max-w-7xl mx-auto mt-6 flex gap-3 border-b border-slate-200 print:hidden">
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
          <>
            {/* PANEL DE FILTROS */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6 print:mb-4">
              <div className="lg:col-span-3 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
                {/* Colaborador */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Colaborador
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="ALL">Todos los colaboradores</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mes */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Mes
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Semana */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Semana
                  </label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="ALL">Todo el mes completo</option>
                    <option value="1">Semana 1 (Lun - Dom)</option>
                    <option value="2">Semana 2 (Lun - Dom)</option>
                    <option value="3">Semana 3 (Lun - Dom)</option>
                    <option value="4">Semana 4 (Lun - Dom)</option>
                    <option value="5">Semana 5 (Lun - Dom)</option>
                  </select>
                </div>

                {/* Día */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Día
                  </label>
                  <select
                    value={selectedDayOfWeek}
                    onChange={(e) => setSelectedDayOfWeek(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="ALL">Todos los días</option>
                    <option value="1">Lunes</option>
                    <option value="2">Martes</option>
                    <option value="3">Miércoles</option>
                    <option value="4">Jueves</option>
                    <option value="5">Viernes</option>
                    <option value="6">Sábado</option>
                    <option value="0">Domingo</option>
                  </select>
                </div>
              </div>

              {/* TARJETA DE CUMPLIMIENTO */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between print:col-span-4 print:border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {selectedWeek === 'ALL' ? 'Total Período' : `Semana ${selectedWeek}`}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Meta: {targetToCompare} h
                  </span>
                </div>

                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {formatHoursAndMinutes(totalHoursInFilter)}
                  </span>
                  <span className="text-sm font-medium text-slate-400">/ {targetToCompare} h</span>
                </div>

                <div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden print:hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        totalHoursInFilter >= targetToCompare ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ 
                        width: `${Math.min(Math.round((totalHoursInFilter / targetToCompare) * 100), 100)}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                    <span>
                      {totalHoursInFilter >= targetToCompare
                        ? '✅ Meta completada'
                        : `${formatHoursAndMinutes(Math.max(0, targetToCompare - totalHoursInFilter))} restantes`}
                    </span>
                    <span className="font-bold">
                      {Math.round((totalHoursInFilter / targetToCompare) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLA DE ASISTENCIAS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:border print:shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-6">Colaborador</th>
                      <th className="py-4 px-6">Estado</th>
                      <th className="py-4 px-6">Entrada (Fecha y Hora)</th>
                      <th className="py-4 px-6">Salida (Fecha y Hora)</th>
                      <th className="py-4 px-6">Horas Jornada</th>
                      <th className="py-4 px-6 text-right print:hidden">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendances.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                          No existen registros de asistencia para los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendances.map((att) => (
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
                            {formatHoursAndMinutes(att.total_hours)}
                          </td>
                          <td className="py-4 px-6 text-right print:hidden">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditAttendance(att)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Editar jornada"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAttendance(att.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* TABLA DE COLABORADORES */
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
                            onClick={() => openEditEmployeeModal(emp)}
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

      {/* MODAL: COLABORADOR */}
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

      {/* MODAL: REGULARIZAR / EDITAR ASISTENCIA */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingAttendance ? 'Editar Registro de Asistencia' : 'Regularizar Asistencia'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa o ajusta la fecha y hora exacta de entrada y salida.
            </p>
            <form onSubmit={handleSaveAttendance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Colaborador</label>
                <select
                  required
                  value={attForm.employee_id}
                  onChange={(e) => setAttForm({ ...attForm, employee_id: e.target.value })}
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
                  value={attForm.clock_in}
                  onChange={(e) => setAttForm({ ...attForm, clock_in: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fecha y Hora Salida</label>
                <input
                  type="datetime-local"
                  value={attForm.clock_out}
                  onChange={(e) => setAttForm({ ...attForm, clock_out: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                >
                  {editingAttendance ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
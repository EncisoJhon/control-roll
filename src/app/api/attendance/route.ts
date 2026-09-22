import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dni = String(body.dni || '').trim();
    const pin = String(body.pin || '').trim();

    if (!dni || !pin) {
      return NextResponse.json({ error: 'DNI y PIN son requeridos' }, { status: 400 });
    }

    // 1. Validar identidad
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('id, full_name, weekly_target_hours')
      .eq('dni_or_code', dni)
      .eq('pin_hash', pin)
      .eq('is_active', true)
      .maybeSingle();

    if (empErr) {
      return NextResponse.json({ error: `Error BD: ${empErr.message}` }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Credenciales inválidas o usuario inactivo' }, { status: 401 });
    }

    // 2. Verificar jornada abierta
    const { data: openShift } = await supabase
      .from('attendances')
      .select('id, clock_in')
      .eq('employee_id', employee.id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .maybeSingle();

    if (!openShift) {
      // Registrar ENTRADA
      const { data: newShift, error: inErr } = await supabase
        .from('attendances')
        .insert([{ employee_id: employee.id }])
        .select()
        .single();

      if (inErr) throw inErr;

      return NextResponse.json({
        type: 'ENTRADA',
        employee: employee.full_name,
        time: new Date(newShift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      // Registrar SALIDA
      const { data: closedShift, error: outErr } = await supabase
        .from('attendances')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', openShift.id)
        .select()
        .single();

      if (outErr) throw outErr;

      // Calcular acumulado semanal
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
      startOfWeek.setHours(0, 0, 0, 0);

      const { data: weekData } = await supabase
        .from('attendances')
        .select('total_hours')
        .eq('employee_id', employee.id)
        .gte('clock_in', startOfWeek.toISOString());

      const weeklyHours = weekData?.reduce((acc, curr) => acc + (Number(curr.total_hours) || 0), 0) || 0;

      return NextResponse.json({
        type: 'SALIDA',
        employee: employee.full_name,
        shiftHours: closedShift.total_hours,
        weeklyHours: weeklyHours.toFixed(2),
        targetHours: employee.weekly_target_hours,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { full_name, dni_or_code, pin, weekly_target_hours } = await request.json();

    if (!full_name || !dni_or_code || !pin) {
      return NextResponse.json({ error: 'Nombre, DNI y PIN son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([
        {
          full_name,
          dni_or_code: String(dni_or_code).trim(),
          pin_hash: String(pin).trim(),
          weekly_target_hours: weekly_target_hours || 40.0,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un empleado con este DNI' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, employee: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error registrando empleado' }, { status: 500 });
  }
}
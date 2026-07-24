import { NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '../../../lib/supabase';

// Summer Session financials, read from Supabase (source of truth). Pulls the
// latest FY26 snapshot from summer_financials and hands the panel the raw
// weekly_data array + summary object to render. Distinct from the .eml-sourced
// year-round financial KPIs — this covers the 13-week summer session only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — latest FY26 summer snapshot as { configured, weeklyData, summary,
// snapshotDate }. Returns { configured: false } (not an error) when Supabase
// isn't wired up so the panel can degrade gracefully, mirroring /api/scorecard.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('summer_financials')
      .select('weekly_data, summary, snapshot_date')
      .eq('fiscal_year', 'FY26')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ configured: true, error: error.message }, { status: 200 });
    }

    if (!data) {
      return NextResponse.json({ configured: true, weeklyData: [], summary: null, snapshotDate: null });
    }

    return NextResponse.json({
      configured: true,
      weeklyData: Array.isArray(data.weekly_data) ? data.weekly_data : [],
      summary: data.summary || null,
      snapshotDate: data.snapshot_date || null,
    });
  } catch (e) {
    return NextResponse.json({ configured: true, error: e.message || 'Failed to load summer financials' }, { status: 200 });
  }
}

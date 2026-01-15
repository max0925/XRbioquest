import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Generate a random 6-character short ID
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Find all rows with NULL short_id
    const { data: nullRows, error: fetchError } = await supabase
      .from('scenes')
      .select('id')
      .is('short_id', null);

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!nullRows || nullRows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No rows need backfilling',
        updated: 0
      });
    }

    // Update each row with a unique short_id
    let updated = 0;
    const errors: string[] = [];

    for (const row of nullRows) {
      let shortId = generateShortId();
      let attempts = 0;

      // Retry with new short_id if collision (max 5 attempts)
      while (attempts < 5) {
        const { error: updateError } = await supabase
          .from('scenes')
          .update({ short_id: shortId })
          .eq('id', row.id);

        if (!updateError) {
          updated++;
          break;
        }

        if (updateError.code === '23505') {
          // Unique constraint violation, try new short_id
          shortId = generateShortId();
          attempts++;
        } else {
          errors.push(`Row ${row.id}: ${updateError.message}`);
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${updated} of ${nullRows.length} rows`,
      updated,
      total: nullRows.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      { error: error.message || 'Backfill failed' },
      { status: 500 }
    );
  }
}

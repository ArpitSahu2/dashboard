import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchDashboardData(reportDate) {
  const { data, error } = await supabase.rpc('get_sales_dashboard', {
    report_date: reportDate,
  });

  console.log('Supabase RPC get_sales_dashboard result:', { data, error });

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`);
  }

  return data;
}

export async function fetchAvailableReportDates() {
  const { data, error } = await supabase.rpc('get_available_report_dates');

  console.log('Supabase RPC get_available_report_dates result:', { data, error });

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`);
  }

  if (!data) return [];

  if (Array.isArray(data)) {
    return data
      .map((item) => item?.report_date || item?.date || item?.value || item)
      .filter(Boolean)
      .map(String);
  }

  const value = data.report_date || data.date || data.value || data;
  return value ? [String(value)] : [];
}



// Supabase membatasi jumlah baris per permintaan (default 1.000).
// Ambil per halaman sampai habis agar perhitungan uang tidak diam-diam terpotong.
export const UKURAN_HALAMAN = 1000;

type PageResult<T> = { data: T[] | null; error: { code?: string } | null };

// `fetchPage(from, to)` harus memakai .order(...) yang stabil dan .range(from, to).
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ rows: T[]; error: { code?: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += UKURAN_HALAMAN) {
    const { data, error } = await fetchPage(from, from + UKURAN_HALAMAN - 1);
    // Jangan kembalikan data sebagian: lebih baik gagal daripada angka yang salah.
    if (error || !data) return { rows: [], error: error ?? { code: "no_data" } };
    rows.push(...data);
    if (data.length < UKURAN_HALAMAN) return { rows, error: null };
  }
}

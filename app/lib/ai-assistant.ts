import { getDbPool, ensureDatabaseSchema } from './db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface AiProcessInput {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  source?: 'telegram' | 'web';
  userId?: string;
}

export interface AiProcessOutput {
  action: 'record_transaction' | 'query_finances' | 'general_chat' | 'error';
  replyText: string;
  transactionData?: any;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDisplayDate(d: any): string {
  if (!d) return '';
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return String(d);
  return dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Execute analytical query on PostgreSQL for Family Finance
async function executeFinancialAnalytics(pool: any, params: any) {
  const now = new Date();
  const targetYear = params.year || now.getFullYear();
  const targetMonth = params.month || now.getMonth() + 1;
  const targetCategory = (params.category || '').toLowerCase();

  const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  // Overall Family Treasury Data
  const allTxnsRes = await pool.query(`
    SELECT 
      space_id, 
      type, 
      amount, 
      paid_by, 
      reimbursed, 
      to_char(date, 'YYYY-MM') as month_str,
      to_char(date, 'YYYY-MM-DD') as date_str,
      category, 
      note
    FROM transactions
    WHERE space_id != 'pribadi' OR space_id IS NULL
  `);

  let saldoKas = 0;
  let totalKeluarBulanIni = 0;
  let totalMasukBulanIni = 0;
  let categoryTotal = 0;
  let talanganAsykar = 0;
  let talanganRiska = 0;

  for (const t of allTxnsRes.rows) {
    const amt = Number(t.amount) || 0;
    const isThisMonth = t.month_str === monthStr;
    const cat = (t.category || '').toLowerCase();

    // Family Treasury Balance Calculation
    if (t.type === 'masuk') {
      saldoKas += amt;
    } else if (t.type === 'keluar') {
      const isUnreimbursed = t.paid_by && t.paid_by !== 'bersama' && !t.reimbursed;
      if (!isUnreimbursed) {
        saldoKas -= amt;
      } else {
        if (t.paid_by === 'asykar') talanganAsykar += amt;
        else if (t.paid_by === 'istri') talanganRiska += amt;
      }
    }

    // Monthly stats
    if (isThisMonth) {
      if (t.type === 'keluar') totalKeluarBulanIni += amt;
      if (t.type === 'masuk') totalMasukBulanIni += amt;

      if (targetCategory && cat.includes(targetCategory)) {
        categoryTotal += amt;
      }
    }
  }

  // Family Budget Pos
  const budgetRes = await pool.query(`
    SELECT name, monthly_allocation FROM budget_pos WHERE space_id != 'pribadi' OR space_id IS NULL
  `);

  return {
    monthStr,
    saldoKas,
    totalKeluarBulanIni,
    totalMasukBulanIni,
    categoryTotal,
    targetCategory,
    talanganAsykar,
    talanganRiska,
    totalTalangan: talanganAsykar + talanganRiska,
    budgetList: budgetRes.rows,
  };
}

async function callGeminiApi(
  contents: any[],
  responseMimeType?: string,
  temperature: number = 0.1
): Promise<any> {
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fallbackModels = [primaryModel, 'gemini-3.5-flash', 'gemini-2.5-flash'];
  const triedModels = new Set<string>();
  let lastError: any = null;

  for (const model of fallbackModels) {
    if (triedModels.has(model)) continue;
    triedModels.add(model);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature,
            ...(responseMimeType ? { responseMimeType } : {}),
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`Gemini Error (${res.status}): ${errText}`);
        continue;
      }

      return await res.json();
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal menghubungi layanan AI');
}

export async function processAiMessage(input: AiProcessInput): Promise<AiProcessOutput> {
  if (!GEMINI_API_KEY) {
    return {
      action: 'error',
      replyText: '⚠️ GEMINI_API_KEY belum dikonfigurasi di server. Silakan set di file .env.',
    };
  }

  const pool = getDbPool();
  if (!pool) {
    return {
      action: 'error',
      replyText: '⚠️ Database PostgreSQL belum terhubung.',
    };
  }

  await ensureDatabaseSchema();

  // Fetch available categories for AI context
  const catsRes = await pool.query('SELECT name FROM categories ORDER BY name ASC');
  const availableCategories = catsRes.rows.map((c: any) => c.name);

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Construct Prompt for Gemini 3.8 Flash (Dedicated Family Finance)
  const systemInstruction = `
Kamu adalah asisten keuangan cerdas, teliti, dan ramah untuk aplikasi DuitKu Keuangan Keluarga.
Aplikasi ini DEDIKASI KHUSUS 100% UNTUK KEUANGAN KELUARGA (kas bersama keluarga, belanja dapur, makan harian, kebutuhan anak, tagihan rumah tangga).

TUGAS UTAMA:
1. MENCATAT TRANSAKSI KELUARGA:
   - Dari pesan teks pengguna (contoh: "makan malam 10rb", "beli popok baby 120k ditalangi asykar", "setoran kas 3jt")
   - Dari foto struk belanjaan kasir / nota / bukti transfer.
   - Semua transaksi otomatis dicatat sebagai keuangan keluarga.
   - Sumber dana / Pelaku (paidBy):
     * "bersama": Kas Bersama (default jika tidak disebutkan siapa yang menalangi)
     * "asykar": ditalangi oleh Asykar (belum diganti dari kas keluarga)
     * "istri": ditalangi oleh Istri / Riska (belum diganti dari kas keluarga)

2. MENJAWAB ANALITIK KEUANGAN:
   - Menjawab pertanyaan tentang saldo kas bersama keluarga, total pengeluaran keluarga, total pemasukan, dan rincian talangan dari database PostgreSQL.

HARI INI: ${todayStr} (Bulan ${currentMonth}, Tahun ${currentYear})
DAFTAR KATEGORI TERSEDIA DI APLIKASI:
${availableCategories.join(', ')}

ATURAN KLASIFIKASI NIAT:
- Jika pengguna meminta mencatat / menyebutkan pengeluaran atau pemasukan atau mengirim foto struk -> tentukan "action": "record_transaction".
- Jika pengguna bertanya tentang data keuangan (contoh: "berapa pengeluaran bulan ini?", "berapa saldo kas keluarga?", "ada talangan apa saja?") -> tentukan "action": "query_finances".
- Jika pengguna hanya menyapa, mengobrol, atau berterima kasih -> tentukan "action": "general_chat".

FORMAT OUTPUT JSON (Keluarkan JSON murni tanpa markdown, tanpa backtick):
{
  "action": "record_transaction" | "query_finances" | "general_chat",
  
  // Jika action = "record_transaction":
  "transaction": {
    "type": "keluar" | "masuk",
    "amount": number (angka murni, contoh: 25000),
    "category": string (pilih salah satu dari DAFTAR KATEGORI yang paling cocok),
    "note": string (nama barang / tempat / keperluan yang rapi),
    "date": "YYYY-MM-DD" (tanggal transaksi, default hari ini),
    "paidBy": "bersama" | "asykar" | "istri" (pilih 'asykar' jika disebut ditalangi asykar, 'istri' jika disebut ditalangi istri/riska, default 'bersama'),
    "isTalangan": boolean (true jika dibayar uang pribadi asykar/istri dulu untuk ditalangi)
  },

  // Jika action = "query_finances":
  "queryParams": {
    "year": number (default ${currentYear}),
    "month": number (default ${currentMonth}),
    "category": string (jika bertanya kategori spesifik misal 'makan', 'listrik', atau kosongkan jika umum)
  },

  // Respon langsung ramah (untuk general_chat):
  "chatReply": string
}
`;

  const contents: any[] = [];
  const parts: any[] = [];

  // Add Image part if provided (multimodal receipt scanning)
  if (input.imageBase64) {
    parts.push({
      inline_data: {
        mime_type: input.imageMimeType || 'image/jpeg',
        data: input.imageBase64,
      },
    });
  }

  // Add text part
  const textPrompt = input.text
    ? `${systemInstruction}\n\nPESAN/KETERANGAN DARI PENGGUNA:\n"${input.text}"`
    : `${systemInstruction}\n\nPengguna mengirimkan foto struk/bukti transaksi tanpa teks tambahan. Tolong baca struk tersebut dan ekstrak transaksi keluarga.`;

  parts.push({ text: textPrompt });
  contents.push({ parts });

  try {
    const resJson = await callGeminiApi(contents, 'application/json', 0.1);
    const rawAiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawAiText) {
      throw new Error('AI tidak memberikan respon');
    }

    const aiResult = JSON.parse(rawAiText.replace(/```json/g, '').replace(/```/g, '').trim());

    // ACTION 1: Record Transaction (100% Family Finance)
    if (aiResult.action === 'record_transaction' && aiResult.transaction?.amount) {
      const t = aiResult.transaction;
      const isTalangan = Boolean(t.isTalangan || (t.paidBy && t.paidBy !== 'bersama'));
      const paidBy = t.paidBy || 'bersama';

      const insertRes = await pool.query(`
        INSERT INTO transactions (
          type, category, amount, note, date, space_id, paid_by, reimbursed
        ) VALUES ($1, $2, $3, $4, $5, 'keluarga', $6, $7)
        RETURNING *
      `, [
        t.type || 'keluar',
        t.category || 'Lainnya',
        t.amount,
        t.note || '',
        t.date || todayStr,
        paidBy,
        !isTalangan, // if talangan, reimbursed = false
      ]);

      const inserted = insertRes.rows[0];
      const typeLabel = inserted.type === 'masuk' ? '📈 Pemasukan' : '💸 Pengeluaran';
      const amountStr = formatRupiah(Number(inserted.amount));

      let sumberDana = 'Kas Bersama';
      if (inserted.paid_by === 'asykar') {
        sumberDana = 'Talangan Asykar <i>(Belum diganti)</i>';
      } else if (inserted.paid_by === 'istri') {
        sumberDana = 'Talangan Istri <i>(Belum diganti)</i>';
      }

      const replyText =
        `✅ <b>Transaksi Keluarga Dicatat!</b>\n\n` +
        `<b>${typeLabel}:</b> ${amountStr}\n` +
        `📁 <b>Kategori:</b> ${inserted.category}\n` +
        `📝 <b>Catatan:</b> ${inserted.note || '-'}\n` +
        `💳 <b>Sumber Dana:</b> ${sumberDana}\n` +
        `📅 <b>Tanggal:</b> ${formatDisplayDate(inserted.date)}`;

      return {
        action: 'record_transaction',
        replyText,
        transactionData: inserted,
      };
    }

    // ACTION 2: Query Finances Q&A
    if (aiResult.action === 'query_finances') {
      const stats = await executeFinancialAnalytics(pool, aiResult.queryParams || {});

      const queryPrompt = `
Data dari database Keuangan Keluarga DuitKu:
- Bulan yang dicek: ${stats.monthStr}
- Saldo Kas Bersama: ${formatRupiah(stats.saldoKas)}
- Total Pengeluaran Keluarga Bulan Ini: ${formatRupiah(stats.totalKeluarBulanIni)}
- Total Pemasukan Keluarga Bulan Ini: ${formatRupiah(stats.totalMasukBulanIni)}
${stats.targetCategory ? `- Total Kategori "${stats.targetCategory}": ${formatRupiah(stats.categoryTotal)}` : ''}
- Total Talangan Belum Diganti: ${formatRupiah(stats.totalTalangan)} (Asykar: ${formatRupiah(stats.talanganAsykar)}, Istri: ${formatRupiah(stats.talanganRiska)})

Pertanyaan pengguna:
"${input.text}"

Tuliskan jawaban yang ramah, jelas, to-the-point, dan informatif tentang keuangan keluarga dalam bahasa Indonesia (bisa gunakan emoji). Jangan mengarang angka selain yang ada di atas.
`;

      let naturalReply = '';
      try {
        const qJson = await callGeminiApi(
          [{ parts: [{ text: queryPrompt }] }],
          undefined,
          0.3
        );
        naturalReply = qJson.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (e) {
        console.warn('CallGeminiApi query reply error, using template fallback:', e);
      }

      if (!naturalReply) {
        naturalReply =
          `📊 <b>Ringkasan Keuangan Keluarga (${stats.monthStr}):</b>\n\n` +
          `💸 <b>Pengeluaran Keluarga:</b> ${formatRupiah(stats.totalKeluarBulanIni)}\n` +
          `📈 <b>Pemasukan Kas:</b> ${formatRupiah(stats.totalMasukBulanIni)}\n` +
          `🏠 <b>Saldo Kas Bersama:</b> ${formatRupiah(stats.saldoKas)}\n` +
          (stats.totalTalangan > 0 ? `💳 <b>Total Talangan Belum Diganti:</b> ${formatRupiah(stats.totalTalangan)}\n` : '');
      }

      return {
        action: 'query_finances',
        replyText: naturalReply,
      };
    }

    // ACTION 3: General Chat
    return {
      action: 'general_chat',
      replyText: aiResult.chatReply || 'Halo! Saya asisten DuitKu Keuangan Keluarga. Ada transaksi kas bersama yang ingin dicatat atau dicek hari ini?',
    };
  } catch (err: any) {
    console.error('processAiMessage error:', err);
    return {
      action: 'error',
      replyText: `❌ Gagal memproses: ${err.message || 'Terjadi kesalahan sistem'}`,
    };
  }
}

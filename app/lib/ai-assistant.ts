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

// Execute analytical query on PostgreSQL based on AI parameters
async function executeFinancialAnalytics(pool: any, params: any) {
  const now = new Date();
  const targetYear = params.year || now.getFullYear();
  const targetMonth = params.month || now.getMonth() + 1;
  const targetSpace = params.spaceId || 'all'; // 'pribadi', 'keluarga', or 'all'
  const targetCategory = (params.category || '').toLowerCase();

  const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  // 1. Overall Balance
  const allTxnsRes = await pool.query(`
    SELECT space_id, type, amount, paid_by, reimbursed, date, category, note
    FROM transactions
  `);

  let saldoPribadi = 0;
  let saldoKeluarga = 0;
  let totalKeluarBulanIni = 0;
  let totalMasukBulanIni = 0;
  let categoryTotal = 0;
  let talanganAsykar = 0;
  let talanganRiska = 0;

  for (const t of allTxnsRes.rows) {
    const amt = Number(t.amount) || 0;
    const space = t.space_id || 'pribadi';
    const isThisMonth = (t.date ? String(t.date).slice(0, 7) : '') === monthStr;
    const cat = (t.category || '').toLowerCase();

    // Balances
    if (space === 'keluarga') {
      if (t.type === 'masuk') saldoKeluarga += amt;
      else if (t.type === 'keluar') {
        const isUnreimbursed = t.paid_by && t.paid_by !== 'bersama' && !t.reimbursed;
        if (!isUnreimbursed) saldoKeluarga -= amt;
        else {
          if (t.paid_by === 'asykar') talanganAsykar += amt;
          else if (t.paid_by === 'istri') talanganRiska += amt;
        }
      }
    } else {
      if (t.type === 'masuk') saldoPribadi += amt;
      else if (t.type === 'keluar') saldoPribadi -= amt;
    }

    // Monthly stats
    if (isThisMonth) {
      if (targetSpace === 'all' || targetSpace === space) {
        if (t.type === 'keluar') totalKeluarBulanIni += amt;
        if (t.type === 'masuk') totalMasukBulanIni += amt;

        if (targetCategory && cat.includes(targetCategory)) {
          categoryTotal += amt;
        }
      }
    }
  }

  // Budget Pos
  const budgetRes = await pool.query(`
    SELECT name, monthly_allocation, space_id FROM budget_pos
  `);

  return {
    monthStr,
    saldoPribadi,
    saldoKeluarga,
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

  // Fetch available categories and budget pos for AI context
  const catsRes = await pool.query('SELECT name FROM categories ORDER BY name ASC');
  const availableCategories = catsRes.rows.map((c: any) => c.name);

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Construct Prompt for Gemini 2.0 Flash
  const systemInstruction = `
Kamu adalah asisten keuangan pribadi cerdas dan ramah untuk aplikasi DuitKu.
Kamu memiliki 2 tugas utama:
1. MENCATAT TRANSAKSI: Baik dari pesan teks maupun dari foto struk belanja, nota, atau bukti transfer.
2. MENJAWAB PERTANYAAN KEUANGAN: Menjawab pertanyaan pengguna tentang saldo, pengeluaran, anggaran, dan talangan dari database.

HARI INI: ${todayStr} (Bulan ${currentMonth}, Tahun ${currentYear})
DAFTAR KATEGORI TERSEDIA DI APLIKASI:
${availableCategories.join(', ')}

ATURAN KLASIFIKASI NIAT:
- Jika pengguna meminta mencatat / menyebutkan pengeluaran atau pemasukan (misal: "beli kopi 25k", "makan siang nasi uduk 30rb", "gaji freelance 1.5jt", atau mengirimkan foto struk belanjaan kasir) -> tentukan "action": "record_transaction".
- Jika pengguna bertanya tentang data keuangan (misal: "berapa pengeluaran bulan ini?", "berapa sisa saldo?", "berapa talangan saya?", "berapa habis buat makan?") -> tentukan "action": "query_finances".
- Jika pengguna hanya menyapa, mengobrol, atau berterima kasih -> tentukan "action": "general_chat".

FORMAT OUTPUT JSON (Hanya keluarkan JSON murni tanpa markdown, tanpa backtick):
{
  "action": "record_transaction" | "query_finances" | "general_chat",
  
  // Jika action = "record_transaction":
  "transaction": {
    "type": "keluar" | "masuk",
    "amount": number (angka murni, contoh: 25000),
    "category": string (pilih salah satu dari DAFTAR KATEGORI yang paling cocok),
    "note": string (nama barang / tempat / keperluan yang rapi),
    "date": "YYYY-MM-DD" (tanggal transaksi, default hari ini),
    "spaceId": "keluarga" | "pribadi" (pilih 'keluarga' jika belanja kebutuhan rumah/kas bersama/anak/istri, atau jika user menyebutkan 'keluarga'. Default 'pribadi'),
    "paidBy": "asykar" | "istri" | "bersama" (default 'bersama' jika keluarga, atau nama yang menalangi),
    "isTalangan": boolean (true jika transaksi keluarga dibayar uang pribadi asykar/istri dulu)
  },

  // Jika action = "query_finances":
  "queryParams": {
    "year": number (default ${currentYear}),
    "month": number (default ${currentMonth}),
    "spaceId": "pribadi" | "keluarga" | "all",
    "category": string (jika bertanya kategori tertentu, misal 'makan', 'bensin', atau kosongkan jika umum)
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
    : `${systemInstruction}\n\nPengguna mengirimkan foto struk/bukti transaksi tanpa teks tambahan. Tolong baca struk tersebut dan ekstrak transaksi.`;

  parts.push({ text: textPrompt });
  contents.push({ parts });

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fallbackModels = [primaryModel, 'gemini-3.5-flash', 'gemini-2.5-flash'];
  const triedModels = new Set<string>();

  let resJson: any = null;
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
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`Gemini Error (${res.status}): ${errText}`);
        continue;
      }

      resJson = await res.json();
      break;
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!resJson) {
    throw lastError || new Error('Gagal menghubungi layanan AI');
  }

  try {
    const rawAiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawAiText) {
      throw new Error('AI tidak memberikan respon');
    }

    const aiResult = JSON.parse(rawAiText.replace(/```json/g, '').replace(/```/g, '').trim());

    // ACTION 1: Record Transaction
    if (aiResult.action === 'record_transaction' && aiResult.transaction?.amount) {
      const t = aiResult.transaction;
      const insertRes = await pool.query(`
        INSERT INTO transactions (
          type, category, amount, note, date, space_id, paid_by, reimbursed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        t.type || 'keluar',
        t.category || 'Lainnya',
        t.amount,
        t.note || '',
        t.date || todayStr,
        t.spaceId || 'pribadi',
        t.paidBy || 'bersama',
        t.isTalangan ? false : true,
      ]);

      const inserted = insertRes.rows[0];
      const typeLabel = inserted.type === 'masuk' ? '📈 Pemasukan' : '💸 Pengeluaran';
      const spaceLabel = inserted.space_id === 'keluarga' ? '🏠 Keluarga' : '👤 Pribadi';
      const amountStr = formatRupiah(Number(inserted.amount));

      let talanganText = '';
      if (inserted.space_id === 'keluarga') {
        if (inserted.paid_by !== 'bersama') {
          const person = inserted.paid_by === 'asykar' ? 'Asykar' : 'Riska';
          talanganText = `\n💳 <b>Sumber Dana:</b> Talangan ${person} <i>(Belum diganti)</i>`;
        } else {
          talanganText = `\n💳 <b>Sumber Dana:</b> Kas Bersama`;
        }
      }

      const replyText =
        `✅ <b>Transaksi Berhasil Dicatat!</b>\n\n` +
        `<b>${typeLabel}:</b> ${amountStr}\n` +
        `📁 <b>Kategori:</b> ${inserted.category}\n` +
        `📝 <b>Catatan:</b> ${inserted.note || '-'}\n` +
        `📍 <b>Ruang:</b> ${spaceLabel}${talanganText}\n` +
        `📅 <b>Tanggal:</b> ${inserted.date}`;

      return {
        action: 'record_transaction',
        replyText,
        transactionData: inserted,
      };
    }

    // ACTION 2: Query Finances Q&A
    if (aiResult.action === 'query_finances') {
      const stats = await executeFinancialAnalytics(pool, aiResult.queryParams || {});

      // Use Gemini to write a conversational natural language reply based on real data
      const queryPrompt = `
Data dari database PostgreSQL DuitKu:
- Bulan yang dicek: ${stats.monthStr}
- Saldo Kas Keluarga: ${formatRupiah(stats.saldoKeluarga)}
- Saldo Pribadi: ${formatRupiah(stats.saldoPribadi)}
- Total Pengeluaran Bulan Ini: ${formatRupiah(stats.totalKeluarBulanIni)}
- Total Pemasukan Bulan Ini: ${formatRupiah(stats.totalMasukBulanIni)}
${stats.targetCategory ? `- Total Kategori "${stats.targetCategory}": ${formatRupiah(stats.categoryTotal)}` : ''}
- Total Talangan Belum Diganti: ${formatRupiah(stats.totalTalangan)} (Asykar: ${formatRupiah(stats.talanganAsykar)}, Riska: ${formatRupiah(stats.talanganRiska)})

Pertanyaan pengguna:
"${input.text}"

Tuliskan jawaban yang ramah, jelas, to-the-point, dan informatif dalam bahasa Indonesia (bisa gunakan emoji). Jangan mengarang angka selain yang ada di atas.
`;

      const qRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: queryPrompt }] }],
          generationConfig: { temperature: 0.3 },
        }),
      });

      const qJson = await qRes.json();
      const naturalReply = qJson.candidates?.[0]?.content?.parts?.[0]?.text ||
        `📊 <b>Ringkasan ${stats.monthStr}:</b>\n` +
        `• Total Pengeluaran: ${formatRupiah(stats.totalKeluarBulanIni)}\n` +
        `• Total Pemasukan: ${formatRupiah(stats.totalMasukBulanIni)}\n` +
        `• Saldo Kas Keluarga: ${formatRupiah(stats.saldoKeluarga)}\n` +
        `• Saldo Pribadi: ${formatRupiah(stats.saldoPribadi)}`;

      return {
        action: 'query_finances',
        replyText: naturalReply,
      };
    }

    // ACTION 3: General Chat
    return {
      action: 'general_chat',
      replyText: aiResult.chatReply || 'Halo! Saya asisten DuitKu. Ada yang bisa saya bantu catat atau periksa?',
    };
  } catch (err: any) {
    console.error('processAiMessage error:', err);
    return {
      action: 'error',
      replyText: `❌ Gagal memproses: ${err.message || 'Terjadi kesalahan sistem'}`,
    };
  }
}


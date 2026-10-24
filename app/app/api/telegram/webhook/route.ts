import { NextRequest, NextResponse } from 'next/server';
import { processAiMessage } from '@/lib/ai-assistant';
import { getDbPool } from '@/lib/db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_IDS = (process.env.TELEGRAM_ALLOWED_USERS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

// In-memory update_id deduplication set to prevent Telegram webhook retries from duplicating replies
const processedUpdates = new Set<number>();

async function sendTelegramMessage(chatId: number | string, text: string): Promise<number | null> {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.result?.message_id) {
      return data.result.message_id;
    }

    // Fallback: If Telegram rejected due to invalid HTML formatting or entities, send as plain text
    const fallbackRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.replace(/<[^>]*>/g, ''), // Strip tags for plain text
      }),
    });
    const fallbackData = await fallbackRes.json().catch(() => null);
    return fallbackData?.result?.message_id || null;
  } catch (err) {
    console.error('Failed to send telegram message:', err);
    return null;
  }
}

async function editTelegramMessage(chatId: number | string, messageId: number, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      const fallbackRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text.replace(/<[^>]*>/g, ''),
        }),
      });
      return fallbackRes.ok;
    }
    return true;
  } catch {
    return false;
  }
}

// Download photo from Telegram Bot API and convert to Base64
async function downloadTelegramPhotoBase64(fileId: string): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const fileInfoRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const fileInfo = await fileInfoRes.json();
    if (!fileInfo.ok || !fileInfo.result?.file_path) return null;

    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`;
    const fileRes = await fetch(fileUrl);
    const arrayBuffer = await fileRes.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (err) {
    console.error('Failed to download telegram photo:', err);
    return null;
  }
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.message) {
      return NextResponse.json({ ok: true });
    }

    // 0. Deduplicate webhook updates from Telegram retries
    if (body.update_id) {
      if (processedUpdates.has(body.update_id)) {
        return NextResponse.json({ ok: true });
      }
      processedUpdates.add(body.update_id);
      if (processedUpdates.size > 1000) {
        const oldest = processedUpdates.values().next().value;
        if (oldest) processedUpdates.delete(oldest);
      }
    }

    const { message } = body;
    const chatId = message.chat?.id;
    const userId = String(message.from?.id);
    const text = (message.text || message.caption || '').trim();
    const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    // 1. Security Check: Whitelist check
    if (ALLOWED_USER_IDS.length > 0 && !ALLOWED_USER_IDS.includes(userId)) {
      await sendTelegramMessage(
        chatId,
        `⛔ <b>Akses Ditolak</b>\nID Telegram Anda (<code>${userId}</code>) belum terdaftar di daftar pengguna berizin DuitKu.`
      );
      return NextResponse.json({ ok: true });
    }

    // 2. Command /start or /help
    if (text === '/start' || text === '/help') {
      await sendTelegramMessage(
        chatId,
        `👋 <b>Halo! Saya Asisten AI DuitKu</b>\n\n` +
        `Anda bisa mencatat transaksi atau bertanya seputar keuangan Anda:\n\n` +
        `📝 <b>Catat via Teks:</b>\n` +
        `• <i>"Makan siang soto 25rb"</i>\n` +
        `• <i>"Beli popok baby 120k keluarga ditalangi asykar"</i>\n` +
        `• <i>"Gaji freelance masuk 2jt"</i>\n\n` +
        `📸 <b>Catat via Foto Struk:</b>\n` +
        `• Langsung kirim foto struk belanjaan kasir / nota / bukti transfer\n\n` +
        `💬 <b>Tanya Jawab Data:</b>\n` +
        `• <i>"Berapa pengeluaran saya bulan ini?"</i>\n` +
        `• <i>"Berapa total talangan asykar yang belum diganti?"</i>\n` +
        `• <i>"Berapa habis buat makan bulan ini?"</i>\n\n` +
        `<b>Perintah Cepat:</b>\n` +
        `• /saldo - Cek ringkasan saldo pribadi & kas keluarga\n` +
        `• /batal - Hapus transaksi terakhir yang baru saja diinput\n` +
        `• /id - Cek ID Telegram Anda`
      );
      return NextResponse.json({ ok: true });
    }

    // 3. Command /id
    if (text === '/id') {
      await sendTelegramMessage(
        chatId,
        `🆔 ID Telegram Anda: <code>${userId}</code>\n` +
        `<i>Tambahkan ID ini ke TELEGRAM_ALLOWED_USERS di .env VPS Anda untuk mengunci akses.</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // 4. Command /batal (Undo last transaction)
    if (text === '/batal') {
      const pool = getDbPool();
      if (!pool) {
        await sendTelegramMessage(chatId, '⚠️ Error: DATABASE_URL belum dikonfigurasi di server.');
        return NextResponse.json({ ok: true });
      }

      const lastTxnRes = await pool.query(`
        SELECT id, type, category, amount, note, space_id 
        FROM transactions 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (lastTxnRes.rows.length === 0) {
        await sendTelegramMessage(chatId, 'ℹ️ Tidak ada transaksi untuk dibatalkan.');
        return NextResponse.json({ ok: true });
      }

      const last = lastTxnRes.rows[0];
      await pool.query('DELETE FROM transactions WHERE id = $1', [last.id]);

      await sendTelegramMessage(
        chatId,
        `🗑️ <b>Transaksi Terakhir Dibatalkan:</b>\n` +
        `• ${last.type === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}: ${formatRupiah(Number(last.amount))}\n` +
        `• Kategori: ${last.category}\n` +
        `• Catatan: ${last.note || '-'}\n` +
        `• Ruang: ${last.space_id === 'keluarga' ? 'Keluarga' : 'Pribadi'}`
      );
      return NextResponse.json({ ok: true });
    }

    if (!text && !hasPhoto) {
      return NextResponse.json({ ok: true });
    }

    // Process asynchronous in background so Telegram receives 200 OK immediately
    // and never triggers timeout retries
    (async () => {
      let statusMsgId: number | null = null;
      try {
        statusMsgId = await sendTelegramMessage(
          chatId,
          hasPhoto ? '🔍 <i>Menganalisis foto struk...</i>' : '💭 <i>Memproses...</i>'
        );

        let imageBase64: string | undefined;
        if (hasPhoto) {
          const highestResPhoto = message.photo[message.photo.length - 1];
          const b64 = await downloadTelegramPhotoBase64(highestResPhoto.file_id);
          if (b64) imageBase64 = b64;
        }

        const result = await processAiMessage({
          text,
          imageBase64,
          imageMimeType: 'image/jpeg',
          source: 'telegram',
          userId,
        });

        let edited = false;
        if (statusMsgId) {
          edited = await editTelegramMessage(chatId, statusMsgId, result.replyText);
        }

        if (!edited) {
          await sendTelegramMessage(chatId, result.replyText);
        }
      } catch (err: any) {
        console.error('Async Telegram process error:', err);
        const errMsg = `❌ Gagal memproses: ${err?.message || 'Terjadi kesalahan sistem'}`;
        if (statusMsgId) {
          await editTelegramMessage(chatId, statusMsgId, errMsg);
        } else {
          await sendTelegramMessage(chatId, errMsg);
        }
      }
    })();

    // Return 200 OK immediately to Telegram so it never retries
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram Webhook unhandled error:', err);
    return NextResponse.json({ ok: true });
  }
}

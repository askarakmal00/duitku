Buatkan aplikasi web manajemen keuangan pribadi dengan struktur data yang universal (bukan hardcode ke satu kasus tertentu), dengan fitur berikut:

1. Transaksi (universal, masuk/keluar)

Setiap transaksi punya field:

Tipe: Masuk atau Keluar
Kategori (dropdown, bisa tambah kategori baru): Gaji, Tabungan, Pengeluaran, Hutang, atau kategori custom lain
Sub-kategori (khusus kategori Pengeluaran): Makan, Transport, Tagihan, Kebutuhan rumah tangga, Kesehatan, Lainnya
Pos anggaran (dropdown, lihat modul budget)
Jumlah (Rp)
Keterangan (teks bebas)
Tanggal (default hari ini)

Jangan hardcode kategori "hutang ke istri" secara spesifik — cukup kategori umum "Hutang", dengan detail pihaknya diatur di modul hutang (poin 3).

2. Modul budget (pos anggaran)
User bisa membuat beberapa pos anggaran, misalnya "Operasional", "Rumah Tangga", "Cicilan". Tiap pos punya nama, alokasi bulanan (Rp), dan sisa anggaran berjalan (dihitung otomatis).
Saat mencatat transaksi Keluar dan memilih pos anggaran, sistem otomatis memotong sisa anggaran pos itu sebesar jumlah transaksi.
Sisa anggaran = alokasi bulan ini − total semua transaksi Keluar bulan berjalan yang menunjuk ke pos tersebut.
Tampilkan progress/donut chart per pos (alokasi vs terpakai vs sisa), beri warna peringatan kalau sudah habis/minus tapi tetap izinkan input.
Di awal bulan baru, anggaran tiap pos otomatis reset mengikuti alokasi bulanan yang di-set (dihitung ulang dari transaksi bulan berjalan, bukan disimpan sebagai angka tetap). Opsional: toggle rollover sisa bulan lalu ke bulan ini.
3. Modul hutang (universal, multi-pihak)
Terpisah dari transaksi umum, ada halaman/list "Hutang" yang bisa punya banyak entri pihak, bukan cuma satu.
Tiap entri hutang punya: nama pihak (bebas diisi user — bisa siapa saja, tidak dikategorikan di UI), jumlah awal atau riwayat penambahan/pengurangan, dan sisa saldo hutang ke pihak itu.
User bisa "Tambah hutang" (pilih/ketik nama pihak, jumlah, keterangan) dan "Bayar hutang" (pilih pihak yang sudah ada, jumlah yang dibayar).
List hutang menampilkan semua pihak dengan sisa saldo masing-masing, dan riwayat (running balance) per pihak bisa di-expand untuk detail.
Total sisa hutang keseluruhan = jumlah semua sisa saldo per pihak.
4. Ringkasan & saldo (dashboard utama)
Total balance, Income (bulan ini), Expense (bulan ini), Total savings — masing-masing sebagai kartu ringkasan dengan indikator naik/turun dibanding bulan lalu
Saldo tabungan = akumulasi Masuk(Tabungan) − Keluar(Tabungan), sejak awal
Grafik "Money flow": bar chart Income vs Expense per bulan, filter periode (bulan ini/tahun ini)
Recent transactions: tabel transaksi terbaru dengan kolom tanggal, jumlah, keterangan, metode/kategori
5. Target tabungan (saving goals)
User bisa buat beberapa target tabungan (misal: dana darurat, kebutuhan anak, dll), tiap target punya nama, nominal target, dan progress bar otomatis dari saldo tabungan yang dialokasikan ke target itu
6. Grafik & analitik
Bar chart income vs expense per bulan (6-12 bulan terakhir)
Donut/pie chart breakdown pengeluaran per kategori/pos anggaran bulan berjalan
Halaman Analytics terpisah untuk tren jangka lebih panjang
7. Data & penyimpanan
Simpan transaksi sebagai array (id, tipe, kategori, sub-kategori, pos anggaran, jumlah, keterangan, tanggal)
Simpan pos anggaran sebagai list terpisah (nama, alokasi bulanan, rollover on/off)
Simpan hutang sebagai list per pihak, masing-masing dengan riwayat transaksi sendiri
Simpan target tabungan sebagai list terpisah (nama, nominal target)
Semua data bisa dihapus/edit; setelah itu semua perhitungan (saldo, sisa anggaran, sisa hutang, grafik) otomatis dihitung ulang
8. Desain visual

Ikuti gaya dashboard SaaS finance modern seperti referensi berikut:

Layout: sidebar kiri dengan navigasi ikon (Dashboard, Transactions, Wallet, Goals, Budget, Analytics, Settings), area konten utama di kanan dengan card-card putih rounded di atas background lembut
Header halaman: sapaan singkat + subtext, filter periode (dropdown "This month"), search & notification icon, avatar profil di kanan atas
Baris atas: 4 kartu ringkasan angka besar (Total balance, Income, Expense, Total savings) masing-masing dengan badge kecil hijau/merah untuk persentase perubahan vs bulan lalu
Grafik utama: bar chart "Money flow" (Income vs Expense) dua warna ungu (tua/muda), dengan tooltip nilai saat hover
Card "Budget": donut chart dengan legend list warna per pos anggaran, angka besar di tengah donut menunjukkan total/sisa anggaran bulan ini
Card "Recent transactions": tabel ringkas (tanggal, jumlah, nama transaksi, metode, kategori), dengan link "See all"
Card "Saving goals": list target dengan progress bar horizontal dan persentase, nominal target di kanan
Palet warna: putih bersih dengan aksen ungu (violet/indigo), rounded corner besar (16-20px) pada semua card, shadow lembut, tipografi sans-serif modern, ikon outline sederhana
Ada toggle light/dark mode di pojok kiri bawah sidebar
9. Deployment & database (gratis)

Deploy aplikasi ini ke Vercel (Hobby plan, gratis selamanya untuk pemakaian personal/non-komersial). Gunakan Supabase (Postgres) sebagai database, tier gratis: 500 MB storage database, 50.000 monthly active users — jauh lebih dari cukup untuk pemakaian pribadi.

Catatan penting: project gratis Supabase otomatis di-pause kalau tidak ada request API sama sekali selama 7 hari. Kalau aplikasi rutin dibuka tiap hari ini bukan masalah, tapi kalau jarang dipakai perlu di-resume manual dari dashboard Supabase. Simpan API key Supabase sebagai environment variable di Vercel, jangan hardcode di kode.

Sebutkan ke AI app builder: "Deploy ke Vercel Hobby plan (gratis, non-komersial), gunakan Supabase (tier gratis) untuk penyimpanan data, dan sediakan instruksi langkah demi langkah untuk connect repo ke Vercel serta setup project Supabase gratis dan environment variable-nya."

dan saya punya spesial template yang saya attach di chat 
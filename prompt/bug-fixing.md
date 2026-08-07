Saya sudah screenshot 6 halaman di HP (Dashboard, Transaksi, Kalender, Goals, Anggaran, Analitik) dan menemukan 2 masalah sistemik berikut. Tolong perbaiki root cause-nya, bukan cuma halaman yang kelihatan rusak saja — karena kemungkinan besar semua halaman lain yang pakai komponen yang sama juga kena masalah yang sama.

MASALAH 1: Overflow horizontal masih terjadi di banyak tempat

Bukti spesifik yang saya lihat:

Header di banyak halaman (Dashboard, Transaksi, Analitik): ikon lonceng notifikasi dan avatar di pojok kanan atas kepotong/hilang sebagian — search icon, bell, avatar dipaksa satu baris (flex-row) yang total lebarnya lebih dari layar
Kartu quick-action di Dashboard (Pemasukan/Pengeluaran/Hutang/+1 lagi): kartu ke-4 kepotong tanpa indikasi bisa di-scroll ke kanan
Kartu saldo ungu besar di Dashboard: baris "Free Money: Rp ..." dan "Sisa Anggaran: Rp ..." teksnya kepotong di kanan
Grafik "Arus Uang" di halaman Analitik: chart dan legend-nya meluber melewati tepi kanan layar, sampai legend kedua ("Pengeluaran") nyaris tidak kelihatan
Nominal transaksi di halaman Transaksi: masih kepotong (mis. "-Rp 27...") — ini sudah pernah diminta diperbaiki sebelumnya tapi kelihatannya solusinya cuma diterapkan di satu tempat, bukan di komponen baris transaksi yang dipakai berulang

Perbaikan yang diminta — di level komponen/global, bukan per halaman:

Audit SEMUA halaman (bukan cuma yang di-screenshot), cari setiap tempat yang pakai flex-nowrap atau lebar tetap (fixed px width) tanpa min-width: 0 — ini penyebab utama overflow di flexbox/grid
Komponen header (dipakai di semua halaman) harus satu kali diperbaiki di file komponennya sendiri, supaya otomatis kebawa ke semua halaman — jangan diperbaiki manual di tiap halaman satu-satu
Komponen baris transaksi (dipakai di Dashboard, Transaksi, dan mungkin halaman lain) sama — perbaiki di satu tempat sumbernya
Semua chart/grafik HARUS pakai container responsive (width: 100%, gunakan ResizeObserver atau library chart yang auto-resize seperti recharts ResponsiveContainer) — jangan set width dalam px tetap
Row horizontal-scroll (kartu quick-action) harus punya overflow-x: auto + scroll-snap-type + sedikit crop di kartu terakhir sebagai sinyal visual "masih ada lagi", BUKAN kartu terpotong tanpa sengaja di tengah teks
Setelah perbaikan, screenshot ULANG semua 6 halaman ini di lebar 390px dan pastikan tidak ada satupun teks/ikon/tombol yang terpotong di tepi kanan
MASALAH 2: Halaman Target Tabungan, Anggaran, dan Analitik terasa monoton — pola kartu di-copy paste

Ketiga halaman ini semua dibuka dengan pola yang identik: 3 kartu putih ditumpuk vertikal, masing-masing isinya cuma "label kecil abu-abu + angka besar berwarna". Bedanya cuma teks dan angkanya. Ini bikin app terasa seperti template generik, bukan produk yang dirancang.

Perbaikan yang diminta:

Gabungkan 3 kartu ringkasan itu jadi SATU kartu dengan 3 kolom/baris di dalamnya (stat row dengan pembatas vertikal tipis antar angka), bukan 3 kartu terpisah yang makan tempat vertikal
Beri masing-masing halaman identitas warna yang beda sesuai fungsinya — misalnya Goals pakai aksen ungu/violet (sudah ada), Anggaran pakai aksen amber/oranye, Analitik pakai aksen teal — supaya user langsung tahu lagi di halaman mana tanpa baca judul
Tambahkan elemen visual yang bukan cuma angka: mis. mini icon di tiap stat (ikon target untuk Goals, ikon dompet untuk Anggaran), atau progress ring kecil, biar tidak semua slot cuma teks
Untuk halaman Analitik khususnya: card "Total Pemasukan", "Total Pengeluaran", "Rata-rata", "Saving Rate" bisa digabung jadi satu dashboard-style row 2x2 grid (bukan 4 kartu bertumpuk penuh lebar), supaya user bisa lihat semuanya tanpa scroll panjang
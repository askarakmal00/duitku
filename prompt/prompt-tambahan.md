1. Mobile responsive (masih belum jalan, tolong perbaiki secara teknis, bukan cuma "dibuat responsive")

Aplikasi ini HARUS bisa dipakai nyaman di layar HP (lebar 360–430px), bukan cuma versi desktop yang di-scale. Lakukan ini secara spesifik:

Sidebar kiri: di layar < 768px, sidebar HARUS berubah jadi bottom navigation bar (ikon-ikon di bawah layar) atau hamburger menu yang slide-in dari kiri — jangan tetap tampil sebagai sidebar sempit yang kepotong
Semua card ringkasan (Total balance, Income, Expense, dst) yang di desktop berjajar 4 kolom, di mobile HARUS jadi 1 atau 2 kolom bertumpuk (grid-cols-2 atau flex-col), bukan di-scroll horizontal
Grafik (money flow chart, donut budget) harus resize mengikuti lebar layar (gunakan container responsive, bukan width/height fixed dalam px)
Tabel (recent transactions) di mobile diubah jadi list/card per baris, bukan tabel dengan scroll horizontal yang menyulitkan
Semua tombol dan area tap minimal tinggi 44px supaya nyaman disentuh jari
Form input transaksi: field-field yang di desktop sejajar dalam satu baris, di mobile HARUS bertumpuk 1 kolom penuh
Test dan pastikan tidak ada elemen yang overflow/terpotong horizontal di lebar 375px (ukuran iPhone SE/standar kecil)
2. Desain masih terasa monoton, buat lebih punya karakter
Jangan semua card pakai treatment visual yang sama persis (rounded + shadow + putih polos berulang-ulang) — beri variasi: satu-dua card bisa pakai warna latar berbeda (misal card ringkasan saldo pakai gradient ungu gelap dengan teks putih, sementara card lain tetap putih) supaya ada hierarki visual, bukan semua rata
Tambahkan aksen ilustrasi kecil atau icon custom yang bukan generic (hindari icon set default yang terlalu umum/flat tanpa karakter)
Beri variasi ukuran/tipografi yang lebih tegas antara angka utama (misal saldo, jadi besar dan bold) vs label pendukung (kecil, warna lebih pudar) — jangan semua teks terasa rata besar/kecilnya
Tambahkan sedikit warna aksen kedua (bukan cuma ungu tunggal) untuk membedakan modul — misal hijau untuk pemasukan/tabungan, oranye/merah untuk pengeluaran/hutang, supaya user langsung bisa membedakan tanpa baca label
Empty state (waktu belum ada data) jangan kosong polos — kasih ilustrasi atau pesan yang lebih hangat/personal
3. Modul baru: monitor pengeluaran harian (tampilan kalender)

Tambahkan halaman/section baru khusus untuk melihat pengeluaran per hari, dengan tampilan seperti kalender:

Tampilkan grid kalender bulan berjalan (7 kolom hari, baris per minggu, seperti kalender biasa)
Di tiap kotak tanggal, tampilkan total pengeluaran hari itu (angka kecil di bawah nomor tanggal)
Beri intensitas warna berbeda tergantung besar pengeluaran hari itu (heatmap sederhana): tidak ada pengeluaran = kosong/netral, pengeluaran kecil = warna pudar, pengeluaran besar = warna lebih pekat — supaya sekali lihat langsung kelihatan hari mana yang paling boros
Klik salah satu tanggal → muncul detail list transaksi pengeluaran di hari itu (bisa berupa panel/modal di bawah kalender atau popup)
Di atas kalender, tampilkan ringkasan cepat: "Hari ini keluar: Rp ..." dan "Rata-rata pengeluaran harian bulan ini: Rp ..."
Kalender ini juga harus responsive di mobile: kalau grid 7 kolom kepotong di layar kecil, kotak tanggal boleh mengecil dan angka pengeluaran disingkat (misal "45rb" bukan "Rp 45.000") asal tetap terbaca
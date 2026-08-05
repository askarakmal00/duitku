Di halaman Transaksi (dan kemungkinan halaman lain yang mirip), ada elemen yang KEPOTONG di luar layar pada mobile — ini bug overflow horizontal, bukan sekadar "belum responsive". Tolong perbaiki ini secara spesifik:

1. Tombol "+ Tambah" kepotong di kanan

Tombol ini terpotong sebagian, tidak terlihat penuh di layar. Penyebabnya kemungkinan search bar dan tombol dipaksa sejajar dalam satu baris (flex-row) dengan lebar gabungan yang melebihi lebar layar. Perbaiki dengan salah satu dari ini:

Di mobile (< 640px), search bar dan tombol "Tambah" ditumpuk vertikal (search bar full-width di atas, tombol full-width di bawahnya), ATAU
Tombol "Tambah" di mobile diubah jadi floating action button (FAB) bulat dengan ikon "+" saja di pojok kanan bawah layar, terpisah dari search bar Pastikan tidak ada container dengan flex-nowrap tanpa min-width: 0 pada anak-anaknya, karena ini penyebab umum overflow di flexbox.
2. Nominal transaksi (mis. "-Rp 28.000") kepotong di kanan

Di setiap baris transaksi, nominal dan tombol edit/hapus di ujung kanan terpotong keluar layar. Perbaiki dengan:

Ubah layout tiap baris transaksi di mobile jadi 2 baris (bukan 1 baris sejajar penuh): baris atas = nama transaksi + tanggal/jam, baris bawah = badge kategori + nominal + tombol edit/hapus, ATAU
Kecilkan ukuran font nominal dan ikon aksi (edit/hapus) khusus di mobile, dan pastikan container baris transaksi punya overflow: hidden + elemen di dalamnya pakai flex-shrink yang wajar (jangan flex-shrink: 0 pada semua elemen sekaligus)
Nominal jangan pernah terpotong sebagian (misal "-Rp 28.00" tanpa 3 digit terakhir) — pastikan width kolom nominal menyesuaikan panjang teks, bukan lebar tetap yang keburu habis oleh elemen lain
3. Baris filter (Semua / Pemasukan / Pengeluaran / Bulan Ini)

Kalau chip filter ini lebih lebar dari layar, jangan biarkan salah satu chip kepotong tanpa indikasi bisa di-scroll. Buat baris ini scrollable horizontal (overflow-x: auto) dengan scroll-snap, sembunyikan scrollbar visualnya, dan tambahkan sedikit fade/shadow gradient di ujung kanan sebagai sinyal visual bahwa masih ada chip lain kalau di-scroll.

4. Cara verifikasi sebelum dianggap selesai
Screenshot ulang halaman ini persis di lebar 390px (ukuran HP standar) setelah perbaikan
Pastikan TIDAK ADA teks, angka, atau tombol yang terpotong/hilang sebagian di tepi kanan layar manapun di seluruh aplikasi, bukan cuma halaman Transaksi
Kalau ada elemen yang kepanjangan, prioritaskan solusi "ubah jadi 2 baris / perkecil / sembunyikan sebagian info non-esensial" dibanding membiarkan overflow atau memaksa scroll horizontal seluruh halaman
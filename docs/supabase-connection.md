# Prisma Session Pooler helper

Supabase free tier memberi **IPv6-only** untuk host direct
`db.<ref>.supabase.co:5432`. Jaringan yang tidak punya IPv6 akan gagal
`P1001` walaupun URL-nya benar.

Solusi gratisnya: **Session pooler** pada host pooler yang sama, port **5432**.
Menurut dokumentasi Supabase, "the shared pooler endpoint accepts IPv4
connections by default and does not require this add-on", jadi tidak perlu
upgrade Pro atau membayar add-on IPv4 ($4/bulan).

| Port | Mode | IPv4 | Prepared statement | Dipakai untuk |
| --- | --- | --- | --- | --- |
| 6543 | Transaction pooler | ya | tidak | runtime aplikasi (`DATABASE_URL`) |
| 5432 | Session pooler | ya | ya | **Prisma CLI / migrate** (`DIRECT_URL`) |
| 5432 | Direct (`db.<ref>…`) | **tidak** | ya | hanya dari jaringan ber-IPv6 |

## Turunan otomatis

`npm run db:migrate` dan `npm run db:status` memakai skrip
`scripts/with-session-pooler.mjs` yang menurunkan URL Session pooler dari
`DATABASE_URL` (ganti port `6543` → `5432`, buang `pgbouncer`/`connection_limit`).

Jika host direct kamu ternyata sudah bisa dijangkau, `DIRECT_URL` yang sudah diisi
di `.env` akan dipakai apa adanya.

## Kalau tetap ingin host direct

Tanpa membayar, opsinya hanya menjalankan migrasi dari jaringan ber-IPv6.
Host direct juga akan ber-IPv4 jika project dipindah ke region yang menyediakan
IPv4 (lihat dokumentasi Supabase), tetapi solusi Session pooler di atas tidak
memerlukan perubahan apa pun.

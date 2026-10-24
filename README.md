# Daily Focus Board

Dashboard kecil untuk menampilkan tugas, deadline, jadwal, dan interest dari file Markdown di Obsidian. Dashboard juga menyediakan Pomodoro, pilihan background, dan pengaturan tampilan.

## Kebutuhan

- Node.js 18 atau lebih baru
- (Opsional) vault Obsidian dengan folder `Dashboard`

## Menjalankan lokal

```powershell
npm start
```

Buka <http://localhost:3000> setelah server berjalan.

Secara default, server akan memakai vault lama `D:\AFIF\Diary\Secret Diary` jika folder tersebut tersedia. Jika tidak, server menggunakan folder `data` di proyek ini dan membuat file Markdown yang diperlukan secara otomatis. Untuk lokasi vault lain, atur `OBSIDIAN_VAULT`. Karena proyek ini tidak memakai package tambahan untuk membaca `.env`, variabel lingkungan dapat diatur langsung dari terminal:

```powershell
$env:OBSIDIAN_VAULT = 'D:\path\ke\vault'
npm start
```

Folder vault yang dipakai harus memiliki:

```text
Dashboard/
  tasks.md
  deadlines.md
  schedule.md
  interests.md
```

Contoh format:

```markdown
# Tasks

- [ ] Selesaikan tugas
```

## Background

Letakkan gambar atau video di folder `backgrounds`. Format yang didukung: JPG, JPEG, PNG, WEBP, GIF, MP4, WEBM, dan MOV.

## Launcher Windows

- `start-dashboard.bat` menjalankan server dengan jendela terminal.
- `start-dashboard.vbs` menjalankan server tanpa menampilkan jendela terminal.

Keduanya menggunakan folder tempat file launcher berada, sehingga tidak bergantung pada path komputer pembuat proyek.

## Git

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Data lokal dan file `.env` sengaja tidak dilacak Git. Jangan commit isi vault Obsidian pribadi atau kredensial apa pun.

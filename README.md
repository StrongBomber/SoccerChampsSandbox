# SoccerChampsSandbox

## World Soccer Champs 2026.12 (XAPK)

Drive'daki `World+Soccer+Champs_2026.12_APKPure-1.xapk` dosyasi GitHub'a alindi.

| | |
|---|---|
| **Indirme** | https://github.com/StrongBomber/SoccerChampsSandbox/releases/download/wsc-2026.12/World%2BSoccer%2BChamps_2026.12_APKPure-1.xapk |
| **Release** | https://github.com/StrongBomber/SoccerChampsSandbox/releases/tag/wsc-2026.12 |
| **Boyut** | 237.511.212 bayt (~226 MB) |
| **SHA-256** | `4198930c006dd294e1e444d489a1df78d42b3e46c2c4c5b1e454ff672c7f3112` |

Git 100 MB uzerindeki dosyalari depo agacina kabul etmedigi icin dosya
**release asset** olarak yayinlandi (GitHub'in buyuk ikili dosyalar icin onerdigi yol).

### Nasil indirildi

Dosya 100 MB'lik calisma alani limitini astigi ve sandbox'tan Google Drive'a
dogrudan erisim kapali oldugu icin indirme islemi GitHub Actions runner'inda yapildi:

1. `scripts/download_drive.sh` — Drive dosyasini (buyuk dosyalardaki "virus scan"
   onay sayfasini da asarak) indirir.
2. `.github/workflows/fetch-xapk.yml` — boyutu ve arsiv butunlugunu dogrular,
   SHA-256 uretir, sonucu `wsc-2026.12` release'ine asset olarak yukler.

Yeniden calistirmak icin workflow dosyasinda veya scriptte bir degisiklik push etmek yeterli.

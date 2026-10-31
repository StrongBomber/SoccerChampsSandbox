/*
 * THE BOYS EVRENİ — BitLife için içerik paketi.
 *
 * Bu dosya oyunun APK'sına dokunmaz; çalışma anında ajana yüklenen YENİ
 * içeriktir: karakterler, meslekler ve bölümler. Ajan bu içeriği oyunun
 * kendi penceresinden oynatır ve seçimlerin etkisini oyunun canlı
 * istatistiklerine (bellekten bağlanan adreslere) yazar.
 *
 * Şema
 *   characters[] : {id, name, tag, perk, start:{money,health,happy,fame,karma,smarts,looks}}
 *   careers[]    : {id, name, employer, pay, ladder[], need[], blockedBy[], note}
 *   chapters[]   : {id, career (id veya "*"), title, text, choices[]}
 *   choices[]    : {text, effects{}, flags{}, outcome}
 *
 * effect anahtarları: money · health · happy · fame · karma · smarts · looks
 * (money dışındakiler 0–100 aralığına kırpılır)
 */

globalThis.BOYS_UNIVERSE = {
  version: 2,
  title: "The Boys Evreni",
  subtitle: "Vought International · Sezon 1–4",

  characters: [
    {
      id: "homelander",
      name: "Homelander",
      tag: "Vought'un yüzü",
      perk: "Şöhret kapıları açılır; kimse sana hayır diyemez.",
      start: { fame: 35, money: 2500000, happy: -10, health: 10 },
    },
    {
      id: "butcher",
      name: "Billy Butcher",
      tag: "The Boys'ın lideri",
      perk: "Supe'lere karşı pazarlık yok; ekip seni dinler.",
      start: { karma: -15, health: 15, money: -5000 },
    },
    {
      id: "starlight",
      name: "Starlight",
      tag: "Yedi'nin vicdanı",
      perk: "Basın seni sever, kamuoyu arkanda.",
      start: { fame: 20, looks: 10, happy: 5 },
    },
    {
      id: "atrain",
      name: "A-Train",
      tag: "Yedi · hız",
      perk: "Kaçış ve kovalamaca senin işin.",
      start: { fame: 15, health: -5, money: 400000 },
    },
    {
      id: "blacknoir",
      name: "Black Noir",
      tag: "Sessiz infazcı",
      perk: "İz bırakmazsın; kimse adını bilmez.",
      start: { smarts: 10, karma: -10, fame: -5 },
    },
    {
      id: "soldierboy",
      name: "Soldier Boy",
      tag: "Vought'un ilk süper askeri",
      perk: "Savaş tecrübesi; acıya alışkınsın.",
      start: { health: 20, fame: 10, happy: -15 },
    },
    {
      id: "kimiko",
      name: "Kimiko",
      tag: "Sessiz güç",
      perk: "Acıya dayanıklısın, korku bilmezsin.",
      start: { health: 15, happy: -5, smarts: 5 },
    },
    {
      id: "frenchie",
      name: "Frenchie",
      tag: "Teknik deha",
      perk: "Patlayıcı ve kimyasal uzmanı.",
      start: { smarts: 15, karma: 5 },
    },
    {
      id: "hughie",
      name: "Hughie",
      tag: "Sıradan insan",
      perk: "Kimse senden şüphelenmez.",
      start: { karma: 10, health: 5 },
    },
    {
      id: "thedeep",
      name: "The Deep",
      tag: "Denizin dibi",
      perk: "Deniz canlıları seni dinler; kamuoyu affetmez.",
      start: { fame: 5, happy: -10, money: 60000 },
    },
  ],

  careers: [
    {
      id: "vought-pr",
      name: "Vought PR Uzmanı",
      employer: "Vought International",
      pay: 96000,
      ladder: ["Stajyer", "Uzman", "Kıdemli Uzman", "İletişim Müdürü"],
      need: [],
      blockedBy: [],
      note: "Her skandal senin masanda. Kriz yönetimi = hayatta kalma.",
    },
    {
      id: "seven",
      name: "The Seven Üyesi",
      employer: "Vought · The Seven",
      pay: 6000000,
      ladder: ["Yedek Üye", "Yedi Üyesi", "Yüz", "Vought'un Yüzü"],
      need: ["supe"],
      blockedBy: [],
      note: "Süper güç şart (Compound V). Maaş astronomik, gizlilik sözleşmesi ölümcül.",
    },
    {
      id: "boys",
      name: "Supe Avcısı",
      employer: "The Boys",
      pay: 42000,
      ladder: ["Çaylak", "Ekip Üyesi", "Saha Lideri", "Butcher'ın Sağ Kolu"],
      need: [],
      blockedBy: ["vought_insider"],
      note: "Vought'ta çalışan biri The Boys'a güvenmez. Önce bağını koparman gerek.",
    },
    {
      id: "chemist",
      name: "Compound V Kimyageri",
      employer: "Vought R&D · Lab 7",
      pay: 210000,
      ladder: ["Laborant", "Araştırmacı", "Kıdemli Kimyager", "Lab Şefi"],
      need: ["vought_insider"],
      blockedBy: [],
      note: "Mavi sıvı senin elinde. Ahlak? O laboratuvarın dışında kalıyor.",
    },
    {
      id: "lawyer",
      name: "Vought Avukatı",
      employer: "Vought Legal",
      pay: 480000,
      ladder: ["Stajyer Avukat", "Avukat", "Kıdemli Ortak", "Baş Hukuk Müşaviri"],
      need: ["vought_insider"],
      blockedBy: [],
      note: "Sessizlik anlaşmaları, NDAlar ve sonsuz bütçe.",
    },
    {
      id: "social",
      name: "Vought Sosyal Medya",
      employer: "Vought Digital",
      pay: 72000,
      ladder: ["İçerik Üreticisi", "Sosyal Medya Uzmanı", "Kampanya Lideri", "Dijital Direktör"],
      need: [],
      blockedBy: [],
      note: "140 karakterle bir suçun üstünü örtmek.",
    },
    {
      id: "marine",
      name: "Deniz Biyoloğu",
      employer: "Vought Aquatics",
      pay: 88000,
      ladder: ["Asistan", "Biyolog", "Akvaryum Sorumlusu", "Deniz Programı Şefi"],
      need: [],
      blockedBy: [],
      note: "The Deep'in akvaryumu ve okyanus terapisörleri.",
    },
    {
      id: "security",
      name: "Vought Güvenlik Şefi",
      employer: "Vought Security",
      pay: 130000,
      ladder: ["Devriye", "Kamera Operatörü", "Vardiya Şefi", "Güvenlik Direktörü"],
      need: [],
      blockedBy: [],
      note: "Vought Kulesi'nde her koridorda bir sır var.",
    },
    {
      id: "press",
      name: "Araştırmacı Muhabir",
      employer: "Vought Basın Takibi",
      pay: 68000,
      ladder: ["Stajyer", "Muhabir", "Araştırmacı", "Kıdemli Muhabir"],
      need: [],
      blockedBy: [],
      note: "Bir kaynak her şeyi değiştirir. Ya senin kariyerini ya da Vought'u.",
    },
    {
      id: "tempv",
      name: "TEMP-V Denek Koordinatörü",
      employer: "Vought · Proje 24",
      pay: 150000,
      ladder: ["Klinik Asistanı", "Koordinatör", "Kıdemli Koordinatör", "Program Yöneticisi"],
      need: ["vought_insider"],
      blockedBy: [],
      note: "24 saatlik güç. Deneden kimse aynı dönmüyor.",
    },
    {
      id: "manager",
      name: "Starlight'ın Menajeri",
      employer: "Vought Talent",
      pay: 175000,
      ladder: ["Asistan", "Menajer Yardımcısı", "Menajer", "Yıldız Yöneticisi"],
      need: [],
      blockedBy: [],
      note: "İyi kız imajını satmak; gerçek kızı korumak zor.",
    },
    {
      id: "janitor",
      name: "Yedi Ayakçısı",
      employer: "Vought Facilities",
      pay: 45000,
      ladder: ["Temizlik Görevlisi", "Kat Sorumlusu", "Vardiya Şefi", "Tesis Müdürü"],
      need: [],
      blockedBy: [],
      note: "Kanı ilk sen görürsün. Kimse seni görmez.",
    },
  ],

  chapters: [
    /* ---------------- Vought PR ---------------- */
    {
      id: "vought-pr-1",
      career: "vought-pr",
      title: "Bölüm 1 · İlk kriz",
      text: "Homelander'ın kanat uçları bir yolcu uçağını tarumar etti. Basın toplantısına 40 dakika var; Vought \"kuş sürüsü\" demeni istiyor.",
      choices: [
        { text: "Raporu \"kuş sürüsü\" yap", effects: { money: 4200, karma: -8, happy: 2 }, flags: { vought_insider: true }, outcome: "Yönetim memnun. Uçağın enkazı hâlâ orada." },
        { text: "Gerçeği söyle", effects: { money: -2000, karma: 10, fame: 3 }, outcome: "Toplantı buz kesiyor ama içten rahatsın." },
        { text: "Belgeyi bir muhabire sızdır", effects: { karma: 6, fame: 5, health: -3 }, flags: { leaked: true }, outcome: "Sabah manşet: \"VOUGHT YALAN SÖYLEDİ\"." },
      ],
    },
    {
      id: "vought-pr-2",
      career: "vought-pr",
      title: "Bölüm 2 · The Deep'in dönüşü",
      text: "The Deep rehabilitasyon turunda. Vought onu \"yeni bir adam\" olarak satmak istiyor ama kameralar önünde ağzından çıkacak tek cümle her şeyi bitirebilir.",
      choices: [
        { text: "Senaryoyu ezberlet", effects: { money: 5200, karma: -5, happy: 1 }, outcome: "Röportaj kusursuz. The Deep ağlıyor, kamera kapanınca." },
        { text: "Doğal bırak, batarsa batar", effects: { money: -1200, fame: 4, karma: 3 }, outcome: "Klip viral oldu — ama Vought'un istediği şekilde değil." },
      ],
    },

    /* ---------------- The Seven ---------------- */
    {
      id: "seven-1",
      career: "seven",
      title: "Bölüm 1 · Yedi'ye katılım",
      text: "Kadroda boş yer var. Homelander seni ölçüyor: \"Bana faydalı mısın, yoksa dekor mu?\"",
      choices: [
        { text: "Onun önünde eğil", effects: { money: 250000, fame: 12, karma: -6 }, outcome: "Kadroya girdin. Boynunda bir tasma var." },
        { text: "Kendi şartlarını dayat", effects: { fame: 8, karma: 4, health: -6 }, flags: { independent: true }, outcome: "Homelander gülümsedi. Bu iyi bir şey değil." },
        { text: "Kadroyu reddet, gizli kal", effects: { karma: 8, money: -20000 }, flags: { underground: true }, outcome: "\"Akıllı kız,\" dedi Starlight." },
      ],
    },
    {
      id: "seven-2",
      career: "seven",
      title: "Bölüm 2 · Vought sözleşmesi",
      text: "Sözleşme 400 sayfa: film hakları, ürün lisansları ve \"kamuya zarar verecek her olayda sessiz kalma\" maddesi.",
      choices: [
        { text: "Hepsini imzala", effects: { money: 1800000, fame: 10, karma: -12 }, flags: { vought_contract: true }, outcome: "Artık Vought'un malısın. Ama zenginsin." },
        { text: "Sessizlik maddesini çiz", effects: { money: -50000, karma: 8, fame: 3 }, outcome: "Avukatlar 6 saat tartıştı. Kazandın — bu sefer." },
      ],
    },

    /* ---------------- The Boys ---------------- */
    {
      id: "boys-1",
      career: "boys",
      title: "Bölüm 1 · Kanlı çamaşır",
      text: "Butcher seni bir bodrumda bekliyor. Masada bir supe'nin dişleri ve bir plan var: \"Kirli iş, temiz para. Var mısın?\"",
      choices: [
        { text: "Ekibe katıl", effects: { money: 3000, karma: -4, health: -5 }, flags: { boys_member: true, wanted: true }, outcome: "Butcher sırtını sıvazladı: \"Hoş geldin, velet.\"" },
        { text: "Sadece bilgi sat", effects: { money: 9000, karma: -8 }, outcome: "Para cebinde. Butcher adını bir deftere yazdı." },
        { text: "Reddet ve uzaklaş", effects: { karma: 6, happy: -4 }, outcome: "Kapıdan çıkarken \"Bu iş bitmedi\" dedi." },
      ],
    },
    {
      id: "boys-2",
      career: "boys",
      title: "Bölüm 2 · TEMP-V",
      text: "Frenchie masaya mavi bir enjektör koydu: \"24 saatlik güç. Sonrası... karışık.\"",
      choices: [
        { text: "Enjekte et", effects: { health: -10, fame: 6, happy: 5 }, flags: { temp_supe: true }, outcome: "Duvara yumruk attın, duvar kaybetti. 24 saat sonra bayıldın." },
        { text: "Başkasına ver", effects: { money: 4000, karma: -10 }, outcome: "Denek işe yaradı. Sonra patladı. Kelimenin tam anlamıyla." },
        { text: "Yok et", effects: { karma: 8, money: -1000 }, outcome: "Frenchie küfretti ama saygı duydu." },
      ],
    },

    /* ---------------- Kimyager ---------------- */
    {
      id: "chemist-1",
      career: "chemist",
      title: "Bölüm 1 · Mavi sıvı",
      text: "Lab 7'de yeni bir V partisi var. Homelander'ın emri: \"Bir bebek üzerinde dene.\"",
      choices: [
        { text: "Emri uygula", effects: { money: 30000, karma: -20, happy: -8 }, flags: { vought_insider: true }, outcome: "Bebek hayatta kaldı. Gözleri parlıyor. Uyuyamıyorsun." },
        { text: "Sahte veri gir", effects: { karma: 10, smarts: 4, money: -3000 }, outcome: "Kayıtlarda \"başarısız parti\". Gerçekte bebeğe hiç dokunmadın." },
        { text: "Partiyi çal", effects: { money: 15000, karma: -5 }, flags: { has_v: true }, outcome: "Cebinde iki flakon var. Bu bir güç ya da bir bomba." },
      ],
    },
    {
      id: "chemist-2",
      career: "chemist",
      title: "Bölüm 2 · Kendine iğne",
      text: "Gecenin üçünde laboratuvar boş. Elinde V var, kolunda damar.",
      choices: [
        { text: "Kendine enjekte et", effects: { health: -12, fame: 5, happy: 8 }, flags: { supe: true }, outcome: "Gözlerin maviye döndü. Artık bir supesin." },
        { text: "Starlight'a götür", effects: { karma: 12, money: -5000 }, outcome: "Starlight flakonu aldı: \"Bunu doğru kişilere vereceğim.\"" },
        { text: "Flakonu sat", effects: { money: 600000, karma: -18 }, flags: { vought_insider: true }, outcome: "Alıcı bir savaş ağasıydı. Parayı sayarken gülümsüyordun." },
      ],
    },

    /* ---------------- Avukat ---------------- */
    {
      id: "lawyer-1",
      career: "lawyer",
      title: "Bölüm 1 · Sessizlik anlaşması",
      text: "A-Train bir bisikletliyi ezdi. Aile 200 bin dolar istiyor; Vought 50 bin teklif ediyor ve imzayı senin almanı istiyor.",
      choices: [
        { text: "Aileyi sıkıştır", effects: { money: 18000, karma: -12 }, flags: { vought_insider: true }, outcome: "İmza alındı. Kadın imzayı gözyaşlarıyla attı." },
        { text: "Vought'un cebinden fazla öde", effects: { money: -6000, karma: 10 }, outcome: "Aile sustu, sen de rahatladın. Muhasebe kızdı." },
        { text: "Davayı mahkemeye taşı", effects: { fame: 6, money: -15000, karma: 5 }, flags: { vought_target: true }, outcome: "Vought avukatlarını sana çevirdi." },
      ],
    },
    {
      id: "lawyer-2",
      career: "lawyer",
      title: "Bölüm 2 · Kongre duruşması",
      text: "Kongre Vought'u sorguluyor. Senin tanıklığın dosyayı kapatabilir ya da Vought'u dize getirebilir.",
      choices: [
        { text: "Şirketi koru", effects: { money: 120000, fame: 4, karma: -15 }, flags: { vought_insider: true }, outcome: "Duruşma ertelendi. Sonsuza kadar." },
        { text: "Gerçeği anlat", effects: { fame: 15, karma: 15, money: -30000 }, flags: { whistleblower: true }, outcome: "Salonda alkış. Vought'un koridorlarında sessizlik." },
      ],
    },

    /* ---------------- Sosyal medya ---------------- */
    {
      id: "social-1",
      career: "social",
      title: "Bölüm 1 · Trend",
      text: "Homelander'ın bir mitingde çocuğu korkuttuğu video yayıldı. 3 saat içinde algıyı çevirmen gerek.",
      choices: [
        { text: "Videoyu botla gömdür", effects: { money: 6000, karma: -9, smarts: 3 }, outcome: "Trend listesi temizlendi. Kullanıcılar değil." },
        { text: "Özür kampanyası yap", effects: { fame: 5, karma: 6, money: -2000 }, outcome: "\"Homelander da insan\" hashtag'i 2 milyon etkileşim." },
        { text: " Videoyu öne çıkar", effects: { fame: 10, karma: 8, health: -4 }, outcome: "Hesap askıya alındı; içerik hiç bu kadar görünür olmamıştı." },
      ],
    },
    {
      id: "social-2",
      career: "social",
      title: "Bölüm 2 · İtibar krizi",
      text: "Starlight'ın eski bir fotoğrafı sızdı. Vought onu \"aile dostu\" bir imaja dönüştürmek için 48 saat veriyor.",
      choices: [
        { text: "Sahte bir ilişki kurgula", effects: { money: 9000, fame: 6, karma: -6 }, outcome: "Magazin mutlu, Starlight değil." },
        { text: "Starlight'a sor", effects: { karma: 10, fame: 4, money: -1500 }, outcome: "Starlight kendi hikâyesini anlattı; sen sadece yayınladın." },
      ],
    },

    /* ---------------- Deniz biyoloğu ---------------- */
    {
      id: "marine-1",
      career: "marine",
      title: "Bölüm 1 · Akvaryum",
      text: "The Deep akvaryumdaki ahtapota danışman istiyor. Vought bunu \"deniz programı\" diye satıyor.",
      choices: [
        { text: "Programı yürüt", effects: { money: 7000, fame: 3, karma: -3 }, outcome: "Ahtapot kameralar önünde el salladı. Çocuklar bayıldı." },
        { text: "The Deep'e gerçeği söyle", effects: { karma: 8, happy: 4, money: -1000 }, outcome: "\"Kimse beni dinlemiyor,\" dedi. Sonra seni dinledi." },
      ],
    },
    {
      id: "marine-2",
      career: "marine",
      title: "Bölüm 2 · Timothy",
      text: "Vought, The Deep'in akvaryumundaki Timothy'yi bir etkinlikte \"canlı yem\" olarak kullanmayı planlıyor.",
      choices: [
        { text: "Timothy'yi kaçır", effects: { karma: 15, health: -6, money: -4000 }, flags: { timothy_saved: true }, outcome: "Timothy şimdi bir devlet akvaryumunda. The Deep adını öğrendi." },
        { text: "Etkinliğe göz yum", effects: { money: 12000, karma: -14, happy: -6 }, outcome: "Etkinlik başarılıydı. Sen o gün deniz ürünleri yemedin." },
      ],
    },

    /* ---------------- Güvenlik ---------------- */
    {
      id: "security-1",
      career: "security",
      title: "Bölüm 1 · Vought Kulesi",
      text: "Kamera kayıtlarında 34. katta bir şey var. Yönetim \"kayıtları temizle\" diyor.",
      choices: [
        { text: "Kayıtları sil", effects: { money: 15000, karma: -10 }, flags: { vought_insider: true }, outcome: "Dosya yok. Kafandaki görüntü kalıcı." },
        { text: "Kopyasını al", effects: { smarts: 4, karma: 8, health: -4 }, flags: { evidence: true }, outcome: "Kopya bir USB'de. Bu bir sigorta poliçesi." },
        { text: "Soruşturma başlat", effects: { money: -4000, fame: 3, karma: 6 }, outcome: "İç soruşturma 2 gün sürdü, sonra sessizce kapandı." },
      ],
    },
    {
      id: "security-2",
      career: "security",
      title: "Bölüm 2 · Sızıntı",
      text: "Bir gazeteci Vought Kulesi'ne girmiş. Patronun talimatı net: \"Onu bul.\"",
      choices: [
        { text: "Gazeteciyi yakala", effects: { money: 20000, karma: -12 }, flags: { vought_insider: true }, outcome: "Gazeteci gözaltında. Haber yine de çıktı." },
        { text: "Kaçmasına yardım et", effects: { karma: 12, money: -8000, health: -5 }, flags: { press_ally: true }, outcome: "Kapıyı açık bıraktın. Hiçbir kamera görmedi." },
      ],
    },

    /* ---------------- Muhabir ---------------- */
    {
      id: "press-1",
      career: "press",
      title: "Bölüm 1 · Kaynak",
      text: "Anonim bir kaynak, Vought'un yetimhanelerde V denediğini söylüyor. Belge karşılığında para istiyor.",
      choices: [
        { text: "Parayı öde", effects: { money: -7000, smarts: 5, karma: 8 }, flags: { dossier: true }, outcome: "Klasör elinde: 41 çocuk, 9 ölüm, 1 imza." },
        { text: "Reddet, kendi araştır", effects: { money: -1000, health: -5, smarts: 3 }, outcome: "İki hafta sonra kapında bir Vought avukatı vardı." },
        { text: "Vought'a bildir", effects: { money: 25000, karma: -16 }, flags: { vought_insider: true, vought_target: false }, outcome: "Kaynak ortadan kayboldu. Sen terfi aldın." },
      ],
    },
    {
      id: "press-2",
      career: "press",
      title: "Bölüm 2 · Yayın",
      text: "Haber hazır. Yayınlarsan kariyerin biter ya da başlar. Vought bir telefon uzaklıkta.",
      choices: [
        { text: "Yayınla", effects: { fame: 20, karma: 15, money: -20000 }, flags: { story_published: true, vought_target: true }, outcome: "Manşet dünyaya yayıldı. Vought hisseleri %9 düştü." },
        { text: "Dosyayı rafa kaldır", effects: { money: 80000, karma: -20, happy: -10 }, outcome: "Dosya bir kasada. Sen de onunla birlikte kapandın." },
      ],
    },

    /* ---------------- TEMP-V ---------------- */
    {
      id: "tempv-1",
      career: "tempv",
      title: "Bölüm 1 · Denek 12",
      text: "Denek 12, TEMP-V'nin üçüncü dozunu istiyor. Protokol iki dozdan fazlasını yasaklıyor.",
      choices: [
        { text: "Protokolü çiğne", effects: { money: 30000, karma: -12, smarts: 4 }, outcome: "Üçüncü dozdan sonra 11 dakika boyunca duvarların içinden geçti." },
        { text: "Protokole uy", effects: { money: -3000, karma: 10 }, outcome: "Denek 12 küfretti ama hayatta kaldı." },
        { text: "Kendi üzerinde dene", effects: { health: -8, fame: 4 }, flags: { temp_supe: true }, outcome: "24 saatliğine uçtun. İndiğinde bacakların titriyordu." },
      ],
    },
    {
      id: "tempv-2",
      career: "tempv",
      title: "Bölüm 2 · 24 saat",
      text: "Bir denek gücünü kaybetmeden 30. saate girdi. Vought bunu \"yeni bir çağ\" diye duyuruyor.",
      choices: [
        { text: "Duyuruyu destekle", effects: { money: 50000, karma: -10, fame: 5 }, flags: { vought_insider: true }, outcome: "Hisse yükseldi. Denek hâlâ nöbette." },
        { text: "Deneği kaçır", effects: { karma: 16, health: -8, money: -10000 }, flags: { supe: true, wanted: true }, outcome: "Denek artık seninle. Gücü kalıcı — ve senin de." },
      ],
    },

    /* ---------------- Menajer ---------------- */
    {
      id: "manager-1",
      career: "manager",
      title: "Bölüm 1 · Starlight'ın programı",
      text: "Starlight 18 saatlik röportaj maratonunda. Vought onu \"Vought'un meleği\" yapmak istiyor, o ise sadece uyumak.",
      choices: [
        { text: "Programa devam", effects: { money: 25000, fame: 8, happy: -4 }, outcome: "Reyting rekoru. Starlight kuliste uyuyakaldı." },
        { text: "Programı iptal et", effects: { karma: 10, money: -9000, fame: -3 }, outcome: "Vought kızdı. Starlight ilk kez gerçekten gülümsedi." },
      ],
    },
    {
      id: "manager-2",
      career: "manager",
      title: "Bölüm 2 · Reklam anlaşması",
      text: "Bir silah şirketi Starlight'a 4 milyon dolarlık reklam teklif ediyor. İmza senin elinde.",
      choices: [
        { text: "İmzala", effects: { money: 400000, fame: 6, karma: -14 }, flags: { vought_insider: true }, outcome: "Kampanya yayında. Starlight reklamı hiç izlemedi." },
        { text: "Reddet ve açıkla", effects: { fame: 10, karma: 12, money: -30000 }, flags: { independent: true }, outcome: "\"Silah para kazanmıyor, insan öldürüyor.\" Klip milyonlarca izlendi." },
      ],
    },

    /* ---------------- Ayakçı ---------------- */
    {
      id: "janitor-1",
      career: "janitor",
      title: "Bölüm 1 · Kan lekesi",
      text: "34. katın toplantı odasında kan var. Vardiya defterine \"kırmızı şarap\" yazman isteniyor.",
      choices: [
        { text: "Deftere \"şarap\" yaz", effects: { money: 2500, karma: -6 }, flags: { vought_insider: true }, outcome: "Kimse sormadı. Halının altındaki leke kalıcı." },
        { text: "Kan örneği al", effects: { smarts: 5, karma: 8, health: -3 }, flags: { evidence: true }, outcome: "Test tüpü cebinde. İçinde DNA var, sahibi yok." },
        { text: "Temizlik ekibini ara", effects: { money: -500, karma: 4 }, outcome: "Ekip 12 dakikada geldi. Bu kadar hızlı olmaları seni korkuttu." },
      ],
    },
    {
      id: "janitor-2",
      career: "janitor",
      title: "Bölüm 2 · Temizlik ekibi",
      text: "Vought'un \"özel temizlik\" birimi seni işe almak istiyor. Maaş üç katı, iş tanımı yok.",
      choices: [
        { text: "Kabul et", effects: { money: 60000, karma: -15, health: -5 }, flags: { vought_insider: true, vought_cleaner: true }, outcome: "İlk işin bir tanığı \"ikna etmekti\"." },
        { text: "Reddet, istifa et", effects: { karma: 12, money: -2000, happy: 6 }, outcome: "Rozetini bıraktın. İlk kez iyi uyudun." },
      ],
    },

    /* ---------------- Global bölümler ---------------- */
    {
      id: "g1",
      career: "*",
      title: "Sezon 1 finali · Herrick'in gecesi",
      text: "Butcher'ın tuzağı hazır: bir supe'yi canlı yakalayıp Vought'a gösterecek. Ama plan patlarsa sadece The Boys ölmez.",
      choices: [
        { text: "Tuzağa katıl", effects: { health: -10, fame: 6, karma: 4 }, flags: { boys_member: true }, outcome: "Supe tuzağa düştü. Butcher gülümsedi: \"Bu daha başlangıç.\"" },
        { text: "Planı Vought'a sat", effects: { money: 250000, karma: -20 }, flags: { vought_insider: true, traitor: true }, outcome: "Baskında The Boys'ın ikisi yaralandı. Butcher adını unutmadı." },
        { text: "Uzak dur", effects: { karma: 2, happy: -6 }, outcome: "Haberlerde \"Vought Kulesi'nde patlama\" yazıyordu." },
      ],
    },
    {
      id: "g2",
      career: "*",
      title: "Sezon 2 · Kilise",
      text: "Bir \"kilise\" Vought'un kirli işlerini yıkıyor ve seni üye yapmak istiyor. Teklif: koruma, terapi ve sınırsız bağış.",
      choices: [
        { text: "Üye ol", effects: { money: 40000, happy: 6, karma: -8 }, flags: { church_member: true, vought_insider: true }, outcome: "Terapi seansları rahatlatıcı. Ama soruları fazla spesifik." },
        { text: "Kiliseyi araştır", effects: { smarts: 5, karma: 8, health: -5 }, flags: { church_file: true }, outcome: "Dosya kalın: 300 isim, 12 kayıp, 1 kasa." },
        { text: "Reddet ve kaç", effects: { karma: 4, money: -5000 }, outcome: "Üç gün boyunca gölgende bir araba gördün." },
      ],
    },
    {
      id: "g3",
      career: "*",
      title: "Sezon 2 finali · Kongre duruşması",
      text: "Kongre salonu dolu. Elinde Vought'un yetimhane dosyası var mı, yoksa sadece bir NDA mı?",
      choices: [
        { text: "Dosyayı sun", effects: { fame: 22, karma: 16, money: -25000 }, flags: { story_published: true, vought_target: true }, outcome: "Vought hisseleri çöktü. Homelander ilk kez kamera önünde terledi." },
        { text: "NDA'yı hatırlat, sus", effects: { money: 300000, karma: -18, happy: -8 }, flags: { vought_insider: true }, outcome: "Duruşma ertelendi. Sen zenginleştin." },
      ],
    },
    {
      id: "g4",
      career: "*",
      title: "Sezon 3 · Soldier Boy uyanıyor",
      text: "Rusya'da bir kapsül açıldı. İçinde 40 yıldır uyuyan Soldier Boy var ve ilk istediği şey intikam.",
      choices: [
        { text: "Onu Vought'a karşı kullan", effects: { health: -8, fame: 10, karma: 6 }, flags: { soldier_boy_ally: true }, outcome: "Soldier Boy gülümsedi: \"Beni 40 yıl beklettiler.\"" },
        { text: "Vought'a teslim et", effects: { money: 500000, karma: -20 }, flags: { vought_insider: true }, outcome: "Vought kapsülü kapattı. Bu sefer daha derine." },
        { text: "Kaç ve saklan", effects: { happy: -8, karma: 2 }, outcome: "Üç hafta boyunca her gürültüde yerinden sıçradın." },
      ],
    },
    {
      id: "g5",
      career: "*",
      title: "Sezon 3 finali · Herogasm",
      text: "Vought'un gizli partisi basıldı, kameralar her yerde. Bu gece kimin ayakta kalacağını sen belirleyeceksin.",
      choices: [
        { text: "The Boys'a katıl", effects: { health: -15, fame: 12, karma: 10 }, flags: { boys_member: true }, outcome: "Sabah olduğunda Vought Kulesi'nin camları kırıktı. Sen hâlâ ayaktasın." },
        { text: "Kanıt topla", effects: { smarts: 6, karma: 10, health: -6 }, flags: { evidence: true }, outcome: "Kameranda 42 dakika var. Bu bir bomba." },
        { text: "Sadece para topla", effects: { money: 350000, karma: -12 }, outcome: "Yerde bulduğun çantada 350 bin dolar vardı. Sahibi ölmüştü." },
      ],
    },
    {
      id: "g6",
      career: "*",
      title: "Sezon 4 · Vought'un yeni yüzü",
      text: "Vought yeniden markalandı: \"Daha iyi bir dünya için.\" Taht boş ve sen o koltuğa yakınsın.",
      choices: [
        { text: "Vought'un yeni yüzü ol", effects: { money: 2000000, fame: 25, karma: -18 }, flags: { vought_face: true }, outcome: "Spot ışığı sende. Gölgende 41 isim var." },
        { text: "Her şeyi yayınla", effects: { fame: 18, karma: 20, money: -50000 }, flags: { truth_out: true }, outcome: "Dünya öğrendi. Vought çöktü. Seni kimse unutmadı." },
        { text: "Kaybol, yeni bir hayat kur", effects: { happy: 12, karma: 6, money: -30000 }, flags: { retired: true }, outcome: "Sabah kahven, sessiz bir kasaba. Telefonun kapalı." },
      ],
    },
  ],
};

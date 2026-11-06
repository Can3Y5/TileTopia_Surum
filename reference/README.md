# Kabileler — Unity sürümü

Tarayıcı sürümündeki oyunun tamamı Unity'ye taşındı: izometrik 3B harita, sis, 5 kabile,
14 teknoloji, 8 birim, şehir seviyeleri ve ödülleri, köy ele geçirme, yapay zekâ rakip.

**Hazır model, sprite, prefab veya sahne dosyası gerekmiyor.** Her şey çalışma anında
koddan kuruluyor (küp/kapsül/küre + kodla üretilen koni ve piramit).

---

## Kurulum — 3 adım

1. Unity'de yeni bir 3D proje aç (2020.3 veya üstü; URP de Built-in de olur).
2. `Assets/Kabileler` klasörünü olduğu gibi projenin `Assets` klasörüne kopyala.
3. Sahnede boş bir GameObject oluştur (`GameObject > Create Empty`), üstüne
   **GameBootstrap** betiğini ekle ve **Play**'e bas.

Kamera, ışık, harita ve arayüz kendiliğinden kurulur. Sahnede Main Camera yoksa onu da
kendi oluşturur.

### Play'e basınca ekran boşsa
- **Her şey pembe görünüyorsa**: URP projesindesin ama shader bulunamamış.
  `BoardView.FindShader()` içinde sırayla URP Lit → Standard deneniyor; projendeki
  render pipeline'a göre oradaki isimleri kontrol et.
- **Tıklamalar çalışmıyorsa**: Projen yeni Input System kullanıyor olabilir.
  `Edit > Project Settings > Player > Active Input Handling` değerini **Both** yap.
- **Yazılar çok küçük/büyükse**: `GameHUD.S` özelliği ekran yüksekliğine göre ölçekliyor,
  oradaki `800f` sayısını değiştir.

---

## Kontroller

| Giriş | Etki |
|---|---|
| Sol tık | Kare seç / seçili birimi hareket ettir / saldır |
| Sağ tık veya orta tuş + sürükle | Haritayı kaydır |
| Fare tekerleği | Yakınlaştır |
| Enter | Turu bitir |
| Esc | Seçimi bırak |

Beyaz plaka = gidebileceğin kare, kırmızı = vurabileceğin düşman, sarı = seçili kare.
Birimin üstündeki sarı nokta "bu birim hâlâ oynayabilir" demek.

---

## Dosyalar

```
Assets/Kabileler/Scripts/
├── Core/                  ← saf C#, içinde UnityEngine YOK
│   ├── GameData.cs        sabit veriler: arazi, kaynak, birim, teknoloji, kabile, ödüller
│   ├── Models.cs          Tile, City, Unit, Player sınıfları
│   ├── GameState.cs       bütün kurallar: harita üretimi, hareket, savaş, şehir, tur akışı
│   └── AIBrain.cs         rakibin beyni (her hamlede yield return ediyor)
└── Unity/                 ← sadece görüntü ve girdi
    ├── GameBootstrap.cs   giriş noktası: sahne kurulumu, kamera, tıklama, tur döngüsü
    ├── BoardView.cs       3B çizim: kareler, ağaçlar, dağlar, şehirler, birimler, vurgular
    ├── GameHUD.cs         arayüz (OnGUI): menü, üst çubuk, eylem çubuğu, pencereler
    ├── MeshFactory.cs     koni/piramit mesh'lerini kodla üretir
    └── TileRef.cs         tıklanan nesnenin hangi kareye ait olduğunu tutar

Tools/HeadlessTest/Program.cs   Unity açmadan denge testi (aşağıya bak)
```

Bu ayrımın tek sebebi var: **kurallar görüntüden bağımsız.** Arayüzü uGUI ile baştan
yazsan, 3B yerine 2B sprite kullansan, hatta oyunu sunucuda koştursan `Core` klasörüne
hiç dokunmazsın.

---

## Nasıl değiştirilir

**Denge ayarı** — `GameData.cs`. Birim maliyetleri, canları, saldırı/savunma değerleri,
teknoloji kademeleri ve kaynak nüfus değerleri hep orada, tek tabloda.

**Yeni birim eklemek** — üç yer:
1. `UnitType` enum'una isim ekle,
2. `DB.Units` sözlüğüne satırını yaz,
3. istersen `BoardView.BuildUnit` içindeki `switch`e ona özel bir şekil ekle.
Arayüz, yapay zekâ ve şehir paneli birimi kendiliğinden görür.

**Yeni teknoloji** — `Tech` enum'u + `DB.Techs` satırı. Bir birimi açıyorsa birimin
`Need` alanını ona bağla. Teknoloji ağacı ekranı kendini otomatik kurar.

**Harita üretimini değiştirmek** — `GameState.GenerateMap()`. Arazi ağırlıkları,
göl sayısı, köy sayısı ve başkent çevresine garanti konan kaynaklar orada.

**Savaş formülü** — `GameState.PreviewDamage` / `Attack`. Şu an Polytopia'nın formülü:
`güç = değer × (can / maks can)`, hasar iki tarafın gücünün oranına göre paylaşılıyor.

---

## Unity açmadan denge testi

`Tools/HeadlessTest/Program.cs`, yapay zekâyı kendi kendine 200 oyun oynatıp sonucu yazar.
Bir dengeyi değiştirdikten sonra çalıştırırsan, değişikliğin işe yarayıp yaramadığını
5 saniyede görürsün.

```
mcs -out:test.exe Tools/HeadlessTest/Program.cs Assets/Kabileler/Scripts/Core/*.cs
mono test.exe 200
```

(Windows'ta `mcs` yerine .NET SDK ile: `dotnet new console` açıp Core dosyalarını
projeye ekleyebilirsin. Unity kendi mono'sunu da `Editor/Data/MonoBleedingEdge/bin`
altında taşır.)

Örnek çıktı ve okunuşu:

```
Ortalama tur: 23.0  |  süreden önce biten: 82
Kazananın ortalama şehri: 7.0  |  teknolojisi: 11.1
Alazlar 21%  Bozkırlar 21%  Ovalılar 25%  Yabanlar 21%  Denizoğulları 13%
```

Denizoğulları %13'te kalıyor — balıkçılık ekonomisi diğerlerinden zayıf. Bu, "liman
maliyetini düşür" ya da "su karelerini artır" denemesi yapıp tekrar ölçmen gereken bir
şey. Testin varlık sebebi tam olarak bu.

---

## Bilinen sınırlar

- Arayüz `OnGUI` ile çiziliyor. Hızlı ve sahne kurulumu istemiyor ama üretim kalitesinde
  değil; ciddileşince uGUI veya UI Toolkit'e taşımak gerekir. Oyun mantığı buna bağlı değil.
- Kod içindeki metinlerde Türkçe karakter kullanılmadı (ğ, ş, ı yerine g, s, i). Unity
  UTF-8 destekliyor, istersen `GameData.cs` ve `GameHUD.cs` içindeki metinleri düzeltebilirsin;
  yalnızca dosyaları UTF-8 olarak kaydet.
- Kaydetme/yükleme yok, ses yok, animasyon yok. Birimler ışınlanıyor.
- Yapay zekâ tek katmanlı: hedefi seçip yaklaşıyor, kârlıysa vuruyor. Uzun vadeli planı yok.

# Metadata tablo çözümü

```
{
  "file_bytes": 19293888,
  "magic": "0xfab11baf",
  "version": 39,
  "lit_off": 380,
  "lit_size": 289888,
  "data_off": 72472,
  "data_size": 290268,
  "str_off": 1919309,
  "str_size": 72471
}
```

## Dizgi ofsetleri

| Dizgi | Geçiş | Ofsetler |
|---|---|---|
| `You went to the witch doctor, who says you have V.` | 1 | [295674] |
| `Your teacher sent you to the principal's office!` | 1 | [297010] |
| `I began training to be an astronaut at the ` | 1 | [299057] |
| `Astronaut` | 864 | [628282, 628291, 628309, 628326] |
| `You are a strict JSON translation engine` | 1 | [297485] |
| `Space Academy` | 13 | [317626, 317640, 317699, 317757] |

## Tablo çözümleri

| Sıra | Taban | Tutan | Toplam |
|---|---|---|---|
| len,idx | zero | 0 | 6 |
| len,idx | data_off | 0 | 6 |
| len,idx | lit_off | 0 | 6 |
| len,idx | str_off | 0 | 6 |
| idx,len | zero | 0 | 6 |
| idx,len | data_off | 1 | 6 |
| idx,len | lit_off | 0 | 6 |
| idx,len | str_off | 0 | 6 |

## Çevre dizgileri

| Dizgi | Ofset | Başlangıç | Boy |
|---|---|---|---|
| `You went to the witch doctor, who says you have V.` | 295674 | 295578 | 247 |
| `Your teacher sent you to the principal's office!` | 297010 | 296914 | 240 |
| `I began training to be an astronaut at the ` | 299057 | 298961 | 235 |
| `Astronaut` | 628282 | 628186 | 201 |
| `Astronaut` | 628291 | 628195 | 201 |
| `You are a strict JSON translation engine` | 297485 | 297389 | 232 |
| `Space Academy` | 317626 | 317530 | 205 |
| `Space Academy` | 317640 | 317544 | 205 |


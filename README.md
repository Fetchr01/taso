# Taso

Taso on avoin videoformaatti ja soitin, jossa videon päällä oleva sisältö pysyy datana.
Komennot kopioituvat, linkit avautuvat, kuvat latautuvat täysikokoisina, teksti on terävää
kaikilla näytöillä. Katsojan ei tarvitse pysäyttää videota ja kirjoittaa mitään käsin.

Video on vain pohjakerros. Kaikki muu on **tasoja**.

## Mitä täällä on

| Hakemisto | Sisältö | Tila |
|---|---|---|
| `spec/` | Formaatin määrittely: JSON Schema ja esimerkkimanifestit | v0.1 luonnos |
| `packages/player/` | `<taso-player>`, upotettava Web Component, ei riippuvuuksia kehyksiin, ~11 kt gz | prototyyppi, toimii demolla |

Tulossa myöhemmin: työpöytäsovellus (nauhoitus, leikkaus, julkaisu) ja renderöijä (tavallinen MP4 samasta projektista).

## Formaatti lyhyesti

Taso-video on **manifesti** (`*.taso.json`), joka viittaa videoon, fontteihin, kuviin ja sisältää
aikaleimatut kohteet:

```json
{
  "id": "cmd-install",
  "type": "command",
  "start": 276200,
  "end": 358000,
  "content": "sudo apt install nginx",
  "box": { "x": 0.06, "y": 0.86, "w": 0.34, "anchor": "bottom-left" },
  "action": { "kind": "copy" }
}
```

- Ajat millisekunteina kokonaislukuina.
- Sijainnit ja koot suhteessa videon kuva-alaan (0–1), joten sama data toimii 720p:ssä ja 4K:ssa.
- `content` on täsmälleen se, mikä kopioituu. Näkyvän ja kopioituvan välillä ei ole koskaan eroa.
- Kohteet ovat DOM-elementtejä soittimessa: terävää tekstiä, valittavaa, saavutettavaa.

Täysi määrittely: [`spec/`](spec/).

## Soitin

```html
<script type="module" src="https://unpkg.com/@taso/player"></script>
<taso-player src="https://example.com/video.taso.json"></taso-player>
```

Soitin näyttää kohteet videon päällä ja videon alla "Nyt ruudulla" -listassa, joka toimii
mobiilissa, näppäimistöllä ja silloin kun kohde ehti jo kadota ruudulta.

Kehitys: [`packages/player/`](packages/player/).

## Lisenssi

MIT. Formaatti on avoin: toteuta soitin, editori tai muunnin vapaasti.

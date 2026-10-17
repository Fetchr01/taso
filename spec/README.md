# Taso-formaatti v0.1 (luonnos)

Kaksi tiedostotyyppiä, sama ydin:

| Tiedosto | Kuka lukee | Sisältö |
|---|---|---|
| `*.taso.json` (`kind: "distribution"`) | soitin | litistetty: yksi video (HLS/MP4), fontit, assetit, kohteet |
| `*.project.json` (`kind: "project"`) | editori | ei-destruktiivinen: lähteet, leikkeet, raidat, kohteet, julkaisuasetukset |

Julkaisu muuntaa projektin jakelumanifestiksi: leikkeet kootaan yhdeksi videoksi, lähdeviitteet
vaihtuvat julkisiksi URL:eiksi, editorin sisäinen tieto (`origin`, `proxy`, `hash`) jää pois.

Skeema: [`schema/distribution.schema.json`](schema/distribution.schema.json)
Esimerkit: [`examples/`](examples/)

## Periaatteet

1. **Sisältö on dataa.** Komento, koodi, linkki ja teksti tallennetaan merkkijonoina, ei kuvina.
   Soitin piirtää ne. Terävyys, kopioitavuus, haku ja saavutettavuus seuraavat tästä.
2. **Näkyvä = kopioituva.** `content` on täsmälleen se, mikä päätyy leikepöydälle. Soitin ei saa
   piilottaa merkkejä, ja renderöijän on näytettävä sama merkkijono.
3. **Soittimen on kestettävä puutteellinen data.** Puuttuva fontti → fallback-pino. Puuttuva kuva →
   placeholder ja alt-teksti. Tuntematon `type` → näytetään tekstinä. Video toistuu aina.
4. **Yksiköt:** aika millisekunteina (kokonaisluku), sijainti suhteessa videon kuva-alaan (0–1),
   koot (fontti, padding, radius) suhteessa videon **korkeuteen**, jotta kuvasuhde ei vaikuta.
5. **Kaikki viitteet ovat URL:eja.** Ei alustakohtaisia tunnisteita. Creator voi hostata videon,
   kuvat ja fontit missä tahansa, joka vastaa CORS-otsakkeilla.

## Kohde (`item`)

| Kenttä | Pakollinen | Merkitys |
|---|---|---|
| `id` | kyllä | yksilöllinen manifestissa |
| `type` | kyllä | `text` `command` `code` `link` `image` `file` `mention` `hotspot` |
| `start`, `end` | kyllä | ms |
| `content` | kyllä | sisältö; komennossa/koodissa kopioituva merkkijono |
| `box` | kyllä | `x y w [h] [anchor] [z]`; ilman `h`:ta korkeus tulee sisällöstä |
| `label` | | lyhyt nimi listaan |
| `style` | | avain `styles`-objektiin |
| `keyframes` | | `[{t, box, ease}]`, liikkuvalle kohteelle |
| `render` | | `false`: vain klikattava alue (hotspot) |
| `action` | | `copy` `open` `expand` `seek` `none`; oletus tyypin mukaan |
| `list` | | näytetäänkö "Nyt ruudulla" -listassa (oletus `true`) |

Tyyppikohtaiset kentät: `link.href`, `image.asset`, `file.asset`, `mention.handle {platform, id}`,
`code.language`, `command.shell`.

Oletustoiminnot: `command`/`code`/`text` → copy, `link`/`mention`/`hotspot` → open, `image`/`file` → expand.

## Turvallisuus

- `mention` ratkaistaan `platform` + `id` -parista soittimen tunnetusta listasta, ei vapaasta URL:sta.
- Linkit avataan `rel="noopener noreferrer"`, ja soitin näyttää kohdedomainin ennen avaamista.
- Kopioitaessa ei koskaan lisätä, poisteta tai muuteta merkkejä. Monirivinen sisältö näytetään
  kokonaan ennen kopiointia.

## Avoimet kysymykset (v0.2)

- `subtitles`-raidan kohteiden muoto (todennäköisesti WebVTT-viite, ei omia kohteita).
- Käännökset: erillinen manifesti per kieli vai `lang`-avaimet kohteissa.
- `terminal`-raita jakelumanifestissa: asciinema v2 -yhteensopiva tapahtumavirta, joka korvaa
  ruutukaappauksen kokonaan.
- Kuvan `box` ilman `h`:ta: korkeus assetin kuvasuhteesta (nykyinen esimerkki laskee sen käsin).

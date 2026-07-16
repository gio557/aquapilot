# voice-transcriber

Sbobina in **testo** una conversazione telefonica (o qualsiasi audio a due voci)
**separando i due interlocutori**. Distingue automaticamente **Uomo** e **Donna**
in base al tono della voce.

Tutto gira **in locale** sul tuo computer ed è **gratuito**: l'audio non viene
caricato da nessuna parte.

Output di esempio:

```
[Uomo]  Pronto, ciao come stai?
[Donna] Ehi! Tutto bene, tu? Allora ci vediamo domani?
[Uomo]  Sì volentieri, verso le otto?
[Donna] Perfetto, a domani!
```

---

## Come funziona

Tre passaggi, tutti con modelli open source:

1. **Trascrizione** — [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
   (il Whisper di OpenAI, molto buono con l'italiano) converte l'audio in testo
   con i tempi di ogni parola.
2. **Diarization** — [pyannote.audio](https://github.com/pyannote/pyannote-audio)
   capisce *chi parla quando* e divide l'audio nei due interlocutori.
3. **Uomo / Donna** — stima del *pitch* (frequenza fondamentale) di ogni voce:
   quella più grave viene etichettata `Uomo`, quella più acuta `Donna`.

> Nota: una telefonata è di solito audio **mono** (le due voci mischiate in
> un'unica traccia), quindi la separazione avviene per *diarization*, non per
> canale. Funziona comunque bene.

---

## Installazione

Serve **Python 3.9+** e **ffmpeg** installato nel sistema.

```bash
# 1. ffmpeg (una volta sola)
#    Ubuntu/Debian:  sudo apt install ffmpeg
#    macOS (brew):   brew install ffmpeg
#    Windows:        https://ffmpeg.org/download.html

# 2. Ambiente Python
cd voice-transcriber
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

La prima volta i modelli (qualche centinaio di MB) vengono scaricati in
automatico e riusati alle esecuzioni successive.

---

## Token Hugging Face (gratuito, una volta sola)

Il modello di diarization di pyannote richiede un token gratuito:

1. Crea un account su https://huggingface.co
2. Accetta le condizioni (basta un click) su queste due pagine:
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0
3. Crea un token in https://huggingface.co/settings/tokens (tipo *Read*)
4. Impostalo come variabile d'ambiente:

```bash
export HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
```

(oppure passalo con `--hf-token hf_xxx` al comando)

---

## Uso

```bash
# base
python transcribe.py conversazione.mp3

# salva su file
python transcribe.py conversazione.mp3 -o trascrizione.txt

# con i tempi (minuto:secondo) davanti a ogni battuta
python transcribe.py conversazione.mp3 --timestamps

# più preciso (ma più lento): modello large
python transcribe.py conversazione.mp3 --model large-v3
```

Formati audio supportati: mp3, wav, m4a, ogg, flac, ... (qualsiasi cosa legga ffmpeg).

### Opzioni utili

| Opzione | Default | Descrizione |
|---|---|---|
| `--model` | `medium` | `tiny`, `base`, `small`, `medium`, `large-v3`. Più grande = più preciso e più lento. |
| `--language` | `it` | Lingua dell'audio. `auto` per rilevarla. |
| `--num-speakers` | `2` | Numero di interlocutori. |
| `--timestamps` | off | Anteponi `mm:ss` a ogni battuta. |
| `--no-gender` | off | Usa `Speaker 1`/`Speaker 2` invece di `Uomo`/`Donna`. |
| `--device` | `auto` | `cpu` o `cuda` (GPU NVIDIA, molto più veloce). |
| `-o, --output` | stdout | File di output. |

---

## Prestazioni

- Su **CPU** funziona ma è lento: con `--model medium` conta all'incirca il
  tempo reale dell'audio o più. Per prove veloci usa `--model small`.
- Con una **GPU NVIDIA** (`--device cuda`) è molto più rapido.

---

## Limiti / note

- L'etichetta **Uomo/Donna** si basa sul pitch: nella grande maggioranza dei casi
  è corretta, ma su voci particolari o audio molto disturbato può sbagliare. In
  quel caso usa `--no-gender` e rinomina tu le due voci.
- Quando le due persone **parlano sopra** (sovrapposte), la separazione è più
  difficile: è un limite intrinseco della diarization.
- Audio pulito = risultati migliori. Le telefonate hanno banda ridotta, quindi
  un modello più grande (`--model large-v3`) aiuta sulla qualità del testo.

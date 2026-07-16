#!/usr/bin/env python3
"""
Sbobina una conversazione telefonica (o qualsiasi audio a due voci) in testo,
separando i due interlocutori.

Pipeline (tutto in locale, gratuito):
  1. Trascrizione   -> faster-whisper (Whisper di OpenAI, ottimo con l'italiano)
  2. Diarization    -> pyannote.audio (capisce "chi parla quando")
  3. Etichettatura  -> stima del pitch (F0) per assegnare Uomo / Donna

Output: testo semplice, una battuta per riga:
  [Uomo]  Pronto, ciao...
  [Donna] Ehi, allora ci vediamo...

Uso:
  python transcribe.py conversazione.mp3
  python transcribe.py conversazione.wav --model medium --output out.txt

Vedi README.md per l'installazione e per il token (gratuito) di Hugging Face.
"""

import argparse
import os
import sys
from collections import defaultdict


# --------------------------------------------------------------------------- #
# 1. Trascrizione
# --------------------------------------------------------------------------- #
def transcribe(audio_path, model_size, language, device, compute_type):
    """Ritorna una lista di parole con timestamp: [{start, end, text}, ...]."""
    from faster_whisper import WhisperModel

    print(f"[1/3] Trascrizione con Whisper ({model_size}, device={device})...",
          file=sys.stderr)
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    segments, info = model.transcribe(
        audio_path,
        language=language,
        word_timestamps=True,   # servono per allineare parole <-> speaker
        vad_filter=True,        # taglia i silenzi, migliora l'allineamento
    )

    words = []
    for seg in segments:
        if seg.words:
            for w in seg.words:
                text = w.word.strip()
                if text:
                    words.append({"start": w.start, "end": w.end, "text": text})
        else:
            text = seg.text.strip()
            if text:
                words.append({"start": seg.start, "end": seg.end, "text": text})

    print(f"      Lingua rilevata: {info.language} "
          f"(prob. {info.language_probability:.2f}), "
          f"{len(words)} parole.", file=sys.stderr)
    return words


# --------------------------------------------------------------------------- #
# 2. Diarization (chi parla quando)
# --------------------------------------------------------------------------- #
def diarize(audio_path, hf_token, num_speakers):
    """Ritorna i turni di parola: [{start, end, speaker}, ...]."""
    import torch
    from pyannote.audio import Pipeline

    print("[2/3] Diarization con pyannote (chi parla quando)...", file=sys.stderr)
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=hf_token,
    )
    if pipeline is None:
        raise RuntimeError(
            "Impossibile caricare il modello pyannote. Controlla il token di "
            "Hugging Face e di aver accettato le condizioni del modello "
            "(vedi README.md)."
        )

    if torch.cuda.is_available():
        pipeline.to(torch.device("cuda"))

    # num_speakers=2 aiuta molto: sappiamo che sono due persone.
    diarization = pipeline(audio_path, num_speakers=num_speakers)

    turns = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        turns.append({"start": turn.start, "end": turn.end, "speaker": speaker})
    turns.sort(key=lambda t: t["start"])
    print(f"      Trovati {len({t['speaker'] for t in turns})} interlocutori, "
          f"{len(turns)} turni.", file=sys.stderr)
    return turns


def assign_speakers(words, turns):
    """Assegna a ogni parola lo speaker con cui si sovrappone di piu' nel tempo."""
    for w in words:
        best_speaker, best_overlap = None, 0.0
        for tr in turns:
            overlap = min(w["end"], tr["end"]) - max(w["start"], tr["start"])
            if overlap > best_overlap:
                best_overlap, best_speaker = overlap, tr["speaker"]
        if best_speaker is None and turns:
            # nessuna sovrapposizione: prendi il turno col centro piu' vicino
            mid = (w["start"] + w["end"]) / 2.0
            best_speaker = min(
                turns, key=lambda tr: abs(mid - (tr["start"] + tr["end"]) / 2.0)
            )["speaker"]
        w["speaker"] = best_speaker or "SPEAKER_00"
    return words


# --------------------------------------------------------------------------- #
# 3. Etichettatura Uomo / Donna tramite pitch (F0)
# --------------------------------------------------------------------------- #
def label_by_gender(audio_path, turns):
    """
    Stima il pitch medio (F0) di ogni speaker e mappa:
      pitch piu' basso  -> Uomo
      pitch piu' alto   -> Donna
    Ritorna un dizionario {speaker_id: "Uomo"|"Donna"|...}.
    """
    try:
        import librosa
        import numpy as np
    except ImportError:
        print("      (librosa non disponibile: salto l'etichettatura Uomo/Donna)",
              file=sys.stderr)
        return {}

    print("[3/3] Stima del pitch per distinguere Uomo/Donna...", file=sys.stderr)
    sr = 16000
    y, _ = librosa.load(audio_path, sr=sr, mono=True)

    # F0 su tutto il segnale (voce umana ~65-300 Hz).
    f0, _, _ = librosa.pyin(y, fmin=65, fmax=300, sr=sr)
    times = librosa.times_like(f0, sr=sr)

    # turni ordinati -> assegnazione rapida frame -> speaker
    turns_sorted = sorted(turns, key=lambda t: t["start"])
    f0_by_speaker = defaultdict(list)
    idx = 0
    for t, f in zip(times, f0):
        if f is None or np.isnan(f):
            continue
        while idx < len(turns_sorted) and turns_sorted[idx]["end"] < t:
            idx += 1
        # cerca un turno che contenga t a partire da idx
        j = idx
        speaker = None
        while j < len(turns_sorted) and turns_sorted[j]["start"] <= t:
            if turns_sorted[j]["start"] <= t <= turns_sorted[j]["end"]:
                speaker = turns_sorted[j]["speaker"]
                break
            j += 1
        if speaker is not None:
            f0_by_speaker[speaker].append(float(f))

    medians = {sp: float(np.median(v)) for sp, v in f0_by_speaker.items() if v}
    if len(medians) < 2:
        return {}

    ordered = sorted(medians.items(), key=lambda kv: kv[1])  # dal piu' grave
    labels = {ordered[0][0]: "Uomo", ordered[-1][0]: "Donna"}
    for sp in medians:
        labels.setdefault(sp, f"Voce {sp}")
    for sp, med in sorted(medians.items(), key=lambda kv: kv[1]):
        print(f"      {sp}: F0 medio {med:.0f} Hz -> {labels[sp]}", file=sys.stderr)
    return labels


# --------------------------------------------------------------------------- #
# Composizione output
# --------------------------------------------------------------------------- #
def group_utterances(words):
    """Raggruppa parole consecutive dello stesso speaker in una battuta."""
    utterances = []
    for w in words:
        if utterances and utterances[-1]["speaker"] == w["speaker"]:
            utterances[-1]["text"] += " " + w["text"]
            utterances[-1]["end"] = w["end"]
        else:
            utterances.append({
                "speaker": w["speaker"],
                "start": w["start"],
                "end": w["end"],
                "text": w["text"],
            })
    return utterances


def render(utterances, labels, show_time):
    lines = []
    width = max((len(labels.get(u["speaker"], u["speaker"])) for u in utterances),
                default=0)
    for u in utterances:
        name = labels.get(u["speaker"], u["speaker"])
        tag = f"[{name}]".ljust(width + 2)
        text = " ".join(u["text"].split())
        if show_time:
            ts = f"{int(u['start']//60):02d}:{int(u['start']%60):02d}"
            lines.append(f"{ts} {tag} {text}")
        else:
            lines.append(f"{tag} {text}")
    return "\n".join(lines)


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def main():
    parser = argparse.ArgumentParser(
        description="Sbobina una conversazione a due voci separando gli interlocutori."
    )
    parser.add_argument("audio", help="file audio (mp3, wav, m4a, ...)")
    parser.add_argument("--model", default="medium",
                        help="modello Whisper: tiny|base|small|medium|large-v3 "
                             "(default: medium)")
    parser.add_argument("--language", default="it",
                        help="lingua dell'audio (default: it). Usa 'auto' per rilevarla.")
    parser.add_argument("--num-speakers", type=int, default=2,
                        help="numero di interlocutori (default: 2)")
    parser.add_argument("--hf-token", default=os.environ.get("HF_TOKEN"),
                        help="token Hugging Face (o variabile d'ambiente HF_TOKEN)")
    parser.add_argument("--device", default="auto",
                        help="auto|cpu|cuda (default: auto)")
    parser.add_argument("--output", "-o", help="scrivi il risultato su file")
    parser.add_argument("--timestamps", action="store_true",
                        help="anteponi il minuto:secondo a ogni battuta")
    parser.add_argument("--no-gender", action="store_true",
                        help="non etichettare Uomo/Donna, usa Speaker 1/2")
    args = parser.parse_args()

    if not os.path.isfile(args.audio):
        sys.exit(f"Errore: file non trovato: {args.audio}")

    # scelta device / compute_type
    device = args.device
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    language = None if args.language == "auto" else args.language

    if not args.hf_token:
        sys.exit(
            "Errore: manca il token di Hugging Face.\n"
            "E' gratuito. Vedi README.md (sezione 'Token Hugging Face').\n"
            "Poi: export HF_TOKEN=hf_xxx   oppure   --hf-token hf_xxx"
        )

    words = transcribe(args.audio, args.model, language, device, compute_type)
    if not words:
        sys.exit("Nessun parlato riconosciuto nell'audio.")

    turns = diarize(args.audio, args.hf_token, args.num_speakers)
    words = assign_speakers(words, turns)

    if args.no_gender:
        speakers = sorted({w["speaker"] for w in words})
        labels = {sp: f"Speaker {i + 1}" for i, sp in enumerate(speakers)}
    else:
        labels = label_by_gender(args.audio, turns)

    utterances = group_utterances(words)
    text = render(utterances, labels, args.timestamps)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text + "\n")
        print(f"\nScritto su {args.output}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()

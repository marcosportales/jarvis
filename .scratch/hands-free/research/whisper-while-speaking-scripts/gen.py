"""Generate Spanish test speech with Kokoro on Nan (em_alex), one WAV per paragraph, then concatenate.

Usage: python3 -I gen.py OUT_DIR
"""
import json
import subprocess
import sys
import time

sys.path.insert(0, __file__.rsplit("/", 1)[0])
import nan  # noqa: E402

PARAS = [
    "Hola Jarvis, buenos días. Quería pedirte que me ayudes a organizar la semana, porque tengo bastantes cosas pendientes y no sé muy bien por dónde empezar.",
    "El lunes tengo una reunión con el equipo de diseño a las diez de la mañana, y después tengo que llamar al dentista para cambiar la cita del jueves, que me coincide con otra cosa.",
    "El martes quiero ir al gimnasio temprano, antes del trabajo, y por la tarde tengo que terminar el informe trimestral que me pidió Lucía. Recuérdame también comprar leche, pan y huevos.",
    "El miércoles es el cumpleaños de mi hermana Carmen. Todavía no le he comprado nada, así que me gustaría que me sugirieras algún regalo: le gustan los libros de historia, la jardinería y el café de especialidad.",
    "Además, necesito revisar el correo de Ignacio sobre el presupuesto del proyecto de Valencia. Creo que había un error en la partida de transporte, unos tres mil cuatrocientos euros de diferencia.",
    "Por cierto, ¿qué tiempo va a hacer el fin de semana en Madrid? Estaba pensando en salir a la sierra el sábado con unos amigos, pero si llueve prefiero quedarme en casa leyendo.",
    "Y una última cosa: apúntame que el viernes a las siete y media de la tarde tengo cena con Javier y Marta en el restaurante del barrio de Salamanca. No quiero olvidarme otra vez.",
]


def main(out):
    files = []
    for i, text in enumerate(PARAS):
        body = json.dumps({"model": "kokoro", "voice": "em_alex", "input": text, "response_format": "wav"}).encode()
        t = time.time()
        s, h, b = nan.req("/audio/speech", body, {"Content-Type": "application/json"})
        print(i, s, len(b), f"{time.time()-t:.2f}s", h.get("Content-Type"))
        if s != 200:
            print(b[:300])
            sys.exit(1)
        p = f"{out}/p{i}.wav"
        open(p, "wb").write(b)
        files.append(p)
        time.sleep(4.5)  # Kokoro: 15 req/min
    open(f"{out}/PARAS.json", "w").write(json.dumps(PARAS, ensure_ascii=False, indent=1))
    lst = f"{out}/list.txt"
    open(lst, "w").write("".join(f"file '{p}'\nfile '{out}/gap.wav'\n" for p in files))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.4", f"{out}/gap.wav"], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-ar", "16000", "-ac", "1", f"{out}/long.wav"], check=True)
    print(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{out}/long.wav"], capture_output=True, text=True).stdout)


if __name__ == "__main__":
    main(sys.argv[1])

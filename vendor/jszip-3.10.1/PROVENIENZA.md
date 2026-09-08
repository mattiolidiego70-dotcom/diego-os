# JSZip 3.10.1 — copia vendorizzata, non installata

**Perché è qui.** La pagina Spesa produce un `.xlsx` VERO: un file .xlsx è uno ZIP
di parti XML, e serve uno scrittore di ZIP. Il file non si scarica dalla rete a
runtime (nessun CDN: sarebbe una dipendenza esterna sul percorso di un download
autenticato) e non si è installato niente: la copia viene da un pacchetto già
presente nella cache npx della macchina.

| | |
|---|---|
| origine | `/Users/diegomattioli/.npm/_npx/4b4c857f6efdfb61/node_modules/jszip` |
| versione | 3.10.1 (da `package.json` del pacchetto) |
| file copiato | `dist/jszip.min.js` |
| sha256 | `acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e` |
| licenza | MIT **oppure** GPLv3, a scelta di chi la usa (`LICENSE.markdown`, copiato accanto) |
| autore | Stuart Knightley e collaboratori |

**Deploy.** È un file statico: va copiato nel repo pubblico `diego-os` insieme a
`spesa.html`, nello stesso percorso relativo `vendor/jszip-3.10.1/jszip.min.js`.
Nessuna dipendenza nuova per le edge function: `health-app` e `health-ask` non
importano niente di nuovo.

**Se cambia.** L'hash sopra è quello che il banco della Spesa verifica prima di
servire il file al browser di prova: un file diverso ferma il banco invece di
provare qualcosa che non è quello che va in produzione. Aggiornando la libreria
si aggiornano INSIEME file e hash, mai l'uno senza l'altro.

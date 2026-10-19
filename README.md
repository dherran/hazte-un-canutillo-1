# 🎩 Hazte un canutillo

**Un concurso multijugador de preguntas, apuestas y estrategia para jugar en grupo.**

Los participantes responden desde sus móviles y siguen el desarrollo de la partida en una pantalla de televisión o en el portátil del presentador. El objetivo es superar las preguntas y conservar canutillos hasta el final.

## 🚀 Acceder al juego

| Acceso | Enlace |
| --- | --- |
| 📺 **Televisión / Presentador** | **[Abrir modo televisión](https://hazte-un-canutillo-1.netlify.app/?modo=tv)** |
| 📱 **Concursantes / Móviles** | **[Entrar a jugar](https://hazte-un-canutillo-1.netlify.app/)** |
| 💻 **Código del proyecto** | [Repositorio en GitHub](https://github.com/dherran/hazte-un-canutillo-1) |

> **Guarda este repositorio en favoritos:** los enlaces anteriores estarán siempre a mano desde aquí, mientras el sitio siga publicado en esa dirección de Netlify.

## 🎮 Cómo jugar

1. Abre el **modo televisión** en un portátil o una pantalla grande.
2. Cada concursante entra desde su móvil, escribe su nombre y pulsa **«Estoy listo»**.
3. El presentador puede comenzar con **1 a 9 jugadores**; cuando los **10 concursantes** estén preparados, la partida puede iniciarse automáticamente.
4. En cada ronda, los participantes distribuyen sus canutillos entre las respuestas que consideren correctas.
5. Los canutillos **no apostados se queman**. La cantidad apostada a la respuesta correcta determina el saldo que se conserva según las reglas de la ronda.
6. Quien termine una ronda con **0 canutillos** queda eliminado y deja de intervenir en las votaciones y apuestas posteriores.
7. La partida continúa hasta su desenlace o hasta que todos los concursantes queden eliminados.

## ✨ Características

- 👥 **De 1 a 10 concursantes**, con acceso individual desde el móvil.
- 📺 **Pantalla de presentador** con seguimiento de la partida.
- 🧠 **15 rondas**, divididas por dificultad:
  - **Rondas 1–5:** preguntas fáciles.
  - **Rondas 6–10:** preguntas medias.
  - **Rondas 11–15:** preguntas difíciles.
- 📚 **150 preguntas** en el banco actual: 50 fáciles, 50 medias y 50 difíciles.
- 💰 **Apuestas limitadas al saldo disponible**, sin cantidades negativas.
- 🔥 **Los canutillos que no se apuesten se pierden**.
- 💀 **Eliminación automática** al quedarse sin canutillos.
- 🔄 **Re-roll** con votación de los concursantes que siguen en juego; si solo queda uno, no necesita votos de eliminados.
- ♻️ **Reinicio de partida** desde la pantalla del presentador para jugar otra vez o incorporar nuevos participantes.
- 📱 Interfaz adaptada para escribir apuestas desde el móvil.

## 🛠️ Tecnologías

- **HTML, CSS y JavaScript:** interfaz del juego.
- **Netlify:** alojamiento de la web y funciones del servidor.
- **Netlify Functions:** lógica compartida de la partida.
- **Netlify Blobs:** almacenamiento del estado del juego.
- **GitHub:** código fuente y control de versiones.

## 📂 Archivos principales

| Archivo | Función |
| --- | --- |
| `index.html` | Interfaz de concursantes y televisión. |
| `questions.json` | Banco de preguntas y respuestas. |
| `dificultades.json` | Clasificación de las preguntas por nivel. |
| `netlify/functions/game.mjs` | Reglas, apuestas, estados y sincronización. |
| `netlify.toml` | Configuración de publicación y rutas de Netlify. |
| `package.json` | Dependencias del proyecto. |

## 🔧 Actualizar el juego

1. Modifica los archivos del repositorio.
2. Confirma los cambios en GitHub mediante **Commit changes** (o integra una *pull request*).
3. Si el repositorio está conectado a Netlify con despliegue automático, espera a que termine la publicación.
4. Comprueba la actualización desde los enlaces de **televisión** y **concursantes** indicados arriba.

**Importante:** al ampliar o reorganizar preguntas, conserva sus identificadores y el orden de las preguntas antiguas para no desajustar el historial de preguntas usadas.

## ⚠️ Notas

Este es un proyecto de juego privado en evolución. Conviene probar las actualizaciones con varios dispositivos antes de una partida completa. El almacenamiento compartido mediante Netlify Blobs puede presentar conflictos ante acciones simultáneas; además, el proyecto no cuenta con autenticación fuerte para el presentador.

---

**🎉 ¡Reúne a tus concursantes y hazte un canutillo!**

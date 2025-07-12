// Variables globales
let songs = [],
    current = [],
    comparisonCount = 0;

// Elementos DOM
const importMenu = document.getElementById("importMenu");
const votingScreen = document.getElementById("votingScreen");
const rankingScreen = document.getElementById("rankingScreen");
const rankingList = document.getElementById("ranking");
const finishVotingBtn = document.getElementById("finishVotingBtn");
const countSpan = document.getElementById("count");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const backToMenuFromRankingBtn = document.getElementById("backToMenuFromRankingBtn");
const seguirVotandoBtn = document.getElementById("seguirVotandoBtn");
const exportarRankingBtn = document.getElementById("exportarRankingBtn");
const spotifyCsvMsg = document.getElementById("spotifyCsvMsg");
const youtubeJSONMsg = document.getElementById("youtubeJSONMsg");

const fileInput = document.getElementById("fileInput");
const loadSpotifyCSV = document.getElementById("loadSpotifyCSV");
const loadRanking = document.getElementById("loadRanking");

const btnYoutube = document.getElementById("btnYoutube");
const btnSpotify = document.getElementById("btnSpotify");
const btnImportPlaylist = document.getElementById("btnImportPlaylist");
const btnSpotifyPlaylist = document.getElementById("btnSpotifyPlaylist");
const btnLoadRanking = document.getElementById("btnLoadRanking");

btnImportPlaylist.style.display = "none";
btnSpotifyPlaylist.style.display = "none";

// Muestra solo menú de importación
function showImportMenu() {
    importMenu.classList.remove("hidden-screen");
    votingScreen.classList.add("hidden-screen");
    rankingScreen.classList.add("hidden-screen");
    spotifyCsvMsg.style.display = "none";
    youtubeJSONMsg.style.display = "none";
    btnImportPlaylist.style.display = "none";
    btnSpotifyPlaylist.style.display = "none";
    clearData();
}


// Muestra votación
function showVoting() {
    importMenu.classList.add("hidden-screen");
    votingScreen.classList.remove("hidden-screen");
    rankingScreen.classList.add("hidden-screen");
    pickVideos();
}


// Muestra ranking con sidebar
function showOnlyRanking() {
    importMenu.classList.add("hidden-screen");
    votingScreen.classList.add("hidden-screen");
    rankingScreen.classList.remove("hidden-screen");
    showRanking();
    // Elimina el contenedor fijo si existe
    let actions = document.getElementById("rankingActionsFixed");
    if (actions) actions.remove();
}



// Limpia datos y contadores
function clearData() {
    songs = [];
    current = [];
    comparisonCount = 0;
    countSpan.textContent = comparisonCount;
    rankingList.innerHTML = "";
}

// ------------------------------------------------------
// Eventos botones menú importación
btnYoutube.onclick = () => {
    youtubeJSONMsg.style.display = "block";
    btnImportPlaylist.style.display = "block";
    spotifyCsvMsg.style.display = "none";
    btnSpotifyPlaylist.style.display = "none";
};

btnImportPlaylist.onclick = () => {
    fileInput.click();
};

btnSpotify.onclick = () => {
    btnImportPlaylist.style.display = "none";
    youtubeJSONMsg.style.display = "none";
    spotifyCsvMsg.style.display = "block";
    btnSpotifyPlaylist.style.display = "block";

};

btnSpotifyPlaylist.onclick = () => {
    loadSpotifyCSV.click();
};

btnLoadRanking.onclick = () => {
    loadRanking.click();
};

finishVotingBtn.onclick = () => {
    showOnlyRanking();
};

seguirVotandoBtn.onclick = () => {
    showVoting();
};

exportarRankingBtn.onclick = () => {
    downloadRanking();
};

// ----------------------------------------------------------
//  IMPORTAR YOUTUBE PLAYLIST
// ----------------------------------------------------------

fileInput.addEventListener("change", async (e) => {
    if (!e.target.files.length) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const json = JSON.parse(reader.result);
            if (!json.entries) throw new Error("Formato JSON incorrecto");

            // Filtrar vídeos que no sean "[Private video]"
            const validSongs = json.entries.filter(s => s.title !== "[Private video]").map(s => ({
                title: s.title,
                id: s.id,
                platform: "youtube",
                elo: 1000, // Elo inicial
                coverUrl: `https://img.youtube.com/vi/${s.id}/hqdefault.jpg`,
            }));

            songs = validSongs;
            comparisonCount = 0;
            countSpan.textContent = comparisonCount;

            if (songs.length === 0) {
                alert("No se han encontrado vídeos públicos válidos en la playlist.");
                showImportMenu();
                return;
            }

            showVoting();
        } catch (err) {
            alert("Error leyendo JSON YouTube: " + err.message);
            showImportMenu();
        }
    };
    reader.readAsText(e.target.files[0]);
});




// ----------------------------------------------------------
//  IMPORTAR SPOTIFY CSV
// ----------------------------------------------------------
// Función auxiliar para buscar variantes de nombres de columna
function findColumnIndex(header, variants) {
    for (const variant of variants) {
        const index = header.indexOf(variant);
        if (index !== -1) return index;
    }
    return -1;
}

// Leer archivo CSV Spotify
loadSpotifyCSV.addEventListener("change", (e) => {
    if (!e.target.files.length) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const lines = parseCSV(reader.result);
            if (lines.length === 0) throw new Error("CSV vacío o formato incorrecto");

            const header = lines[0];

            // Buscar columnas con variantes posibles (en inglés y español)
            const titleIndex = findColumnIndex(header, ["Track Name", "Nombre de la canción"]);
            const artistIndex = findColumnIndex(header, ["Artist Name(s)", "Nombre(s) del artista"]);
            const uriIndex = findColumnIndex(header, ["Track URI", "URI de la canción"]);
            const coverUrlIndex = findColumnIndex(header, ["Album Image URL", "URL de la imagen del álbum"]);
            const previewUrlIndex = findColumnIndex(header, ["Track Preview URL", "URL de vista previa de la canción"]);

            // Validación mínima obligatoria
            if (titleIndex === -1 || artistIndex === -1 || uriIndex === -1)
                throw new Error("CSV no válido: faltan columnas obligatorias como nombre, artista o URI.");

            songs = [];

            for (let i = 1; i < lines.length; i++) {
                const row = lines[i];
                if (row.length <= Math.max(titleIndex, artistIndex, uriIndex))
                    continue;

                const title = row[titleIndex];
                const artist = row[artistIndex];
                const uri = row[uriIndex];
                const cover = coverUrlIndex !== -1 ? row[coverUrlIndex] : null;
                const preview = previewUrlIndex !== -1 ? row[previewUrlIndex] : null;

                const match = uri.match(/spotify:track:(\w+)/);
                if (!match) continue;

                songs.push({
                    title: `${title} - ${artist}`,
                    id: match[1],
                    platform: "spotify",
                    elo: 1000, // Elo inicial
                    coverUrl: cover,
                    previewUrl: preview,
                });
            }

            if (songs.length === 0) {
                alert("No se han podido importar canciones. Revisa que el CSV tenga los datos necesarios.");
                return showImportMenu();
            }

            comparisonCount = 0;
            countSpan.textContent = comparisonCount;
            showVoting();
        } catch (err) {
            alert("Error leyendo CSV Spotify: " + err.message);
            showImportMenu();
        }
    };
    reader.readAsText(file);
});

// ----------------------------------------------------------
//  IMPORTAR RANKING EXISTENTE
// ----------------------------------------------------------

document.getElementById("loadRanking").addEventListener("change", (e) => {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const json = JSON.parse(reader.result);
            songs = json.entries.map((entry) => ({
                position: entry.position,
                title: entry.title,
                elo: entry.elo || 1000,
                platform: entry.platform || "youtube",
                coverUrl: entry.coverUrl || null,
                id: entry.id || null,
            }));
            comparisonCount = json.comparisonCount ?? 0;
            showOnlyRanking();
        } catch {
            alert("Archivo JSON inválido");
        }
    };
    reader.readAsText(e.target.files[0]);
});

// ----------------------------------------------------------
//  PARSE CSV (manejo comillas, saltos y comas)
// ----------------------------------------------------------

function parseCSV(str) {
    const rows = [];
    let insideQuote = false;
    let field = "";
    let row = [];

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const nextChar = str[i + 1];

        if (char === '"') {
            if (insideQuote && nextChar === '"') {
                field += '"';
                i++;
            } else {
                insideQuote = !insideQuote;
            }
        } else if (char === "," && !insideQuote) {
            row.push(field);
            field = "";
        } else if ((char === "\n" || char === "\r") && !insideQuote) {
            if (field || row.length > 0) {
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
            }
            if (char === "\r" && nextChar === "\n") {
                i++;
            }
        } else {
            field += char;
        }
    }

    if (field || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

// ----------------------------------------------------------
//  CREAR MINIATURA Y BOTONES DE VOTACIÓN
// ----------------------------------------------------------

function createThumbnailBox(song, containerId, voteIndex) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (song.platform === "youtube") {
        const img = document.createElement("img");
        img.src = `https://img.youtube.com/vi/${song.id}/hqdefault.jpg`;
        img.alt = song.title;
        img.title = "Abrir en YouTube";
        img.onclick = () => window.open(`https://www.youtube.com/watch?v=${song.id}`, "_blank");
        container.appendChild(img);

        const btnEmbed = document.createElement("button");
        btnEmbed.textContent = "Escuchar";
        btnEmbed.className = "btn btn-purple btn-uniform";
        btnEmbed.onclick = () => {
            container.innerHTML = "";
            const iframe = document.createElement("iframe");
            iframe.src = `https://www.youtube.com/embed/${song.id}?autoplay=1`;
            iframe.style.width = "100%";
            iframe.style.aspectRatio = "16 / 9";
            iframe.style.border = "none";
            iframe.style.borderRadius = "8px";
            iframe.allow = "autoplay; encrypted-media";
            iframe.allowFullscreen = true;
            container.appendChild(iframe);

            const backBtn = document.createElement("button");
            backBtn.textContent = "Volver a miniatura";
            backBtn.className = "btn btn-outline-purple btn-uniform";
            backBtn.onclick = () => createThumbnailBox(song, containerId, voteIndex);

            const voteBtn = document.createElement("button");
            voteBtn.textContent = "Me gusta más";
            voteBtn.className = "btn btn-purple btn-uniform";
            voteBtn.onclick = () => vote(voteIndex);

            const btnContainer = document.createElement("div");
            btnContainer.style.marginTop = "10px";
            btnContainer.style.display = "flex";
            btnContainer.style.gap = "10px";

            btnContainer.appendChild(backBtn);
            btnContainer.appendChild(voteBtn);

            container.appendChild(btnContainer);
        };

        const btnVote = document.createElement("button");
        btnVote.textContent = "Me gusta más";
        btnVote.className = "btn btn-purple btn-uniform";
        btnVote.onclick = () => vote(voteIndex);

        const btnRow = document.createElement("div");
        btnRow.style.marginTop = "10px";
        btnRow.style.display = "flex";
        btnRow.style.gap = "10px"

        btnRow.appendChild(btnEmbed);
        btnRow.appendChild(btnVote);

        container.appendChild(btnRow);

    } else if (song.platform === "spotify") {
        // Título de la canción
        const content = document.createElement("div");
content.className = "thumbnail-content";

const title = document.createElement("h4");
title.textContent = song.title;
title.className = "video-title";

const img = document.createElement("img");
img.src = song.coverUrl || "https://developer.spotify.com/assets/branding-guidelines/icon3@2x.png";
img.alt = song.title;
img.title = "Abrir en Spotify";
img.style.borderRadius = "8px";
img.style.cursor = "pointer";
img.onclick = () => window.open(`https://open.spotify.com/track/${song.id}`, "_blank");

content.appendChild(title);
content.appendChild(img);
container.appendChild(content);


        // Preview si existe
        if (song.previewUrl) {
            const audio = document.createElement("audio");
            audio.src = song.previewUrl;
            audio.controls = true;
            audio.style.marginTop = "10px";
            audio.style.width = "100%";
            audio.volume = 0.2;
            container.appendChild(audio);
        } else {
            const noPreview = document.createElement("div");
            noPreview.textContent = "No hay preview disponible";
            noPreview.style.marginTop = "10px";
            container.appendChild(noPreview);
        }

        // Botones
        const btnContainer = document.createElement("div");
        btnContainer.style.marginTop = "10px";
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "10px";

        const btnOpen = document.createElement("button");
        btnOpen.textContent = "Abrir en Spotify";
        btnOpen.className = "btn btn-purple btn-uniform";
        btnOpen.onclick = () => window.open(`https://open.spotify.com/track/${song.id}`, "_blank");

        const btnVote = document.createElement("button");
        btnVote.textContent = "Me gusta más";
        btnVote.className = "btn btn-purple btn-uniform";
        btnVote.onclick = () => vote(voteIndex);

        btnContainer.appendChild(btnOpen);
        btnContainer.appendChild(btnVote);

        container.appendChild(btnContainer);
    }

}

// ----------------------------------------------------------
//  SELECCIONAR Y VOTAR CANCIONES
// ----------------------------------------------------------


function pickVideos() {
    let a = Math.floor(Math.random() * songs.length);
    let b;
    do {
        b = Math.floor(Math.random() * songs.length);
    } while (b === a);
    current = [songs[a], songs[b]];
    createThumbnailBox(current[0], "boxA", 0);
    createThumbnailBox(current[1], "boxB", 1);
}

function vote(winnerIndex) {
  const loserIndex = winnerIndex === 0 ? 1 : 0;

  const winner = current[winnerIndex];  
  const loser = current[loserIndex];

  // Elo update
  const winnerOld = winner.elo;
  const loserOld = loser.elo;
  winner.elo = Elo.getNewRating(winnerOld, loserOld, 1);
  loser.elo = Elo.getNewRating(loserOld, winnerOld, 0);

  comparisonCount++;
  document.getElementById("count").textContent = comparisonCount;

  pickVideos();
}

function showRanking(scrollTop = 0) {
    // Ordena por rating Elo
    songs.sort((a, b) => b.elo - a.elo);

    const container = document.getElementById("ranking");
    container.innerHTML = ""; // limpiar sin borrar los botones fuera
const heading = document.createElement("h2");
heading.className = "mb-4";
heading.textContent = "Ranking final (usa las flechas para reordenar)";
container.appendChild(heading);

    // Contenedor scrollable con tamaño fijo (puedes ajustar altura)
    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "scroll-wrapper";
    scrollWrapper.style.maxHeight = "70vh"; // altura fija máxima
    scrollWrapper.style.overflowY = "auto";
    scrollWrapper.style.paddingRight = "10px"; // para que no choque con scrollbar

    // Contenedor grid Bootstrap: row con columnas responsivas
    const rowDiv = document.createElement("div");
    rowDiv.className = "row g-3 px-3 py-2"; // padding para que no esté pegado al borde

    songs.forEach((song, i) => {
        const colDiv = document.createElement("div");
        colDiv.className = "col-12 col-sm-6 col-md-4 col-lg-3 ranking-card";

        const card = document.createElement("div");
        card.className = "d-flex flex-column align-items-center text-center p-3";
        card.style.border = `1px solid var(--purple)`;
        card.style.borderRadius = "0.5rem";
        card.style.background = "var(--dark)";
        card.style.boxShadow = `0 0 12px var(--btn-hover) inset`;
        card.style.color = "var(--text-light)";
        card.style.minHeight = "260px";

        const img = document.createElement("img");
        if (song.platform === "spotify") {
            img.src = song.coverUrl || "https://developer.spotify.com/assets/branding-guidelines/icon3@2x.png";
        } else {
            img.src = `https://img.youtube.com/vi/${song.id}/hqdefault.jpg`;
        }
        img.alt = song.title;
        img.style.width = "180px";
        img.style.height = "102px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "0.375rem";
        img.style.cursor = "pointer";
        img.onclick = () => {
            if (song.platform === "spotify") {
                window.open(`https://open.spotify.com/track/${song.id}`, "_blank");
            } else {
                window.open(`https://www.youtube.com/watch?v=${song.id}`, "_blank");
            }
        };
        card.appendChild(img);
        
        const titleSpan = document.createElement("span");
        titleSpan.textContent = `${i + 1}. ${song.title}`;
        titleSpan.className = "ranking-title"; 
        card.appendChild(titleSpan);

        const eloSpan = document.createElement("span");
        eloSpan.textContent = `Elo: ${song.elo.toFixed(0)}`;
        eloSpan.style.color = "var(--btn-hover)"; // o cualquier color que te guste
        eloSpan.style.fontSize = "0.9rem";
        eloSpan.style.marginBottom = "8px";
        card.appendChild(eloSpan);

        const btnRow = document.createElement("div");
        btnRow.className = "d-flex justify-content-center align-items-center gap-3 mb-0";

        // Botón izquierda
        const leftBtn = document.createElement("button");
        leftBtn.type = "button";
        leftBtn.className = "btn btn-outline-purple btn-uniform";
        leftBtn.disabled = i === 0;
        leftBtn.innerHTML = "";
        leftBtn.onclick = () => {
            if (i > 0) {
                const scrollWrapper = document.querySelector(".scroll-wrapper");
                const currentScroll = scrollWrapper ? scrollWrapper.scrollTop : 0;

                const cards = document.querySelectorAll(".ranking-card");
                cards[i].classList.add("card-anim-left");
                cards[i - 1].classList.add("card-anim-right");

                setTimeout(() => {
                    [songs[i - 1], songs[i]] = [songs[i], songs[i - 1]];
                    const tempElo = songs[i].elo;
                    songs[i].elo = songs[i - 1].elo;
                    songs[i - 1].elo = tempElo;
                    showRanking(currentScroll);
                }, 300);
            }
        };
        btnRow.appendChild(leftBtn);

        // Icono plataforma
        const platformIcon = document.createElement("span");
        platformIcon.style.cursor = "pointer";
        platformIcon.title = song.platform === "spotify" ? "Abrir en Spotify" : "Abrir en YouTube";
        platformIcon.style.fontSize = "1.5rem";
        platformIcon.className = "mx-2";
        if (song.platform === "spotify") {
            platformIcon.innerHTML = '<i class="fa fa-spotify" style="color:#1DB954; font-size: 42px;"></i>';
            platformIcon.onclick = () =>
                window.open(`https://open.spotify.com/track/${song.id}`, "_blank");
        } else {
            platformIcon.innerHTML = '<i class="fa fa-youtube-play" style="color:red; font-size: 42px;"></i>';
            platformIcon.onclick = () =>
                window.open(`https://www.youtube.com/watch?v=${song.id}`, "_blank");
        }

        btnRow.appendChild(platformIcon);

        // Botón derecha
        const rightBtn = document.createElement("button");
        rightBtn.type = "button";
        rightBtn.className = "btn btn-outline-purple btn-uniform";
        rightBtn.disabled = i === songs.length - 1;
        rightBtn.innerHTML = "";
        rightBtn.onclick = () => {
            if (i < songs.length - 1) {
                const scrollWrapper = document.querySelector(".scroll-wrapper");
                const currentScroll = scrollWrapper ? scrollWrapper.scrollTop : 0;

                const cards = document.querySelectorAll(".ranking-card");
                cards[i].classList.add("card-anim-right");
                cards[i + 1].classList.add("card-anim-left");

                setTimeout(() => {
                    [songs[i], songs[i + 1]] = [songs[i + 1], songs[i]];
                    const tempElo = songs[i].elo;
                    songs[i].elo = songs[i + 1].elo;
                    songs[i + 1].elo = tempElo;
                    showRanking(currentScroll);
                }, 300);
            }
        };
        btnRow.appendChild(rightBtn);

        card.appendChild(btnRow);
        colDiv.appendChild(card);
        rowDiv.appendChild(colDiv);
    });

    scrollWrapper.appendChild(rowDiv);
    container.appendChild(scrollWrapper);

    // Restaurar scroll justo después de renderizar el DOM
    if (scrollTop) {
        // Esperar el siguiente frame para asegurar renderizado
        requestAnimationFrame(() => {
            const scrollWrapperEl = document.querySelector(".scroll-wrapper");
            if (scrollWrapperEl) {
                scrollWrapperEl.scrollTop = scrollTop;
                // console.log("Scroll restaurado a", scrollTop);
            }
        });
    }
}



function downloadRanking() {
    const data = {
        comparisonCount,
        entries: songs.map((s, i) => ({
            position: i + 1,
            title: s.title,
            id: s.id,
            elo: s.elo || 1000,
            platform: s.platform || "youtube",
            coverUrl: s.coverUrl || null,
        })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ranking_completo.json";
    a.click();
}
// ------------------------------------------------------
// Botones volver a menú
backToMenuBtn.onclick = showImportMenu;
backToMenuFromRankingBtn.onclick = showImportMenu;

// ------------------------------------------------------
// Inicializar con menú importación
showImportMenu();
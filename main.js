// todo: store in json
// todo: gestion point "manigance"

// --- Configuration et données ---
const playerCount = 4;
const maxRounds = 4;
let objectiveRange = 10;

let champions = [
    {name:""}
];
let bonus = [];
let malus = [];


// --- Etat de la partie ---
let players = [];       // contient {nom, score} des joueurs
let roundNumber = 1;    // manche en cours
let round = null;            
let debateTimerInterval = null;


// --- Evenements de la page ---
document.getElementById("setupPlayer").addEventListener("submit", async event => {
    document.getElementById("title").classList.add("hidden");

    event.preventDefault(); // empeche reload de la page

    const formData = new FormData(event.currentTarget);

    // chaque joueur garde son score d'une manche à l'autre
    players = Array.from({ length: playerCount }, (_, index) => ({
        name: String(formData.get(`player${index + 1}`)).trim() || `Joueur ${index + 1}`,
        score: 0
    }));

    console.log("SET OF PLAYERS :");
    console.log(players);

    try {
        await loadData();
    } 
    catch (error) {
        console.error(error);
        alert("Impossible de charger les données du jeu.");
        return;
    }

    roundNumber = 1;
    document.getElementById("setupPanel").classList.add("hidden");
    document.getElementById("gamePanel").classList.remove("hidden");
    startRound();
});

document.getElementById("newGame").addEventListener("click", () => {
    clearDebateInterval();
    document.getElementById("gamePanel").classList.add("hidden");
    document.getElementById("setupPanel").classList.remove("hidden");
});

document.getElementById("openScores").addEventListener("click", () => {
    document.getElementById("scoresDialog").showModal();
});

document.getElementById("closeScores").addEventListener("click", () => {
    document.getElementById("scoresDialog").close();
});

// Bouton "je suis pret" de l'overlay
document.getElementById("readyForTurn").addEventListener("click", () => {
    round.ready = true;
    document.getElementById("turnOverlay").close();
    renderTurn();
});

document.getElementById("turnOverlay").addEventListener("cancel", event => {
    event.preventDefault();
});



// --- Game logic ---

// todo: attribuer différents niveaux de bonus/malus 
function chooseChampion(roundNumber){
    const selectedChampion = champions[Math.floor(Math.random() * champions.length)];
    
    let coinFlip;
    console.log(roundNumber);

    switch(roundNumber){
        case 1:
            coinFlip = pickRandom(["bonus", "malus"]);
            return {
                ...selectedChampion,
                // 1 bonus ou malus (au hasard)
                modifiers: [
                    { type: coinFlip, name: pickRandom(coinFlip === "bonus" ? bonus : malus).name }, 

                ]
   
            };
                
        case 2:
            return {
                ...selectedChampion,
                // 1 bonus et 1 malus
                modifiers: [
                    { type: "bonus", name: pickRandom(bonus).name },
                    { type: "malus", name: pickRandom(malus).name }
                ]
            };
                
        default:
            coinFlip = pickRandom(["bonus", "malus"]);
            return {
                ...selectedChampion,
                // 1 bonus, 1 malus, et un au hasard
                modifiers: [
                    { type: coinFlip, name: pickRandom(coinFlip === "bonus" ? bonus : malus).name }, 
                    { type: "bonus", name: pickRandom(bonus).name }, 
                    { type: "malus", name: pickRandom(malus).name }, 
                ]
            };
                

    }

}
function startRound() {
    clearDebateInterval();

    // fait tourner le rôle du monarque entre les 4 joueurs
    const monarchIndex = (roundNumber - 1) % playerCount;

    // on garde l'index d'origine pour attribuer les points au bon joueur après le verdict
    const contributors = players
        .map((player, index) => ({ player, index }))
        .filter(entry => entry.index !== monarchIndex);

    const objectiveNumbers = Array.from({ length: objectiveRange }, (_, index) => index + 1);
    const objectives = shuffle(objectiveNumbers);

    // Cette liste garantit un bonus et un malus minimum ; le troisième type est aléatoire.
    const modifierTypes = shuffle(["bonus", "malus", pickRandom(["bonus", "malus"])]);

    round = {
        monarchIndex,
        champion: chooseChampion(roundNumber),
        contributors: contributors.map((entry, index) => ({
            ...entry,
            objective: objectives[index],
            modifierType: modifierTypes[index]
        })),
        currentContributor: 0,
        modifiers: [],
        firstGuess: null,       // premiere estimation du MJ 
        debateTimers: [],
        activeDebateTimerIndex: null,
        // false : l'overlay attend le joueur ; true : il peut saisir.
        ready: false
    };

    console.log(round);

    const turnPanel = document.getElementById("turnPanel");
    

    document.getElementById("roundLabel").textContent = `Manche ${roundNumber}`;
    document.getElementById("introPanel").classList.remove("hidden");
    document.getElementById("turnPanel").classList.remove("hidden");
    document.getElementById("resultPanel").classList.add("hidden");
    document.getElementById("gameTopline").classList.add("hidden");
    document.getElementById("characterSection").classList.add("hidden");
  
    document.getElementById("scorePanel").classList.add("hidden");
    renderScores();
    renderCharacters();

    const monarchDescription = createElement("p", "turn-copy", "");
    monarchDescription.append(
        createElement("strong", "", players[monarchIndex].name),
        document.createTextNode(", tu es le Monarque.")
    );

    turnPanel.replaceChildren(
        createElement("p", "eyebrow", `MANCHES ${roundNumber} SUR ${maxRounds}`),
        createElement("h2", "turn-title", "Le monarque est choisi !"),
        monarchDescription,
        createElement("p", "turn-copy", "Il te revient de gérer les troupes, tes conseillers sont là pour t'aider à faire un choix... qu'il soit bon ou non.")
    );
    turnPanel.append(createElement("button", "button", "Prêt à en découdre !"));

    let beginButton = turnPanel.querySelector("button");
    beginButton.addEventListener("click", () => {
        turnPanel.replaceChildren();
        revealMatch();
    });
}

function revealMatch() {
    document.getElementById("gameTopline").classList.remove("hidden");
    document.getElementById("characterSection").classList.remove("hidden");

    const championDescription = createElement("p", "turn-copy", "");
    championDescription.append(
        document.createTextNode("Vos éclaireurs ont repéré "),
        createElement("strong", "", round.champion.name),
        document.createTextNode(" sur notre territoire. Ils ont rapporté de précieux renseignements tactiques.")
    );

    document.getElementById("introPanel").replaceChildren(
        createElement("p", "eyebrow", `MANCHES ${roundNumber} SUR ${maxRounds}`),
        createElement("h2", "turn-title", "L'intrus est identifié !"),
        championDescription
    );

    // cache panneau ragondin
    document.getElementById("ragondinCharacterPanel").classList.add("hidden");

    const beginButton = makeButton("Demander l'avis des conseillers", () => {
        document.getElementById("introPanel").classList.add("hidden");
        document.getElementById("turnPanel").replaceChildren();
        renderTurn();
    });
    document.getElementById("turnPanel").replaceChildren(beginButton);
}

// --- Affichage ---


function renderCharacters() {
    document.getElementById("championImage").src = "./images/" +round.champion.image;
    document.getElementById("championImage").alt = round.champion.name;
    document.getElementById("championDescription").textContent = round.champion.description;
    document.getElementById("championName").textContent = round.champion.name;

    renderModifierList("championMods", round.champion.modifiers);

    document.getElementById("ragondinImage").src = "./images/ragondin.jpg";
    document.getElementById("ragondinImage").alt = "Ragondins";
    document.getElementById("ragondinDescription").textContent = "Soldat rongeur";
    document.getElementById("ragondinName").textContent = "Les ragondins";
    renderModifierList("ragondinMods", round.modifiers);
}

function renderModifierList(id, modifiers) {
    const list = document.getElementById(id);
    list.replaceChildren();

    if (!modifiers || modifiers.length === 0) {
        list.append(createElement("li", "", "N/A"));
        return;
    }

    // le type devient une classe CSS pour afficher les bonus et malus en couleurs distinctes
    modifiers.forEach(({ name, text, type }) => {
        list.append(createElement("li", type, name ?? text));
    });
}

function renderScores() {
    // les scores sont affichés à deux endroits : dans la fenêtre modale et en fin de manche
    ["scoreList", "modalScoreList"].forEach(id => {
        document.getElementById(id).replaceChildren(...players.map(player => {
            const item = document.createElement("div");
            item.className = "score-item";
            const name = createElement("span", "score-name", player.name);
            const score = createElement("strong", "", player.score);
            item.append(name, score);
            return item;
        }));
    });
}

function renderTurn() {
    document.getElementById("ragondinCharacterPanel").classList.remove("hidden");

    const turnPanel = document.getElementById("turnPanel");
    turnPanel.classList.remove("hidden");
    turnPanel.replaceChildren();

    if (!round.ready) {
        const nextPlayer = round.currentContributor < round.contributors.length
            ? round.contributors[round.currentContributor].player
            : players[round.monarchIndex];
        document.getElementById("turnOverlayTitle").textContent = `Joueur suivant : ${nextPlayer.name}`;
        document.getElementById("turnOverlay").showModal();
        return;
    }

    // Les trois conseillers jouent d'abord ; le monarque intervient quand ils ont tous contribué.
    if (round.currentContributor < round.contributors.length) {
        renderContributorTurn(turnPanel);
    } else if (round.firstGuess === null) {
        renderJudgeTurn(turnPanel);
    } else {
        renderDebateTurn(turnPanel);
    }
}

// --- Tours des joueurs ---

function renderContributorTurn(container) {
    const contributor = round.contributors[round.currentContributor];

    const step = createElement("p", "eyebrow", `CONSEILLER ${round.currentContributor + 1} SUR ${playerCount-1}`);
    const title = createElement("h2", "turn-title", `À toi, ${contributor.player.name}`);

    const description = createElement("p", "turn-copy", "Ajoute un modificateur pour te rapprocher de ton objectif secret.");

    const modifierInstruction = createElement(
        "p",
        `modifier-instruction ${contributor.modifierType}`,
        contributor.modifierType === "malus" ? "Attribue un malus" : "Attribue un bonus"
    );

    container.append(step, title, description, modifierInstruction);

    // L'objectif est révélé seulement après confirmation, pour rester privé des autres joueurs.
    const objective = document.createElement("div");
    objective.className = "objective-box";
    objective.append(createElement("span", "objective-caption", "Objectif secret :"));
    objective.append(createElement("strong", "objective-number", round.contributors[round.currentContributor].objective));
    objective.append(createElement("span", "objective-caption", "ragondins"));

    const form = document.createElement("form");
    form.className = "modifier-form";

    const label = createElement("label", "", "Ton modificateur");

    const input = document.createElement("input");
    input.name = "modifier";
    input.maxLength = 90;
    input.placeholder = contributor.modifierType == "malus" ? "ex: pas de poils" : 'ex: volants';
    input.required = true;
    label.append(input);

    const submitButton = makeButton("Transmettre au suivant", () => {});
    submitButton.type = "submit";
    form.append(label, submitButton);

    form.addEventListener("submit", event => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        // On enregistre le texte et son type avant de passer au conseiller suivant
        round.modifiers.push({ playerIndex: contributor.index, text, type: contributor.modifierType });
        round.currentContributor++;
        round.ready = false;
        renderCharacters();
        renderTurn();
    });
    container.append(objective, form);

    input.focus();
}

function renderDebateTurn(container) {
    container.append(
        createElement("h2", "turn-title", "Débat des conseillers"),
        createElement("p", "turn-copy", `Le monarque a fait sa première estimation, mais arrange-t-elle les conseillers ? Vous pouvez encore tourner le vent en votre faveur.`)
    );


    // --- GESTION DES TIMERS ---
    const timers = createElement("div", "debate-timers", "");
    round.contributors.forEach((contributor, index) => {
        const button = document.createElement("button");
        button.className = "debate-timer";
        button.type = "button";
        button.id = `debateTimer${index}`;
        button.setAttribute("aria-pressed", "false");
        button.append(
            createElement("span", "debate-timer-player", contributor.player.name),
            createElement("strong", "debate-timer-time", "01:00"),
            createElement("span", "debate-timer-action", "Démarrer")
        );
        button.addEventListener("click", () => toggleDebateTimer(index));
        timers.append(button);
    });
    container.append(timers);

    const form = document.createElement("form");
    form.className = "guess-form";

    const label = createElement("label", "", "Estimation finale du monarque");
    const input = document.createElement("input");
    input.type = "number";
    input.name = "guess";
    input.min = "0";
    input.max = "1000000";
    input.step = "1";
    input.required = true;
    input.inputMode = "numeric";
    label.append(input);

    const submitButton = makeButton("Envoyer les troupes !", () => {});
    submitButton.type = "submit";
    form.append(label, submitButton);
    form.addEventListener("submit", event => {
        event.preventDefault();
        const guess = Number(input.value);
        if (!Number.isInteger(guess) || guess < 0) return;
        finishRound(guess);
    });
    container.append(form);
}

function renderJudgeTurn(container) {
    const judge = players[round.monarchIndex];
    container.append(
        createElement("h2", "turn-title", `À toi de trancher, ${judge.name}`),
        document.createTextNode("Tu peux faire une première estimation du nombre de ragondins à envoyer. N'hésite pas à partager ton raisonnement avec tes conseillers "),
        createElement("strong", "", "sans réveler ton nombre"),
        document.createTextNode(".")

    );

    const form = document.createElement("form");
    form.className = "guess-form";

    const label = createElement("label", "", "Combien de ragondins envoyer ?");

    const input = document.createElement("input");
    input.type = "number";
    input.name = "guess";
    input.min = "0";
    input.max = "1000000";
    input.step = "1";
    input.placeholder = "0";
    input.required = true;
    input.inputMode = "numeric";
    label.append(input);

    const submitButton = makeButton("Révéler le résultat", () => {});
    submitButton.type = "submit";

    form.append(label, submitButton);
    form.addEventListener("submit", event => {
        event.preventDefault();
        const guess = Number(input.value);
        if (!Number.isInteger(guess) || guess < 0) return;
        startDebate(guess);
    });

    container.append(form);
    input.focus();
}



// --- DEBATE MANAGEMENT ---
function startDebate(firstGuess) {
    round.firstGuess = firstGuess;
    round.debateTimers = round.contributors.map(() => 60);
    round.activeDebateTimerIndex = null;
    document.getElementById("introPanel").classList.add("hidden");
    document.getElementById("characterSection").classList.remove("hidden");
    document.getElementById("ragondinCharacterPanel").classList.remove("hidden");
    renderTurn();
}

function toggleDebateTimer(index) {
    if (round.debateTimers[index] === 0) return;

    clearDebateInterval();
    if (round.activeDebateTimerIndex === index) {
        round.activeDebateTimerIndex = null;
    } else {
        round.activeDebateTimerIndex = index;
        debateTimerInterval = setInterval(() => {
            round.debateTimers[index] = Math.max(0, round.debateTimers[index] - 1);
            if (round.debateTimers[index] === 0) {
                clearDebateInterval();
                round.activeDebateTimerIndex = null;
            }
            updateDebateTimerButtons();
        }, 1000);
    }
    updateDebateTimerButtons();
}

function clearDebateInterval() {
    if (debateTimerInterval !== null) {
        clearInterval(debateTimerInterval);
        debateTimerInterval = null;
    }
}

function updateDebateTimerButtons() {
    round.contributors.forEach((contributor, index) => {
        const button = document.getElementById(`debateTimer${index}`);
        if (!button) return;

        const seconds = round.debateTimers[index];
        const isActive = round.activeDebateTimerIndex === index;
        button.setAttribute("aria-pressed", String(isActive));
        button.classList.toggle("active", isActive);
        button.disabled = seconds === 0;
        button.querySelector(".debate-timer-time").textContent = formatTimer(seconds);
        button.querySelector(".debate-timer-action").textContent = seconds === 0
            ? "Terminé"
            : isActive ? "Pause" : "Démarrer";
    });
}

function formatTimer(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}


// --- Resultat et attribution des points ---

function finishRound(guess) {
    clearDebateInterval();
    const initialOutcome = getRoundOutcome(round.firstGuess);
    const finalOutcome = getRoundOutcome(guess);
    const initialWinnerIndexes = initialOutcome.winners.map(winner => winner.index).sort((a, b) => a - b);
    const finalWinnerIndexes = finalOutcome.winners.map(winner => winner.index).sort((a, b) => a - b);
    const winnerChanged = initialWinnerIndexes.length !== finalWinnerIndexes.length
        || initialWinnerIndexes.some((index, winnerIndex) => index !== finalWinnerIndexes[winnerIndex]);

    finalOutcome.winners.forEach(winner => {
        players[winner.index].score += finalOutcome.winners.length > 1 ? 1 : 2;
        if (winnerChanged) players[winner.index].score++;
    });
    renderScores();


    // afficher les scores
    document.getElementById("scorePanel").classList.remove("hidden");
    document.getElementById("turnPanel").classList.add("hidden");
    renderResult(guess, finalOutcome.distances, finalOutcome.winners, winnerChanged);
}

function getRoundOutcome(guess) {
    const distances = round.contributors.map(contributor => Math.abs(contributor.objective - guess));
    const closestDistance = Math.min(...distances);
    const winners = round.contributors.filter((contributor, index) => distances[index] === closestDistance);
    return { distances, winners };
}

function renderResult(guess, distances, winners, winnerChanged) {
    const prevWinner = getRoundOutcome(round.firstGuess).winners;

    const result = document.getElementById("resultPanel");
    result.replaceChildren();
    result.classList.remove("hidden");
    const winnerNames = winners.map(winner => players[winner.index].name).join(" et ");
    result.append(
        createElement("p", "eyebrow", "RÉSULTAT DE LA MANCHE"),
        createElement("h2", "turn-title", winners.length > 1 ? `Égalité : ${winnerNames}` : `${winnerNames} marque un point !`),
        createElement("p", "turn-copy", `Première estimation : ${round.firstGuess}.`),
        createElement("p", "turn-copy", `Estimation finale : ${guess} ragondin${guess === 1 ? "" : "s"}.`),
        winnerChanged
            ? createElement("p", "debate-bonus", `Manigance !! Le débat a changé le vainqueur : ${winnerNames} gagne${winners.length > 1 ? "nt chacun" : ""} 1 point bonus pour avoir volé la victoire de ${prevWinner.map(winner => players[winner.index].name).join(" et ")}.`)
            : createElement("p", "turn-copy", "Le débat n'a pas changé le vainqueur.")
    );

    const recap = document.createElement("div");
    recap.className = "recap-list";
    round.contributors.forEach((contributor, index) => {
        const row = document.createElement("div");
        row.className = "recap-row";
        row.append(
            createElement("span", "", players[contributor.index].name),
            createElement("strong", "", `${contributor.objective} ragondins`),
            createElement("span", "recap-distance", `écart ${distances[index]}`)
        );
        recap.append(row);
    });

    result.append(recap, makeButton("Manche suivante", () => {
        roundNumber++;
        objectiveRange+=10;
        startRound();
    }));
}


// --- Fonctions utilitaires ---

function shuffle(items) {
    const shuffledItems = [...items];

    // Fisher-Yates mélange le tableau en place, sans modifier le tableau d'origine.
    for (let index = shuffledItems.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]];
    }

    return shuffledItems;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
}

function makeButton(text, onClick) {
    const button = document.createElement("button");
    button.className = "button";
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
}

function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}


// --- Gestions des données ---
async function loadJSON(name) {
    const response = await fetch(`./${name}`);
    if (!response.ok) {
        throw new Error(`Impossible de charger ${name} : ${response.status}`);
    }
    console.log(`Loaded ${name}`);
    return response.json();
}

async function loadData() {
    console.log("loading champions, bonus and malus");
    [champions, bonus, malus] = await Promise.all([
        loadJSON("./data/champions.json"),
        loadJSON("./data/bonus.json"),
        loadJSON("./data/malus.json")
    ]);
    console.log("Loaded champions, bonus and malus");
}
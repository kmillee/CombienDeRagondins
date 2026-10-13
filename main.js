// todo: store in json
// todo: gestion point "manigance"

// --- Configuration et données ---
const playerCount = 4;
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


// --- Evenements de la page ---
document.getElementById("setupPlayer").addEventListener("submit", async event => {
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
    document.getElementById("gamePanel").classList.add("hidden");
    document.getElementById("setupPanel").classList.remove("hidden");
});

document.getElementById("openScores").addEventListener("click", () => {
    document.getElementById("scoresDialog").showModal();
});

document.getElementById("closeScores").addEventListener("click", () => {
    document.getElementById("scoresDialog").close();
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
        // false : l'écran attend que le joueur prenne le téléphone ; true : il peut saisir.
        ready: false
    };

    console.log(round);
    
    document.getElementById("roundLabel").textContent = `Manche ${roundNumber}`;
    document.getElementById("resultPanel").classList.add("hidden");
    document.getElementById("turnPanel").classList.remove("hidden");
    document.getElementById("scorePanel").classList.add("hidden");
    renderScores();
    renderCharacters();
    renderTurn();
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
    const turnPanel = document.getElementById("turnPanel");
    turnPanel.replaceChildren();

        // Les trois conseillers jouent d'abord ; le monarque intervient quand ils ont tous contribué.
        if (round.currentContributor < round.contributors.length) {
                renderContributorTurn(turnPanel);
    } else {
                renderJudgeTurn(turnPanel);
    }
}

// --- Tours des joueurs ---

function renderContributorTurn(container) {
    const contributor = round.contributors[round.currentContributor];
    const heading = round.ready
                    ? `À toi, ${contributor.player.name}`
                    : `Passez le téléphone à ${contributor.player.name}`;

    const step = createElement("p", "eyebrow", `CONSEILLER ${round.currentContributor + 1} SUR ${playerCount-1}`);
    const title = createElement("h2", "turn-title", heading);

    const description = createElement("p", "turn-copy", round.ready
                        ? "Ajouter un modificateur pour te rapprocher de ton objectif."
                        : "Ton objectif est secret, appuie quand tu es seul·e à regarder l'écran.");

    const modifierInstruction = createElement(
        "p",
        `modifier-instruction ${contributor.modifierType}`,
        contributor.modifierType === "malus" ? "Attribue un malus" : "Attribue un bonus"
    );

    container.append(step, title, description, modifierInstruction);
    if (!round.ready) {
        container.append(makeButton("Je suis prêt·e", () => {
            round.ready = true;
            renderTurn();
        }));
        return;
    }


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
    container.append(modifierInstruction,objective, form);  

    input.focus();
}

function renderDebateTurn(container){
    // On donne un timer propre à chaque joueur 
}

function renderJudgeTurn(container) {
    const judge = players[round.monarchIndex];
    const isReady = round.ready;
    container.append(
    createElement("h2", "turn-title", isReady ? `À toi de trancher, ${judge.name}` : `Passez le téléphone à ${judge.name}`),
    createElement("p", "turn-copy", isReady
        ? ""
        : "Les modificateurs des personnages sont visibles. Les autres joueurs détournent le regard.")
    );

    if (!isReady) {
        container.append(makeButton("Le monarque rend sa décision !", () => {
            round.ready = true;
            renderTurn();
        }));
        return;
    }

    const form = document.createElement("form");
    form.className = "guess-form";

    const label = createElement("label", "", "Combien de ragondins ?");

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
        finishRound(guess);
    });

    container.append(form);
    input.focus();
}


// --- Resultat et attribution des points ---

function finishRound(guess) {
    // écart entre la réponse du monarque et les joeurs
    const distances = round.contributors.map(contributor => Math.abs(contributor.objective - guess));
    const closestDistance = Math.min(...distances);

    // 2pts pour le gagnant, 1pt en cas d'égalité entre 2j
    const winners = round.contributors.filter((contributor, index) => distances[index] === closestDistance);
    
    winners.forEach(winner => winners.length>1 ? players[winner.index].score++ : players[winner.index].score+=2);
    renderScores();

    // afficher les scores
    document.getElementById("scorePanel").classList.remove("hidden");
    document.getElementById("turnPanel").classList.add("hidden");
    renderResult(guess, distances, winners);
}

function renderResult(guess, distances, winners) {
    const result = document.getElementById("resultPanel");
    result.replaceChildren();
    result.classList.remove("hidden");
    const winnerNames = winners.map(winner => players[winner.index].name).join(" et ");
    result.append(
        createElement("p", "eyebrow", "RÉSULTAT DE LA MANCHE"),
        createElement("h2", "turn-title", winners.length > 1 ? `Égalité : ${winnerNames}` : `${winnerNames} marque un point !`),
        createElement("p", "turn-copy", `Le monarque enverra ${guess} ragondin${guess === 1 ? "" : "s"}.`)
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
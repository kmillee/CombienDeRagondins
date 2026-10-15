
//todo intégration du son
// Trompette	trompette.ogg	Intrus dévoilé, Début débat
// Trompette Roi	trompette_roi.ogg	Monarque élu
// Bruits de pattes	bruit_pattounes.ogg	Changement de conseiller
// Ragondin1	ragondin1.ogg	
// Ragondin2	ragondin2.ogg	
// Ragondin3	ragondin3.ogg	
// Grattage	timer.ogg	Plus que 10sec au timer


// --- Configuration et données ---
const playerCount = 4;
const maxRounds = 4;
let objectiveRange = 10;

let champions = [ {name:""} ];
let bonus = [];
let malus = [];


// --- Etat de la partie ---
let players = [];       // contient {nom, score} des joueurs
let roundNumber = 1;    // manche en cours
let round = null;            
let debateTimerInterval = null;
let firstMonarchIndex = 0;

// --- Etat de l'interface ---
const stagePanelIds = ["landingPanel", "introPanel", "setupPanel", "rulesPanel", "monarchPanel", "gamePanel", "creditsPanel"];
let currentStageId = "landingPanel";
let rulesReturnStageId = "setupPanel";
let creditsReturnStageId = "landingPanel";
let soundEnabled = localStorage.getItem("ragondins.sound") === "true";
let vibrationEnabled = localStorage.getItem("ragondins.vibration") === "true";

// Charger données au lancement de l'app
document.addEventListener("DOMContentLoaded", async () => {
        try {
        await loadData();
    } 
    catch (error) {
        console.error(error);
        alert("Impossible de charger les données du jeu.");
        return;
    }
});

// --- Evenements de la page ---
document.getElementById("beginSetup").addEventListener("click", () => {
    showScreen("introPanel");
});

document.getElementById("introContinue").addEventListener("click", () => {
    showScreen("setupPanel");
});

document.getElementById("rulesContinue").addEventListener("click", () => {
    showScreen(rulesReturnStageId);
});

document.getElementById("setupPlayer").addEventListener("submit", async event => {
    event.preventDefault(); // empeche reload de la page

    const formData = new FormData(event.currentTarget);

    // chaque joueur garde son score d'une manche à l'autre
    players = Array.from({ length: playerCount }, (_, index) => ({
        name: String(formData.get(`player${index + 1}`)).trim() || `Joueur ${index + 1}`,
        score: 0
    }));

    roundNumber = 1;
    objectiveRange = 10;
    rulesReturnStageId = "monarchPanel";
    document.getElementById("rulesContinue").textContent = "Choisir le premier monarque";
    showScreen("rulesPanel");
    renderMonarchChoices();
});

document.getElementById("menuToggle").addEventListener("click", () => {
    pauseDebateTimer();
    document.getElementById("menuDialog").showModal();
});

document.getElementById("closeMenu").addEventListener("click", () => {
    document.getElementById("menuDialog").close();
});

document.getElementById("openRulesFromMenu").addEventListener("click", () => {
    rulesReturnStageId = currentStageId;
    document.getElementById("rulesContinue").textContent = "Reprendre la partie";
    document.getElementById("menuDialog").close();
    showScreen("rulesPanel");
});





document.getElementById("toggleSound").addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("ragondins.sound", String(soundEnabled));
    updateSettingsButtons();
});

document.getElementById("toggleVibration").addEventListener("click", () => {
    vibrationEnabled = !vibrationEnabled;
    localStorage.setItem("ragondins.vibration", String(vibrationEnabled));
    updateSettingsButtons();
});

document.getElementById("openCredits").addEventListener("click", async () => {
    creditsReturnStageId = currentStageId;
    document.getElementById("menuDialog").close();
    showScreen("creditsPanel");
    await renderCreditsCards();
});

document.getElementById("creditsBack").addEventListener("click", () => {
    showScreen(creditsReturnStageId);
});

document.getElementById("restartGame").addEventListener("click", restartGame);

document.getElementById("menuDialog").addEventListener("close", () => {
    document.getElementById("menuOptions").classList.remove("hidden");
    document.getElementById("menuTitle").textContent = "Menu";
});

// document.addEventListener("click", event => {
//     if (event.target.closest(".step-action, .monarch-choice")) playStepFeedback();
// });

updateSettingsButtons();


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
                    // { type: coinFlip, name: pickRandom(coinFlip === "bonus" ? bonus : malus).name }, 
                    { type: "bonus", name: pickRandom(bonus).name },
                    { type: "malus", name: pickRandom(malus).name }
                ]
   
            };
                
        case 2:
            return {
                ...selectedChampion,
                // 1 bonus et 1 malus
                modifiers: [
                    { type: coinFlip, name: pickRandom(coinFlip === "bonus" ? bonus : malus).name }, 
                    { type: coinFlip, name: pickRandom(coinFlip === "bonus" ? bonus : malus).name }, 

                    // { type: "bonus", name: pickRandom(bonus).name },
                    // { type: "malus", name: pickRandom(malus).name }
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

function showScreen(panelId) {
    stagePanelIds.forEach(id => document.getElementById(id).classList.add("hidden"));
    document.getElementById(panelId).classList.remove("hidden");
    currentStageId = panelId;
    window.scrollTo(0, 0);
}

function pauseDebateTimer() {
    if (!round || round.activeDebateTimerIndex === null) return;
    clearDebateInterval();
    round.activeDebateTimerIndex = null;
    updateDebateTimerButtons();
}

function restartGame() {
    const previousStageId = currentStageId;
    clearDebateInterval();
    roundNumber = 1;
    objectiveRange = 10;
    round = null;
    firstMonarchIndex = 0;

    if (players.length > 0) {
        players = players.map(player => ({ name: "Sire " + player.name, score: 0 }));
        players.forEach((player, index) => {
            document.querySelector(`[name="player${index + 1}"]`).value = "Sire " +player.name;
        });
    }

    document.getElementById("menuDialog").close();
    if (document.getElementById("turnOverlay").open) document.getElementById("turnOverlay").close();
    if (document.getElementById("scoresDialog").open) document.getElementById("scoresDialog").close();

    if (players.length > 0) {
        showScreen("monarchPanel");
        renderMonarchChoices();
    } else {
        showScreen(previousStageId === "setupPanel" ? "setupPanel" : "landingPanel");
    }
}

function updateSettingsButtons() {
    const soundButton = document.getElementById("toggleSound");
    const vibrationButton = document.getElementById("toggleVibration");
    if (!soundButton || !vibrationButton) return;

    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    document.getElementById("soundIcon").src = soundEnabled ? "./UI/sound_on.png" : "./UI/sound_off.png";
    document.getElementById("soundLabel").textContent = soundEnabled ? "Son activé" : "Son désactivé";
    vibrationButton.setAttribute("aria-pressed", String(vibrationEnabled));
    document.getElementById("vibrationIcon").src = vibrationEnabled ? "./UI/vibration_on.png" : "./UI/vibration_off.png";
    document.getElementById("vibrationLabel").textContent = vibrationEnabled ? "Vibrations activées" : "Vibrations désactivées";
}

// function playStepFeedback() {
//     if (soundEnabled) {
//         const AudioContextClass = window.AudioContext || window.webkitAudioContext;
//         if (AudioContextClass) {
//             const audioContext = new AudioContextClass();
//             const oscillator = audioContext.createOscillator();
//             const volume = audioContext.createGain();
//             oscillator.frequency.value = 560;
//             volume.gain.setValueAtTime(0.025, audioContext.currentTime);
//             volume.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
//             oscillator.connect(volume);
//             volume.connect(audioContext.destination);
//             oscillator.start();
//             oscillator.stop(audioContext.currentTime + 0.08);
//             oscillator.addEventListener("ended", () => audioContext.close(), { once: true });
//         }
//     }

//     if (vibrationEnabled && navigator.vibrate) navigator.vibrate(24);
// }


function startRound() {
    clearDebateInterval();

    // fait tourner le rôle du monarque entre les 4 joueurs
    const monarchIndex = (firstMonarchIndex + roundNumber - 1) % playerCount;

    // updateNames(monarchIndex);

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
    document.getElementById("matchIntroPanel").classList.remove("hidden");
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
    playSound("./SFX/trompette.ogg");

    document.getElementById("gameTopline").classList.remove("hidden");
    document.getElementById("characterSection").classList.remove("hidden");

    const championDescription = createElement("p", "turn-copy", "");
    championDescription.append(
        document.createTextNode("Nos éclaireurs ont repéré "),
        createElement("strong", "", round.champion.name),
        document.createTextNode(" sur notre territoire. Ils ont rapporté de précieux renseignements tactiques. Présentez la situation à vos conseillers, pour qu'ils puissent vous aider.")
    );

    document.getElementById("matchIntroPanel").replaceChildren(
        createElement("p", "eyebrow", `MANCHES ${roundNumber} SUR ${maxRounds}`),
        createElement("h2", "turn-title", "L'intrus est identifié !"),
        championDescription
    );

        document.getElementById("ragondinCharacterPanel").classList.remove("hidden");

    const beginButton = makeButton("Demander l'avis des conseillers", () => {
        document.getElementById("matchIntroPanel").classList.add("hidden");
        document.getElementById("turnPanel").replaceChildren();
        renderTurn();
    });
    document.getElementById("turnPanel").replaceChildren(beginButton);
}

// --- Affichage ---
function renderMonarchChoices() {
    const choices = document.getElementById("monarchChoices");
    choices.replaceChildren(...players.map((player, index) => {
        const button = makeButton(player.name, () => {
            firstMonarchIndex = index;
            showScreen("gamePanel");
            startRound();
        }, { stepAction: false });
        button.classList.add("monarch-choice");
        button.setAttribute("aria-label", `Choisir ${player.name} comme premier Monarque`);
        return button;
    }));
}

async function renderCreditsCards() {
    const creditsCharacters = document.getElementById("creditsCharacters");
    const teamRagondin = [
        {name: "Camille Jouanet", image: "./UI/ragondin_camille.png", description: "Dévelopement web"},
        {name: "Gabriel Sargent", image: "./UI/ragondin_roi.png", description: "Direction artistique"},
        {name: "Fréderic L. Tremblay", image: "./UI/ragondin_fred.png", description: "Game design"},
        {name: "Nolwenn Tricaud-Malherbe", image: "./UI/ragondin_nolwenn.png", description: "UI/UX design"},
    ];


    creditsCharacters.replaceChildren(...teamRagondin.map(ragondin => {
        const panel = createElement("article", "character-panel", "");
        const layout = createElement("div", "character-layout", "");
        const image = document.createElement("img");
        image.src = `${ragondin.image}`;
        image.alt = ragondin.name;

        const details = createElement("div", "character-details", "");
        details.append(
            createElement("h3", "credit-character-name", ragondin.name),
            createElement("span", "description", ragondin.description)
        );

        const modifiers = document.createElement("ul");
        modifiers.append(
            createElement("li", "bonus", pickRandom(bonus).name),
            createElement("li", "malus", pickRandom(malus).name)
        );
        details.append( modifiers);
        layout.append(image, details);
        panel.append(layout);
        return panel;
    }));
}

function renderCharacters() {
    document.getElementById("championImage").src = "./images/" +round.champion.image;
    document.getElementById("championImage").alt = round.champion.name;
    document.getElementById("championDescription").textContent = round.champion.description;
    document.getElementById("championName").textContent = round.champion.name;

    renderModifierList("championMods", round.champion.modifiers);

    document.getElementById("ragondinImage").src = "./images/ragondin_soldat.png";
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
    const maxScore = Math.max(...players.map(player => player.score));
    // les scores sont affichés à deux endroits : dans la fenêtre modale et en fin de manche
    ["scoreList", "modalScoreList"].forEach(id => {
        document.getElementById(id).replaceChildren(...players.map(player => {
            const item = document.createElement("div");
            item.className = "score-item";
            const name = createElement("span", "score-name", player.name);
            if (maxScore === player.score) {
                const crown = document.createElement("img");
                crown.className = "score-crown";
                crown.src = "./UI/couronne.png";
                crown.alt = "Meilleur score";
                name.append(crown);
            }
            const score = createElement("strong", "", player.score);
            item.append(name, score);
            return item;
        }));
    });
}

function renderTurn() {
    playSound("./SFX/laugh.mp3");
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


    container.append(step, title, description);

    // L'objectif est révélé seulement après confirmation, pour rester privé des autres joueurs.
    const objective = document.createElement("div");
    objective.className = "objective-box";
    objective.append(createElement("span", "objective-caption", "Objectif secret :"));
    objective.append(createElement("strong", "objective-number", round.contributors[round.currentContributor].objective));
    objective.append(createElement("span", "objective-caption", "ragondins (entre 1 et " + objectiveRange + ")"));

    const form = document.createElement("form");
    form.className = "modifier-form";

    const label = createElement("label", `modifier-instruction ${contributor.modifierType}`, `${contributor.modifierType === "malus" ? "Attribue un malus au régiment :" : "Attribue un bonus au régiment :"}`);
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
    input.max = `${objectiveRange}`;
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
    input.max = `${objectiveRange}`;
    input.step = "1";
    input.placeholder = `(entre 1 et ${objectiveRange})`;
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
}



// --- DEBATE MANAGEMENT ---
function startDebate(firstGuess) {
    round.firstGuess = firstGuess;
    round.debateTimers = round.contributors.map(() => 60);
    round.activeDebateTimerIndex = null;
    document.getElementById("matchIntroPanel").classList.add("hidden");
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

    // Distribution des points aux joueurs 
    finalOutcome.winners.forEach(winner => {
        players[winner.index].score += finalOutcome.winners.length > 1 ? 1 : 2;
        if (winnerChanged) players[winner.index].score++;
    });
    console.log("Closest distance:");
    console.log(finalOutcome.closestDistance);
    
    if (finalOutcome.closestDistance === 0) players[round.monarchIndex].score+=2;
    else if (finalOutcome.closestDistance < roundNumber) players[round.monarchIndex].score+=1;

    renderScores();

    // afficher les scores
    document.getElementById("scorePanel").classList.remove("hidden");
    document.getElementById("characterSection").classList.add("hidden");
    document.getElementById("turnPanel").classList.add("hidden");
    renderResult(guess, finalOutcome.distances, finalOutcome.winners, winnerChanged, finalOutcome.closestDistance);
}

function getRoundOutcome(guess) {
    const distances = round.contributors.map(contributor => Math.abs(contributor.objective - guess));
    const closestDistance = Math.min(...distances);
    const winners = round.contributors.filter((contributor, index) => distances[index] === closestDistance);
    return { closestDistance, distances, winners };
}

function renderResult(guess, distances, winners, winnerChanged, closestDistance) {

    playSound("./SFX/trompette_roi.ogg");
    const prevWinner = getRoundOutcome(round.firstGuess).winners;

    const result = document.getElementById("resultPanel");
    result.replaceChildren();
    result.classList.remove("hidden");
    const winnerNames = winners.map(winner => players[winner.index].name).join(" et ");
    const resultHeading = createElement("div", "result-heading", "");
    resultHeading.append(
        createElement("p", "eyebrow", `FIN DE LA MANCHE ${roundNumber}`),
        createElement("h2", "turn-title", winners.length > 1 ? `Égalité entre ${winnerNames}` : `${winnerNames} remporte la manche`)
    );

    const monarchPoints = closestDistance === 0 ? 2 : closestDistance < roundNumber ? 1 : 0;
    const resultStats = createElement("div", "result-stats", "");
    [
        ["Estimation finale", `${guess} ragondin${guess === 1 ? "" : "s"}`],
        ["Écart le plus proche", closestDistance],
        ["Points du Monarque", `+${monarchPoints}`]
    ].forEach(([label, value]) => {
        const stat = createElement("div", "result-stat", "");
        stat.append(createElement("span", "", label), createElement("strong", "", value));
        resultStats.append(stat);
    });

    result.append(resultHeading, resultStats);
    result.append(winnerChanged
        ? createElement("p", "result-note debate-bonus", `Le débat a changé le résultat : ${winnerNames} remporte le bonus de manigance aux dépens de ${prevWinner.map(winner => players[winner.index].name).join(" et ")}.`)
        : createElement("p", "result-note", "Le débat n'a pas changé le vainqueur."));

    const recap = document.createElement("div");
    recap.className = "recap-list";
    const recapHeading = document.createElement("div");
    recapHeading.className = "recap-heading";
    recapHeading.append(
        createElement("span", "", "Conseiller"),
        createElement("span", "", "Objectif"),
        createElement("span", "", "Écart"),
        createElement("span", "", "Points")
    );
    recap.append(recapHeading);
    round.contributors.forEach((contributor, index) => {
        const row = document.createElement("div");
        row.className = "recap-row";
        const isWinner = winners.some(winner => winner.index === contributor.index);
        const roundPoints = isWinner
            ? (winners.length > 1 ? 1 : 2) + (winnerChanged ? 1 : 0)
            : 0;
        if (isWinner) row.classList.add("is-winner");
        row.append(
            createElement("span", "", players[contributor.index].name),
            createElement("strong", "", `${contributor.objective} ragondins`),
            createElement("span", "recap-distance", distances[index]),
            createElement("strong", "recap-points", `+${roundPoints}`)
        );
        recap.append(row);
    });

    const nextRoundButton = makeButton("Manche suivante", () => {
        roundNumber++;
        objectiveRange+=10;
        startRound();
    });
    nextRoundButton.classList.add("step-action");
    result.append(recap, nextRoundButton);
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

function makeButton(text, onClick, { stepAction = true } = {}) {
    const button = document.createElement("button");
    button.className = stepAction ? "button step-action" : "button";
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
}

function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}


function playSound(soundFile, volume = 0.5) {
        if (soundEnabled) {
        const trumpetSound = new Audio(soundFile);
        trumpetSound.volume = volume;
        trumpetSound.play().catch(() => {});
    }
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

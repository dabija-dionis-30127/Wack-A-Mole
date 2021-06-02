const players = {};
const activeGames = [];

const http = require("http");
const app = require("express")();
const websocketServer = require("websocket").server
const httpServer = http.createServer();

app.use(require("express").static(__dirname + '/public'));

app.listen(9091, () => console.log("Oppened connection on port 9091"))
httpServer.listen(9090, () => console.log("Oppened connection on port 9090"))

setInterval(() => {
	activeGames.forEach(ag => {
		if (!ag.gameEnded) {
			if (Date.now() - ag.gameStartTime > ag.gameTime) {
				ag.gameEnded = true;
				const payLoad = {
					"method": "gameEnded",
					"score": ag.score,
					"molesHit": ag.molesHit,
					"molesMissed": ag.molesMissed,
					"moleInHoleId": ag.moleInHoleId
				}
				players[ag.playerId].activeGameId = null;
				players[ag.playerId].connection.send(JSON.stringify(payLoad));
				//activeGames.splice(players[ag.playerId].activeGameId, 1);
			} else {
				if (Date.now() - ag.moleUpStartTime > ag.moleMSUp) {
					const payLoad = {
						"method": "changeMole",
						"lastHoleId": getNewHoleForMole(players[ag.playerId].activeGameId, false),
						"game": ag
					}
					players[ag.playerId].connection.send(JSON.stringify(payLoad));
				}
			}
		}
	});
}, 250)

const wsServer = new websocketServer({
	"httpServer": httpServer
});
wsServer.on("request", request => {
	//Connect
	const connection = request.accept(null, request.origin);
	connection.on("open", () => console.log("Opened!"))
	connection.on("close", () => console.log("Closed!"))
	connection.on("message", message => {
		const result = JSON.parse(message.utf8Data)
		if (result.method === "newGame") {
			const playerId = result.playerId;
			activeGames.push({
				"playerId": playerId,
				"holeNumber": result.maxHoles,
				"gameTime": result.gameTime * 1000,
				"score": 0,
				"molesHit": 0,
				"molesMissed": 0,
				"moleMSUp": 500 + Math.floor(Math.random() * 1500),
				"moleInHoleId": Math.floor(Math.random() * result.maxHoles), //add random number between 0 and holeNumbers
				"moleUpStartTime": Date.now(),
				"gameStartTime": Date.now(),
				"gameEnded": false
			})

			const payLoad = {
				"method": "newGame",
				"game": activeGames[activeGames.length - 1]
			}
			players[playerId].activeGameId = activeGames.length - 1;
			players[playerId].connection.send(JSON.stringify(payLoad));
		}

		if (result.method === "clickHole") {
			const playerId = result.playerId;
			const currentGame = activeGames[players[playerId].activeGameId]??"failed"
			if (currentGame.moleInHoleId == result.holeId) {
				const payLoad = {
					"method": "changeMole",
					"lastHoleId": getNewHoleForMole(players[playerId].activeGameId, true),
					"game": currentGame
				}
				players[playerId].connection.send(JSON.stringify(payLoad));
			} else {
				currentGame.score -= 30;
				currentGame.molesMissed += 1;
				const payLoad = {
					"method": "missedMole",
					"score": currentGame.score
				}
				players[playerId].connection.send(JSON.stringify(payLoad));
			}

		}
	})

	const playerId = guid();
	players[playerId] = {
		"connection": connection,
		"activeGameId": null
	}

	const payLoad = {
		"method": "connect",
		"playerId": playerId
	}

	connection.send(JSON.stringify(payLoad))
})

function getNewHoleForMole(playerId, bonked) {
	if (bonked == true) {
		activeGames[playerId].score += Math.floor((4000 - activeGames[playerId].moleMSUp - (Date.now() - activeGames[playerId].moleUpStartTime)) / 100);
		activeGames[playerId].molesHit += 1;
	}
	activeGames[playerId].moleMSUp = 500 + Math.floor(Math.random() * 1500);
	const lastIdMole = activeGames[playerId].moleInHoleId;
	activeGames[playerId].moleInHoleId = Math.floor(Math.random() * activeGames[playerId].holeNumber);
	activeGames[playerId].moleUpStartTime = Date.now();
	return lastIdMole;
}

function S4() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
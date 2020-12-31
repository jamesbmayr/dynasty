/*** modules ***/
	if (!CORE) { var CORE = require("../node/core") }
	if (!SESSION) { var SESSION = require("../node/session") }
	module.exports = {}

/*** creates ***/
	/* createOne */
		module.exports.createOne = createOne
		function createOne(REQUEST, callback) {
			try {
				// name
					if (!REQUEST.post.name || REQUEST.post.name.length < 3 || REQUEST.post.name.length > 15 || !CORE.isNumLet(REQUEST.post.name)) {
						callback({success: false, message: "name must be 3-15 letters and numbers"})
						return
					}

				// create
					var player = CORE.getSchema("player")
						player.sessionId = REQUEST.session.id
						player.name = REQUEST.post.name.toUpperCase()

					var game = CORE.getSchema("game")
						game.players[player.id] = player

				// query
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "insert"
						query.document = game

				// insert
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback(results)
							return
						}

						// update session
							REQUEST.updateSession = {
								playerId: player.id,
								gameId: game.id
							}
							SESSION.updateOne(REQUEST, null, function() {
								// redirect
									callback({success: true, message: "game created", location: "../game/" + game.id})
							})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

	/* joinOne */
		module.exports.joinOne = joinOne
		function joinOne(REQUEST, callback) {
			try {
				// name
					if (!REQUEST.post.name || REQUEST.post.name.length < 3 || REQUEST.post.name.length > 15 || !CORE.isNumLet(REQUEST.post.name)) {
						callback({success: false, message: "name must be 3-15 letters and numbers"})
						return
					}

				// validate
					if (!REQUEST.post.gameId || REQUEST.post.gameId.length !== 4 || !CORE.isNumLet(REQUEST.post.gameId)) {
						callback({success: false, message: "gameId must be 4 letters and numbers"})
						return
					}

				// query
					REQUEST.post.gameId = REQUEST.post.gameId.toLowerCase()
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: REQUEST.post.gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						// not found
							if (!results.success) {
								callback({success: false, message: "no game found"})
								return
							}

						// already a player?
							var game = results.documents[0]
							var playerKeys = Object.keys(game.players)
							if (playerKeys.find(function(p) { return game.players[p].sessionId == REQUEST.session.id })) {
								callback({success: true, message: "re-joining game", location: "../game/" + game.id})
								return
							}

						// already ended
							if (game.status && game.status.endTime) {
								callback({success: false, message: "already ended"})
								return
							}

						// already started
							if (game.status && game.status.startTime) {
								callback({success: false, message: "already started"})
								return
							}

						// player count
							if (playerKeys.length >= CORE.getAsset("constants").maximumPlayers) {
								callback({success: false, message: "maximum player count reached"})
								return
							}

						// duplicate name
							var names = playerKeys.map(function(p) { return game.players[p].name }) || []
							if (names.includes(REQUEST.post.name.toUpperCase())) {
								callback({success: false, message: "name already taken"})
								return
							}

						// create player
							var player = CORE.getSchema("player")
								player.sessionId = REQUEST.session.id
								player.name = REQUEST.post.name.toUpperCase()
								player.position = playerKeys.length

						// add to game
							game.players[player.id] = player

						// query
							game.updated = new Date().getTime()
							var query = CORE.getSchema("query")
								query.collection = "games"
								query.command = "update"
								query.filters = {id: game.id}
								query.document = game

						// update
							CORE.accessDatabase(query, function(results) {
								if (!results.success) {
									callback(results)
									return
								}

								// update session
									REQUEST.updateSession = {
										playerId: player.id,
										gameId: game.id
									}
									SESSION.updateOne(REQUEST, null, function() {
										// redirect
											callback({success: true, message: "game joined", location: "../game/" + game.id})
									})
							})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

/*** reads ***/
	/* readOne */
		module.exports.readOne = readOne
		function readOne(REQUEST, callback) {
			try {
				// game id
					var gameId = REQUEST.path[REQUEST.path.length - 1]

				// query
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						// not found
							if (!results.success) {
								callback({success: false, message: "no game found", location: "../../../../", recipients: [REQUEST.session.id]})
								return
							}

						// get player id
							var game = results.documents[0]
							var playerId = null
							if (Object.keys(game.players).length) {
								playerId = Object.keys(game.players).find(function(p) {
									return game.players[p].sessionId == REQUEST.session.id
								})
							}

						// player --> update all players & spectators
							if (playerId) {
								// all players
									for (var i in game.players) {
										callback({success: true, message: null, playerId: i, game: sanitizeGame(game, i), recipients: [game.players[i].sessionId]})
									}

								// spectators
									callback({success: true, message: null, game: sanitizeGame(game, null), recipients: Object.keys(game.spectators)})
								return
							}

						// existing spectator
							if (game.spectators[REQUEST.session.id]) {
								callback({success: true, message: "now observing the game", playerId: null, game: sanitizeGame(game, null), recipients: [REQUEST.session.id]})
								return
							}

						// new spectator
							if (!game.spectators[REQUEST.session.id]) {
								// add spectator
									game.spectators[REQUEST.session.id] = true

								// query
									game.updated = new Date().getTime()
									var query = CORE.getSchema("query")
										query.collection = "games"
										query.command = "update"
										query.filters = {id: game.id}
										query.document = {updated: game.updated, spectators: game.spectators}

								// update
									CORE.accessDatabase(query, function(results) {
										if (!results.success) {
											callback(results)
											return
										}

										// for this spectator
											callback({success: true, message: "now observing the game", playerId: null, game: sanitizeGame(game, null), recipients: [REQUEST.session.id]})
									})
							}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

/*** updates ***/
	/* updateOne */
		module.exports.updateOne = updateOne
		function updateOne(REQUEST, callback) {
			try {
				// game id
					var gameId = REQUEST.path[REQUEST.path.length - 1]
					if (!gameId || gameId.length !== 4) {
						callback({success: false, message: "invalid game id", recipients: [REQUEST.session.id]})
						return
					}

				// action
					if (!REQUEST.post || !REQUEST.post.action) {
						callback({success: false, message: "missing update action", recipients: [REQUEST.session.id]})
						return
					}

				// query
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.recipients = [REQUEST.session.id]
							callback(results)
							return
						}

						// not a player?
							var game = results.documents[0]
							if (!Object.keys(game.players).find(function(p) { return game.players[p].sessionId == REQUEST.session.id })) {
								callback({success: false, message: "not a player", recipients: [REQUEST.session.id]})
								return
							}

						// already ended?
							if (game.status && game.status.endTime) {
								callback({success: false, message: "game already ended", recipients: [REQUEST.session.id]})
								return
							}

						// action switch
							if (REQUEST.post.action == "startGame") {
								startGame(REQUEST, game, callback)
								return
							}
							else if (REQUEST.post.action == "selectPass") {
								selectPass(REQUEST, game, callback)
								return
							}
							else if (REQUEST.post.action == "selectCards") {
								selectCards(REQUEST, game, callback)
								return
							}
							else {
								callback({success: false, message: "invalid update action: " + REQUEST.post.action, recipients: [REQUEST.session.id]})
								return
							}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

	/* startGame */
		module.exports.startGame = startGame
		function startGame(REQUEST, game, callback) {
			try {
				// already started?
					if (game.startTime) {
						callback({success: false, message: "game already started", recipients: [REQUEST.session.id]})
						return
					}

				// too few players
					var playerIds = Object.keys(game.players)
					if (playerIds.length < CORE.getAsset("constants").minimumPlayers) {
						callback({success: false, message: "game requires at least " + CORE.getAsset("constants").minimumPlayers + " players", recipients: [REQUEST.session.id]})
						return
					}

				// launch messages
					game.status.messages.push({id: CORE.generateRandom(), message: "game begins"})
					game.status.messages.push({id: CORE.generateRandom(), message: "on your turn, play 1+ cards of the same value (less than current value) or pass"})

				// randomize order
					game.status.waiting = CORE.sortRandom(playerIds)
					game = setNextGame(game)

				// start game
					game.status.startTime = new Date().getTime()

				// query
					game.updated = new Date().getTime()
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "update"
						query.filters = {id: game.id}
						query.document = game

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback(results)
							return
						}

						// all players
							for (var i in game.players) {
								callback({success: true, message: null, game: sanitizeGame(game, i), recipients: [game.players[i].sessionId]})
							}
						
						// spectators
							callback({success: true, message: null, game: sanitizeGame(game, null), recipients: Object.keys(game.spectators)})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

	/* selectCards */
		module.exports.selectCards = selectCards
		function selectCards(REQUEST, game, callback) {
			try {
				// not started?
					if (!game.status.startTime) {
						callback({success: false, message: "game not started", recipients: [REQUEST.session.id]})
						return
					}

				// thisPlayer
					var playerIds = Object.keys(game.players)
					var thisPlayerId = playerIds.find(function(p) {
						return game.players[p].sessionId == REQUEST.session.id
					})

				// not your turn
					if (game.status.currentTurn !== thisPlayerId && !game.status.taxation) {
						callback({success: false, message: "not your turn", recipients: [REQUEST.session.id]})
						return
					}

				// not part of taxation
					if (game.status.taxation && !game.players[thisPlayerId].taxationPending) {
						callback({success: false, message: "wait for all players to finish taxation", recipients: [REQUEST.session.id]})
						return
					}

				// no cards
					if (!REQUEST.post.selectedCardIds || !REQUEST.post.selectedCardIds.length) {
						callback({success: false, message: "no cards selected", recipients: [REQUEST.session.id]})
						return
					}
					
				// not your cards
					var selectedCards = []
					for (var i in REQUEST.post.selectedCardIds) {
						var card = game.players[thisPlayerId].cards.find(function(c) { return c.id == REQUEST.post.selectedCardIds[i] })
						if (!card) {
							callback({success: false, message: "not your cards", recipients: [REQUEST.session.id]})
							return
						}

						selectedCards.push(card)
					}

				// incorrect taxation amount
					if (game.status.taxation && game.players[thisPlayerId].taxationPending !== selectedCards.length) {
						callback({success: false, message: "you must select " + game.players[thisPlayerId].taxationPending + " card(s)", recipients: [REQUEST.session.id]})
						return
					}

				// taxation
					if (game.status.taxation) {
						// get recipient
							var recipientPosition = playerIds.length - 1 - game.players[thisPlayerId].position
							var recipientId = playerIds.find(function(i) { return game.players[i].position == recipientPosition })

						// move cards
							for (var i in selectedCards) {
								game = moveCard(game, {cardId: selectedCards[i].id, fromId: thisPlayerId, toId: recipientId})
							}

						// finish taxation for this player
							game.players[thisPlayerId].taxationPending = 0

						// all taxation done?
							var taxationComplete = true
							for (var i in playerIds) {
								if (game.players[playerIds[i]].taxationPending) {
									taxationComplete = false
									break
								}
							}

							if (taxationComplete) {
								game.status.taxation = false
								game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.currentTurn].name + " begins the round"})
							}

						// query
							game.updated = new Date().getTime()
							var query = CORE.getSchema("query")
								query.collection = "games"
								query.command = "update"
								query.filters = {id: game.id}
								query.document = game

						// update
							CORE.accessDatabase(query, function(results) {
								if (!results.success) {
									callback(results)
									return
								}

								// all players
									for (var i in game.players) {
										callback({success: true, message: null, game: sanitizeGame(game, i), recipients: [game.players[i].sessionId]})
									}

								// spectators
									callback({success: true, message: null, game: sanitizeGame(game, null), recipients: Object.keys(game.spectators)})
							})

							return
					}

				// get values
					var values = {}
					for (var i in selectedCards) {
						var stringValue = String(selectedCards[i].value)
						if (!values[stringValue]) {
							values[stringValue] = 1
						}
						else {
							values[stringValue]++
						}
					}

				// too many / few
					var valueKeys = Object.keys(values)
					if (!valueKeys.length || valueKeys.length > 2 || (valueKeys.length == 2 && !values["?"])) {
						callback({success: false, message: "cards do not match", recipients: [REQUEST.session.id]})
						return
					}

				// realvalue
					var realValue = valueKeys.find(function(v) {
						return v !== "?"
					}) || 13

				// wilds
					if (values["?"]) {
						for (var i in selectedCards) {
							if (selectedCards[i].value == "?") {
								selectedCards[i].tempValue = realValue	
							}
						}
					}

				// values not lower
					if (game.pile.length) {
						var currentValue = game.pile[game.pile.length - 1].value == "?" ? game.pile[game.pile.length - 1].tempValue : game.pile[game.pile.length - 1].value
						if (realValue >= currentValue) {
							callback({success: false, message: "card value must be less than current value", recipients: [REQUEST.session.id]})
							return
						}
					}

				// not matching quantity
					if (game.pile.length) {
						var quantity = 0
						var differentValue = false
						while (quantity < game.pile.length && !differentValue) {
							if (game.pile[game.pile.length - 1 - quantity].value == currentValue || game.pile[game.pile.length - 1 - quantity].tempValue == currentValue) {
								quantity++
							}
							else {
								differentValue = true
							}
						}
						if (selectedCards.length !== quantity) {
							callback({success: false, message: "selected card quantity must match previously played quantities", recipients: [REQUEST.session.id]})
							return
						}
					}

				// move cards
					for (var i in selectedCards) {
						game = moveCard(game, {cardId: selectedCards[i].id, fromId: thisPlayerId, toId: "pile"})
					}

				// generate message
					var message = valueKeys.map(function(k) {
						return "[" + k + "] x" + values[k]
					}).join(" and ")

				// set last played
					game.players[thisPlayerId].inPlay = true
					game.status.lastPlayed = thisPlayerId
					game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.lastPlayed].name + " plays " + message})

				// out of cards?
					if (!game.players[thisPlayerId].cards.length) {
						game = setWaiting(game)
					}

				// get next player
					if (!game.status.winner) {
						game = setNextPlayer(game)
					}

				// query
					game.updated = new Date().getTime()
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "update"
						query.filters = {id: game.id}
						query.document = game

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback(results)
							return
						}

						// all players
							for (var i in game.players) {
								callback({success: true, message: null, game: sanitizeGame(game, i), recipients: [game.players[i].sessionId]})
							}

						// spectators
							callback({success: true, message: null, game: sanitizeGame(game, null), recipients: Object.keys(game.spectators)})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

	/* selectPass */
		module.exports.selectPass = selectPass
		function selectPass(REQUEST, game, callback) {
			try {
				// not started?
					if (!game.status.startTime) {
						callback({success: false, message: "game not started", recipients: [REQUEST.session.id]})
						return
					}

				// thisPlayer
					var playerIds = Object.keys(game.players)
					var thisPlayerId = playerIds.find(function(p) {
						return game.players[p].sessionId == REQUEST.session.id
					})

				// not your turn
					if (game.status.currentTurn !== thisPlayerId) {
						callback({success: false, message: "not your turn", recipients: [REQUEST.session.id]})
						return
					}

				// starting the pile
					if (!game.pile.length) {
						callback({success: false, message: "cannot pass when starting a round", recipients: [REQUEST.session.id]})
						return
					}

				// set pass
					game.players[thisPlayerId].inPlay = false
					game.status.messages.push({id: CORE.generateRandom(), message: game.players[thisPlayerId].name + " passes"})

				// get next player
					game = setNextPlayer(game)

				// query
					game.updated = new Date().getTime()
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "update"
						query.filters = {id: game.id}
						query.document = game

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback(results)
							return
						}

						// all players
							for (var i in game.players) {
								callback({success: true, message: null, game: sanitizeGame(game, i), recipients: [game.players[i].sessionId]})
							}

						// spectators
							callback({success: true, message: null, game: sanitizeGame(game, null), recipients: Object.keys(game.spectators)})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

/*** tools ***/	
	/* forceDelay */
		module.exports.forceDelay = forceDelay
		function forceDelay(callback, delay) {
			try {
				setTimeout(callback, delay)
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* moveCard */
		module.exports.moveCard = moveCard
		function moveCard(game, data) {
			try {
				// no game?
					if (!game) {
						return null
					}

				// missing data?
					if (!data || !data.cardId || !data.fromId || !data.toId) {
						CORE.logError("missing data for moving card")
						return game
					}

				// from
					// from draw
						if (["draw", "pile", "discard"].includes(data.fromId)) {
							var cardIndex = -1
							for (var i in game[data.fromId]) {
								if (game[data.fromId][i].id == data.cardId) {
									cardIndex = i
									break
								}
							}
							if (cardIndex == -1) {
								CORE.logError("cannot find card " + data.cardId + " in " + data.fromId)
								return game
							}

							var cardClone = CORE.duplicateObject(game[data.fromId][cardIndex])
								cardClone.fromId = data.fromId
							game[data.fromId].splice(cardIndex, 1)
						}

					// from player
						else {
							if (!game.players[data.fromId]) {
								CORE.logError("cannot find player " + data.fromId + " to take card " + data.cardId)
								return game
							}

							var cardIndex = -1
							for (var i in game.players[data.fromId].cards) {
								if (game.players[data.fromId].cards[i].id == data.cardId) {
									cardIndex = i
									break
								}
							}
							if (cardIndex == -1) {
								CORE.logError("cannot find card " + data.cardId + " on player " + data.fromId)
								return game
							}

							var cardClone = CORE.duplicateObject(game.players[data.fromId].cards[cardIndex])
								cardClone.fromId = data.fromId
							game.players[data.fromId].cards.splice(cardIndex, 1)
						}

				// to
					// to pile
						if (["draw", "pile", "discard"].includes(data.toId)) {
							cardClone.toId = data.toId
							game[data.toId].push(cardClone)
						}

					// to player
						else {
							if (!game.players[data.toId]) {
								CORE.logError("cannot find player " + data.toId + " to give card " + data.cardId)
								return game
							}

							cardClone.toId = data.toId
							game.players[data.toId].cards.push(cardClone)
						}

				// return game
					return game
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* setNextPlayer */
		module.exports.setNextPlayer = setNextPlayer
		function setNextPlayer(game) {
			try {
				// current position
					var position = game.players[game.status.currentTurn].position
					var playerIds = Object.keys(game.players)

				// 1+ player has not passed?
					var inPlay = playerIds.filter(function(i) {
						return game.players[i].inPlay
					}) || []

				// no more in play
					if (!inPlay.length) {
						return setNextRound(game)
					}

				// find next player
					var nextPlayerId = null
					while (!nextPlayerId) {
						// modular position
							position++
							if (position >= playerIds.length) {
								position = 0
							}

						// full circle
							if (position == game.players[game.status.currentTurn].position) {
								break
							}

						// find next player by position
							var nextPlayerId = playerIds.find(function(p) {
								return game.players[p].position == position
							})

						// already finished?
							if (!game.players[nextPlayerId].cards.length) {
								nextPlayerId = null
							}
					}

				// set current player
					if (nextPlayerId) {
						game.players[game.status.currentTurn].isTurn = false
						game.status.currentTurn = nextPlayerId
						game.players[game.status.currentTurn].isTurn = true
						game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.currentTurn].name + "'s turn"})
						return game
					}

				// no next player
					return setNextRound(game)
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* setNextRound */
		module.exports.setNextRound = setNextRound
		function setNextRound(game) {
			try {
				// move pile to discard
					while (game.pile.length) {
						if (game.pile[0].tempValue) {
							game.pile[0].tempValue = 13
						}
						game = moveCard(game, {cardId: game.pile[0].id, fromId: "pile", toId: "discard"})
					}

				// all players waiting?
					if (game.status.waiting.length == Object.keys(game.players).length - 1) {
						return setNextGame(game)
					}

				// reset who's in play
					for (var i in game.players) {
						if (game.players[i].cards.length) {
							game.players[i].inPlay = true
						}
					}

				// set turn to lastPlayed
					game.players[game.status.currentTurn].isTurn = false
					game.status.currentTurn = game.status.lastPlayed
					game.players[game.status.currentTurn].isTurn = true
					game.status.lastPlayed = null
					game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.currentTurn].name + " played last"})

				// lastPlayed player finished?
					if (!game.players[game.status.currentTurn].cards.length) {
						return setNextPlayer(game)
					}

				// otherwise
					game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.currentTurn].name + "'s turn"})
					return game
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* setNextGame */
		module.exports.setNextGame = setNextGame
		function setNextGame(game) {
			try {
				// move pile to discard
					if (game.pile.length) {
						for (var i in game.pile) {
							game = moveCard(game, {cardId: game.pile[i].id, fromId: "pile", toId: "discard"})
						}
					}

				// pity the straggler
					for (var i in game.players) {
						if (game.players[i].cards.length) {
							// move cards to discard
								for (var j in game.players[i].cards) {
									game = moveCard(game, {cardId: game.players[i].cards[j].id, fromId: i, toId: "discard"})
								}

							// move to waiting
								game.status.waiting.push(i)
								game.status.messages.push({id: CORE.generateRandom(), message: "round ends"})
						}
					}

				// move discard to draw
					if (game.discard.length) {
						var cloneCards = CORE.sortRandom(game.discard)
						game.discard = []
						game.draw = cloneCards
					}

				// new turn order
					for (var i = 0; i < game.status.waiting.length; i++) {
						game.players[game.status.waiting[i]].position = i
						game.players[game.status.waiting[i]].inPlay = true
					}

				// first player
					if (game.status.currentTurn) {
						game.players[game.status.currentTurn].isTurn = false
					}
					game.status.currentTurn = game.status.waiting[0]
					game.players[game.status.currentTurn].isTurn = true

				// deal cards
					var position = 0
					while (game.draw.length) {
						game = moveCard(game, {cardId: game.draw[0].id, fromId: "draw", toId: game.status.waiting[position]})
						
						position++
						if (position >= game.status.waiting.length) {
							position = 0
						}
					}

				// update game count
					game.status.game++

				// taxation?
					if (game.status.game > 1) {
						game.status.taxation = true

						game.players[game.status.waiting[0]].taxationPending = 2
						game.players[game.status.waiting[1]].taxationPending = 1
						game.players[game.status.waiting[game.status.waiting.length - 2]].taxationPending = 1
						game.players[game.status.waiting[game.status.waiting.length - 1]].taxationPending = 2

						game.status.messages.push({id: CORE.generateRandom(), message: "taxation!"})

						game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.waiting[game.status.waiting.length - 2]].name + " must send lowest card to " + game.players[game.status.waiting[1]].name})
						game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.waiting[1]].name + " must send any card to " + game.players[game.status.waiting[game.status.waiting.length - 2]].name})

						game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.waiting[game.status.waiting.length - 1]].name + " must send 2 lowest cards to " + game.players[game.status.waiting[0]].name})
						game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.waiting[0]].name + " must send any 2 cards to " + game.players[game.status.waiting[game.status.waiting.length - 1]].name})
					}

				// else start
					else {
						game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.currentTurn].name + " begins the round"})
					}

				// reset waiting
					game.status.waiting = []

				// return
					return game
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* setWaiting */
		module.exports.setWaiting = setWaiting
		function setWaiting(game) {
			try {
				// move to waiting
					game.players[game.status.currentTurn].inPlay = false
					game.status.waiting.push(game.status.currentTurn)
					game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.currentTurn].name + " finishes"})

				// not the first one there?
					if (game.status.waiting.length > 1) {
						return game
					}

				// first one there --> next monarch
					game.players[game.status.currentTurn].monarchyCount++
					game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.currentTurn].name + " will be the next monarch"})

				// not yet monarchyToWin?
					if (game.players[game.status.currentTurn].monarchyCount < CORE.getAsset("constants").monarchyToWin) {
						return game
					}

				// hit the limit --> game over
					game.status.winner = game.status.currentTurn
					game.status.messages.push({id: CORE.generateRandom(), message: game.players[game.status.currentTurn].name + " wins!"})
					game.status.endTime = new Date().getTime()
					return game
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* sanitizeGame */
		module.exports.sanitizeGame = sanitizeGame
		function sanitizeGame(gameInput, playerId) {
			try {
				// validate
					if (!gameInput || !Object.keys(gameInput.players).length) {
						return null
					}

				// create a copy
					var game = CORE.duplicateObject(gameInput)


				// player session id
					for (var i in game.players) {
						delete game.players[i].sessionId
					}

				// hide everyone's cards
					for (var i in game.players) {
						if (!playerId || game.players[i].id !== playerId) {
							for (var j in game.players[i].cards) {
								game.players[i].cards[j] = null
							}
						}
					}

				// return
					return game
			}
			catch (error) {
				CORE.logError(error)
			}
		}

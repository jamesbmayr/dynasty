window.addEventListener("load", function() {
	/*** globals ***/
		/* triggers */
			window.TRIGGERS = {
				submit: "submit",
				change: "change",
				input: "input",
				focus: "focus",
				blur: "blur",
				resize: "resize",
				keydown: "keydown",
				keyup: "keyup"
			}
			if ((/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i).test(navigator.userAgent)) {
				window.TRIGGERS.click = "touchstart"
				window.TRIGGERS.mousedown = "touchstart"
				window.TRIGGERS.mousemove = "touchmove"
				window.TRIGGERS.mouseup = "touchend"
				window.TRIGGERS.mouseenter = "touchstart"
				window.TRIGGERS.mouseleave = "touchend"
				window.TRIGGERS.rightclick = "contextmenu"
			}
			else {
				window.TRIGGERS.click = "click"
				window.TRIGGERS.mousedown = "mousedown"
				window.TRIGGERS.mousemove = "mousemove"
				window.TRIGGERS.mouseup = "mouseup"
				window.TRIGGERS.mouseenter = "mouseenter"
				window.TRIGGERS.mouseleave = "mouseleave"
				window.TRIGGERS.rightclick = "contextmenu"
			}

		/* defaults */
			document.addEventListener("dblclick", function(event) {
				event.preventDefault()
			})

			document.addEventListener("contextmenu", function(event) {
				event.preventDefault()
			})

		/* constants */
			var CONSTANTS = {
				circle: 360,
				hasClicked: false
			}

		/* ids */
			var PLAYERID = null

		/* elements */
			var ELEMENTS = {
				start: {
					form: document.querySelector("#start-form"),
					button: document.querySelector("#start-button")
				},
				backlink: document.querySelector("#back-link-outer"),
				gameTable: {
					element: document.querySelector("#game-table"),
					center: document.querySelector("#game-table-center"),
					pile: document.querySelector("#game-table-pile"),
					messages: document.querySelector("#game-table-messages"),
					players: {
						element: document.querySelector("#game-table-players")
					}
				},
				audio: document.querySelector("#audio")
			}

	/*** tools ***/
		/* rangeRandom */
			function rangeRandom(start, end) {
				try {
					// not numbers
						if (isNaN(start) || isNaN(end)) {
							return 0
						}

					// calculate
						return Math.floor(Math.random() * (end - start)) + start
				}
				catch (error) {console.log(error)}
			}

		/* showToast */
			window.TOASTTIME = null
			function showToast(data) {
				try {
					// clear existing countdowns
						if (window.TOASTTIME) {
							clearTimeout(window.TOASTTIME)
							window.TOASTTIME = null
						}

					// append
						if (!window.TOAST) {
							window.TOAST = document.createElement("div")
							window.TOAST.id = "toast"
							window.TOAST.setAttribute("visibility", false)
							window.TOAST.setAttribute("success", false)
							document.body.appendChild(window.TOAST)
						}

					// show
						window.TOAST.innerHTML = data.message
						window.TOAST.setAttribute("success", data.success || false)
						window.TOAST.setAttribute("visibility", true)

					// hide
						window.TOASTTIME = setTimeout(function() {
							window.TOAST.setAttribute("visibility", false)
						}, 5000)
				} catch (error) {console.log(error)}
			}

	/*** socket ***/
		/* start */
			var SOCKET = null
			var SOCKETCHECK = null
			var PINGINTERVAL = 60 * 1000
			checkSocket()

		/* checkSocket */
			function checkSocket() {
				createSocket()
				SOCKETCHECK = setInterval(function() {
					try {
						if (!SOCKET) {
							try {
								createSocket()
							}
							catch (error) {console.log(error)}
						}
						else {
							clearInterval(SOCKETCHECK)
						}
					}
					catch (error) {console.log(error)}
				}, 5000)
			}

		/* createSocket */
			function createSocket() {
				try {
					SOCKET = new WebSocket(location.href.replace("http","ws"))
					SOCKET.keepPinging = false
					SOCKET.onopen = function() {
						SOCKET.send(null)
					}
					SOCKET.onerror = function(error) {
						showToast({success: false, message: error})
					}
					SOCKET.onclose = function() {
						showToast({success: false, message: "disconnected"})
						SOCKET = null
						checkSocket()
					}
					SOCKET.onmessage = function(message) {
						try {
							SOCKET.keepPinging = true
							var post = JSON.parse(message.data)
							if (post && (typeof post == "object")) {
								receiveSocket(post)
							}
						}
						catch (error) {console.log(error)}
					}

					if (SOCKET.pingLoop) {
						clearInterval(SOCKET.pingLoop)
					}
					SOCKET.pingLoop = setInterval(function() {
						if (SOCKET.keepPinging) {
							SOCKET.keepPinging = false
							fetch("/ping", {method: "GET"})
								.then(function(response){ return response.json() })
								.then(function(data) {})
						}
					}, PINGINTERVAL)
				}
				catch (error) {console.log(error)}
			}

		/* receiveSocket */
			function receiveSocket(data) {
				try {
					// meta
						// redirect
							if (data.location) {
								window.location = data.location
								return
							}
							
						// failure
							if (!data || !data.success) {
								showToast({success: false, message: data.message || "unknown websocket error"})
								return
							}

						// toast
							if (data.message) {
								showToast(data)
							}

					// ids
						// player id
							if (data.playerId) {
								PLAYERID = data.playerId
							}

					// data
						// game data
							if (data.game) {
								displayCenter(data.game.status, data.game.pile)
								displayPlayers(data.game.players)
							}
				} catch (error) {console.log(error)}
			}

	/*** builds ***/
		/* buildPlayer */
			function buildPlayer(player) {
				try {
					// element
						var playerElement = document.createElement("div")
							playerElement.className = "player"
							playerElement.id = "game-table-player-" + player.id
						ELEMENTS.gameTable.players[player.id] = playerElement
						ELEMENTS.gameTable.players.element.appendChild(playerElement)

					// self?
						if (PLAYERID && PLAYERID == player.id) {
							playerElement.className += " self"

							// send
								var sendButton = document.createElement("button")
									sendButton.className = "player-button"
									sendButton.id = "game-table-send"
									sendButton.innerText = "send"
									sendButton.addEventListener(TRIGGERS.click, selectCards)
								playerElement.appendChild(sendButton)

							// pass
								var passButton = document.createElement("button")
									passButton.className = "player-button"
									passButton.id = "game-table-pass"
									passButton.innerText = "pass"
									passButton.addEventListener(TRIGGERS.click, selectPass)
								playerElement.appendChild(passButton)

							// play
								var playButton = document.createElement("button")
									playButton.className = "player-button"
									playButton.id = "game-table-play"
									playButton.innerText = "play"
									playButton.addEventListener(TRIGGERS.click, selectCards)
								playerElement.appendChild(playButton)

							// stay
								var stayButton = document.createElement("button")
									stayButton.className = "player-button"
									stayButton.id = "game-table-stay"
									stayButton.innerText = "stay"
									stayButton.addEventListener(TRIGGERS.click, selectStay)
								playerElement.appendChild(stayButton)

							// quit
								var quitButton = document.createElement("button")
									quitButton.className = "player-button"
									quitButton.id = "game-table-quit"
									quitButton.innerText = "quit"
									quitButton.addEventListener(TRIGGERS.click, selectQuit)
								playerElement.appendChild(quitButton)
						}

					// not self
						else {
							playerElement.addEventListener(TRIGGERS.click, selectPlayer)
						}

					// cards
						var cardsOuterElement = document.createElement("div")
							cardsOuterElement.className = "player-cards-outer"
						playerElement.appendChild(cardsOuterElement)

						var cardsInnerElement = document.createElement("div")
							cardsInnerElement.className = "player-cards-inner"
						cardsOuterElement.appendChild(cardsInnerElement)

					// name
						var nameElement = document.createElement("button")
							nameElement.className = "player-name"
							nameElement.innerHTML = player.name
						playerElement.appendChild(nameElement)

					// monarchy
						var monarchyElement = document.createElement("span")
							monarchyElement.className = "player-monarchy"
						nameElement.appendChild(monarchyElement)

					// return element
						return playerElement
				} catch (error) {console.log(error)}
			}

		/* buildCard */
			function buildCard(card, container) {
				try {
					// create card element
						var cardElement = document.createElement("button")
							cardElement.className = "card"

					// known?
						if (card && card.id) {
							cardElement.id = "card-" + card.id
							cardElement.innerText = card.value + (card.tempValue ? " (" + card.tempValue + ")" : "")
							cardElement.setAttribute("value", card.value)

							// where from
								if (card.fromId && !["draw", "pile", "discard"].includes(card.fromId)) {
									// to pile
										if (card.toId && card.toId == "pile") {
											var previousElement = document.querySelector("#game-table-player-" + card.fromId)									
											if (previousElement) {
												// set starting top & left
													var previousRect = previousElement.getBoundingClientRect()
													var containerRect = container.getBoundingClientRect()
													cardElement.style.top = previousRect.top + (previousRect.height / 2) - containerRect.top + "px"
													cardElement.style.left = previousRect.left + (previousRect.width / 2) - containerRect.left + "px"

												// animate movement
													setTimeout(function() {
														cardElement.style.top = "50%"
														cardElement.style.left = "50%"
													}, 100)
											}
										}

									// to another player (taxation)
										else {
											cardElement.setAttribute("fadedOut", true)
											setTimeout(function() {
												cardElement.removeAttribute("fadedOut")
												cardElement.setAttribute("fadeIn", true)
											}, 100)
											setTimeout(function() {
												cardElement.removeAttribute("fadeIn")
											}, 5000)
										}
								}

							// player
								if (container !== ELEMENTS.gameTable.pile) {
									cardElement.addEventListener(window.TRIGGERS.click, selectCard)
								}
						}

					// append
						container.appendChild(cardElement)

					// return
						return cardElement
				} catch (error) {console.log(error)}
			}

	/*** displays ***/
		/* displayCenter */
			function displayCenter(status, pile) {
				try {
					// start?
						if (status.startTime) {
							ELEMENTS.start.form.setAttribute("visibility", false)
						}

					// end?
						if (status.endTime) {
							ELEMENTS.backlink.removeAttribute("visibility")
						}

					// taxation
						if (status.taxation) {
							ELEMENTS.gameTable.element.setAttribute("taxation", true)
						}
						else {
							ELEMENTS.gameTable.element.removeAttribute("taxation")
						}

					// in between
						if (status.inBetween) {
							ELEMENTS.gameTable.element.setAttribute("inBetween", true)
						}
						else {
							ELEMENTS.gameTable.element.removeAttribute("inBetween")
						}

					// pile
						displayPile(pile)

					// messages
						for (var i = 0; i < status.messages.length; i++) {
							if (!ELEMENTS.gameTable.messages.querySelector("#message-" + status.messages[i].id)) {
								var messageElement = document.createElement("div")
									messageElement.id = "message-" + status.messages[i].id
									messageElement.className = "message"
									messageElement.innerText = status.messages[i].message
								ELEMENTS.gameTable.messages.prepend(messageElement)
							}
						}
				} catch (error) {console.log(error)}
			}

		/* displayPile */
			function displayPile(pile) {
				try {
					// pile
						var currentCards = Array.from(ELEMENTS.gameTable.pile.querySelectorAll(".card"))
						var allCurrentCardIds = currentCards.map(function(c) { return c.id.replace("card-", "") })
						var allCardIds = pile.map(function(c) { return c.id })

					// loop through existing cards
						for (var i in currentCards) {
							// remove cleared cards
								if (!allCardIds.includes(currentCards[i].id.replace("card-", ""))) {
									// animate movement
										currentCards[i].setAttribute("removing", true)
										removeCard(currentCards[i].id)
								}

							// shift pile
								else {
									var xOffset = Math.max(25, Math.min(75, Number(currentCards[i].getAttribute("xOffset")) + rangeRandom(-1, 1)))
									var yOffset = Math.max(25, Math.min(75, Number(currentCards[i].getAttribute("yOffset")) + rangeRandom(-1, 1)))
									var aOffset = Number(currentCards[i].getAttribute("aOffset")) + rangeRandom(-5, 5)
									currentCards[i].style.transform = "translateX(-" + xOffset + "%) translateY(-" + yOffset + "%) rotate(" + aOffset + "deg)"
								}
						}

					// add new cards
						for (var i = 0; i < pile.length; i++) {
							if (!allCurrentCardIds.includes(pile[i].id)) {
								var card = buildCard(pile[i], ELEMENTS.gameTable.pile)

								// get offsets
									if (i !== pile.length - 1) {
										var xOffset = rangeRandom(25, 75)
										var yOffset = rangeRandom(25, 75)
										var aOffset = rangeRandom(0, 360)
									}
									else {
										var xOffset = 50
										var yOffset = 50
										var aOffset = 0
									}

								// set offsets
									card.setAttribute("xOffset", xOffset)
									card.setAttribute("yOffset", yOffset)
									card.setAttribute("aOffset", aOffset)
									card.style.transform = "translateX(-" + xOffset + "%) translateY(-" + yOffset + "%) rotate(" + aOffset + "deg)"
							}
						}
				} catch (error) {console.log(error)}
			}

		/* removeCard */
			function removeCard(cardId) {
				try {
					// remove after fade
						setTimeout(function() {
							var card = document.querySelector("#" + cardId)
							if (card) {
								card.remove()
							}
						}, 1000)
				} catch (error) {console.log(error)}
			}

		/* displayPlayers */
			function displayPlayers(players) {
				try {
					// remove players who have left
						var playerElements = Array.from(ELEMENTS.gameTable.players.element.querySelectorAll(".player"))
						if (playerElements && playerElements.length) {
							for (var i in playerElements) {
								if (!players[playerElements[i].id.replace("game-table-player-", "")]) {
									playerElements[i].remove()
								}
							}
						}

					// display individuals
						for (var i in players) {
							displayPlayer(players[i])
						}

					// rotation
						// in game?
							if (PLAYERID) {
								var playerCount = Object.keys(players).length
								var angle = Math.round((CONSTANTS.circle / 2) / (playerCount - 2))
								var countOffset = PLAYERID ? players[PLAYERID].position : 0
								var shiftAngle = (CONSTANTS.circle / 4)

								if (playerCount == 2) {
									for (var i in players) {
										if (i !== PLAYERID) {
											var playerElement = ELEMENTS.gameTable.players[players[i].id]
												playerElement.style.transform = "translateX(-50%) translateY(-50%) rotate(" + 180 + "deg) translateY(calc(var(--card-size) * 3))"
												playerElement.style["z-index"] = 1
										}
									}
								}
								else {
									for (var i in players) {
										if (i !== PLAYERID) {
											var calculatedOffset = (players[i].position - countOffset - 1 + playerCount) % playerCount
											var calculatedAngle = (calculatedOffset * angle) + shiftAngle
											var playerElement = ELEMENTS.gameTable.players[players[i].id]
												playerElement.style.transform = "translateX(-50%) translateY(-50%) rotate(" + calculatedAngle + "deg) translateY(calc(var(--card-size) * (3 + (var(--desktop-modifier) * " + Math.abs(180 - calculatedAngle) / 45 + "))))"
												playerElement.style["z-index"] = calculatedOffset + 1
										}
									}
								}
							}

						// not in game
							else {
								var playerCount = Object.keys(players).length
								var angle = Math.round(CONSTANTS.circle / playerCount)

								for (var i in players) {
									var playerElement = ELEMENTS.gameTable.players[players[i].id]
										playerElement.style.transform = "translateX(-50%) translateY(-50%) rotate(" + (players[i].position * angle) + "deg) translateY(calc(var(--card-size) * 3)) "
								}
							}
				} catch (error) {console.log(error)}
			}

		/* displayPlayer */
			function displayPlayer(player) {
				try {
					// find player element
						var playerElement = ELEMENTS.gameTable.players[player.id]
						if (!playerElement) {
							playerElement = buildPlayer(player)
						}

					// highlight if this player is doing taxation
						if (player.taxationPending) {
							playerElement.setAttribute("isTaxation", true)
						}
						else {
							playerElement.removeAttribute("isTaxation")
						}

					// highlight if this player is still deciding
						if (player.stillDeciding) {
							playerElement.setAttribute("stillDeciding", true)
						}
						else {
							playerElement.removeAttribute("stillDeciding")
						}

					// highlight if it is this player's turn
						if (!player.taxationPending && player.isTurn) {
							// chime on own turn
								if (PLAYERID && player.id == PLAYERID && !playerElement.getAttribute("isTurn") && CONSTANTS.hasClicked) {
									ELEMENTS.audio.load()
									ELEMENTS.audio.play()
								}

							playerElement.setAttribute("isTurn", true)
						}
						else {
							playerElement.removeAttribute("isTurn")
						}

					// lowlight if this player is finished
						if (!player.cards.length && !player.stillDeciding) {
							playerElement.setAttribute("isDone", true)
						}
						else {
							playerElement.removeAttribute("isDone")
						}

					// monarchy
						var monarchyElement = playerElement.querySelector(".player-monarchy")
							monarchyElement.innerHTML = ""
						for (var i = 0; i < player.monarchyCount; i++) {
							monarchyElement.innerHTML += " &#x1F451;"
						}

					// clear cards
						var cardsElement = playerElement.querySelector(".player-cards-inner")
							cardsElement.innerHTML = ""

					// display cards
						if (PLAYERID && PLAYERID == player.id) {
							player.cards = player.cards.sort(function(a, b) {
								if (a && b) {
									return (Number(a.value) || 0) - (Number(b.value) || 0)
								}
							})
						}	
						for (var i in player.cards) {
							buildCard(player.cards[i], cardsElement)
						}
				} catch (error) {console.log(error)}
			}

	/*** submits ***/
		/* startGame */
			ELEMENTS.start.form.addEventListener(window.TRIGGERS.submit, startGame)
			function startGame(event) {
				try {
					// clicked
						if (!CONSTANTS.hasClicked) { CONSTANTS.hasClicked = true }

					// not a player
						if (!PLAYERID) {
							return false
						}

					// sendPost
						SOCKET.send(JSON.stringify({
							action: "startGame"
						}))
				} catch (error) {console.log(error)}
			}

		/* selectPlayer */
			function selectPlayer(event) {
				try {
					// clicked
						if (!CONSTANTS.hasClicked) { CONSTANTS.hasClicked = true }

					// get player
						var playerElement = event.target.className == "player" ? event.target : event.target.closest(".player:not(.self)")
						if (!playerElement) {
							return false
						}

					// toggle
						if (playerElement.getAttribute("onTop")) {
							playerElement.removeAttribute("onTop")
						}
						else {
							var playerElements = Array.from(ELEMENTS.gameTable.players.element.querySelectorAll(".player"))
							for (var i in playerElements) {
								playerElements[i].removeAttribute("onTop")
							}
							playerElement.setAttribute("onTop", true)
						}
				} catch (error) {console.log(error)}
			}

		/* selectPass */
			function selectPass(event) {
				try {
					// clicked
						if (!CONSTANTS.hasClicked) { CONSTANTS.hasClicked = true }

					// not a player
						if (!PLAYERID) {
							return false
						}

					// sendPost
						SOCKET.send(JSON.stringify({
							action: "selectPass"
						}))
				} catch (error) {console.log(error)}
			}

		/* selectCard */
			function selectCard(event) {
				try {
					// clicked
						if (!CONSTANTS.hasClicked) { CONSTANTS.hasClicked = true }

					// not a player
						if (!PLAYERID) {
							return false
						}

					// not a card?
						if (event.target.className !== "card") {
							return false
						}

					// already selected?
						if (event.target.getAttribute("selected")) {
							event.target.removeAttribute("selected")
							if (!Array.from(ELEMENTS.gameTable.players[PLAYERID].querySelectorAll(".card[selected='true']")).length) {
								ELEMENTS.gameTable.players[PLAYERID].querySelector("#game-table-pass").removeAttribute("unavailable")
							}
						}

					// newly selected
						else {
							event.target.setAttribute("selected", true)
							ELEMENTS.gameTable.players[PLAYERID].querySelector("#game-table-pass").setAttribute("unavailable", true)
						}
				} catch (error) {console.log(error)}
			}

		/* selectCards */
			function selectCards(event) {
				try {
					// clicked
						if (!CONSTANTS.hasClicked) { CONSTANTS.hasClicked = true }

					// not a player
						if (!PLAYERID) {
							return false
						}

					// get ids
						var ids = []
						document.querySelectorAll(".card[selected='true']").forEach(function(element) {
							ids.push(element.id.replace("card-", ""))
						})

					// none selected?
						if (!ids || !ids.length) {
							showToast({success: false, message: "no cards selected"})
							return false
						}

					// reenable pass
						ELEMENTS.gameTable.players[PLAYERID].querySelector("#game-table-pass").removeAttribute("unavailable")

					// sendPost
						SOCKET.send(JSON.stringify({
							action: "selectCards",
							selectedCardIds: ids,
						}))
				} catch (error) {console.log(error)}
			}

		/* selectStay */
			function selectStay(event) {
				try {
					// clicked
						if (!CONSTANTS.hasClicked) { CONSTANTS.hasClicked = true }

					// not a player
						if (!PLAYERID) {
							return false
						}

					// sendPost
						SOCKET.send(JSON.stringify({
							action: "selectStay"
						}))
				} catch (error) {console.log(error)}
			}

		/* selectQuit */
			function selectQuit(event) {
				try {
					// clicked
						if (!CONSTANTS.hasClicked) { CONSTANTS.hasClicked = true }

					// not a player
						if (!PLAYERID) {
							return false
						}

					// sendPost
						SOCKET.send(JSON.stringify({
							action: "selectQuit"
						}))
				} catch (error) {console.log(error)}
			}
})
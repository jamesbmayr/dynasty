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
				circle: 360
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
				}
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
							var post = JSON.parse(message.data)
							if (post && (typeof post == "object")) {
								receiveSocket(post)
							}
						}
						catch (error) {console.log(error)}
					}
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
											var playerElement = ELEMENTS.gameTable.players[players[i].id]
												playerElement.style.transform = "translateX(-50%) translateY(-50%) rotate(" + ((calculatedOffset * angle) + shiftAngle) + "deg) translateY(calc(var(--card-size) * 3)) "
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

					// highlight if it is this player's turn
						if (!player.taxationPending && player.isTurn) {
							playerElement.setAttribute("isTurn", true)
						}
						else {
							playerElement.removeAttribute("isTurn")
						}

					// lowlight if this player is out
						if (!player.inPlay) {
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
								return (Number(a.value) || 0) - (Number(b.value) || 0)
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

		/* selectPass */
			function selectPass(event) {
				try {
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
						}

					// newly selected
						else {
							event.target.setAttribute("selected", true)
						}
				} catch (error) {console.log(error)}
			}

		/* selectCards */
			function selectCards(event) {
				try {
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

					// sendPost
						SOCKET.send(JSON.stringify({
							action: "selectCards",
							selectedCardIds: ids,
						}))
				} catch (error) {console.log(error)}
			}
})
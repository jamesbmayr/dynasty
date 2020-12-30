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

	/*** elements ***/
		var ELEMENTS = {
			playerNameInput: document.querySelector("#player-name-input"),
			newGameForm: document.querySelector("#new-game-form"),
			newGameButton: document.querySelector("#new-game-button"),
			joinGameForm: document.querySelector("#join-game-form"),
			gameIdInput: document.querySelector("#game-id-input"),
			joinGameButton: document.querySelector("#join-game-button")
		}

	/*** tools ***/
		/* sendPost */
			function sendPost(options, callback) {
				try {
					// create request object and send to server
						var request = new XMLHttpRequest()
							request.open("POST", location.pathname, true)
							request.onload = function() {
								if (request.readyState !== XMLHttpRequest.DONE || request.status !== 200) {
									callback({success: false, readyState: request.readyState, message: request.status})
									return
								}
								
								callback(JSON.parse(request.responseText) || {success: false, message: "unknown error"})
							}
							request.send(JSON.stringify(options))
				} catch (error) {console.log(error)}
			}

		/* receivePost */
			function receivePost(data) {
				try {
					// redirect
						if (data.location) {
							window.location = data.location
							return
						}

					// message
						if (data.message) {
							showToast(data)
						}
				} catch (error) {console.log(error)}
			}

		/* isNumLet */
			function isNumLet(string) {
				try {
					return (/^[a-zA-Z0-9]+$/).test(string)
				} catch (error) {console.log(error)}
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
						setTimeout(function() {
							window.TOAST.innerHTML = data.message
							window.TOAST.setAttribute("success", data.success || false)
							window.TOAST.setAttribute("visibility", true)
						}, 200)

					// hide
						window.TOASTTIME = setTimeout(function() {
							window.TOAST.setAttribute("visibility", false)
						}, 5000)
				} catch (error) {console.log(error)}
			}

	/*** submits ***/
		/* submitNewGame */
			ELEMENTS.newGameForm.addEventListener(window.TRIGGERS.submit, submitNewGame)
			function submitNewGame(event) {
				try {
					// validation
						var playerName = ELEMENTS.playerNameInput.value || null
						if (!playerName || playerName.length < 3 || playerName.length > 15 || !isNumLet(playerName)) {
							showToast({success: false, message: "name must be 3-15 letters & numbers"})
							return
						}

					// post
						sendPost({
							action: "createGame",
							name: playerName
						}, receivePost)
				} catch (error) {console.log(error)}
			}

		/* submitJoinGame */
			ELEMENTS.joinGameForm.addEventListener(window.TRIGGERS.submit, submitJoinGame)
			function submitJoinGame(event) {
				try {
					// validation
						var playerName = ELEMENTS.playerNameInput.value || null
						if (!playerName || playerName.length < 3 || playerName.length > 15 || !isNumLet(playerName)) {
							showToast({success: false, message: "name must be 3-15 letters & numbers"})
							return
						}

						var gameId = ELEMENTS.gameIdInput.value || null
						if (!gameId || gameId.length !== 4 || !isNumLet(gameId)) {
							showToast({success: false, message: "game id must be 4 letters & numbers"})
							return
						}

					// post
						sendPost({
							action: "joinGame",
							name: playerName,
							gameId: gameId
						}, receivePost)
				} catch (error) {console.log(error)}
			}
})
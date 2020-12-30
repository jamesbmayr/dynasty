# Dynasty
Dynasty is a multiplayer multi-round elimination card game by James Mayr inspired by The Great Dalmuti

---
<pre>
</pre>
---

## Rules

### The Deck
The deck is composed of cards ranging from 1 to 12. There are twelve 12s, eleven 11s, and so on down to one 1. Additionally, there are two Wild cards.

### Start
Shuffle the deck and deal cards as evenly as possible to all players. Some players may start with one card more than others.

### Turn Order
During the first game, turn order is random. In every subsequent game, turn order is determined by the order in which players finished the previous game.

### Game Play
If you start the round, you may select a set of matching cards from your hand. This may be any quantity, from one to the total number of cards of that type you have. Play these face-up in the center. Play passes to the next player.

All subsequent players must either pass their turn or match the quantity of cards, but with a lower value. For example, if you started by playing three 12s, the next player may play three 11s or three 10s, etc., down to three 1s (that is, playing the one 1 and two Wild cards). If a player passes, they cannot play again this round. The last player to play clears the cards and starts the next round.

If you play all of your cards, you are finished for this game. If you were the last person to play on a round before it was cleared, then the next player starts instead.

### Resetting
After all players have finished, change turn order. The first player to finish will be the monarch for the next round.
	
### End
The game ends after someone earns the monarchy for the 3rd time.


## Code
The app is powered by nodeJS, written in 100% raw javascript.
It uses the following packages:
* *websocket*: for real-time communication between client and server

---
<pre>
dynasty
|
|- package.json
|
|- index.js
|
|- node_modules
|   |- websocket
|
|- node
|   |- core.js
|   |- game.js
|   |- session.js
|
|- js
|   |- game.js
|   |- home.js
|   |- main.js
|
|- css
|   |- game.css
|   |- home.css
|   |- main.css
|
|- html
|   |- _404.html
|   |- game.html
|   |- home.html
|
|- assets
	|- logo.png
</pre>

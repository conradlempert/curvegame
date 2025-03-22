# curvegame

## Play the game online

Play it here: **https://curvegame.onrender.com**

## General info

<img src="https://github.com/user-attachments/assets/41cc399e-0852-4b34-a243-791d47119505" width="500"/>

This is a multiplayer game about surviving the longest as a snake.

It is written in TypeScript with a Vite vanilla frontend and express/socket.io backend.

## Host the server locally

Run this in the root folder of the repository:

```
npm install
npm run build
npm run prod
```

## Play the game locally

This is a multiplayer game (i.e., you want to join the server from multiple clients).

If you are playing on the computer that is running the server, go to `http://localhost:3000`.

If you want to join from another computer on the local network, first find out the local IP address of the server ([tutorial](https://www.whatismybrowser.com/detect/what-is-my-local-ip-address/)), which looks something like e.g. `192.168.1.60`. Then you would join the server from another computer by opening e.g. `http://192.168.1.60:3000`.

## Development server

Run this in the root folder of the repository:

```
npm install
npm run dev
```

Then open the frontend at `http://localhost:5173`.

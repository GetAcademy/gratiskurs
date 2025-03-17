class MazeCanvas extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.tileMap = {
            0b0001: 'left',         // Kun venstre åpent
            0b0010: 'down',         // Kun ned åpent
            0b0011: 'down-left',    // Ned og venstre åpent
            0b0100: 'right',        // Kun høyre åpent
            0b0101: 'left-right',   // Venstre og høyre åpent
            0b0110: 'right-down',   // Høyre og ned åpent
            0b0111: 'closed-up',    // Opp lukket
            0b1000: 'up',           // Kun opp åpent
            0b1001: 'up-left',      // Opp og venstre åpent
            0b1010: 'up-down',      // Opp og ned åpent
            0b1011: 'closed-right', // Høyre lukket
            0b1100: 'up-right',     // Opp og høyre åpent
            0b1101: 'closed-down',  // Ned lukket
            0b1110: 'closed-left',  // Venstre lukket
            0b1111: 'open',         // Alle fire veggene er åpne
        };

    }

    connectedCallback() {
        const div = document.createElement('div');
        this.canvas = document.createElement('canvas');
        this.shadowRoot.appendChild(div);
        div.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        const model = this.model = {};
        model.labyrinthSize = parseInt(this.getAttribute('size'));
        model.cornerSize = 16;
        model.wallToCornerRatio = 4;
        model.directions = ['opp', 'ned', 'høyre', 'venstre'];
        model.oppositeDirection = {
            'opp': 'ned',
            'ned': 'opp',
            'venstre': 'høyre',
            'høyre': 'venstre',
        };
        model.openWalls = {};
        model.wallSize = model.cornerSize * model.wallToCornerRatio;
        model.character = {
            roomIndex: 0,
            direction: 'ned',
        };
        model.commandQueue = [];
        this.timer = null;

        model.roomCount = model.labyrinthSize * model.labyrinthSize;
        model.openWalls['opp0'] = true;
        model.openWalls['ned' + (model.roomCount - 1)] = true;
        model.pixels = this.calcWallSize(model.labyrinthSize + 1);
        this.canvas.setAttribute('width', model.pixels);
        this.canvas.setAttribute('height', model.pixels);
        this.generateLabyrinth();
    }

    generateLabyrinth() {
        const model = this.model;
        const rooms = [];
        rooms[0] = true;
        const stack = [];
        stack.push(0);

        while (stack.length > 0) {
            let currentRoom = stack.pop();
            let neighbourNotVisited = this.getNeighbourNotVisited(currentRoom, rooms);
            if (neighbourNotVisited === null) continue;
            stack.push(currentRoom);
            model.openWalls[neighbourNotVisited.direction + currentRoom] = true;
            const directionFromNeighbour = model.oppositeDirection[neighbourNotVisited.direction];
            model.openWalls[directionFromNeighbour + neighbourNotVisited.roomIndex] = true;
            rooms[neighbourNotVisited.roomIndex] = true;
            stack.push(neighbourNotVisited.roomIndex);
        }
    }

    getNeighbourNotVisited(roomIndex, rooms) {
        const model = this.model;
        shuffle(model.directions);
        const rowIndex = Math.floor(roomIndex / model.labyrinthSize);
        const colIndex = roomIndex % model.labyrinthSize;
        for (let direction of model.directions) {
            if (direction == 'opp' && rowIndex > 0 && !rooms[roomIndex - model.labyrinthSize])
                return { roomIndex: roomIndex - model.labyrinthSize, direction };
            if (direction == 'venstre' && colIndex > 0 && !rooms[roomIndex - 1])
                return { roomIndex: roomIndex - 1, direction };
            if (direction == 'høyre' && colIndex < model.labyrinthSize - 1 && !rooms[roomIndex + 1])
                return { roomIndex: roomIndex + 1, direction };
            if (direction == 'ned' && rowIndex < model.labyrinthSize - 1 && !rooms[roomIndex + model.labyrinthSize])
                return { roomIndex: roomIndex + model.labyrinthSize, direction };
        }
        return null;
    }

    drawLabyrinth() {
        const model = this.model;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const fillStyle = this.ctx.fillStyle;
        this.ctx.fillStyle = '#47ABA9';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = fillStyle;
        for (let roomIndex = 0; roomIndex < model.roomCount; roomIndex++) {
            this.drawSquare(roomIndex);
        }
        this.drawCharacter();
    }

    drawCharacter() {
        const ctx = this.ctx;
        const model = this.model;
        const rowIndex = Math.floor(model.character.roomIndex / model.labyrinthSize);
        const colIndex = model.character.roomIndex % model.labyrinthSize;
        let x = this.calcWallSize(colIndex) + 1.5 * model.cornerSize;
        let y = this.calcWallSize(rowIndex) + 1.5 * model.cornerSize;
        const size = model.wallSize - model.cornerSize;
        ctx.beginPath();
        if (model.character.direction == 'høyre') {
            ctx.moveTo(x, y);
            ctx.lineTo(x + size, y + size / 2);
            ctx.lineTo(x, y + size);
        } else if (model.character.direction == 'venstre') {
            ctx.moveTo(x, y + size / 2);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x + size, y + size);
        } else if (model.character.direction == 'opp') {
            ctx.moveTo(x + size / 2, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x + size, y + size);
        } else if (model.character.direction == 'ned') {
            ctx.moveTo(x, y);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x + size / 2, y + size);
        }
        ctx.fill();
    }

    drawSquare(roomIndex) {
        const model = this.model;
        const rowIndex = Math.floor(roomIndex / model.labyrinthSize);
        const colIndex = roomIndex % model.labyrinthSize;

        let x = this.calcWallSize(colIndex) + model.cornerSize;
        let y = this.calcWallSize(rowIndex) + model.cornerSize;

        const isOpenUp = model.openWalls['opp' + roomIndex] || false;
        const isOpenRight = model.openWalls['høyre' + roomIndex] || false;
        const isOpenDown = model.openWalls['ned' + roomIndex] || false;
        const isOpenLeft = model.openWalls['venstre' + roomIndex] || false;

        const tileKey = (isOpenUp << 3) | (isOpenRight << 2) | (isOpenDown << 1) | (isOpenLeft << 0);
        const imageName = this.tileMap[tileKey];

        const image = images[imageName];
        if (image) {
            this.ctx.drawImage(image, x, y);
        } else {
            console.log(isOpenUp, isOpenRight, isOpenDown, isOpenLeft, tileKey, imageName);
        }

        if (isOpenUp) {
            const wallX = x;
            const wallY = y - model.cornerSize; // Flytt opp for å tegne mellomrommet
            const wallWidth = model.wallSize;
            const wallHeight = model.cornerSize; // Kun de øverste 16 pikslene

            const upDownImage = images['up-down'];
            if (upDownImage) {
                this.ctx.drawImage(upDownImage, 0, 0, wallWidth, wallHeight, wallX, wallY, wallWidth, wallHeight);
            }
        }

        if (isOpenDown) {
            const wallX = x;
            const wallY = y + model.wallSize; // Plasser under
            const wallWidth = model.wallSize;
            const wallHeight = model.cornerSize;

            const upDownImage = images['up-down'];
            if (upDownImage) {
                this.ctx.drawImage(upDownImage, 0, 0, wallWidth, wallHeight, wallX, wallY, wallWidth, wallHeight);
            }
        }

        // Tegn horisontal åpning mellom to ruter hvis veggen er åpen til venstre
        if (isOpenLeft) {
            const wallX = x - model.cornerSize; // Flytt til venstre
            const wallY = y;
            const wallWidth = model.cornerSize; // Kun de venstre 16 pikslene
            const wallHeight = model.wallSize;

            const leftRightImage = images['left-right'];
            if (leftRightImage) {
                this.ctx.drawImage(leftRightImage, 0, 0, wallWidth, wallHeight, wallX, wallY, wallWidth, wallHeight);
            }
        }

        // Tegn horisontal åpning mellom to ruter hvis veggen er åpen til høyre
        if (isOpenRight) {
            const wallX = x + model.wallSize; // Flytt til høyre
            const wallY = y;
            const wallWidth = model.cornerSize; // Kun de høyre 16 pikslene
            const wallHeight = model.wallSize;

            const leftRightImage = images['left-right'];
            if (leftRightImage) {
                this.ctx.drawImage(leftRightImage, 0, 0, wallWidth, wallHeight, wallX, wallY, wallWidth, wallHeight);
            }
        }

    }

    calcWallSize(index) {
        const model = this.model;
        return index * model.wallSize + (index + 1) * model.cornerSize;
    }

    snuHøyre() {
        const model = this.model;
        model.character.direction = {
            'opp': 'høyre',
            'høyre': 'ned',
            'ned': 'venstre',
            'venstre': 'opp',
        }[model.character.direction];
        this.drawLabyrinth();
        return model.character.direction;
    }

    gå() {
        const model = this.model;
        if (!model.openWalls[model.character.direction + model.character.roomIndex]) return false;
        const position = this.getRowAndCol(model.character.roomIndex);

        if (model.character.direction == 'opp' && position.rowIndex > 0) model.character.roomIndex -= model.labyrinthSize;
        else if (model.character.direction == 'venstre' && position.colIndex > 0) model.character.roomIndex -= 1;
        else if (model.character.direction == 'høyre' && position.colIndex < model.labyrinthSize - 1) model.character.roomIndex += 1;
        else if (model.character.direction == 'ned' && position.rowIndex < model.labyrinthSize - 1) model.character.roomIndex += model.labyrinthSize;
        this.drawLabyrinth();
        return true;
    }

    getRowAndCol(roomIndex) {
        const model = this.model;
        const rowIndex = Math.floor(roomIndex / model.labyrinthSize);
        const colIndex = roomIndex % model.labyrinthSize;
        return { rowIndex, colIndex };
    }

    // følgVeggx() {
    //     snuHøyre();
    //     if (!gå()) {
    //         snuVenstre();
    //         if (!gå()) {
    //             snuVenstre();
    //         }
    //     }
    // }

    erVedUtgang() {
        const model = this.model;
        return model.character.roomIndex == model.labyrinthSize * model.labyrinthSize - 1;
    }
}

function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

customElements.define('maze-canvas', MazeCanvas);
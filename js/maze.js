class MazeCanvas extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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
        const isFirstCol = colIndex == 0;
        const isFirstRow = rowIndex == 0;
        if (isFirstRow) this.drawWall(rowIndex, colIndex, roomIndex, 'opp');
        if (isFirstCol) this.drawWall(rowIndex, colIndex, roomIndex, 'venstre');
        this.drawWall(rowIndex, colIndex, roomIndex, 'høyre');
        this.drawWall(rowIndex, colIndex, roomIndex, 'ned');
        this.drawCorner(rowIndex, colIndex, 0, 0);
        this.drawCorner(rowIndex, colIndex, 0, 1);
        this.drawCorner(rowIndex, colIndex, 1, 0);
        this.drawCorner(rowIndex, colIndex, 1, 1);

        let x = this.calcWallSize(colIndex) + model.cornerSize;
        let y = this.calcWallSize(rowIndex) + model.cornerSize;
        this.ctx.drawImage(images['down'], x, y);
    }

    drawWall(rowIndex, colIndex, roomIndex, direction) {
        const model = this.model;
        const doorKey = direction + roomIndex;
        if (model.openWalls[doorKey]) return;
        const isDoorHorizontal = direction == 'opp' || direction == 'ned';
        let x = this.calcWallSize(colIndex);
        let y = this.calcWallSize(rowIndex);
        if (direction == 'opp') { x += model.cornerSize; }
        if (direction == 'venstre') { y += model.cornerSize; }
        if (direction == 'høyre') {
            x += model.wallSize + model.cornerSize;
            y += model.cornerSize;
        }
        if (direction == 'ned') {
            y += model.wallSize + model.cornerSize;
            x += model.cornerSize;
        }
        const width = isDoorHorizontal ? model.wallSize : model.cornerSize;
        const height = isDoorHorizontal ? model.cornerSize : model.wallSize;
        this.ctx.fillRect(x, y, width, height);
    }

    drawCorner(rowIndex, colIndex, addX, addY) {
        const model = this.model;
        let x = this.calcWallSize(colIndex) + addX * (model.cornerSize + model.wallSize);
        let y = this.calcWallSize(rowIndex) + addY * (model.cornerSize + model.wallSize);
        this.ctx.fillRect(x, y, model.cornerSize, model.cornerSize);
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
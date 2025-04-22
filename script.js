class Item{
    size;
    time;
    name;
    crit;
    TimeSpent  =0;
    abilities = [];
    hasteTime = 0;
    slowTime = 0;
    freezeTime = 0;
    triggers = [];
    constructor (fab){
        this.size = fab.size;
        this.time = fab.time;
        this.name = fab.name;
        for(let i =0;i<fab.abilities.length;i++){
            const currentAbility = fab.abilities[i];
            this.abilities.push(new Ability(currentAbility.funcName,currentAbility.data,currentAbility.target));
        }
        for(let i =0;i<fab.triggers.length;i++){
            const currentTrigger = fab.triggers[i];
            this.triggers.push(new Trigger(currentTrigger.event,currentTrigger.ability));
            this.triggers[i].setPlace(currentTrigger.match,currentTrigger.boardId,currentTrigger.pos);
        }
        this.crit = fab.crit;
    }

    age(match,boardId,pos){
        let ToAge = timeIncrement;

        if(this.hasteTime > 0){
            this.hasteTime--;
            ToAge *= 2;
        }
        if(this.slowTime > 0){
            this.slowTime--;
            ToAge *= .5;
        }
        if(this.freezeTime > 0){
            this.freezeTime--;
            ToAge = 0;
        }
        this.TimeSpent += ToAge;

        if(this.TimeSpent >= this.time){
            this.TimeSpent -= Math.max(this.time,1);
            for(let i = 0;i<this.abilities.length;i++){
                if(this.abilities[i].type != "cool"){continue;};
                this.abilities[i].func(match,boardId,pos);

                //crit chance
                if(Math.random()*100<this.crit){
                    this.abilities[i].func(match,boardId,pos);
                    match.checkTriggers("crit",boardId);
                }
            }
        }
    }
}

class ItemFab{
    size;
    time;
    name;
    abilities;
    crit;
    triggers;

    constructor(name,size,time,crit,abilities,triggers){
        this.name = name;
        this.size = size;
        this.time = time;
        this.abilities = abilities;
        this.crit = crit;
        this.triggers = triggers;
    }
}

class Board{
    maxSize = 5;
    size = 0;
    maxHP = 100;
    hp = 0;
    Play = [];
    shield = 0;
    burn = 0;

    constructor(){
        this.hp = this.maxHP;
    }

    AddToPlay(item,pos){    
        this.Play.splice(pos, 0, item);
        this.size += item.size;
    }

    Mirror(){
        return Object.assign(
            new Board(),
            {
                ...this,
                Play: this.Play.map(item => new Item(item))
            }
        );
    }
}

class Match{
    Boards = [];
    players = [];
    winner = -1;
    closed = false;
    triggers = [];
    constructor(board1,board2,player1,player2){
        // create unlinked instances for specific match
        this.Boards.push(board1.Mirror());
        this.Boards.push(board2.Mirror());
        this.players.push(player1);
        this.players.push(player2);
        

        for(let i = 0;i<2;i++){
            const currentBoard = this.Boards[i];
            for(let j = 0;j<currentBoard.Play.length;j++){
                const currentItem = currentBoard.Play[j];
                for(let k = 0;k<currentItem.triggers.length;k++){
                    const currentTrigger = currentItem.triggers[k];
                    this.triggers.push(currentTrigger);
                    this.triggers[this.triggers.length-1].setPlace(this,i,j);
                    
                }
            }
        }
    }

    checkTriggers(event,boardId){
        for(let i = 0;i<this.triggers.length;i++){
            this.triggers[i].check(event,boardId);
        }
    }

    age(){
        if(this.winner != -1){
            return;
        }
        for(let j =0;j<=1;j++){
            for(let i = 0;i<this.Boards[j].Play.length;i++){
                this.Boards[j].Play[i].age(this,j,i);
            }
        }

        if(fightTime%10 == 0){
            //burn
        this.Boards[0].hp -= this.Boards[0].burn;
        this.Boards[1].hp -= this.Boards[1].burn;
        this.checkWin();
        }
    }

    checkWin(){
        if(!fighting){return;}
        if(this.closed){return;}
        if(this.Boards[0].hp<=0){
            this.winner = 1;
        }
        if(this.Boards[1].hp<=0){
            this.winner = 0;
        }
        if(this.Boards[1].hp<=0 && this.Boards[0].hp<=0){
            this.winner = 3;
        }
    }
}

class Trigger{
    ability;
    event;
    match;
    boardId;
    pos;

    constructor(event,ability){
        this.ability = ability;
        this.event = event;
    }

    check(event,boardId){
        let doesTrigger = false;
        if(this.event.includes("any")){
            doesTrigger = true;
        }
        if(this.event.includes("not")){
            if(!this.event.includes(event)){
                doesTrigger = true;
            }
        }
        else if(this.event.includes(event)){
            doesTrigger = true;
        }
        if(doesTrigger){
            if(boardId == this.boardId && this.event.includes("me")||(boardId != this.boardId &&this.event.includes("enemy"))){
                this.ability.func(this.match,this.boardId,this.pos);
            }
        }
    }

    setPlace(match,boardId,pos){
        this.match = match;
        this.boardId = boardId;
        this.pos = pos;
    }
}

class Ability{
    funcRaw;
    data;
    funcName;
    type;
    target;
    upgradeType;
    // cool - cooldown
    // above/below/all - on placement
    // start - on battle start
    // event - on event
    constructor(func,data,target){

        let newFunc = func;
        let modifier = "";
        const splitfunc = func.split(" ");

        if(func.includes(" ")){
            newFunc = splitfunc[0];
            modifier = splitfunc[splitfunc.length-1];
        }
        switch(newFunc){
            case "dmg":
                this.funcRaw = this.dmg;
                break;
            case "shield":
                this.funcRaw = this.shield;
            break;
            case "heal":
                this.funcRaw = this.heal;
            break;
            case "burn":
                this.funcRaw = this.burn;
            break;
            case "crit":
                this.funcRaw = this.crit;
            break;
            case "haste":
                this.funcRaw = this.haste;
            break;
            case "slow":
                this.funcRaw = this.slow;
            break;
            case "freeze":
                this.funcRaw = this.freeze;
            break;
            case "upgrade":
                this.funcRaw = this.upgrade;
                this.upgradeType = splitfunc[1];
            break;
            case "charge":
                this.funcRaw = this.charge;
            break;
            case "kamenMudrcu":
                this.funcRaw = this.kamenMudrcu;
            break;
            case "kuse":
                this.funcRaw = this.kuse;
            break;
            case "hydra":
                this.funcRaw = this.hydra;
            break;
            case "kamil":
                this.funcRaw = this.kamil;
            break;
            case "stit":
                this.funcRaw = this.stit;
            break;
            case "carodejnice":
                this.funcRaw = this.carodejnice;
            break;
            case "bazina":
                this.funcRaw = this.bazina;
            break;
            case "vahy":
                this.funcRaw = this.vahy;
            break;
            case "palma":
                this.funcRaw = this.palma;
            break;
            case "vlk":
                this.funcRaw = this.vlk;
            break;
            case "pernik":
                this.funcRaw = this.pernik;
            break;
            case "droslik":
                this.funcRaw = this.droslik;
            break;
        }
        
        if(modifier != ""){
            this.type = modifier;
        }
        else{
            this.type = "cool";
        }
        this.funcName = func;
        this.data = data;
        this.target = target;
    }

    getTarget(match,boardId,pos){
        switch(this.target){
            case "--":
                if(pos != 0){
                    return match.Boards[boardId].Play[pos-1];
                }
                else{
                    return null;
                }

            case "++":
                if(pos != match.Boards[boardId].Play.length-1){
                    return match.Boards[boardId].Play[pos+1];
                }
                else{
                    return null;
                }

            case "this":
                return match.Boards[boardId].Play[pos];

            case "enemy":
                const targetBoardEn = this.getCoolItems(match.Boards[1-boardId]);
                if(targetBoardEn.length == 0){return null;}
                const randomEn = Math.floor(Math.random()*targetBoardEn.length);
                return targetBoardEn[randomEn];
            case "me":
                const targetBoardMe = this.getCoolItems(match.Boards[boardId]);
                if(targetBoardMe.length == 0){return null;}
                const randomMe = Math.floor(Math.random()*targetBoardMe.length);
                return targetBoardMe[randomMe];
            case "all me":
                return match.Boards[boardId].Play;
            case "all":
                return match.Boards[0].Play.concat(match.Boards[1].Play);
            case "big cool":
                const currentBoard = match.Boards[boardId]
                let output = currentBoard.Play[0];
                for(let i =1;i<currentBoard.Play.length;i++){
                    if(currentBoard.Play[i].time>output.time){
                        output = currentBoard.Play[i];
                    }
                }
                return output;
            case "shield me":
                const myBoard = match.Boards[boardId];
                let outputShield = [];
                for(let i =1;i<myBoard.Play.length;i++){
                    const shieldItem = myBoard.Play[i];
                    for(let j = 0;j<shieldItem.abilities.length;j++){
                        if(shieldItem.abilities[j].funcName == "shield"){
                            outputShield.push(shieldItem);
                            break;
                        }
                    }
                }
                return outputShield;
        }
    }

    func(match, boardId, pos){
        //triggery
        const toTrigger = this.funcName.split(" ")[0];
        match.checkTriggers(toTrigger,boardId);

        this.funcRaw(match,boardId,pos);
    }

    getCoolItems(board){
        let output = [];
        for(let i = 0;i<board.Play.length;i++){
            const currentItem = board.Play[i];
            for(let j = 0;j<currentItem.abilities.length;j++){
                if(currentItem.abilities[j].type == "cool"){
                    output.push(currentItem);
                    break;
                }
            } 
        }
        return output;
    }

    // Abilities-----------------------------------------------------------------

    dmg(match,boardId,pos){
        if(match == null){
            return;
        }
        let nepritel = match.Boards[1-boardId];

        if(nepritel.shield >= this.data){
            nepritel.shield -= this.data;
        }
        else{
            nepritel.hp -= (this.data-nepritel.shield);
            nepritel.shield = 0;
        }
        match.checkWin();
    }

    shield(match,boardId,pos){
        if(match == null){
            return;
        }
        let currentBoard = match.Boards[boardId];
        currentBoard.shield += this.data
    }

    heal(match,boardId,pos){
        if(match == null){
            return;
        }
        let currentBoard = match.Boards[boardId];
        if(currentBoard.hp + this.data < currentBoard.maxHP){
            currentBoard.hp += this.data;
        }
        else{
            currentBoard.hp = currentBoard.maxHP
        }
    }

    burn(match,boardId,pos){
        if(match == null){
            return;
        }
        let nepritel = match.Boards[1-boardId];
        nepritel.burn += this.data;
        match.checkWin();
    }

    crit(match,boardId,pos){
        if(match == null){
            return;
        }
        let toApply = this.getTarget(match,boardId,pos);
        if(toApply != null){
            if(!Array.isArray(toApply)){
                toApply = [toApply];
            }
            for(let j = 0;j<toApply.length;j++){
                toApply[j].crit += this.data;   
            }
        }
    }

    haste(match,boardId,pos){
        if(match == null){
            return;
        }
        let toApply = this.getTarget(match,boardId,pos);
        if(toApply != null){
            toApply.hasteTime += this.data;
        }
    }

    slow(match,boardId,pos){
        if(match == null){
            return;
        }
        let toApply = this.getTarget(match,boardId,pos);
        if(toApply != null){
            toApply.slowTime += this.data;
        }
    }

    freeze(match,boardId,pos){
        if(match == null){
            return;
        }
        let toApply = this.getTarget(match,boardId,pos);
        if(toApply != null){
            if(!Array.isArray(toApply)){
                toApply = [toApply];
            }
            for(let j = 0;j<toApply.length;j++){
                toApply[j].freezeTime += this.data;   
            }
        }
    }

    upgrade(match, boardId,pos){
        if(match == null){
            return;
        }
        let toApply = this.getTarget(match,boardId,pos);
        if(toApply != null){
            if(!Array.isArray(toApply)){
                toApply = [toApply];
            }
            for(let j = 0;j<toApply.length;j++){
                for(let i = 0;i<toApply[j].abilities.length;i++){
                    const currentAbility = toApply[j].abilities[i];
                    if(currentAbility.funcName == this.upgradeType){
                        currentAbility.data += this.data;
                    }
                }
            }
        }

    }

    charge(match, boardId,pos){
        if(match == null){
            return;
        }
        let toApply = this.getTarget(match,boardId,pos);
        if(toApply != null){
            toApply.TimeSpent += this.data/10;
        }
    }

    kamenMudrcu(match, boardId, pos){
        if(match == null){
            return;
        }
        let toApply = this.getTarget(match,boardId,pos);
        if(toApply != null){
            for(let i = 0;i<toApply.abilities.length;i++){
                const currentAbility = toApply.abilities[i];
                if(currentAbility.funcName == "dmg"){
                    this.data = currentAbility.data;
                    this.heal(match,boardId,pos);
                }
            }
        }
    }

    kuse(match, boardId, pos){
        if(match == null){
            return;
        }
        const thisItem = match.Boards[boardId].Play[pos];
        thisItem.time = 10-((thisItem.abilities[0].data-20)*0.1); 
    }

    hydra(match, boardId, pos){
        if(match == null){
            return;
        }
        const thisBoard = match.Boards[boardId];
        let twosizes = 0;
        for(let i = 0;i<thisBoard.Play.length;i++){
            const currentItem = thisBoard.Play[i];
            if(currentItem.size == 2){
                twosizes++;
            }
        }
        const thisItem = thisBoard.Play[pos];
        thisItem.abilities[1].data = twosizes*this.data;

    }

    kamil(match, boardId, pos){
        if(match == null){
            return;
        }
        const enemyBoard = match.Boards[1-boardId];
        this.data = 2*enemyBoard.burn;
        this.shield(match,boardId,pos);

    }

    stit(match, boardId, pos){
        if(match == null){
            return;
        }
        const thisBoard = match.Boards[boardId];
        this.data = thisBoard.shield;
        this.dmg(match,boardId,pos);

    }

    carodejnice(match, boardId, pos){
        if(match == null){
            return;
        }
        const thisBoard = match.Boards[boardId];
        this.data = thisBoard.hp/2;
        this.dmg(match,boardId,pos);
    }

    bazina(match, boardId, pos){
        if(match == null){
            return;
        }
        const thisBoard = match.Boards[boardId];
        this.data = thisBoard.hp;
        this.heal(match,boardId,pos);
    }

    vahy(match, boardId, pos){
        if(match == null){
            return;
        }
        const thisBoard = match.Boards[boardId];
        if((thisBoard.Play.length-1)/2 == pos){
            this.haste(match,boardId,pos);
        }
    }

    palma(match, boardId, pos){
        if(match == null){
            return;
        }
        const enemyBoard = this.getCoolItems(match.Boards[1-boardId]);
        if(enemyBoard.length == 0){return;}
        if(enemyBoard[0].slowTime != 0){
            this.burn(match,boardId,pos);
        }
    }

    vlk(match, boardId, pos){
        if(match == null){
            return;
        }
        const thisBoard = match.Boards[boardId];
        for(let i = 0;i<thisBoard.Play.length;i++){
            thisBoard.Play[i].time --;
        }
    }

    pernik(match, boardId, pos){
        if(match == null){
            return;
        }
        const thisBoard = match.Boards[boardId];
        this.data = thisBoard.hp;
        this.shield(match,boardId,pos);
    }

    droslik(match, boardId, pos){
        if(match == null){
            return;
        }
        const enemyBoard = match.Boards[1-boardId];
        this.data = enemyBoard.burn;
        this.dmg(match,boardId,pos);
    }

}

// -----------------------------------------------------------------

let Boards = [new Board(),new Board(),new Board(),new Board(),new Board()];
let BoardsBuffless = [new Board(),new Board(),new Board(),new Board(),new Board()];
let selected = -1;
let selectedBoard = 0;
let matches = [];
let fighting = false;
let exampleMatches = new Array(5);
let interval;
const timeIncrement = .1;
const sandstormTime = 30;
let fightTime = 0;



// Button functions -----------------------------------------------
function pushUp(){
    if(fighting){return;}
    let board = BoardsBuffless[selectedBoard];
    if(selected == 0|| selected == -1){
        return;
    }
    let item = board.Play[selected];
    board.Play.splice(selected,1);
    selected--;
    board.Play.splice(selected,0,item);
    addBuffs();
    ShowBoard("table");
}

function pushDown(){
    if(fighting){return;}
    let board = BoardsBuffless[selectedBoard];
    if(selected == board.Play.length-1 || selected == -1){
        return;
    }
    let item = board.Play[selected];
    board.Play.splice(selected,1);
    selected++;
    board.Play.splice(selected,0,item);
    addBuffs();
    ShowBoard("table");
}

function deleteItem(){
    if(fighting){return;}
    if(selected == -1){
        return;
    }
    let board = BoardsBuffless[selectedBoard];
    let item = board.Play[selected];
    board.size -= item.size;
    board.Play.splice(selected,1);
    selected = -1;
    addBuffs();
    ShowBoard("table");
}

function begin(){
    document.getElementById("GameTable").style.display = "none";
    document.getElementById("ExampleTables").style.display = "flex";
    document.getElementById("fightTable").style.display = "inline-block";
    fightTime = 0;
    if(fighting){return;}
    interval = setInterval(UpdateItems,1000*timeIncrement);
    fighting = true;
    selected = -1;
    matches = [];
    for(let i = 0;i<Boards.length;i++){
        let row = [];
        for(let j = 0;j<i;j++){
            row.push(new Match(Boards[i],Boards[j],i,j));
        }
        matches.push(row);
    }
    let dummy = new Board();
    dummy.hp = Number.MAX_SAFE_INTEGER;
    for(let i =0;i<5;i++){
        exampleMatches[i] = new Match(Boards[i],dummy,i,null);
    }

    //trigger start events
    for(let k = 0;k<matches.length;k++){
        const matchRow = matches[k];
        for(let l = 0;l<matchRow.length;l++){
            const currentMatch = matchRow[l];
            for(let m = 0;m<2;m++){
                const currentBoard = currentMatch.Boards[m];
                for(let i = 0;i<currentBoard.Play.length;i++){
                    const currentItem =  currentBoard.Play[i];
                    for(let j = 0;j<currentItem.abilities.length;j++){
                        const currentAbility = currentItem.abilities[j];
                        if(currentAbility.type == "start"){
                            currentAbility.func(currentMatch,m,i);
                        }
                    }
                }
            }
        }
    }

    for(let l = 0;l<exampleMatches.length;l++){
        const currentMatch = exampleMatches[l];
        for(let m = 0;m<2;m++){
            const currentBoard = currentMatch.Boards[m];
            for(let i = 0;i<currentBoard.Play.length;i++){
                const currentItem =  currentBoard.Play[i];
                for(let j = 0;j<currentItem.abilities.length;j++){
                    const currentAbility = currentItem.abilities[j];
                    if(currentAbility.type == "start"){
                        currentAbility.func(currentMatch,m,i);
                    }
                }
            }
        }
    }
   

    ShowFightTable();
}

function addItem(){
    if(fighting){return;}
    let id = document.getElementById("item").value;
    let board = BoardsBuffless[selectedBoard];

    if( id<0 || id>ItemLibrary.length-1){
        alert("neexistující předmět");
        return;
    }

    let item = new Item(ItemLibrary[id]);

    if(board.size+item.size > board.maxSize){
        return false;
    }

    if(selected == -1){
        board.AddToPlay(item,0);
    }
    else{
        board.AddToPlay(item,selected);
        selected++;
    }
    addBuffs();
    ShowBoard("table");
}

function click(index){
    if(fighting){return;}
    if(selected == index){
        selected = -1;
    }
    else{
        selected = index;
    }
    ShowBoard("table");
}

function changeBoard(){
    if(fighting){return;}
    let dropdown = document.getElementById("teams");
    selectedBoard = dropdown.value;
    selected  =-1;
    ShowBoard("table");
}

function setMaxHp(){
    const newValue = document.getElementById("MaxHp").value;
    if(newValue<=0){
        alert("špatná hodnota max hp");
        return;
    }
    Boards[selectedBoard].maxHP = newValue;
    Boards[selectedBoard].hp = newValue;

    document.getElementById("MaxHpShow").innerHTML = newValue;
}

function setBoardSize(){

    const newValue = document.getElementById("BoardSize").value;
    if(newValue<=0){
        alert("špatná hodnota max hp");
        return;
    }
    for(let i = 0;i<Boards.length;i++){
        BoardsBuffless[i].maxSize = newValue;
    }
    document.getElementById("BoardSizeShow").innerHTML = newValue;
}
// -----------------------------------------------------------------


// General functions -----------------------------------------------
function ShowBoard(id){
    let table = document.getElementById(id);
    table.innerHTML = '';
    let board = Boards[selectedBoard];
    if(fighting){
        let boardId = parseInt(id[1]);
        board = exampleMatches[boardId].Boards[0];
        
        let header = table.insertRow();
        header.insertCell(0);
        let nameCell = header.insertCell(1);
        header.insertCell(2);

        nameCell.innerHTML = TeamNames[boardId];
        
    }
    for(let i = 0;i<board.Play.length;i++){
        let row = table.insertRow();
        let nameP =  row.insertCell(0);
        let progressP =  row.insertCell(1);
        let abilityP = row.insertCell(2);

        if(selected == i){
            row.id = "selected";
        }
        
        row.classList.add("size"+board.Play[i].size);
        nameP.innerHTML  = board.Play[i].name;

        progressP.innerHTML = ""
        progressP.innerHTML += '<progress id="prog'+i.toString()+'" value="'+board.Play[i].TimeSpent.toString()+'" max="'+board.Play[i].time.toString()+'"></progress>'+"<br>";

        if(board.Play[i].crit != 0){
            progressP.innerHTML += board.Play[i].crit + "%💢 ";
        }
        if(board.Play[i].hasteTime != 0){
            progressP.innerHTML += board.Play[i].hasteTime +"⏰ ";
        }
        if(board.Play[i].slowTime != 0){
            progressP.innerHTML += board.Play[i].slowTime + "🐌 ";
        }
        if(board.Play[i].freezeTime != 0){
            progressP.innerHTML += board.Play[i].freezeTime + "❄️ ";
        }


        abilityP.innerHTML = "";
        let coolExists = false;
        for(let j = 0;j<board.Play[i].abilities.length;j++){
            const current = board.Play[i].abilities[j];
            if(current.type == "cool"){coolExists = true;}
            if(current.funcName.includes("start")){
                abilityP.innerHTML += "S:";
            }
            if(current.funcName.includes("above")){
                abilityP.innerHTML += "↑+";
            }
            if(current.funcName.includes("below")){
                abilityP.innerHTML += "↓+";
            }
            if(current.funcName.includes("all")){
                abilityP.innerHTML += "↕+";
            }

            abilityP.innerHTML += current.data+getEmoji(current.funcName)+" ";
        }

        for(let j = 0;j<board.Play[i].triggers.length;j++){
            let current = board.Play[i].triggers[j];

            abilityP.innerHTML += getEmoji(current.event);

            abilityP.innerHTML += ":"

            current = current.ability;
            abilityP.innerHTML += current.data+getEmoji(current.funcName)+" ";
        }
        if(!coolExists){
            progressP.innerHTML = "";
        }
        
    }

    var cells = document.querySelectorAll("#table tr");
    for (var i = 0; i < cells.length; i++) {
    cells[i].addEventListener("click", function(){ click(getIndex(this),selectedBoard);});
    }
}

function ShowFightTable(){
    let table = document.getElementById("fightTable");
    table.innerHTML = '';
    let NameRow = table.insertRow();
    NameRow.insertCell(0);
    NameRow.classList.add("fightTableRow");
    for(let i = 0;i < TeamNames.length;i++){
        let cell = NameRow.insertCell(i+1);
        cell.innerHTML = TeamNames[i];
    }
    

    for(let i = 0;i<Boards.length;i++){
        let row = table.insertRow();
        row.classList.add("fightTableRow");
        let nameCell =row.insertCell(0);
        nameCell.innerHTML = TeamNames[i];

        for(let j = 0;j<Boards.length;j++){
            let cell = row.insertCell(j+1);
            cell.classList.add("fightTableCell");
            let drawingBoard;
            let drawingMatch;
            let drawBoardID;
            if(i>j){
                drawingMatch = matches[i][j];
                drawBoardID = 0;
            }
            else if(j>i){
                drawingMatch = matches[j][i];
                drawBoardID = 1;
            }
            else{
                //tries to fight with itself
                continue;
            }
            drawingBoard = drawingMatch.Boards[drawBoardID];
            if(drawingMatch.winner == drawBoardID){
                cell.innerHTML = "Výhra!";    
            }else if(drawingMatch.winner == 1-drawBoardID){
                cell.innerHTML = "Prohra";
            }
            else if(drawingMatch.winner == 3){
                cell.innerHTML = "Remíza";
            }
            else{
                cell.innerHTML = drawingBoard.hp.toString()+'❤️ ';
                if(drawingBoard.shield != 0){
                    cell.innerHTML += drawingBoard.shield.toString()+'🛡️ ';
                }
                if(drawingBoard.burn != 0){
                    cell.innerHTML += drawingBoard.burn.toString()+'🔥 ';
                }
                cell.innerHTML+='<br><progress value="'+drawingBoard.hp.toString()+'" max="'+drawingBoard.maxHP.toString()+'"></progress>';
            }
        } 
        
        for(let i =0;i<exampleMatches.length;i++){
            const tableID = "p" + i.toString();
            ShowBoard(tableID);
        }

        document.getElementById("table").innerHTML = "";
    }
}

function UpdateItems(){
    if(isEndOfBattle()){
        resetFight();
        return;
    }

   for(let i = 0;i<matches.length;i++){
       for(let j = 0;j<matches[i].length;j++){
            matches[i][j].age();
       }
   }

   for(let i =0;i<exampleMatches.length;i++){
        exampleMatches[i].age();        
   }
   ShowFightTable();

   const sandCounter = document.getElementById("sandCounter");
   fightTime += timeIncrement*10;
   if(fightTime>sandstormTime*10){
        const sandDmg =  Math.round(fightTime-(sandstormTime*10));
        const sandAbility = new Ability("dmg",sandDmg);
        for(let i = 0;i<matches.length;i++){
            for(let j = 0;j<matches[i].length;j++){
                const current = matches[i][j];
                sandAbility.func(current,0,0);
                sandAbility.func(current,1,0);
            }
        }
        sandCounter.innerHTML = "SUDDEN DEATH: "+sandDmg+" DMG";
   }
   else{
    sandCounter.innerHTML = ((sandstormTime*10-fightTime)/10) + " to sudden death"
   }
}

function getIndex(t){
    let children = t.parentNode.childNodes;
    for (let i = 0;i<children.length;i++){
        if(children[i] == t){
            return i;
        }
    }
}

function isEndOfBattle(){
    let src = matches;
    let stillPlaying = false;
    for(let i = 0;i<src.length;i++){
        for(let j =0;j<src[i].length;j++){
            if(src[i][j].winner == -1){stillPlaying = true;}
            else{src[i][j].closed = true;}
        }
    }
    if(stillPlaying){
        return false;
    }
    else{
        return true;
    }
}

function resetFight(){
    clearInterval(interval);
    document.getElementById("GameTable").style.display = "inline-block";
    document.getElementById("ExampleTables").style.display = "none";
    document.getElementById("fightTable").style.display = "none";
    document.getElementById("sandCounter").innerHTML = "";
    fighting = false;
    let points = [0,0,0,0,0];
    let src = matches;
    for(let i = 0;i<src.length;i++){
        for(let j =0;j<src[i].length;j++){
            const Mtch = src[i][j];
            if(Mtch.winner == 3){
                points[Mtch.players[0]] += .5;
                points[Mtch.players[1]] += .5;
            }
            else{
                points[Mtch.players[Mtch.winner]] ++;
            }
        }
    }
    let toShow = "";
    for(let i =0;i<TeamNames.length;i++){
        toShow += TeamNames[i] + ": "+ points[i].toString()+"\n";
    }
    selectedBoard = 0;
    ShowBoard("table");
    alert(toShow);
}

function addBuffs(){
        Boards[selectedBoard] = BoardsBuffless[selectedBoard].Mirror();
        const currentBoard = Boards[selectedBoard];
        for(let i = 0;i<currentBoard.Play.length;i++){
            const currentItem =  currentBoard.Play[i];
            for(let j = 0;j<currentItem.abilities.length;j++){
                const currentAbility = currentItem.abilities[j];

                let itemToBuff = null
                if(currentAbility.type == "above" && i != 0){
                    itemToBuff = currentBoard.Play[i-1];
                }
                if(currentAbility.type == "below" && i < currentBoard.Play.length-1){
                    itemToBuff = currentBoard.Play[i+1];
                }
                if(itemToBuff != null){
                    const funcToBuff = currentAbility.funcName.split(" ")[0];
                    for(let k = 0;k<itemToBuff.abilities.length;k++){
                        const abilityToBuff = itemToBuff.abilities[k];
                        if(abilityToBuff.funcName.includes(funcToBuff)){
                            abilityToBuff.data += currentAbility.data;
                        }
                    }
                }

                if(currentAbility.type == "all"){
                    const funcToBuff = currentAbility.funcName.split(" ")[0];
                    for(let l = 0;l<currentBoard.Play.length;l++){
                        itemToBuff = currentBoard.Play[l];
                        // buffuje sebe sama
                        if(l == i){continue;}

                        for(let k = 0;k<itemToBuff.abilities.length;k++){
                            const abilityToBuff = itemToBuff.abilities[k];
                            if(abilityToBuff.funcName.includes(funcToBuff)){
                                abilityToBuff.data += currentAbility.data;
                            }
                        }
                    }
                }
            }
        }
}

// -----------------------------------------------------------------

const ItemLibrary = [
    // jmeno, velikost, cooldown, crit, ability, triggery
    /*0 */new ItemFab("Brusný kámen mudrců",3,5,0,[new Ability("crit start",30,"--"),new Ability("kamenMudrcu",1,"--")],[]),
    /*1 */new ItemFab("Poloautomatická kuše",2,21,0,[new Ability("dmg",20,null),new Ability("kuse start",0,null),new Ability("kuse",0,null)],[]),
    /*2 */new ItemFab("Balvan",3,20,0,[new Ability("dmg",1000,null)],[]),
    /*3 */new ItemFab("Katapult",3,8,0,[new Ability("dmg",50,null)],[new Trigger("dmg me",new Ability("charge",20,"this"))]),
    /*4 */new ItemFab("Dvouhlavá hydra",2,1,0,[new Ability("hydra start",10,null),new Ability("upgrade dmg start",0,"all me")],[]),
    /*5 */new ItemFab("Stokrát nic",2,1,0,[new Ability("dmg",0,null)],[]),
    /*6 */new ItemFab("Kamil ze sirotčince",1,3,0,[new Ability("kamil",0,null)],[]),
    /*7 */new ItemFab("Zápalky",1,6,0,[new Ability("burn",4,null)],[new Trigger("not dmg charge me",new Ability("charge",10,"this"))]),
    /*8 */new ItemFab("Blaf z jídelny",1,1,0,[],[new Trigger("burn me",new Ability("slow",10,"enemy"))]),
    /*9 */new ItemFab("Růžena Šípková",1,1,0,[],[new Trigger("slow me",new Ability("dmg",25,null))]),
    /*10*/new ItemFab("Zanedbaný vchod",2,1,0,[],[new Trigger("any enemy",new Ability("slow",10,null))]),
    /*11*/new ItemFab("Doběla nažhavený šnek",3,7,0,[new Ability("burn",10,null)],[new Trigger("slow me",new Ability("charge",20,null))]),
    /*12*/new ItemFab("Nebezpečně nabroušený štít",1,5,0,[new Ability("stit",0,null)],[]),
    /*13*/new ItemFab("Perníček",2,7,0,[new Ability("shield",10,null)],[new Trigger("shield me",new Ability("upgrade shield cool",5,"this"))]),
    /*14*/new ItemFab("Prášek na tvrdnutí hlavy",3,2,0,[new Ability("upgrade shield cool",5,"all me")],[]),
    /*15*/new ItemFab("Palice na čarodějnice",3,12,0,[new Ability("carodejnice",0,null)],[]),
    /*16*/new ItemFab("Záložní bažina",3,10,0,[new Ability("bazina",0,null)],[]),
    /*17*/new ItemFab("Vyvážený jídelníček",2,1,0,[],[new Trigger("dmg enemy",new Ability("heal",10,null))]),
    /*18*/new ItemFab("Ledové království",3,1,0,[],[new Trigger("any enemy",new Ability("freeze",5,"enemy"))]),
    /*19*/new ItemFab("Mezibojové hry",2,7,0,[new Ability("freeze",30,"all")],[]),
    /*20*/new ItemFab("Zatykač",1,1,0,[new Ability("freeze start",1000,"enemy")],[]),
    /*21*/new ItemFab("Vavřínová postel",3,1,0,[],[]),
    /*22*/new ItemFab("Alkanový lektvar",2,8,0,[new Ability("burn",5,null),new Ability("burn all",3,null)],[]),
    /*23*/new ItemFab("Cementové náplasti",2,6,0,[new Ability("heal",20,null)],[new Trigger("heal me",new Ability("upgrade shield cool",5,"--"))]),
    /*24*/new ItemFab("Tekutá kuráž",1,1,0,[],[new Trigger("dmg me",new Ability("charge",5,"big cool"))]),
    /*25*/new ItemFab("Božské mlýny",2,1,0,[],[new Trigger("slow me",new Ability("crit",10,"me")),new Trigger("freeze me",new Ability("crit",10,"me"))]),
    /*26*/new ItemFab("Kocourovy kritické kroksy",2,4,0,[new Ability("crit",5,"this")],[new Trigger("crit me", new Ability("charge",20,"me"))]),
    /*27*/new ItemFab("Crepe de feu",1,7,0,[new Ability("heal",30,null),new Ability("burn",4,null)],[]),
    /*28*/new ItemFab("Kouzelný francouzák",2,5,0,[new Ability("upgrade dmg shield heal cool",10,"me")],[]),
    /*29*/new ItemFab("Kilo cukru",1,3,0,[new Ability("haste",10,"--")],[]),
    /*30*/new ItemFab("Nažhavené zbraně",3,1,0,[],[new Trigger("crit me", new Ability("burn",15,null))]),
    /*31*/new ItemFab("Blizard v lahvi",1,7,0,[new Ability("freeze",20,"enemy")],[new Trigger("freeze me", new Ability("dmg",30,null))]),
    /*32*/new ItemFab("Pila na kosti",1,5,0,[new Ability("haste",20,"me")],[new Trigger("heal me", new Ability("charge",10,"this"))]),
    /*33*/new ItemFab("Iglú",1,4,0,[new Ability("shield",15,null),new Ability("freeze",10,null)],[]),
    /*34*/new ItemFab("Seminář vyhýbání",2,1,0,[],[new Trigger("slow me", new Ability("shield",20,null))]),
    /*35*/new ItemFab("Prokleté váhy",2,4,0,[new Ability("vahy",20,"++"),new Ability("vahy",20,"--")],[]),
    /*36*/new ItemFab("Komicky velké hledí",1,1,0,[new Ability("dmg above",-10,null),new Ability("crit start",30,"--")],[]),
    /*37*/new ItemFab("Útok na palmu",2,6,0,[new Ability("slow",10,"enemy"),new Ability("palma",50,null)],[]),
    /*38*/new ItemFab("Zlatý marvin",3,7,0,[new Ability("upgrade dmg heal shield cool",20,"++"),new Ability("upgrade dmg heal shield cool",20,"--")],[]),
    /*39*/new ItemFab("Motivační vlk euroasijský",3,1,0,[new Ability("vlk start",1,null)],[]),
    /*40*/new ItemFab("FVM-DT",1,1,0,[],[new Trigger("haste me",new Ability("shield",10,null)),new Trigger("charge me",new Ability("shield",10,null))]),
    /*41*/new ItemFab("Vajíčka do malty",2,1,0,[new Ability("crit start",20,"shield me")],[]),
    /*42*/new ItemFab("Perníkové stavební materiály",3,13,0,[new Ability("pernik",0,null)],[]),
    /*43*/new ItemFab("Meč v kameni",2,7,0,[new Ability("dmg",10,null), new Ability("upgrade dmg cool",10,"all me")],[]),
    /*44*/new ItemFab("Sítě s viry",1,4,0,[new Ability("dmg",5,null),new Ability("slow",10,"enemy")],[]),
    /*45*/new ItemFab("Moc malý střevíček",1,5,0,[new Ability("dmg",5,null),new Ability("heal",30,null)],[]),
    /*46*/new ItemFab("Doslíci",2,2,0,[new Ability("droslik",0,null)],[]),
    /*47*/new ItemFab("Kolemjdoucí rolník",1,5,0,[new Ability("dmg",5,null),new Ability("burn",3,null)],[]),
    /*48*/new ItemFab("Srdce ledového obra",1,1,0,[new Ability("upgrade freeze start",10,"all me")],[]),
    /*49*/new ItemFab("Hyperhypotermie",3,1,0,[],[new Trigger("burn me",new Ability("freeze",5,"enemy"))]),
    /*50*/new ItemFab("Proklatě těžká úloha",2,7,0,[new Ability("slow",20,"enemy"),new Ability("slow",20,"enemy"),new Ability("slow",20,"enemy")],[]),
    /*51*/new ItemFab("Pinokio",1,4,0,[new Ability("dmg",5,null),new Ability("shield",10,null)],[]),
    /*52*/new ItemFab("Táborák",1,3,0,[new Ability("burn",3,null)],[]),
    /*53*/new ItemFab("2048-lístek",1,1,0,[new Ability("crit start",15,"all me")],[]),
]

const TeamNames =[
    "Zluti",
    "Modri",
    "Ruzovi",
    "Oranzovi",
    "Zeleni"
]

function getEmoji(name){
    emoji = [
        ["not","🚫"],
        ["upgrade","📈"],
        ["dmg","💥"],
        ["shield","🛡️"],
        ["heal","❤️"],
        ["burn","🔥"],
        ["haste","⏰"],
        ["slow","🐌"],
        ["freeze","❄️"],
        ["charge","⚡"],
        ["crit","%💢"],
        ["kamenMudrcu","❤️"],
        ["kuse","🏹"],
        ["hydra","🐍"],
        ["kamil","🕺"],
        ["stit","💥"],
        ["carodejnice","💥"],
        ["bazina","❤️"],
        ["vahy","⏰"],
        ["palma","🔥"],
        ["vlk","🐺"],
        ["pernik","🛡️"],
        ["droslik","💥"],
    ];
    let output = "";
    for(let i = 0;i<emoji.length;i++){
        if(name.includes(emoji[i][0])){
            output += emoji[i][1];
            if(i != 0){
                return output;
            }
        }
    }
    return "X";
}

/* todo:
    schedule
    ----postpreludium
    save?
    animace
*/
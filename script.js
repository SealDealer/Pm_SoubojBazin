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
            this.TimeSpent -= this.time;
            for(let i = 0;i<this.abilities.length;i++){
                if(this.abilities[i].type != "cool"){return;};
                this.abilities[i].func(match,boardId,pos);

                //crit chance
                if(Math.random()*100<this.crit){
                    this.abilities[i].func(match,boardId,pos);
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

    checkTriggers(event){
        for(let i = 0;i<this.triggers.length;i++){
            this.triggers[i].check(event);
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

    check(event){
        if(event == this.event){
            this.ability.func(this.match,this.boardId,this.pos);
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

        if(func.includes(" ")){
            newFunc = func.split(" ")[0];
            modifier = func.split(" ")[1];
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
                this.upgradeType = modifier;
                modifier = "";
            break;
            case "charge":
                this.funcRaw = this.charge;
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
                const targetBoardEn = match.Boards[1-boardId].Play;
                const randomEn = Math.floor(Math.random()*targetBoardEn.length);
                return targetBoardEn[randomEn];

            case "me":
                const targetBoardMe = match.Boards[boardId].Play;
                const randomMe = Math.floor(Math.random()*targetBoardMe.length);
                return targetBoardMe[randomMe];
        }
    }

    func(match, boardId, pos){
        //triggery
        const toTrigger = this.funcName.split(" ")[0];
        match.checkTriggers(toTrigger);

        this.funcRaw(match,boardId,pos);
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
            toApply.crit += this.data;
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
            toApply.freezeTime += this.data;
        }
    }

    upgrade(match, boardId,pos){
        if(match == null){
            return;
        }
        let toApply = this.getTarget(match,boardId,pos);
        if( toApply != null){

            for(let i = 0;i<toApply.abilities.length;i++){
                const currentAbility = toApply.abilities[i];
                if(currentAbility.funcName.includes(this.upgradeType)){
                    currentAbility.data += this.data
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
        Boards[i].maxSize = newValue;
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
            if(current.funcName.includes("OnStart")){
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
    for(let i = 0;i < TeamNames.length;i++){
        let cell = NameRow.insertCell(i+1);
        cell.innerHTML = TeamNames[i];
    }
    

    for(let i = 0;i<Boards.length;i++){
        let row = table.insertRow();
        let nameCell =row.insertCell(0);
        nameCell.innerHTML = TeamNames[i];

        for(let j = 0;j<Boards.length;j++){
            let cell = row.insertCell(j+1);
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
    new ItemFab("a"   ,1,2,0, [new Ability("charge",10,"++")],           []),
    new ItemFab("b"     ,1,3,0, [new Ability("dmg",30,null)],         []),
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
    sanatizovat input

    ----postpreludium
    save
    animace
*/
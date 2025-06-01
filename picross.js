"use strict";
/*

TODO: CONVERT TO TYPESCRIPT!!!
TODO: Fix bugs in DragOperation. Namely, the neutralizing of the base block when the mouse is not in line with it.
TODO: Add Microsoft Encatra esque styling.
TODO: Add thicker lines on the 5s.
TODO: Add function to generate puzzle data instead of calling the same three built ins over and over.
TODO: Allow for a custom palette.

*Palette ideas;
	dark, default *check*
	light,
	original-dev, *check*
	galaxy (dark purple),
	business (encatra),
	candy heart (light pastels),
	vaporwave,
*/

class Puzzle{

	static defaultPuzzleData = 'MDkwOTEwMDAxMDEwMDEwMDAxMDEwMDEwMDAxMDEwMDEwMDAxMDEwMDAwMDAwMDAwMDEwMTAxMDAwMDEwMTAxMDAwMDEwMTAxMDAwMDEwMTAxMDExMQ==';
	static errorPuzzleData = 'MTAxNDExMTEwMTExMDAxMTEwMTAwMDAxMDAxMDEwMDExMDAwMDEwMDEwMTAwMTEwMDAwMTExMDAxMTEwMTExMTAxMDEwMDEwMTAxMDAwMDEwMTAwMTAxMDEwMDAwMTAwMTAxMDAxMTAwMDAxMDAxMDEwMDExMDAwMDEwMDEwMTAwMTExMTEwMTAwMTAxMDAx';
	static notFoundPuzzleData= '';
	static isEditing = 0; //This must be a class variable, so it is not overwritten when the puzzle is reset I.E. during resolution change
	static difficulty = 2;
	static colorVars = [
		'--htmlBg',
		'--htmlBorder',
		'--puzzleBlockBorder',
		'--puzzleNum',
		'--puzzleNumBorder',
		'--rowNumContainer',
		'--colNumContainer',
		'--neutral',
		'--flagged',
		'--marked',
		'--wrong',
		'--victory',
		'--hoverBorder',
		'--controlBg',
		'--controlText',
		'--controlBorder'
	];

	constructor(puzzleData){

		Block.puzzle = this;
		Block.blocks = [];
		this.rawData = puzzleData;
		this.layout_x = 0;
		this.layout_y = 0;
		this.puzzleLength = 0;
		this.puzzleData = []; //2D array
		this.decode(puzzleData);
		this.setAllColNumbers();
		this.setAllRowNumbers();
		this.correctBlocks = 0;
		this.blocks = {}; //TODO: Find a way to get rid of this.
		this.initPuzzleContainer();
		this.initBlocks();
		this.dragOp = null;
		$('#yRes').val(Block.puzzle.layout_y);
		$('#xRes').val(Block.puzzle.layout_x);
		Block.isLoading = 0;

	}

	static changePalette(elem){
		/* Palettes are handled in a bit of a unique way (as far as I can tell).
			Each palette is saved in the CSS file as an identifier named "palX" where each variable name
			is saved and associated with it's color. The JS file reads them (all names being specified
			with the static in Puzzle) though the identifies, which are themselves attatched to each individual
			option in the selector HTML element.

			This is done to keep all styling in the CSS folder, as otherwise the colors would
			have to be saved here with the JS.*/

		let r = document.querySelector(':root');

		for (let colorVar of Puzzle.colorVars){
			r.style.setProperty(colorVar, $(elem).css(colorVar));
		}

	}

	static completeGame(){

		$('.puzzleBlock').each(function(){
			$(this).addClass('victory')
				.off('mousedown')
		});

	}

	initPuzzleContainer(){
		/* calling 'this' through Block.puzzle may seem weird, but 'this' as a keyword is overwritten by the Jquery call so we needs to reach into block to access class data */
		$('#puzzleContainer').empty();
		$('#puzzleContainer').each(function(){

			for (let y = 0; y < Block.puzzle.layout_x; y++){

				for (let x = 0; x < Block.puzzle.layout_y; x++){

					jQuery('<div>', {
						class: 'puzzleBlock',
						id: `${x}+${y}`,
						oncontextmenu: 'return false;',
					}).css({
						'grid-row' : `${x + 1}`,
						'grid-column' : `${y + 1}`
					}).appendTo($(this));
				}
			}
		});

	}

	initBlocks(){

		$('.puzzleBlock').each(function(){

			let current = new Block(this);
			Block.puzzle.blocks[$(this).attr('id')] = current;

		}).mousedown(function(event){

			DragOperation.mouseState = event.which;
			let current = Block.puzzle.blocks[$(this).attr('id')];
			Block.puzzle.dragOp = new DragOperation(current.id, current.state);
			if (event.which === 1){
				current.mark();
			} else if (event.which === 3){
				current.flag();
			}

		}).mouseenter(function(){

			if (Block.puzzle.dragOp !== null){
				let current = Block.puzzle.blocks[$(this).attr('id')];
				let result = Block.puzzle.dragOp.update(current.id, current.state); //Result will be the id of the target block, and 0 if marking, 1 if flagging, and 2 if neutralizing
				if (result !== null){
					switch(result[1]){
						case 0:
							Block.puzzle.blocks[result[0]].mark();
							break;
						case 1:
							Block.puzzle.blocks[result[0]].flag();
							break;
						case 2:
							Block.puzzle.blocks[result[0]].neutralize();
							break;
						default:
					}
				}
			}
		});

	}

	getRowNumbers(){

		let rowNumbers = [];

		for (let currentRow of this.puzzleData){
			rowNumbers.push(this.countConsecutiveBlocks(currentRow))
		}

		return rowNumbers;

	}

	getColumnNumbers(){

		let colNumbers = [];

		for (let x = 0; x < this.layout_x; x++){
			let currentCol = [];
			for (let y = 0; y < this.layout_y; y++){
				currentCol.push(this.puzzleData[y][x]);
			}
			colNumbers.push(this.countConsecutiveBlocks(currentCol));
		}

		return colNumbers;

	}

	countConsecutiveBlocks(line) {

		let blockGroups = [];
		let currentGroup = 0;
		let noBlocks = 1;

		for (let block of line) {
			if (block) {
				currentGroup += 1;
				noBlocks = 0;
			} else if (currentGroup) {
				blockGroups.push(currentGroup);
				currentGroup = 0;
			}
		}

		if (currentGroup) {
			blockGroups.push(currentGroup);
		}

		if (noBlocks) {
			blockGroups.push(0);
		}

		return blockGroups;

	}

	setAllRowNumbers(){

		$('#rowNumContainer').empty();
		let currentRow = 0;
		for (let rowNumbers of this.getRowNumbers()){

			jQuery('<div>', {
				class: 'puzzleNumXbox',
				id: `row${currentRow.toString()}`
			}).appendTo($('#rowNumContainer'));

			this.setRowNumbers(currentRow, rowNumbers);

			currentRow++;
		}

	}

	setAllColNumbers(){

		$('#colNumContainer').empty();
		let currentCol = 0;
		for (let colNumbers of this.getColumnNumbers()){

			jQuery('<div>', {
				class: 'puzzleNumYbox',
				id: `col${currentCol.toString()}`
			}).appendTo($('#colNumContainer'));

			this.setColNumbers(currentCol, colNumbers);

			currentCol++;
		}

	}

	setRowNumbers(index, nums){

		$(`#row${index}`).each(function(){
			$(this).empty();
			let currentNum = 0;
			for (let rowNum of nums){

				jQuery('<div>', {
					class: 'rowNum',
				}).css({
					'grid-column' : `${currentNum + 1}`
				}).text(rowNum).appendTo($(this));
				currentNum++;

			}
		})

	}

	setColNumbers(index, nums){

		$(`#col${index}`).each(function(){
			$(this).empty();
			let currentNum = 0;
			for (let colNum of nums){
				jQuery('<div>', {
					class: 'colNum',
				}).css({
					'grid-row' : `${currentNum + 1}`
				}).text(colNum).appendTo($(this));
				currentNum++;
			}
		})

	}

	decode(){

		let decryptedData = atob(this.rawData);
		if (this.isDataValid(decryptedData)){
			this.puzzleData = [];
			this.layout_y = parseInt(decryptedData.slice(0, 2), 10);
			this.layout_x = parseInt(decryptedData.slice(2, 4), 10);
			this.puzzleLength = decryptedData.length - 4;
			let yHold = [];
			let xHold = [];
			for (let i = 4; i < decryptedData.length; i++){
				xHold.push(decryptedData[i] === '1' ? 1 : 0);
				if (!((i - 3) % this.layout_x)){
					yHold.push(xHold);
					xHold = [];
				}
			}
			this.puzzleData = yHold;
		}
		else{
			console.log("This code in 'decode' should never run. You better figure that out chief :^/");
		}

	}

	encode(){

		let yDimString = this.layout_y.toString(10).padStart(2, '0');
		let xDimString = this.layout_x.toString(10).padStart(2, '0');
		let puzzleBinString = '';
		for (let y = 0; y < this.layout_y; y++){
			for(let x = 0; x < this.layout_x; x++){
				puzzleBinString = puzzleBinString.concat(this.puzzleData[y][x] ? '1' : '0');
			}
		}
		return btoa(`${yDimString}${xDimString}${puzzleBinString}`);

	}

	editPuzzleData(y, x, isMarked){

		if (Puzzle.isEditing){
			this.puzzleData[y][x] = isMarked;
		}

	}

	isDataValid(rawData){

		let layout_y = parseInt(rawData.slice(0, 2));
		let isYValid = 50 >=layout_y && layout_y > 1;

		let layout_x = parseInt(rawData.slice(2, 4));
		let isXValid = 50 >=layout_x && layout_x > 1;

		let isProperLength = rawData.slice(4).length === layout_y * layout_x;

		return isYValid && isXValid && isProperLength;

	}

	generateBlankPuzzleData(){

		let y = this.layout_y.toString(10).padStart(2, '0');
		let x = this.layout_x.toString(10).padStart(2, '0');
		return btoa(`${y}${x}${Array(this.layout_y * this.layout_x + 1).join('0')}`); //We add 1 because .join places it's character in between array elements

	}

	generateRandomPuzzleData(){

		Block.isLoading = Puzzle.isEditing;

		let newY = Puzzle.isEditing ? this.layout_y : Math.floor(Math.random() * 51);
		let newX = Puzzle.isEditing ? this.layout_x : Math.floor(Math.random() * 51);
		let newData = Array.from({ length: newY * newX }, () => Math.floor(Math.random() + 0.5)).join('');

		newY += newY > 1 ? 0 : 1;
		newX += newX > 1 ? 0 : 1;

		let y = newY.toString(10).padStart(2, '0');
		let x = newX.toString(10).padStart(2, '0');

		return btoa(`${y}${x}${newData}`);

	}

	addColumnToCurrentData(newRes){

		Block.isLoading = 1;
		let currentDataString = atob(this.encode(this.puzzleData)).slice(4);
		let diff = Math.abs(this.layout_x - newRes);
		let newDataString = '';
		let rowExtention = Array(diff + 1).join('0');

		for (let block = 0; block < this.puzzleLength; block++){

			newDataString += currentDataString[block];

			if (!((block + 1) % this.layout_x)){
				newDataString += rowExtention;
			}

		}

		this.layout_x = newRes;

		let y = this.layout_y.toString(10).padStart(2, '0');
		let x = this.layout_x.toString(10).padStart(2, '0');
		return btoa(`${y}${x}${newDataString}`);

	}

	subColumnFromCurrentData(newRes){

		Block.isLoading = 1;
		let currentDataString = atob(this.encode(this.puzzleData)).slice(4);
		let diff = Math.abs(this.layout_x - newRes);
		let newDataString = '';

		for (let row of currentDataString.match(new RegExp('.{1,' + this.layout_x + '}', 'g'))){
			newDataString += row.slice(0, this.layout_x - diff)
		}

		this.layout_x = newRes;

		let y = this.layout_y.toString(10).padStart(2, '0');
		let x = this.layout_x.toString(10).padStart(2, '0');
		return btoa(`${y}${x}${newDataString}`);

	}

	addRowToCurrentData(newRes){

		Block.isLoading = 1;
		let currentDataString = atob(this.encode(this.puzzleData)).slice(4);
		let diff = Math.abs(this.layout_y - newRes);
		this.layout_y = newRes;
		let newDataString = currentDataString + Array(this.layout_x * diff + 1).join('0');
		console.log(diff);
		console.log(currentDataString);
		console.log(newDataString);
		let y = this.layout_y.toString(10).padStart(2, '0');
		let x = this.layout_x.toString(10).padStart(2, '0');
		return btoa(`${y}${x}${newDataString}`);

	}

	subRowFromCurrentData(newRes){

		Block.isLoading = 1;
		let currentDataString = atob(this.encode(this.puzzleData)).slice(4);
		this.layout_y = newRes;

		let y = this.layout_y.toString(10).padStart(2, '0');
		let x = this.layout_x.toString(10).padStart(2, '0');
		return btoa(`${y}${x}${currentDataString.slice(0, this.layout_x * this.layout_y)}`);

	}

}


class Block{

	static puzzle = null;
	static blocks = [];
	static isLoading = 0;

	constructor(elem){

		this.elem = elem;
		this.id = $(elem).attr('id');
		this.y = parseInt(this.id.split('+')[0]);
		this.x = parseInt(this.id.split('+')[1]);
		this.isMarked = Block.puzzle.puzzleData[this.y][this.x];

		if (Puzzle.isEditing && Block.isLoading && this.isMarked){
			this.state = 'marked';
		}
		else if (Puzzle.isEditing){
			this.state = 'flagged';
		}
		else{
			this.state = 'neutral';
		}

		$(this.elem).addClass(this.state);
		Block.blocks.push(this);

	}

	mark(){

		if (!Puzzle.isEditing){

			if (this.state === 'marked'){
				this.neutralize();
			}
			else{

				if (this.isMarked){
					Block.puzzle.correctBlocks += 1;
				}
				else if (this.state ==='flagged'){
					Block.puzzle.correctBlocks -= 1;
				}

				let stateChange = !this.isMarked && !Puzzle.difficulty ? 'wrong' : 'marked';
				$(this.elem).removeClass().addClass(`puzzleBlock ${stateChange}`);
				this.state = 'marked';

				if (Block.puzzle.correctBlocks === Block.puzzle.puzzleLength){
					Puzzle.completeGame();
				}

			}

		}
		else{

			if (this.state !== 'marked'){
				this.state = 'marked';
				Block.puzzle.editPuzzleData(this.y, this.x, 1);
				$(this.elem).removeClass().addClass('puzzleBlock marked');
				this.updatePuzzleNums();
			}

		}

	}

	flag(){

		if (!Puzzle.isEditing){

			if (this.state === 'flagged'){
				this.neutralize();
			}
			else{

				if (!this.isMarked){
					Block.puzzle.correctBlocks += 1;
				}
				else if (this.state ==='marked'){
					Block.puzzle.correctBlocks -= 1;
				}

				let stateChange = this.isMarked && !Puzzle.difficulty ? 'wrong' : 'flagged';
				$(this.elem).removeClass().addClass(`puzzleBlock ${stateChange}`);
				this.state = 'flagged';

				if (Block.puzzle.correctBlocks === Block.puzzle.puzzleLength){
					Puzzle.completeGame();
				}

			}
		}
		else{

			if (this.state !== 'flagged'){
				this.state = 'flagged';
				Block.puzzle.editPuzzleData(this.y, this.x, 0);
				$(this.elem).removeClass().addClass('puzzleBlock flagged');
				this.updatePuzzleNums();
			}

		}

	}

	neutralize(){

		if (!Puzzle.isEditing){
			if (this.state !== 'neutral'){

				$(this.elem).removeClass().addClass('puzzleBlock neutral');
				if ((this.isMarked && this.state === 'marked') || (!this.isMarked && this.state === 'flagged')){
					Block.puzzle.correctBlocks -= 1;
				}
				this.state = 'neutral';
			}
			else{
				console.log("Whoops, a neutral block was neutralized :^)", this.y, this.x);
			}
		}

	}

	updatePuzzleNums(){

		let currentRow = [];
		for (let x of Block.puzzle.puzzleData[this.y]){
			currentRow.push(x);
		}

		let currentCol = [];
		for (let y of Block.puzzle.puzzleData){
			currentCol.push(y[this.x]);
		}

		let rowNums = Block.puzzle.countConsecutiveBlocks(currentRow);

		let colNums = Block.puzzle.countConsecutiveBlocks(currentCol);

		Block.puzzle.setRowNumbers(this.y, rowNums);

		Block.puzzle.setColNumbers(this.x, colNums);
	}

}


class DragOperation{

	static mouseState = 0;

	constructor(id, state){

		this.baseBlock = id;
		this.y = this.idSplit(id)[0];
		this.x = this.idSplit(id)[1];
		this.direction = null; //0=North, 1=East, 2=South, 3=West.
		this.lastBlock = null;
		this.action = null; //0=mark, 1=flag, 2=neutralize marked, 3=neutralise flagged.
		if (DragOperation.mouseState === 1){
			this.action = state === 'marked' ? 2 : 0;
		}
		else if (DragOperation.mouseState === 3){
			this.action = state === 'flagged' ? 3 : 1;
		}
	}

	idSplit = id => id.split('+');

	whatDirection(prev, current){

		let [preY, preX] = this.idSplit(prev);
		let [curY, curX] = this.idSplit(current);
		if (preY - curY){//if vertical
			return preY - curY === 1 ? 0 : 2;
		}
		else{ //if horizontal
			return preX - curX === 1 ? 3 : 1;
		}
	}

	whatAction(state, reverse=false){ //0 = mark, 1 = flag, 2 = neutralize

		if (!reverse &&
			this.action === 0 && state === 'marked' ||
			this.action === 1 && state === 'flagged' ||
			this.action === 2 && state !== 'marked' ||
			this.action === 3 && state !== 'flagged' ||
			reverse && state === 'neutral' && this.action > 1){
			return null;
		}
		else if(reverse &&
			(this.action === 0 && state === 'marked' ||
				this.action === 1 && state === 'flagged')){
			return 2;
		}
		else {
			return this.action === 3 ? 2 : this.action;
		}
	}

	fixPos(id){

		if(!(this.direction & 1)){
			return this.idSplit(id)[0] + '+' + this.x.toString(); //True = vertical
		}
		else{
			return this.y.toString() + '+' + this.idSplit(id)[1];
		}
	}

	update(id, state){

		if(this.direction === null){ //Set direction
			this.lastBlock = id;
			this.direction = this.whatDirection(this.baseBlock, id);
			return [id, this.whatAction(state)];
		}
		let currentDir = this.whatDirection(this.lastBlock, id);
		let action = this.whatAction(state, currentDir !== this.direction);
		if(action !== null && currentDir !== null && ((currentDir & 1) === (this.direction & 1))){//If action is needed
			if (currentDir === this.direction) { //Progressing
				this.lastBlock = id;
				return [this.fixPos(id), this.whatAction(state)];
			} else { //Backtracking
				let retHold = this.fixPos(this.lastBlock);
				this.lastBlock = id;
				if (id === this.baseBlock) { //Reset
					this.lastBlock = null;
					this.direction = null; //TODO: add bugfixes and semiReset code here
				}
				return [retHold, this.whatAction(state, true)];
			}
		}
		else{
			this.lastBlock = id;
			return null;
		}
	}
}

$(document).ready(function(){

	new Puzzle(Puzzle.defaultPuzzleData);

	$('#yRes').prop('disabled', 1);
	$('#xRes').prop('disabled', 1);
	$('#difficultySelector').val('no help');
	$('#inputBox').val('');
	$('#paletteSelector').val('palHacker');
	Puzzle.changePalette($('#palHacker'));

	$('html').mouseup(function(){

		DragOperation.mouseState = 0;
		Block.puzzle.dragOp = null;

	});

	$('#xRes').change(function(){

		if(Puzzle.isEditing){

			let res = $(this).val();

			if (!(50 >= res && res > 1)){
				$(this).val(res > 1 ? 50 : 2);
				res = res > 1 ? 50 : 2;
			}

			if (res > Block.puzzle.layout_x){
				new Puzzle(Block.puzzle.addColumnToCurrentData(res));
			}
			else if (res < Block.puzzle.layout_x){
				new Puzzle(Block.puzzle.subColumnFromCurrentData(res));
			}
		}

	});

	$('#yRes').change(function(){

		if(Puzzle.isEditing){

			let res = $(this).val();

			if (!(50 >= res && res > 1)){
				$(this).val(res > 1 ? 50 : 2);
				res = res > 1 ? 50 : 2;
			}

			if (res > Block.puzzle.layout_y){
				new Puzzle(Block.puzzle.addRowToCurrentData(res));
			}
			else if (res < Block.puzzle.layout_y){
				new Puzzle(Block.puzzle.subRowFromCurrentData(res));
			}
		}

	});

	$('#difficultySelector').change(function(){

		switch($(this).val()){
			case "no help":
				Puzzle.difficulty = 2;
				break;
			case "greying numbers":
				Puzzle.difficulty = 2; //TODO: Add number greying and change this to 1
				break;
			case "instant feedback":
				Puzzle.difficulty = 0;
				break;
		}

		for (let currentBlock of Block.blocks){

			if (currentBlock.state !== 'neutral'){

				let isCorrect = (currentBlock.state === 'marked' && currentBlock.isMarked || currentBlock.state === 'flagged' && !currentBlock.isMarked);
				let cssState = !isCorrect && !Puzzle.difficulty ? 'wrong' : currentBlock.state;
				$(currentBlock.elem).removeClass().addClass(`puzzleBlock ${cssState}`);

			}
		}

	});

	$('#paletteSelector').change(function(){

		let paletteId = '#' + $(this).val();
		Puzzle.changePalette($(paletteId));

	})

	$('#editButton').click(function(){

		if (Puzzle.isEditing){

			Puzzle.isEditing = 0;
			new Puzzle(Puzzle.defaultPuzzleData);
			$(this).html("Switch to edit mode");

			$('#yRes').prop('disabled', 1);
			$('#xRes').prop('disabled', 1);

			$('#difficultyLabel').show();
			$('#difficultySelector').show();
			console.log("Now playing");
		}
		else{

			Puzzle.isEditing = 1;
			new Puzzle(Block.puzzle.generateBlankPuzzleData());
			$(this).html("Switch to play mode");

			$('#yRes').prop('disabled', 0);
			$('#xRes').prop('disabled', 0);

			$('#difficultyLabel').hide();
			$('#difficultySelector').hide();
			console.log("Now editing");

		}

	});

	$('#loadButton').click(function(){

		let dataHold = $('#inputBox').val();
		let isValid = Block.puzzle.isDataValid(atob(dataHold));
		if (isValid){
			Block.isLoading = Puzzle.isEditing;
			new Puzzle($('#inputBox').val());
		}
		else if (Puzzle.isEditing){
			alert("Invalid puzzle code. :^(");
		}
		else{
			alert("Invalid puzzle code. Sorry :^(\nHave a special puzzle as a consolation price!");
			new Puzzle(Puzzle.errorPuzzleData);
		}

	});

	$('#randomButton').click(function(){

		new Puzzle(Block.puzzle.generateRandomPuzzleData())

	});

	$('#exportButton').click(function(){

		$('#inputBox').val(Block.puzzle.encode());

	});

});
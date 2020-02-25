const { dialog } = require('electron').remote;
const fs = require('fs');
const ACNLP = require('./assets/js/acnlp.js');

let currentPattern;

let debugLoadButton = document.querySelector("button.debug_load");
let debugCanvas = document.querySelector("canvas.debug_canvas");
let debugCanvasContext = debugCanvas.getContext('2d');

let debugTitle = document.querySelector(".debug_title");
let debugCreator = document.querySelector(".debug_creator");
let debugTown = document.querySelector(".debug_town");
let debugType = document.querySelector(".debug_type");
let debugPalette = document.querySelector(".debug_palette");

function LoadData(_data) {
    currentPattern = new ACNLP(_data);

    // Set Info
    debugTitle.innerHTML = currentPattern.getTitle();
    debugCreator.innerHTML = currentPattern.getCreator();
    debugTown.innerHTML = currentPattern.getTown();
    debugType.innerHTML = currentPattern.getType();

    // Draw Canvas
    currentPattern.draw(debugCanvasContext, 0);

    debugPalette.innerHTML = "";
    for(let i = 0; i < 15; i++) {
        let newPaletteItem = document.createElement("div");
        newPaletteItem.style.backgroundColor = currentPattern.getColor(i);
        newPaletteItem.style.width = "16px";
        newPaletteItem.style.height = "16px";

        debugPalette.appendChild(newPaletteItem);
    }
}

debugLoadButton.addEventListener('click', function() {
    // DEBUG SHORT LOAD
    /* fs.readFile("/Users/andreasheimann/Downloads/_LoremIpsumLoremIpsumL.acnl", (err, data)=> {
        if(err) {
            alert("An error occured reading the file: " + err.message);
            return;
        }

        LoadData(data);
    }); */

    // NO DEBUG UNCOMMENT FOR FILE OPEN DIALOG
    dialog.showOpenDialog({ properties: ['openFile'] }).then(result => {
        let filePath = result.filePaths[0];

        fs.readFile(filePath, (err, data)=> {
            if(err) {
                alert("An error occured reading the file: " + err.message);
                return;
            }

            LoadData(data);
        });
    });
});
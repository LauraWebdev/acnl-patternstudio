const { dialog } = require('electron').remote;
const fs = require('fs');
const Jimp = require('jimp');
const QRReader = require("jsqr");
const ACNLP = require('./assets/js/acnlp.js');

let currentPattern;

let debugLoadACNLButton = document.querySelector("button.debug_loadacnl");
let debugCanvasPreview = document.querySelector("canvas.debug_canvaspreview");
let debugCanvasBoard = document.querySelector("canvas.debug_canvasboard");

let debugTitle = document.querySelector(".debug_title");
let debugCreator = document.querySelector(".debug_creator");
let debugTown = document.querySelector(".debug_town");
let debugType = document.querySelector(".debug_type");
let debugPalette = document.querySelector(".debug_palette");

let debugLoadImageButton = document.querySelector("button.debug_loadimage");
let debugSaveImageButton = document.querySelector("button.debug_saveimage");

function LoadData(_data) {
    currentPattern = new ACNLP(_data);

    // Set Info
    debugTitle.innerHTML = currentPattern.getTitle();
    debugCreator.innerHTML = currentPattern.getCreator();
    debugTown.innerHTML = currentPattern.getTown();
    debugType.innerHTML = currentPattern.getType();

    // Draw Canvas
    currentPattern.draw(debugCanvasBoard.getContext('2d'), 0);
    currentPattern.draw(debugCanvasPreview.getContext('2d'), 0);

    debugPalette.innerHTML = "";
    for(let i = 0; i < 15; i++) {
        let newPaletteItem = document.createElement("div");
        let color = currentPattern.getColor(i);
        newPaletteItem.style.backgroundColor = color;
        newPaletteItem.innerHTML = i;
        newPaletteItem.style.color = getContrastYIQ(color);

        debugPalette.appendChild(newPaletteItem);
    }
}

debugLoadACNLButton.addEventListener('click', function() {
    dialog.showOpenDialog({ title: "Load ACNL File", properties: ['openFile'], filters: [{"name": "ACNL File", "extensions": ["acnl", "bin"]}] }).then(result => {
        if(!result.canceled) {
            let filePath = result.filePaths[0];

            fs.readFile(filePath, (err, data)=> {
                if(err) {
                    alert("An error occured reading the file: " + err.message);
                    return;
                }

                LoadData(data);
            });
        }
    });
});

debugLoadImageButton.addEventListener('click', function() {
    dialog.showOpenDialog({ title: "Load QR Code Image", properties: ['openFile'], filters: [{"name": "Image", "extensions": ["png", "jpeg", "jpg"]}] }).then(result => {
        if(!result.canceled) {
            let filePath = result.filePaths[0];

            Jimp.read(filePath, function(err, image) {
                if(err) {
                    console.error(err);
                    return;
                }

                let code = QRReader(image.bitmap.data, image.bitmap.width, image.bitmap.height);
                if(code) {
                    LoadData(code.binaryData);
                } else {
                    console.error("Cannot find QR Code in Image");
                }
            });
        }
    });
});

debugSaveImageButton.addEventListener('click', function() {
    dialog.showSaveDialog({ title: "Save QR Code Image", filters: [{"name": "PNG Image", "extensions": ["png"]}]}).then(result => {
        if(!result.canceled) {
            let filePath = result.filePath;
        }
    });
});

function getContrastYIQ(hexcolor){
    hexcolor = hexcolor.replace("#", "");
    var r = parseInt(hexcolor.substr(0,2),16);
    var g = parseInt(hexcolor.substr(2,2),16);
    var b = parseInt(hexcolor.substr(4,2),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? 'black' : 'white';
}
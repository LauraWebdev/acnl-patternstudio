// Huge thanks to Thulinma and DamSenViet for their projects and research of the binary data
// Initialization: new ACNLP(data);

class ACNLP {
    constructor(_data) {
        if(this.validateData(_data)) {
            this.data = _data;
        } else {
            console.error("Data Validation Failed.");
            return;
        }
    }
    validateData(_data) {
        if(_data instanceof Buffer || typeof _data == "object") {
            if(_data.byteLength == 620 || _data.length == 620) {
                return true;
            } else {
                console.error("Data is not valid (Length is not 620 bytes)");
                console.error("Data Byte Length: " + _data.byteLength);
                console.error("Data Object Length: " + _data.length);
                return false;
            }
        } else {
            console.error("Data is not valid (Not a Buffer[])");
            console.error("Data is: " + typeof _data);
            return false;
        }
    }
    getTitle(){
        return this.read(0, 41); 
    }
    getCreator(){
        return this.read(0x2C, 19);
    }
    getTown(){
        return this.read(0x42, 19);
    }
    setTitle( _value ){
        this.writeString(0x00, 41, _value);
    }
    setCreator( _value ){
        this.writeString(0x2C, 19, _value);
    }
    setTown( _value ){
        this.writeString(0x42, 19, _value);
    }
    getCreatorID(){
      return ((this.data[0x2A] << 8) + this.data[0x2B]).toString(16);
    }
    getTownID(){
      return ((this.data[0x40] << 8) + this.data[0x41]).toString(16);
    }
    setCreatorID( _id ){
        var num = parseInt(_id, 16);
        this.writeByte(0x2A, (num >> 8) & 0xFF);
        this.writeByte(0x2B, num & 0xFF);
    }
    setTownID( _id ){
        var num = parseInt(_id, 16);
        this.writeByte(0x40, (num >> 8) & 0xFF);
        this.writeByte(0x41, num & 0xFF);
    }
    getType() {
      return this.data[0x69];
    }

    // Get a color based on its index (0 - 15) in the palette
    getColor(_colorIndex) {
        let colorFromPalette = this.data[0x58 + _colorIndex];
        let color = this.getHexColor(colorFromPalette);
        return color;
    }
    setColor(_colorIndex, _newColor) {
        let colorByte = this.getByteColor(_newColor);
        this.data[0x58 + _colorIndex] = colorByte;
        return colorByte;
    }

    // Draw the entire pattern
    draw(_canvasCtx, _pattern) {
        console.log("Draw!");

        // Clear Canvas
        _canvasCtx.canvas.width = 32;
        _canvasCtx.canvas.height = 32;
        _canvasCtx.fillStyle = "rgba(255,255,255,0)";
        _canvasCtx.fillRect(0, 0, 512, 512);

        // Each Pattern is 512 bytes long
        for (var i = 0; i < 512; i++){
            // Every Byte within a pattern contains 2 values between 0 and 15 representing the index in the current palette
            // Big thanks to DamSenViet for their comments in their React port of the original Animal Crossing New Leaf Pattern Tool by Thulinma
            // https://github.com/DamSenViet/react-acnl-pattern-tool/blob/master/src/EditorCanvas.jsx
            let pixelPair = this.data[this.getPatternOffset(_pattern) + i];
            let firstColor = this.getColor(pixelPair & 0x0F);
            let secondColor = this.getColor(pixelPair >> 4);
            
            this.drawColor(_canvasCtx, i * 2, firstColor);
            this.drawColor(_canvasCtx, i * 2 + 1, secondColor);
        }
    }

    // Draw a color at a certain offset
	drawColor(_canvasCtx, _offset, _color) {
		let x = (_offset % 32);
        let y = Math.floor(_offset / 32);

        if(_color == 15) {
            _canvasCtx.clearRect(x, y, 1, 1);
        } else {
            _canvasCtx.fillStyle = _color;
            _canvasCtx.fillRect(x, y, 1, 1);
        }
    }
    
    colorPixel(_canvasCtx, _x, _y, _colorIndex) {
        let pixelColor = this.getColor(_colorIndex);

        if(_colorIndex == 15) {
            _canvasCtx.clearRect(_x, _y, 1, 1);
        } else {
            _canvasCtx.fillStyle = pixelColor;
            _canvasCtx.fillRect(_x, _y, 1, 1);
        }

        this.updatePixel(_x, _y, _colorIndex);
    }

	updatePixel(x, y, chosenColor) {
		if (chosenColor < 0 || chosenColor > 16) {
			throw new Error("invalid chosen color");
		}

		if (
			isNaN(x) ||
			isNaN(y) ||
			x < 0 ||
			y < 0 ||
			x > 63 ||
			y > 63
		) return false;

		if (
			this.data.length !== 0x870 &&
			(x > 31 || y > 31)
		) return false;

		// each "pixel" in the pattern is only half a byte (colors are 0-14)
		// since each pattern is 32 x 32, we need only 16 bytes in width
		// to represent a row of the pattern, y * 16 allows us to skip rows
		// x assumes that you can get pixels from 0 -> 64 in this situation
		// to get column, we need to x/2

		// reminder that this is a port, will have to refactor this to only color
		// pixels in specific patterns in the future

		// determine pattern quadrant

		let patternNum;
		// top left -> pattern 1
		if (x <= 31 && y <= 31) patternNum = 0;
		// bottom left -> pattern 2
		else if (x <= 31 && y <= 63) patternNum = 1;
		// top right -> pattern 3
		else if (x <= 63 && y <= 31) patternNum = 2;
		// bottom right -> pattern 4
		else if (x <= 63 && y <= 63) patternNum = 3;

		let offset = 0x6C + Math.floor(x % 32 / 2) + (y % 32) * 16;
		// correct offset based on quadrant
		offset += (patternNum * 512);
		// console.log(offset.toString(16));

		// need to make sure we don't override other pixels
		let val = this.data[offset] & 0xFF;
		let oldval = val;
		if ((x % 2) === 1) {
			// keep last half, replace first half with chosen color
			val = (val & 0x0F) + (chosenColor << 4);
		} else {
			// keep first half, replace second half with chosen color
			val = (val & 0xF0) + chosenColor;
		}

		if (val === oldval) {
			return false;
		}

		this.writeByte(offset, val);
		return true;
	}

    // Get the offset in the data bytearray based on the pattern number
    getPatternOffset(_pattern) {
        switch(_pattern) {
            case 0:
            default:
                return 0x6c;
            case 1:
                return 0x26C;
            case 2:
                return 0x46C;
            case 2:
                return 0x66C;
        }
    }

    // Helper Function: Writing a single byte value
    writeByte(_offset, _value) {
        this.data[_offset] = _value;
    }
    // Helper Function: Reading from an offset
    read(_offset, _length){
        var tmp = "";
        for (var i = _offset; i < _offset + _length; i += 2){
            var char = (this.data[i+1] << 8) + this.data[i];
            if (char == 0){return tmp;}
            tmp += String.fromCharCode(char);
        }
        return tmp;
    }
    // Helper Function: Writing a value to an offset
    write(_offset, _length, _value){
        for (var i = 0; i < _length; i++){
            if (i >= _value.length){
                this.writeByte(_offset + i*2, 0);
                this.writeByte(_offset + i*2+1, 0);
            } else{
                this.writeByte(_offset + i*2, _value[i] & 0xFF);
                this.writeByte(_offset + i*2+1, (_value[i] >> 8) & 0xFF);
            }
        }
    }
    writeString(_offset, _length, _value) {
        // Write Bytes
        for (let i = 0; i < _length / 2; i++){
            if (i >= _value.length){
                this.writeByte(_offset + i*2, 0);
            } else{
                this.writeByte(_offset + i*2, _value.charCodeAt(i));
            }
        }
    }
    getData() {
        return this.data;
    }

    // Byte to HexColor Index
    getHexColor(_color) {
        switch (_color) {
            //pinks
            case 0x00: return "#FFEFFF";
            case 0x01: return "#FF9AAD";
            case 0x02: return "#EF559C";
            case 0x03: return "#FF65AD";
            case 0x04: return "#FF0063";
            case 0x05: return "#BD4573";
            case 0x06: return "#CE0052";
            case 0x07: return "#9C0031";
            case 0x08: return "#522031";
            
            //reds
            case 0x10: return "#FFBACE";
            case 0x11: return "#FF7573";
            case 0x12: return "#DE3010";
            case 0x13: return "#FF5542";
            case 0x14: return "#FF0000";
            case 0x15: return "#CE6563";
            case 0x16: return "#BD4542";
            case 0x17: return "#BD0000";
            case 0x18: return "#8C2021";
            
            //oranges
            case 0x20: return "#DECFBD";
            case 0x21: return "#FFCF63";
            case 0x22: return "#DE6521";
            case 0x23: return "#FFAA21";
            case 0x24: return "#FF6500";
            case 0x25: return "#BD8A52";
            case 0x26: return "#DE4500";
            case 0x27: return "#BD4500";
            case 0x28: return "#633010";
            
            //pastels or something, I guess?
            case 0x30: return "#FFEFDE";
            case 0x31: return "#FFDFCE";
            case 0x32: return "#FFCFAD";
            case 0x33: return "#FFBA8C";
            case 0x34: return "#FFAA8C";
            case 0x35: return "#DE8A63";
            case 0x36: return "#BD6542";
            case 0x37: return "#9C5531";
            case 0x38: return "#8C4521";
            
            //purple
            case 0x40: return "#FFCFFF";
            case 0x41: return "#EF8AFF";
            case 0x42: return "#CE65DE";
            case 0x43: return "#BD8ACE";
            case 0x44: return "#CE00FF";
            case 0x45: return "#9C659C";
            case 0x46: return "#8C00AD";
            case 0x47: return "#520073";
            case 0x48: return "#310042";
            
            //pink
            case 0x50: return "#FFBAFF";
            case 0x51: return "#FF9AFF";
            case 0x52: return "#DE20BD";
            case 0x53: return "#FF55EF";
            case 0x54: return "#FF00CE";
            case 0x55: return "#8C5573";
            case 0x56: return "#BD009C";
            case 0x57: return "#8C0063";
            case 0x58: return "#520042";
            
            //brown
            case 0x60: return "#DEBA9C";
            case 0x61: return "#CEAA73";
            case 0x62: return "#734531";
            case 0x63: return "#AD7542";
            case 0x64: return "#9C3000";
            case 0x65: return "#733021";
            case 0x66: return "#522000";
            case 0x67: return "#311000";
            case 0x68: return "#211000";
            
            //yellow
            case 0x70: return "#FFFFCE";
            case 0x71: return "#FFFF73";
            case 0x72: return "#DEDF21";
            case 0x73: return "#FFFF00";
            case 0x74: return "#FFDF00";
            case 0x75: return "#CEAA00";
            case 0x76: return "#9C9A00";
            case 0x77: return "#8C7500";
            case 0x78: return "#525500";
            
            //blue
            case 0x80: return "#DEBAFF";
            case 0x81: return "#BD9AEF";
            case 0x82: return "#6330CE";
            case 0x83: return "#9C55FF";
            case 0x84: return "#6300FF";
            case 0x85: return "#52458C";
            case 0x86: return "#42009C";
            case 0x87: return "#210063";
            case 0x88: return "#211031";
            
            //ehm... also blue?
            case 0x90: return "#BDBAFF";
            case 0x91: return "#8C9AFF";
            case 0x92: return "#3130AD";
            case 0x93: return "#3155EF";
            case 0x94: return "#0000FF";
            case 0x95: return "#31308C";
            case 0x96: return "#0000AD";
            case 0x97: return "#101063";
            case 0x98: return "#000021";
            
            //green
            case 0xA0: return "#9CEFBD";
            case 0xA1: return "#63CF73";
            case 0xA2: return "#216510";
            case 0xA3: return "#42AA31";
            case 0xA4: return "#008A31";
            case 0xA5: return "#527552";
            case 0xA6: return "#215500";
            case 0xA7: return "#103021";
            case 0xA8: return "#002010";
            
            //icky greenish yellow
            case 0xB0: return "#DEFFBD";
            case 0xB1: return "#CEFF8C";
            case 0xB2: return "#8CAA52";
            case 0xB3: return "#ADDF8C";
            case 0xB4: return "#8CFF00";
            case 0xB5: return "#ADBA9C";
            case 0xB6: return "#63BA00";
            case 0xB7: return "#529A00";
            case 0xB8: return "#316500";
            
            //Wtf? More blue?
            case 0xC0: return "#BDDFFF";
            case 0xC1: return "#73CFFF";
            case 0xC2: return "#31559C";
            case 0xC3: return "#639AFF";
            case 0xC4: return "#1075FF";
            case 0xC5: return "#4275AD";
            case 0xC6: return "#214573";
            case 0xC7: return "#002073";
            case 0xC8: return "#001042";
            
            //gonna call this cyan
            case 0xD0: return "#ADFFFF";
            case 0xD1: return "#52FFFF";
            case 0xD2: return "#008ABD";
            case 0xD3: return "#52BACE";
            case 0xD4: return "#00CFFF";
            case 0xD5: return "#429AAD";
            case 0xD6: return "#00658C";
            case 0xD7: return "#004552";
            case 0xD8: return "#002031";
            
            //more cyan, because we didn't have enough blue-like colors yet
            case 0xE0: return "#CEFFEF";
            case 0xE1: return "#ADEFDE";
            case 0xE2: return "#31CFAD";
            case 0xE3: return "#52EFBD";
            case 0xE4: return "#00FFCE";
            case 0xE5: return "#73AAAD";
            case 0xE6: return "#00AA9C";
            case 0xE7: return "#008A73";
            case 0xE8: return "#004531";
            
            //also green. Fuck it, whatever.
            case 0xF0: return "#ADFFAD";
            case 0xF1: return "#73FF73";
            case 0xF2: return "#63DF42";
            case 0xF3: return "#00FF00";
            case 0xF4: return "#21DF21";
            case 0xF5: return "#52BA52";
            case 0xF6: return "#00BA00";
            case 0xF7: return "#008A00";
            case 0xF8: return "#214521";
            
            //greys
            case 0x0F: return "#FFFFFF";
            case 0x1F: return "#ECECEC";
            case 0x2F: return "#DADADA";
            case 0x3F: return "#C8C8C8";
            case 0x4F: return "#B6B6B6";
            case 0x5F: return "#A3A3A3";
            case 0x6F: return "#919191";
            case 0x7F: return "#7F7F7F";
            case 0x8F: return "#6D6D6D";
            case 0x9F: return "#5B5B5B";
            case 0xAF: return "#484848";
            case 0xBF: return "#363636";
            case 0xCF: return "#242424";
            case 0xDF: return "#121212";
            case 0xEF: return "#000000";

            //transparency
            case 0xCC: return "transparent";
            
            default:
                //0x?9 - 0x?E aren't used. Not sure what they do in-game. Can somebody test this?
                //0xFF is displayed as white in-game, editing it causes a game freeze.
                return "";
        }
    }
    getByteColor(_color) {
        switch (_color) {
            //pinks
            case "#FFEFFF": return 0x00;
            case "#FF9AAD": return 0x01;
            case "#EF559C": return 0x02;
            case "#FF65AD": return 0x03;
            case "#FF0063": return 0x04;
            case "#BD4573": return 0x05;
            case "#CE0052": return 0x06;
            case "#9C0031": return 0x07;
            case "#522031": return 0x08;
            
            //reds
            case "#FFBACE": return 0x10;
            case "#FF7573": return 0x11;
            case "#DE3010": return 0x12;
            case "#FF5542": return 0x13;
            case "#FF0000": return 0x14;
            case "#CE6563": return 0x15;
            case "#BD4542": return 0x16;
            case "#BD0000": return 0x17;
            case "#8C2021": return 0x18;
            
            //oranges
            case "#DECFBD": return 0x20;
            case "#FFCF63": return 0x21;
            case "#DE6521": return 0x22;
            case "#FFAA21": return 0x23;
            case "#FF6500": return 0x24;
            case "#BD8A52": return 0x25;
            case "#DE4500": return 0x26;
            case "#BD4500": return 0x27;
            case "#633010": return 0x28;
            
            //pastels or something, I guess?
            case "#FFEFDE": return 0x30;
            case "#FFDFCE": return 0x31;
            case "#FFCFAD": return 0x32;
            case "#FFBA8C": return 0x33;
            case "#FFAA8C": return 0x34;
            case "#DE8A63": return 0x35;
            case "#BD6542": return 0x36;
            case "#9C5531": return 0x37;
            case "#8C4521": return 0x38;
            
            //purple
            case "#FFCFFF": return 0x40;
            case "#EF8AFF": return 0x41;
            case "#CE65DE": return 0x42;
            case "#BD8ACE": return 0x43;
            case "#CE00FF": return 0x44;
            case "#9C659C": return 0x45;
            case "#8C00AD": return 0x46;
            case "#520073": return 0x47;
            case "#310042": return 0x48;
            
            //pink
            case "#FFBAFF": return 0x50;
            case "#FF9AFF": return 0x51;
            case "#DE20BD": return 0x52;
            case "#FF55EF": return 0x53;
            case "#FF00CE": return 0x54;
            case "#8C5573": return 0x55;
            case "#BD009C": return 0x56;
            case "#8C0063": return 0x57;
            case "#520042": return 0x58;
            
            //brown
            case "#DEBA9C": return 0x60;
            case "#CEAA73": return 0x61;
            case "#734531": return 0x62;
            case "#AD7542": return 0x63;
            case "#9C3000": return 0x64;
            case "#733021": return 0x65;
            case "#522000": return 0x66;
            case "#311000": return 0x67;
            case "#211000": return 0x68;
            
            //yellow
            case "#FFFFCE": return 0x70;
            case "#FFFF73": return 0x71;
            case "#DEDF21": return 0x72;
            case "#FFFF00": return 0x73;
            case "#FFDF00": return 0x74;
            case "#CEAA00": return 0x75;
            case "#9C9A00": return 0x76;
            case "#8C7500": return 0x77;
            case "#525500": return 0x78;
            
            //blue
            case "#DEBAFF": return 0x80;
            case "#BD9AEF": return 0x81;
            case "#6330CE": return 0x82;
            case "#9C55FF": return 0x83;
            case "#6300FF": return 0x84;
            case "#52458C": return 0x85;
            case "#42009C": return 0x86;
            case "#210063": return 0x87;
            case "#211031": return 0x88;
            
            //ehm... also blue?
            case "#BDBAFF": return 0x90;
            case "#8C9AFF": return 0x91;
            case "#3130AD": return 0x92;
            case "#3155EF": return 0x93;
            case "#0000FF": return 0x94;
            case "#31308C": return 0x95;
            case "#0000AD": return 0x96;
            case "#101063": return 0x97;
            case "#000021": return 0x98;
            
            //green
            case "#9CEFBD": return 0xA0;
            case "#63CF73": return 0xA1;
            case "#216510": return 0xA2;
            case "#42AA31": return 0xA3;
            case "#008A31": return 0xA4;
            case "#527552": return 0xA5;
            case "#215500": return 0xA6;
            case "#103021": return 0xA7;
            case "#002010": return 0xA8;
            
            //icky greenish yellow
            case "#DEFFBD": return 0xB0;
            case "#CEFF8C": return 0xB1;
            case "#8CAA52": return 0xB2;
            case "#ADDF8C": return 0xB3;
            case "#8CFF00": return 0xB4;
            case "#ADBA9C": return 0xB5;
            case "#63BA00": return 0xB6;
            case "#529A00": return 0xB7;
            case "#316500": return 0xB8;
            
            //Wtf? More blue?
            case "#BDDFFF": return 0xC0;
            case "#73CFFF": return 0xC1;
            case "#31559C": return 0xC2;
            case "#639AFF": return 0xC3;
            case "#1075FF": return 0xC4;
            case "#4275AD": return 0xC5;
            case "#214573": return 0xC6;
            case "#002073": return 0xC7;
            case "#001042": return 0xC8;
            
            //gonna call this cyan
            case "#ADFFFF": return 0xD0;
            case "#52FFFF": return 0xD1;
            case "#008ABD": return 0xD2;
            case "#52BACE": return 0xD3;
            case "#00CFFF": return 0xD4;
            case "#429AAD": return 0xD5;
            case "#00658C": return 0xD6;
            case "#004552": return 0xD7;
            case "#002031": return 0xD8;
            
            //more cyan, because we didn't have enough blue-like colors yet
            case "#CEFFEF": return 0xE0;
            case "#ADEFDE": return 0xE1;
            case "#31CFAD": return 0xE2;
            case "#52EFBD": return 0xE3;
            case "#00FFCE": return 0xE4;
            case "#73AAAD": return 0xE5;
            case "#00AA9C": return 0xE6;
            case "#008A73": return 0xE7;
            case "#004531": return 0xE8;
            
            //also green. Fuck it, whatever.
            case "#ADFFAD": return 0xF0;
            case "#73FF73": return 0xF1;
            case "#63DF42": return 0xF2;
            case "#00FF00": return 0xF3;
            case "#21DF21": return 0xF4;
            case "#52BA52": return 0xF5;
            case "#00BA00": return 0xF6;
            case "#008A00": return 0xF7;
            case "#214521": return 0xF8;
            
            //greys
            case "#FFFFFF": return 0x0F;
            case "#ECECEC": return 0x1F;
            case "#DADADA": return 0x2F;
            case "#C8C8C8": return 0x3F;
            case "#B6B6B6": return 0x4F;
            case "#A3A3A3": return 0x5F;
            case "#919191": return 0x6F;
            case "#7F7F7F": return 0x7F;
            case "#6D6D6D": return 0x8F;
            case "#5B5B5B": return 0x9F;
            case "#484848": return 0xAF;
            case "#363636": return 0xBF;
            case "#242424": return 0xCF;
            case "#121212": return 0xDF;
            case "#000000": return 0xEF;

            //transparency
            case "transparent": return 0xCC;
            
            default:
                //0x?9 - 0x?E aren't used. Not sure what they do in-game. Can somebody test this?
                //0xFF is displayed as white in-game, editing it causes a game freeze.
                return "";
        }
    }
}

module.exports = ACNLP;
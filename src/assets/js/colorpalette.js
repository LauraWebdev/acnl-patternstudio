let currentColor = 0;
let DOMcolors = document.querySelectorAll(".color-palette .color");

function selectColor(_newColor) {
    currentColor = _newColor;

    DOMcolors.forEach(function(item) {
        item.classList.remove("selected");
    });

    DOMcolors[_newColor].classList.add("selected");
}
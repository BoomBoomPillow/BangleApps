const chars = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","1","2","3","4","5","6","7","8","9","0","-","=","[","]",";","'","~",",",".","/","!","@","#","$","%","^","&","*","(",")","_","+","{","}",":","\"","`","<",">","?"," "];

const keycodes = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,45,46,47,48,51,52,53,54,55,56,30,31,32,33,34,35,36,37,38,39,45,46,47,48,51,52,53,54,55,56,44];

const shift_flags = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0];

var kb = require("ble_hid_keyboard");
NRF.setServices(undefined, { hid : kb.report });

// Add 'appearance' to advertising for Windows 11
NRF.setAdvertising([
  {}, // include original Advertising packet
  [   // second packet containing 'appearance'
    2, 1, 6,  // standard Bluetooth flags
    3,3,0x12,0x18, // HID Service
    3,0x19,0xc1,0x03 // Appearance: Keyboard
        // 0xc2,0x03 : 0x03C2 Mouse
        // 0xc3,0x03 : 0x03C3 Joystick
  ]
]);

function getKeycode(char) {
  var i = 0;
  //char = char.toUpperCase();

  while (chars[i] != char) {
    i++;

    if (i >= chars.length) {
      return null;
    }
  }

  return keycodes[i];
}

function getShiftFlag(char) {
  var i = 0;

  while (chars[i] != char) {
    i++;

    if (i >= chars.length) {
      return null;
    }
  }

  return shift_flags[i];
}

class listNode {
  constructor(command, modifier) {
    this.command = command;

    if (modifier===undefined) {
      modifier = 0;
    }

    this.modifier = modifier;

    this.next = null;
  }
}

class LinkedList {
    constructor()
    {
      this.head = null;
      this.size = 0;
    }

    addNode(command, modifier) {
      let node = new listNode(command, modifier);

      if (this.head == null)
        this.head = node;
      else {
        current = this.head;

        // iterate to the end of the
        // list
        while (current.next) {
          current = current.next;
        }

        // add node
        current.next = node;
      }
      this.size++;
    }

    getFirstNode() {
      if (this.head != null) {
        node = this.head;
        this.head = node.next;

        this.size--;

        return node;
      }
      else {
        return null;
      }
    }

    flush() {
      this.head = null;
      this.size = 0;
    }
}

function sendString(str) {
  if (str.length > 0) {
    char = str.charAt(0);
    char_code = str.charCodeAt(0);
    key_code = getKeycode(char);
    shift_flag = getShiftFlag(char);
    substr = str.substring(1);

    console.log("Char: " + str.charAt(0));
    console.log("Char code: " + char_code);
    console.log("Key code: " + key_code);

    if (key_code == null) {
      sendString(substr);
      return;
    }

    if (shift_flag == 1) {
      modifier = kb.MODIFY.SHIFT;
    }
    else {
      modifier = 0;
    }

    kb.tap(key_code, modifier, function() {
      sendString(substr);
    });
  }
  else {
    setTimeout(function () {
      console.log("Sending command finished.");
      sendNextCommand();
    }, 500);
  }

  //console.log(str.charAt(0));
  //console.log(str.substring(1));
}

function sendKeycode(keyCode, modifier) {
  console.log("Modifier: " + modifier);

  kb.tap(keyCode, modifier, function() {
    setTimeout(function () {
      console.log("Sending keycode finished.");
      sendNextCommand();
    }, 500);
  });
}

function sendNextCommand() {
  nextNode = commands.getFirstNode();

  if (nextNode == null) {
    console.log("Sending commands finished.");
    Bangle.buzz(30, 0.5);
    return;
  }

  nextCommand = nextNode.command;
  nextModifier = nextNode.modifier;

  if (typeof(nextCommand)==='string') {
    console.log("Sending command: " + nextCommand);
    sendString(nextCommand);
  }
  else {
    console.log("Sending keycode: " + nextCommand);
    sendKeycode(nextCommand, nextModifier);
  }
}

function sendKeys(keys) {
  commands.flush();
  commands.addNode(kb.KEY.ESC, kb.MODIFY.CTRL);
  commands.addNode("notepad");
  commands.addNode(kb.KEY.ENTER);
  commands.addNode("Hello World!");

  sendNextCommand();

  //layout.update();
  //layout.render();
}

let commands = new LinkedList();

var Layout = require("Layout");
var layout = new Layout( {
  type:"v", c: [
    {type:"txt", font:"6x8:2", label:"Ducky v0.1", id:"label"} ,
    {type:"btn", font:"6x8:2", label:"Send Keys", height:100, cb: l=>sendKeys("a") }
  ]
});

g.clear();
//Bangle.setOptions({backlightTimeout: 0});
Bangle.setBacklight(true);
layout.render(); // first call to layout.render() works out positions and draws
Bangle.setLocked(false);

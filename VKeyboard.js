/*
This script initializes and displays a keyboard for the selected html textbox element (password and text only)
version 	: 1.2
Requires    : jQuery v1.11.1 (Tested on this version. May work with lower versions too)
              jquery.caret.js - http://plugins.jquery.com/caret/ (Version - 1.02 - custom fixed to remove $.browser.msie error.
                                                                  Text selection range operations not supported in lower versions)
Author		: Sandeep Baynes
Styles      : Ameer Deen Sarfu Deen

Usage		: This script appends a keyboard to every input element specified in the element param if the element is a container or else to the element itself
			  Layout of the keyboard depends on the vkeyboard attribute specified in the html element.
			  If no layout is specified in the html element, it takes the layout specified in the layout option

Pre-defined layouts defined based on project requirements. Modify or use VKeyboard.addLayout to add additional layouts

Change log 	: 1.1 - Added functionality for caret selection when text range is selected. New text inserted/removed from start position of text range
			  1.2 - Added new layouts. Handling text range selection replace when range is selected while typing
*/

//Create custom string insert method to insert string at specified index in string
String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

//Create custom string backspace method to delete string at specified index
String.prototype.bksp = function(index){
	if(index > 0)
		return this.substring(0, index - 1) + this.substring(index, this.length);
	else return this;
};

//Create custom string delete method to delete string at specified index
String.prototype['delete'] = function(index){
	if(index < this.length)
		return this.substring(0, index) + this.substring(index + 1, this.length);
	else return this;
};

//Create custom string strip method to remove a text selection based on start index and end index
String.prototype.strip = function(start, end){
	var first = start > 0 ? this.substring(0, start) : '';
	var last = end < this.length ? this.substring(end, this.length) : '';
	return first + last;
};

//Function initializes the keyboard for all elements inside the container element
var VKeyboard = function(element, kbdOptions){	
	//Merge all options from the default options to the user specified options
	var options = $.extend(true, {}, VKeyboard.defaultOptions, kbdOptions);

	//Set the current vkeyboard options data into the element
	var $el = $(element);
	$el.data('VKeyboard', kbdOptions);

	//Initialize the keyboard for the elements based on the element selector
	$el.each(function(){
		VKeyboard.initKeyboards(this, options);
	});
};


/*
CAUTION: Do not modify the below code unless you know how to. This object contains structure data for the entire keyboard.
Defining the html snippets for the keyboard elements
Note: All keyboard elements have to contain class vkeyboard. This will identify keyboard events from other events.
Structure of the keyboard:
	Id Class - use to identify keyboard elements from other elements
	Main Wrapper Class - .vkeyboard-mainwrapper
	Main wrapper - main keyboard container - .vkeyboard-mainwrapper (If class is changed, change even the mainWrapperClass)
	Ul - all key rows in UL - .vkeyboard-keyset
	Li - each row of keys - .vkeyboard-keylist
	key - each key - .vkeyboard-key
	action key - each action key - .vkeyboard-key .vkeyboard-actionkey
	Disabled key class - class for a disabled key - .vkeyboard-disabled
	Key pressed - Class for a pressed key like shift - .vkeyboard-keypressed
	Shift key - Class added to the shift key - .vkeyboard-shiftkey'
	Shift key set - Class added to the key set shown on shift press - .vkeyboard-shiftkeyset
	Normal key set - Class added to the normal key set - .vkeyboard-normalkeyset
	Invalid input - Class added to the selected text box if invalid input is made
	Decimal key - Class added to the decimal action key - .vkeyboard-deckey
	Current element id - Class is set to the currently active textbox - .vkeyboard-selected
*/
VKeyboard.uiElements = {
	idClass: 'vkeyboard',
	mainWrapperClass: 'vkeyboard-mainwrapper',
	mainWrapper: '<div class="vkeyboard vkeyboard-mainwrapper"></div>',
	keyset: '<ul class="vkeyboard vkeyboard-keyset"></ul>',
	keyrow: '<li class="vkeyboard vkeyboard-keylist"></li>',
	key: '<button class="vkeyboard vkeyboard-key"></button>',
	actionKeyClass: 'vkeyboard-actionkey',
	disabledKeyClass: 'vkeyboard-disabled',
	keyPressed: 'vkeyboard-keypressed',
	shiftKey: 'vkeyboard-shiftkey',
	shiftKeyset: 'vkeyboard-shiftkeyset',
	normalKeyset: 'vkeyboard-normalkeyset',
	invalidInput: 'vkeyboard-invalid',
	decimalKey: 'vkeyboard-deckey',
	CurrentElementId: 'vkeyboard-selected'
};

//Contains enums of keycodes that are accepted to be entered when key input is restricted in a textbox.
//Can be used to refer keycodes for keys defined inside
VKeyboard.keyCodes = {
	backSpace: 8,
	tab: 9,
	shift: 16,
	capsLock: 20,
	pgUp: 33,
	pgDn: 34,
	end: 35,
	home: 36,
	left: 37,
	up: 38,
	right: 39,
	down: 40,
	del: 46,
	numLock: 144
};

//Method looks in the VKeyboard.keyCodes for accepted keys to enter into the textbox without restriction and returns true if found or else false
VKeyboard.checkIfAcceptedKeyCode = function(keyCode){
	for(var kc in VKeyboard.keyCodes){
		if(keyCode == VKeyboard.keyCodes[kc])
			return true;
	}
	return false;
};

//Check the type of element. If it is a text box, set the keyboard for the element else set the keyboard for all elements under the container
VKeyboard.initKeyboards = function(element, options){
	var $el = $(element);
	//Get the tag name of the element
	var elProp = $el.prop('tagName');
	if(elProp == 'INPUT' && $el.attr('type') == 'text' || $el.attr('type') == 'password'){
		VKeyboard.addOrRefreshKeyboard($el, options);
	}
	//Get text box input elements inside the container
	else if($el.find('input[type=text], input[type=password]').length){
		$el.find('input[type=text], input[type=password]').each(function(){
			//attach the keyboard events to every element inside the container
			VKeyboard.addOrRefreshKeyboard(this, options);
		});
	}
};

//Function refreshes the keyboard for the input element.
VKeyboard.addOrRefreshKeyboard = function(element, options){
	var $el = $(element);
	//Set attribute to identify that element has virtual keyboard enabled for it
	$el.attr('vkenabled', true);
	//Unbind the keyboard events for the element to prevent memory leak
	$el.unbind(options.openOn, VKeyboard.openKeyboard);
	//bind the events to the keyboard
	$(element).bind(options.openOn, {options: options}, VKeyboard.openKeyboard);
};

//Method shows the keyboard for the text box when events spefified in the openOn are triggered
VKeyboard.openKeyboard = function(event){
	//Initialize document click to trigger keyboard close
	$(document).unbind('click', VKeyboard.closeKeyboard);
	$(document).bind('click', VKeyboard.closeKeyboard);
	var options = event.data.options;
	//Get the target element that is in focus
	var $el = $(event.target);
	//Return if the current active keyboard is the same element
	if(VKeyboard.activeElement && VKeyboard.activeElement.length && $el[0] == VKeyboard.activeElement[0])
		return;
	//Restore the previous selected textbox value to old value if autoAccept of options is set to false
	if(VKeyboard.activeElement && !VKeyboard.activeKeyboardOptions.autoAccept){
		VKeyboard.activeElement.val(VKeyboard.oldVal || '');
	}
	//Remove selected class from previous element
	var selectedElements = $('.' + VKeyboard.uiElements.CurrentElementId);
	selectedElements.removeClass(VKeyboard.uiElements.CurrentElementId);
	if(VKeyboard.activeKeyboardOptions && VKeyboard.activeKeyboardOptions.css && VKeyboard.activeKeyboardOptions.css.input)
		selectedElements.removeClass(VKeyboard.activeKeyboardOptions.css.input);
	if(VKeyboard.activeLayout && VKeyboard.activeLayout.css && VKeyboard.activeLayout.css.input)
		selectedElements.removeClass(VKeyboard.activeLayout.css.input);
	//Add selected class to the currently selected ui element.
	$el.addClass(VKeyboard.uiElements.CurrentElementId);
	if(VKeyboard.activeKeyboardOptions && VKeyboard.activeKeyboardOptions.css && VKeyboard.activeKeyboardOptions.css.input)
		$el.addClass(VKeyboard.activeKeyboardOptions.css.input);
	if(VKeyboard.activeLayout && VKeyboard.activeLayout.css && VKeyboard.activeLayout.css.input)
		$el.addClass(VKeyboard.activeLayout.css.input);
	//Store the current text of the text box for cancel restore operation1
	VKeyboard.oldVal = $el.val();
	//Get the layout for the keyboard
	var layoutAttr = $el.attr('vkeyboard');
	var layout = layoutAttr || options.layout;
	//Set the active elements for the keyboard
	VKeyboard.activeElement = $el;
	VKeyboard.activeKeyboardOptions = options;
	//Check if the new layout is the same as the existing one. If same, do not recreate the keyboard, instead use existing one.
	if(VKeyboard.activeLayout == VKeyboard.layouts[layout])
		return;
	//Assign the new active layout
	VKeyboard.activeLayout = VKeyboard.layouts[layout];
	//Build the keyboard
	var keyboard = VKeyboard.buildKeyboard(layout, options);
	//close the keyboard if it doesn't exist and exit
	if(!keyboard){
		VKeyboard.closeKeyboard();
		return;
	}
	//close any previous keyboards that are open
	$('.' + VKeyboard.uiElements.mainWrapperClass).remove();

	//append the keyboard to the append to element in options
	$(options.appendTo).append(keyboard);

	//Bind any changes to the input element
	var keyPressAction = (options.actions && options.actions['keyPress']) || (VKeyboard.activeLayout.actions && VKeyboard.activeLayout.actions['keyPress']) || VKeyboard.actions['keyPress'];
	$el.unbind('keydown', keyPressAction);
	$el.bind('keydown', keyPressAction);
};

//Method runs when the text box closeOn events are triggered
VKeyboard.closeKeyboard = function(event){
	//if event exists, execute the following code
	var options = VKeyboard.activeKeyboardOptions;
	var layout = VKeyboard.activeLayout;
	var $el = VKeyboard.activeElement;
	
	if(event){
		//return if the call was by clicking on a keyboard element
		if((event.target.tagName == "INPUT" && (event.target.type == "text" || event.target.type == "password") && $(event.target).attr('vkenabled') == 'true') || $(event.target).hasClass(VKeyboard.uiElements.idClass) || (options && options.stayOpen)){		
			return;
		}			
	}
	
	//Unbind the document click action
	$(document).unbind('click', VKeyboard.closeKeyboard);

	//Set the VKeyboard active values to false
	VKeyboard.activeElement = false;
	VKeyboard.activeKeyboardOptions = false;
	VKeyboard.activeLayout = false;
	VKeyboard.oldVal = false;
	//close any previous keyboards that are open in the same container
	$('.' + VKeyboard.uiElements.mainWrapperClass).remove();
	//Remove the selected class from the element
	var selectedElements = $('.' + VKeyboard.uiElements.CurrentElementId);
	selectedElements.removeClass(VKeyboard.uiElements.CurrentElementId);
	if(VKeyboard.activeKeyboardOptions && VKeyboard.activeKeyboardOptions.css && VKeyboard.activeKeyboardOptions.css.input)
		selectedElements.removeClass(VKeyboard.activeKeyboardOptions.css.input);
	if(VKeyboard.activeLayout && VKeyboard.activeLayout.css && VKeyboard.activeLayout.css.input)
		selectedElements.removeClass(VKeyboard.activeLayout.css.input);
	//If not auto accept, set the original value to the textbox
    if (options && !options.autoAccept)
        $el.val(VKeyboard.oldVal);
    else {
        $el.trigger('change', [$el]);
    }
};

//Method builds and returns a keyboard layout based on the options
VKeyboard.buildKeyboard = function(layoutName, options){
	//If the layout is not defined, return false
	var layout = VKeyboard.layouts[layoutName];
	if(!layout)
		return false;

	//build the ui for the keyboard
	var kbdMainWrapper = $(VKeyboard.uiElements.mainWrapper);
	//Check if the normal keyset is available. If not, pick the default keyset
	var kbdKeysetNormal = VKeyboard.buildKeyset(layout, 'normal', options) || VKeyboard.buildKeyset(layout, 'default', options);
	kbdKeysetNormal.addClass(VKeyboard.uiElements.normalKeyset);
	//Get the shift key set and hide it till shift is pressed
	var kbdKeysetShift =  VKeyboard.buildKeyset(layout, 'shift', options);
	if(kbdKeysetShift){
		kbdKeysetShift.hide();
		//add the shift keyset class to the keyset
		kbdKeysetShift.addClass(VKeyboard.uiElements.shiftKeyset);
		kbdMainWrapper.append(kbdKeysetShift);
	}
	//Append the key set to the keyboard main wrapper
	kbdMainWrapper.append(kbdKeysetNormal);
	//Add the container classes from both options and layout
	VKeyboard.addContainerClass(kbdMainWrapper, options.css);
	VKeyboard.addContainerClass(kbdMainWrapper, layout.css);
	//return the built keyboard ui
	return kbdMainWrapper;
};

//Method builds the key set for the specified layout and layout type based on options
VKeyboard.buildKeyset = function(layout, layoutType, options){
	var kbdKeyset = $(VKeyboard.uiElements.keyset);
	//Get the key set from the layout
	var lytKeyset = layout[layoutType];
	if(!lytKeyset)
		return;
	//Loop through the keyset rows and create the key row
	for(var i = 0; i < lytKeyset.length; i++){
		//split the space delimitted array and get array of keys
		var lytKeyrow = lytKeyset[i].split(' ');
		var kbdKeyrow = $(VKeyboard.uiElements.keyrow);
		//Loop through each key and append to the keyboard keyrow ui element
		for(var j = 0; j < lytKeyrow.length; j++){
			var lytKey = lytKeyrow[j];
			var kbdKey = $(VKeyboard.uiElements.key);
			//Get the action for the key if it is an action key
			var actionKey = VKeyboard.getActionKey(lytKey);
			//If action key, add action class to the key.
			var actionKeyText = '';
			//reserve a var for action. Use this to bind to the key click. Assign based on action key or regular key
			var action = false;
			if(actionKey){
				//add spefific pre defined classes to action keys if required
				if(actionKey == 'shift')
					kbdKey.addClass(VKeyboard.uiElements.shiftKey);
				else if(actionKey == 'dec')
					kbdKey.addClass(VKeyboard.uiElements.decimalKey);
				//Add the action key class to the element.
				kbdKey.addClass(VKeyboard.uiElements.actionKeyClass);
				//Set the action key attribute to true for the key to specify that the key is an action key.
				kbdKey.attr('actionkey', true);
				actionKeyText = VKeyboard.getActionKeyDisplay(actionKey, options, layout);
				//Attach the keyboard actions for the action key. Overide the default action with one spefified in layout overide by one specified in options
				action = (options.actions && options.actions[actionKey]) || (layout.actions && layout.actions[actionKey]) || VKeyboard.actions[actionKey];
			}
			//If not action key, check if any specific action is defined for the key. Priority for action -> options>layout>default
			else{
				//check if any specific action is defined for the key. If not, call the default action
				action = (options.actions && options.actions[lytKey]) || (layout.actions && layout.actions[lytKey]) || VKeyboard.actions[lytKey];
			}
			//If no action key or specific action is specified for the key, call the default action
			action = action || (options.actions && options.actions['default']) || (layout.actions && layout.actions['default']) || VKeyboard.actions['default'];
			//If action was found, bind to click
			if(action)
					kbdKey.click(action);
			//Set the text of the key to the action text if exists or else the key text itself
			kbdKey.text(actionKeyText || lytKey);
			//set the layout value for the key
			kbdKey.attr('vkValue', actionKey || lytKey);
			//Set the class for the key from options and layout
			VKeyboard.addKeyClass(kbdKey, options.css);
			VKeyboard.addKeyClass(kbdKey, layout.css);
			//Append the key to the keyboard keyrow
			kbdKeyrow.append(kbdKey);
		}
		//Add the row classes from both options and layout
		VKeyboard.addRowClass(kbdKeyrow, i, options.css);
		VKeyboard.addRowClass(kbdKeyrow, i, layout.css);
		//Append the key row to the key set
		kbdKeyset.append(kbdKeyrow);
	}
	//Add the keyset classes from both options and layout
	VKeyboard.addKeySetClass(kbdKeyset, layoutType == 'shift', options.css);
	VKeyboard.addKeySetClass(kbdKeyset, layoutType == 'shift', layout.css);
	return kbdKeyset;
};

//Method adds the classes from the styles.container to the container
VKeyboard.addContainerClass = function(container, styles){
	if(styles && styles.container)
		container.addClass(styles.container);
};

//Method adds the classes from styles.keySet to the key set
VKeyboard.addKeySetClass = function(keyset, isShift, styles){
	if(styles){
		if(styles.keySet)
			keyset.addClass(styles.keySet);
		if(isShift && styles.shiftKeySet)
			keyset.addClass(styles.shiftKeySet);
	}
};

//Method adds the classes to the row from the styles.keyRow and styles.css.keyRowDefault properties
VKeyboard.addRowClass = function(row, rowIndex, styles){
	if(styles){
		//Add they keyRowDefault class to all the key rows
		if(styles.keyRowDefault)
			row.addClass(styles.keyRowDefault);
		//Add the keyRow[rowIndex] class to the row. Css applies to that row only
		if(styles.keyRow && styles.keyRow[rowIndex])
			row.addClass(styles.keyRow[rowIndex]);
	}
};

//Method adds the classes to the key based on css in options and the layout
VKeyboard.addKeyClass = function(key, styles){
	if(styles){
		var optionCssKeys = Object.keys(styles);
		for(var i = 0; i < optionCssKeys.length; i++){
			var css = optionCssKeys[i];
			//run through the predefined css options first
			switch(css){
				case 'buttonAction':
					if(key.attr('actionKey'))
						key.addClass(styles[css]);
					break;
				case 'buttonDisabled':
					if(key.disabledKey)
						key.addClass(styles[css]);
					break;
				case 'buttonDefault':
					key.addClass(styles[css]);
					break;
				//default assumes classes for individual keys with space delimittion for all keys sharing same class
				default:
					var splitKeys = css.split(' ');
					//Get the vk key value from the key attribute. This will be easy to identify action keys
					var keyVal = key.attr('vkValue');
					for(var j = 0; j < splitKeys.length; j++){
						if(keyVal == splitKeys[j]){
							key.addClass(styles[css]);
							break;
						}
					}
					break;
			}
		}
	}
};

/*
Method extracts the key text from an action key. Sends the value in display option of layout or else sends the text itself
Action keys are handlebar enclosed. eg: {shift}.
Actions to key are specified in the VKeyboard.actions object
Regex to get text enclosed within {} : /[^{\}]+(?=})/g
*/
VKeyboard.getActionKey = function(key){
	//Return if key is empty
	if(!key)
		return;
	//regex to extract characters enclosed within {}
	return key.match(/[^{\}]+(?=})/g);
};

//Method gets the display value for the action key
VKeyboard.getActionKeyDisplay = function(key, options, layout){
	//If an action key text exists in the display option of layout, return that or else return the key text
	return (options && options.display && options.display[key]) || (layout && layout.display && layout.display[key]) || key;
};

//Object contains the methods to be called when an action key is triggered
VKeyboard.actions = {
	'shift': function(event){
		//Toggle to the alternate keyboard specified for the shift
		var options = VKeyboard.activeKeyboardOptions;
		var layout = VKeyboard.activeLayout;
		//Get all shift keys used on the keyboard and the key that was pressed
		var $shiftKeys = $('.' + VKeyboard.uiElements.shiftKey);
		//Check if shift is pressed already and negate the attribute.
		var isPressed = $shiftKeys.attr('pressed') === "true";
		$shiftKeys.attr('pressed', !isPressed);
		//toggle the keyPressed class for the shift key. (classes from uiElements, options and layout)
		$shiftKeys.toggleClass(VKeyboard.uiElements.keyPressed);
		//If options.css has a keypressed class, toggle it
		if(options && options.css && options.css.keyPressed)
			$shiftKeys.toggleClass(options.css.keyPressed);
		//If layout.css has a keypressed class, toggle it
		if(layout && layout.css && layout.css.keyPressed)
			$shiftKeys.toggleClass(layout.css.keyPressed);
		//Show/hide the shift keyset
		$('.' + VKeyboard.uiElements.shiftKeyset)[isPressed ? 'hide' : 'show']();
		//Hide/show normal keyset
		$('.' + VKeyboard.uiElements.normalKeyset)[isPressed ? 'show' : 'hide']();
	},
	'accept': function(event){
		//Handle accept key press
		var options = VKeyboard.activeKeyboardOptions;
		var layout = VKeyboard.activeLayout;
		var $el = VKeyboard.activeElement;
		VKeyboard.oldVal = $el.val();
		VKeyboard.closeKeyboard();
		//trigger event vkaccept and change for the active element and close keyboard
        $el.trigger('change', [$el]);
		$el.trigger('vkaccept', [$el]);
	},
	'bksp': function(event){
		//Handle back space operation
		var options = VKeyboard.activeKeyboardOptions;
		var layout = VKeyboard.activeLayout;
		var $el = VKeyboard.activeElement;
		//Get the element text.
		var curVal = $el.val();
		//Get the caret position of the text box
		var caretSelection = $el.caret();
		caretPosition = caretSelection.start || caretSelection.end;
		var newVal = $el.val();
		if(caretPosition == undefined || caretSelection.start == caretSelection.end){
			caretPosition = caretPosition || caretSelection;
			//Remove the character after the caret position
			newVal = curVal.bksp(caretPosition);
		}
		//if a text range is selected, clear selected text
		else{
			caretPosition = caretSelection.start;
			newVal = curVal.strip(caretSelection.start, caretSelection.end);
		}
		
		//Validate the new text against the options validate method
		if(!options.validate(newVal, $el)){
			//If invalid class is to be added
			if(options.acceptValid){
				$el.addClass(VKeyboard.uiElements.invalidInput);
				if(options && options.css && options.css.invalidInput)
					$el.addClass(options.css.invalidInput);
				if(layout && layout.css && layout.css.invalidInput)
					$el.addClass(layout.css.invalidInput);
			}
			return;
		}
		//Remove the invalid class if it was added
		$el.removeClass(VKeyboard.uiElements.invalidInput);
		if(options && options.css && options.css.invalidInput)
			$el.removeClassremoveClass(options.css.invalidInput);
		if(layout && layout.css && layout.css.invalidInput)
			$el.removeClass(layout.css.invalidInput);
		//If valid, set the new value
		$el.val(newVal);
		//Set the caret position to the next position
		var newPos = caretSelection.start != undefined  && caretSelection.start != caretSelection.end ? caretSelection.start + 1 : caretPosition;
		newPos = newPos > 0 ? newPos - 1 : 0;
		$el.caret(newPos, newPos);
		//Enable or disable the decimal point
		VKeyboard.enableDisableDecimal();
	},
	'del': function(event){
		//Handle delete operation
		var options = VKeyboard.activeKeyboardOptions;
		var layout = VKeyboard.activeLayout;
		var $el = VKeyboard.activeElement;
		//Get the element text.
		var curVal = $el.val();
		//Get the caret position of the text box
		var caretSelection = $el.caret();
		caretPosition = caretSelection.start || caretSelection.end;
		var newVal = $el.val();
		if(caretPosition == undefined || caretSelection.start == caretSelection.end){
			caretPosition = caretPosition != undefined ? caretPosition : caretSelection;
			//Remove the character after the caret position
			newVal = curVal['delete'](caretPosition);
		}
		//if a text range is selected, clear selected text
		else{
			caretPosition = caretSelection.start;
			newVal = curVal.strip(caretSelection.start, caretSelection.end);
		}
		//Validate the new text against the options validate method
		if(!options.validate(newVal, $el)){
			//If invalid class is to be added
			if(options.acceptValid){
				$el.addClass(VKeyboard.uiElements.invalidInput);
				if(options && options.css && options.css.invalidInput)
					$el.addClass(options.css.invalidInput);
				if(layout && layout.css && layout.css.invalidInput)
					$el.addClass(layout.css.invalidInput);
			}
			return;
		}
		//Remove the invalid class if it was added
		$el.removeClass(VKeyboard.uiElements.invalidInput);
		if(options && options.css && options.css.invalidInput)
			$el.removeClassremoveClass(options.css.invalidInput);
		if(layout && layout.css && layout.css.invalidInput)
			$el.removeClass(layout.css.invalidInput);
		//If valid, set the new value
		$el.val(newVal);
		//Set the caret position to the current position
		$el.caret(caretPosition, caretPosition);
		//Enable or disable the decimal point
		VKeyboard.enableDisableDecimal();
	},
	'space': function(event){
		//Handle space click
		var options = VKeyboard.activeKeyboardOptions;
		var layout = VKeyboard.activeLayout;
		var $el = VKeyboard.activeElement;
		//Get the element text.
		var curVal = $el.val();
		//if element length exceeds max length, prevent input
		if(options && options.maxlength && $el.val().length >= options.maxlength)
			return;
		//Get the caret position of the text box
		var caretSelection = $el.caret();
		caretPosition = caretSelection.start || caretSelection.end;
		var newVal = $el.val();
		if(caretPosition == undefined || caretSelection.start == caretSelection.end){
			caretPosition = caretPosition || caretSelection;
			//Remove the character after the caret position
			newVal = curVal.insert(caretPosition, ' ');
		}
		//if a text range is selected, clear selected text and replace with space
		else{
			caretPosition = caretSelection.start;
			newVal = curVal.strip(caretSelection.start, caretSelection.end);
			newVal = newVal.insert(caretPosition, ' ');
		}
		//Validate the new text against the options validate method
		if(!options.validate(newVal, $el)){
			//If invalid class is to be added
			if(options.acceptValid){
				$el.addClass(VKeyboard.uiElements.invalidInput);
				if(options && options.css && options.css.invalidInput)
					$el.addClass(options.css.invalidInput);
				if(layout && layout.css && layout.css.invalidInput)
					$el.addClass(layout.css.invalidInput);
			}
			return;
		}
		//Remove the invalid class if it was added
		$el.removeClass(VKeyboard.uiElements.invalidInput);
		if(options && options.css && options.css.invalidInput)
			$el.removeClassremoveClass(options.css.invalidInput);
		if(layout && layout.css && layout.css.invalidInput)
			$el.removeClass(layout.css.invalidInput);
		//If valid, set the new value
		$el.val(newVal);
		//Set the caret position to the next position
		var newPos = caretPosition.start != undefined ? caretPosition.start + 1 : caretPosition + 1;
		$el.caret(newPos, newPos);
	},
	'default': function(event){
		//Handle regular keypress
		var options = VKeyboard.activeKeyboardOptions;
		var layout = VKeyboard.activeLayout;
		var $el = VKeyboard.activeElement;
		//Get the element text.
		var curVal = $el.val();
		//if element length exceeds max length, prevent input
		if(options && options.maxlength && $el.val().length >= options.maxlength)
			return;
		//Get the clicked button text
		var btnTxt = $(event.target).text();
		//Get the caret position of the text box
		var caretSelection = $el.caret();
		caretPosition = caretSelection.start || caretSelection.end;
		var newVal = $el.val();
		if(caretPosition == undefined || caretSelection.start == caretSelection.end){
			caretPosition = caretPosition || caretSelection;
			//Remove the character after the caret position
			newVal = curVal.insert(caretPosition, btnTxt);
		}
		//if a text range is selected, clear selected text and replace with selected character
		else{
			caretPosition = caretSelection.start;
			newVal = curVal.strip(caretSelection.start, caretSelection.end);
			newVal = newVal.insert(caretPosition, btnTxt);
		}
		//Validate the new text against the options validate method
		if(!options.validate(newVal, $el)){
			//If invalid class is to be added
			if(options.acceptValid){
				$el.addClass(VKeyboard.uiElements.invalidInput);
				if(options && options.css && options.css.invalidInput)
					$el.addClass(options.css.invalidInput);
				if(layout && layout.css && layout.css.invalidInput)
					$el.addClass(layout.css.invalidInput);
			}
			return;
		}
		//Remove the invalid class if it was added
		$el.removeClass(VKeyboard.uiElements.invalidInput);
		if(options && options.css && options.css.invalidInput)
			$el.removeClassremoveClass(options.css.invalidInput);
		if(layout && layout.css && layout.css.invalidInput)
			$el.removeClass(layout.css.invalidInput);
		//If valid, set the new value
		$el.val(newVal);
		//Set the caret position to the next position
		var newPos = caretPosition.start != undefined ? caretPosition.start + 1 : caretPosition + 1;
		$el.caret(newPos, newPos);
		//Enable or disable the decimal point
		VKeyboard.enableDisableDecimal();
		//If sticky shift is false, un press the shift keys
		if(!options.stickyShift){
			//Get the shift keys, check the state and release if neccessary
			var $shiftKeys = $('.' + VKeyboard.uiElements.shiftKey);
			if($shiftKeys.length && $shiftKeys.attr('pressed') == "true")
				$($shiftKeys[0]).click();
		}
	},
	//Note: decimal action key ({dec}) is not the same as period (.)
	'dec': function(event){
		//Handle decimal key press
		var options = VKeyboard.activeKeyboardOptions;
		var layout = VKeyboard.activeLayout;
		var $el = VKeyboard.activeElement;
		//Get the element text.
		var curVal = $el.val();
		//if element length exceeds max length, prevent input
		if(options && options.maxlength && $el.val().length >= options.maxlength)
			return;
		//Get the caret position of the text box
		var caretSelection = $el.caret();
		caretPosition = caretSelection.start || caretSelection.end;
		var newVal = $el.val();
		if(caretPosition == undefined || caretSelection.start == caretSelection.end){
			caretPosition = caretPosition || caretSelection;
			//Remove the character after the caret position
			newVal = curVal.insert(caretPosition, '.');
		}
		//if a text range is selected, clear selected text and replace with space
		else{
			caretPosition = caretSelection.start;
			newVal = curVal.strip(caretSelection.start, caretSelection.end);
			newVal = newVal.insert(caretPosition, '.');
		}
		//return if a decimal value is aleady there in the element value
		if(newVal.replace(/\./, '').indexOf('.') > -1){
			var nPos = caretPosition.start != undefined ? caretPosition.start: caretPosition;
			$el.caret(nPos, nPos);
			return;
		}
		//Validate the new text against the options validate method
		if(!options.validate(newVal, $el)){
			//If invalid class is to be added
			if(options.acceptValid){
				$el.addClass(VKeyboard.uiElements.invalidInput);
				if(options && options.css && options.css.invalidInput)
					$el.addClass(options.css.invalidInput);
				if(layout && layout.css && layout.css.invalidInput)
					$el.addClass(layout.css.invalidInput);
			}
			return;
		}
		//Remove the invalid class if it was added
		$el.removeClass(VKeyboard.uiElements.invalidInput);
		if(options && options.css && options.css.invalidInput)
			$el.removeClassremoveClass(options.css.invalidInput);
		if(layout && layout.css && layout.css.invalidInput)
			$el.removeClass(layout.css.invalidInput);
		//If valid, set the new value
		$el.val(newVal);
		//Set the caret position to the next position
		var newPos = caretPosition.start != undefined ? caretPosition.start + 1 : caretPosition + 1;
		$el.caret(newPos, newPos);
		//Enable or disable the decimal point
		VKeyboard.enableDisableDecimal();
		//If sticky shift is false, un press the shift keys
		if(!options.stickyShift){
			//Get the shift keys, check the state and release if neccessary
			var $shiftKeys = $('.' + VKeyboard.uiElements.shiftKey);
			if($shiftKeys.length && $shiftKeys.attr('pressed') == "true")
				$($shiftKeys[0]).click();
		}
	},
	'cancel': function(event){
		//Restore the old value to the textbox and close
		var options = VKeyboard.activeKeyboardOptions;
		var layout = VKeyboard.activeLayout;
		var $el = VKeyboard.activeElement;
		var oldVal = VKeyboard.oldVal;
		$el.val(oldVal);
		VKeyboard.closeKeyboard();
	},
	'keyPress': function(event){
		//Handles manual entry into textbox
		var $el = VKeyboard.activeElement;
		var options = VKeyboard.activeKeyboardOptions;
		var layout = VKeyboard.activeLayout;
		//If options states to lock input, prevent default event action
		if(options.lockInput || (options && options.maxlength && $el.val().length >= options.maxlength && !VKeyboard.checkIfAcceptedKeyCode(event.keyCode))){
			event.preventDefault();
			return;
		}
		//Validate the input
		var valid = options.validate($el.val(), $el);
		if(!valid){
			//If invalid class is to be added
			if(options.acceptValid){
				$el.addClass(VKeyboard.uiElements.invalidInput);
				if(options && options.css && options.css.invalidInput)
					$el.addClass(options.css.invalidInput);
				if(layout && layout.css && layout.css.invalidInput)
					$el.addClass(layout.css.invalidInput);
			}
		}
		else{
			$el.removeClass(VKeyboard.uiElements.invalidInput);
			if(options && options.css && options.css.invalidInput)
				$el.removeClassremoveClass(options.css.invalidInput);
			if(layout && layout.css && layout.css.invalidInput)
				$el.removeClass(layout.css.invalidInput);
		}
		//Enable or disable the decimal point
		VKeyboard.enableDisableDecimal();
	}
};

//Method checks if a decimal point is already present in the element and adds/removes the disabled class to the decimal action key.
//Note: decimal action key ({dec}) is not the same as period (.)
VKeyboard.enableDisableDecimal =function(){
	var $el = VKeyboard.activeElement;
	var options = VKeyboard.activeKeyboardOptions;
	var layout = VKeyboard.activeLayout;
	if($el.val().indexOf('.') > -1){
		$('.' + VKeyboard.uiElements.decimalKey).addClass(VKeyboard.uiElements.disabledKeyClass);
		if(options && options.css && options.css.buttonDisabled)
			$('.' + VKeyboard.uiElements.decimalKey).addClass(options.css.buttonDisabled);
		if(layout && layout.css && layout.css.buttonDisabled)
			$('.' + VKeyboard.uiElements.decimalKey).addClass(layout.css.buttonDisabled);
	}
	else{
		$('.' + VKeyboard.uiElements.decimalKey).removeClass(VKeyboard.uiElements.disabledKeyClass);
		if(options && options.css && options.css.buttonDisabled)
			$('.' + VKeyboard.uiElements.decimalKey).removeClass(options.css.buttonDisabled);
		if(layout && layout.css && layout.css.buttonDisabled)
			$('.' + VKeyboard.uiElements.decimalKey).removeClass(layout.css.buttonDisabled);
	}
};

//Set the default options of the keyboard
VKeyboard.defaultOptions = {
	layout: 'qwerty',

	//This is the container element to which the keyboard dom element is appended
	appendTo: 'body',

	//If set to true and valid returns true, it auto accepts a value into the selected textbox 
	autoAccept: false,

	//Set the events that the input element triggers which opens the keyboard
	openOn: 'focus click',

	//If this is set to true class vkeyboard-invalid is added when validate returns false or else VKeyboard-valid
	acceptValid: false,

	//Set the validate function. This will be run when any input is made. If false, done button will be disabled
	validate: function(newVal, element) { return true; },

	//Set this value to true to prevent hardware key input
	lockInput: false,

	//If set to true, shift key will be held till pressed again, or else shift will reset after key input
	stickyShift: true,

	//Set to true if keyboard should stay open even after element looses focus
	stayOpen: false,

	//Set this to 0 to allow unlimitted text entry and any value to restrict the input to that length
	maxlength: 0,

	//Additional css can be added to the keyboard keys individually. This will be added along with the css specified inside the layout
	//If additional pre defined css types are added, add these to switch case of VKeyboard.addKeyClass, VKeyboard.addRowClass, VKeyboard.addKeySetClass, VKeyboard.addContainerClass
	css:{
		//class for action keys
		buttonAction: '',
		//class for disabled keys like decimal point after a decimal has already been input
		buttonDisabled: '',
		//class for default button
		buttonDefault: '',
		//Class for the main keyboard wrapper
		container: '',
		//Class for the key set
		keySet: '',
		//Class to use when a toggle key like shift is pressed down. This class will be added on top of the ui elements class
		keyPressed: '',
		//Class added to a key set when shift is pressed
		shiftKeySet: '',
		//Class is added to the textbox if invalid input is made
		invalidInput: '',
		//Class for each individual key row - Specify classes for each row in an array where classes added based on array index
		keyRow: [''],
		//Class added to all the key rows
		keyRowDefault: '',
		//individual key class. Space delimitted for keys that share the same class
		'a . shift': '',
		'b bksp 5': ''
	},
	//Set the display if required in options for the action keys. This will override the layout options
	display: {
		'accept': ''
	},
	//Spefify the action key actions if required including custom action key actions here. This will overide the default actions and layout actions
	//Using key name specifies actions for that specific key eg: 'b' : function(options, layout, event){alert('b pressed');}
	//Parameters to actions: event -> the event which triggered the method call;
	actions: {
		//example of action
		'actionkey': function(event){
			alert('layout');
		}
	}
};

//Method adds a layout to the predefined layouts.
VKeyboard.addLayout = function(layoutName, layout){
	VKeyboard.layouts[layoutName] = layout;
};

//Specify pre-defined layouts for the keyboards
VKeyboard.layouts = {
	'login': {
		//Spefify layouts for normal and shift.
		'normal': ['1 2 3 4 5 6 7 8 9 0 -',
				 'q w e r t y u i o p {del}',
				 '{shift} a s d f g h j k l {shift}',
				 '{cancel} z x c v b n m . {accept}'
				],
		'shift': ['1 2 3 4 5 6 7 8 9 0 _',
				 'Q W E R T Y U I O P {bksp}',
				 '{shift} A S D F G H J K L {shift}',
				 '{cancel} Z X C V B N M . {accept}'
				],
		//Change the display text for action keys
		display:{
			'cancel' : 'Cancel',
			'bksp' : 'BKSP',
			'accept' : 'Next',
			'shift': 'Shift'
		},
		//Spefify css for the keyboard layout. These are added on top of the class specified in the options. Follow same structure as the keyboard options
		css: {
			'cancel accept': 'nextCancelBtn',
			container: 'alphaNumeric-keypad'
		},
		//Specify the action for this layout if required.
		//default spefifies normal key actions. use action key name to specify action for specific action key
		//key name specifies actions for that specific key eg: 'b' : function(){alert('b pressed');}
		actions: {
			//example of action
			'actionkey': function(){
				alert('layout');
			}
		}
	},
	'password': {
		'normal': ['1 2 3 4 5 6 7 8 9 0 -',
				 'q w e r t y u i o p {bksp}',
				 '{shift} a s d f g h j k l {shift}',
				 '{cancel} z x c v b n m . {accept}'
				],
		'shift': ['! @ # $ % ^ & * ( ) _',
				 'Q W E R T Y U I O P {bksp}',
				 '{shift} A S D F G H J K L {shift}',
				 '{cancel} Z X C V B N M . {accept}'
				],
		display:{
			'cancel' : 'Cancel',
			'bksp' : 'BKSP',
			'accept' : 'Login',
			'shift': 'Shift'
		},
		css: {
			'cancel accept': 'nextCancelBtn',
			container: 'alphaNumeric-keypad'
		}
	},
	'pin': {
		'default': ['1 2 3',
				 '4 5 6',
				 '7 8 9',
				 '{bksp} 0 {accept}'
				],
		display: {
			'bksp': 'Delete',
			'accept': 'Login'
		},
		css: {
			container: 'numeric-keypad'
		}
	},
	'decimal': {
		'normal': ['1 2 3',
				 '4 5 6',
				 '7 8 9',
				 '0 {dec}',
				 '{bksp} {cancel} {accept}'
				],
		display: {
			'bksp': 'Delete',
			'accept': 'Ok',
			'dec': '.',
			'cancel': 'Cancel'
		},
		css:{
			'0': 'decimalZeroBtn',
			container: 'decimal-keypad'
		}
	},
	'numeric': {
		'normal': ['1 2 3',
				 '4 5 6',
				 '7 8 9',
				 '0',
				 '{bksp} {cancel} {accept}'
				],
		display: {
			'bksp': 'Delete',
			'accept': 'Ok',
			'cancel': 'Cancel'
		},
		css:{
			container: 'numeric-keypad'
		}
	},
	//QWERTY layout optimized for patient search in project
	'miniQwertySearch':{
		'normal': ['q w e r t y u i o p -',
				 'a s d f g h j k l \'',
				 'z x c v b n m . ',
				 '{cancel} {bksp} {accept}'
				],
		display:{
			'cancel' : 'Cancel',
			'bksp' : 'Delete',
			'accept' : 'Search'
		},
		css: {
			container: 'alpha-keypad'
		}
	}
};

//Extend jquery with VKeyboard
$.fn.VKeyboard = function(options){
	VKeyboard(this, options);
};

//Test method to demonstrate an example
function demoKeyboard(){
	$('body').VKeyboard();
	$('#txtInp1').bind('vkaccept', function(){$('#textInp2').focus();});
	$('#textInp2').bind('vkaccept', function(){alert('loging in')});
};
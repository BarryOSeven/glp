// ==UserScript==
// @name         Godlike Productions Forum Enhancements
// @namespace    http://godlikeproductions.com/
// @version      0.1
// @description  Live update threads and get notified when a new message is posted
// @author       Nuclear
// @match        http://www.godlikeproductions.com/
// @grant        none
// ==/UserScript==

var Settings = {
	newMessageColor: '#ff00ff',
	pollTime: 10000 //ms
}

var GLP = {
	debug: true,
	currentUrl: null,
	currentPageNumber: null,
	fetchPageNumber: null,
	currentMessages: null,
	//isFocused: true,
	didFlip: false,
	newMessageNumber: 0,
	messageHandlers: {},
	log: function(message) {
		if(this.debug) {
			console.log(message);
		}
	},
	init: function() {
		this.currentUrl = window.location.href;
		this.currentPageNumber = this.getCurrentPageNumber(this.currentUrl);

		this.fetchPageNumber = this.currentPageNumber;

		this.strippedUrl = this.currentUrl.split('#');
		this.strippedUrl = this.strippedUrl[0].replace('pg'+this.currentPageNumber, 'pg');

		this.fetchCurrentMessages();

		if(Util.isTopic(this.currentUrl)/* && Util.isLastPage(this.currentPageNumber)*/) {
			this.startFetchTimer(Settings.pollTime);
		}

	},
	fetchCurrentMessages: function() {
		this.currentMessages = document.querySelectorAll('tr[class^="post_member_"]');
	},
	fetchNewMessages: function() {
		GLP.doXhr(GLP.strippedUrl + GLP.fetchPageNumber, GLP.onMessageFetched, GLP.onError);
	},
	onMessageFetched: function(responseText) {
		GLP.parseMessages(responseText);
	},
	onError: function() {
		GLP.startFetchTimer(Settings.pollTime);
	},
	parseMessages: function(domString) {
		console.log('nmn: ' + this.newMessageNumber);
		var parser = new DOMParser();
		var doc = parser.parseFromString(domString, "text/html");

		var newMessages = doc.querySelectorAll('tr[class^="post_member_"]');

		var lastElementPointer = this.currentMessages[this.currentMessages.length-1];

		if(newMessages.length > 0) {
			for(var i=0; i<newMessages.length; i++) {
				var message = newMessages[i];
				var found = false;
				
				for(var j=0; j<this.currentMessages.length; j++) {
					if(message.className === this.currentMessages[j].className && message.id === this.currentMessages[j].id) {
						found = true;
					}
				}

				if(!found) {
					this.enableUserFeedback(message);
					lastElementPointer.parentNode.insertBefore(message, lastElementPointer.parentNode.lastChild);
					var lastElementPointer = message;
					this.newMessageNumber++;
				} else {
					this.log('not a new message');
				}
			}

			this.fetchCurrentMessages();

			var lastPostId = this.currentMessages[this.currentMessages.length-1].id;
			
			this.log(newMessages.length);

			if(lastPostId === 'post_31' && (this.didFlip === false || newMessages.length === 30)) {
				this.log('flipped page');
				this.fetchPageNumber++;
				this.didFlip = true;
			} else if (lastPostId === 'post_31') {
				this.log('tried tp flip page but could not');
			} else {
				this.didFlip = false;
			}

			this.notifyNewMessages();
		}

		this.startFetchTimer(Settings.pollTime);
	},
	enableUserFeedback: function(element) {
		var userContainer = element.getElementsByClassName('replyauthor')[0];
		var oldColor = userContainer.style.backgroundColor;
		userContainer.style.backgroundColor = Settings.newMessageColor;

		var removeBackgroundColor = function() {
			var userContainer = this.getElementsByClassName('replyauthor')[0];
			userContainer.style.backgroundColor = GLP.messageHandlers[this].color;
			this.removeEventListener('mouseenter', GLP.messageHandlers[this].function);
			GLP.newMessageNumber--;
			GLP.notifyNewMessages();
		};

		element.addEventListener("mouseenter", removeBackgroundColor);

		this.messageHandlers[element] = {
			function: removeBackgroundColor,
			color: oldColor
		};

	},
	startFetchTimer: function(pollTime) {
		setTimeout(GLP.fetchNewMessages, pollTime);
	},
	removeNotify: function() {
		document.title = document.title.replace(/^\[[0-9]+\]/g,'');
	},
	notifyNewMessages: function() {
		if(this.newMessageNumber > 0) {
			var title = document.title;
			title = title.replace(/^\[[0-9]+\] /g,'');
			document.title = '[' + this.newMessageNumber + '] ' + title;
		} else {
			this.removeNotify();
		}
	},
	getCurrentPageNumber: function(url) {
		var regex = /pg([0-9]+)/g;
		var match = regex.exec(url);
		if(match) { 
			return match[1];
		}
		return false;
	},
	doXhr: function(url, onFinnish, onError) {
		var xmlhttp;

	    if (window.XMLHttpRequest) {
	        // code for IE7+, Firefox, Chrome, Opera, Safari
	        xmlhttp = new XMLHttpRequest();
	    } else {
	        // code for IE6, IE5
	        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
	    }

	    xmlhttp.onreadystatechange = function() {
	        if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
	           	if(xmlhttp.status == 200){
	           		//this.log(xmlhttp.responseText);
	           		onFinnish(xmlhttp.responseText);
	               //document.getElementById("myDiv").innerHTML = xmlhttp.responseText;
	           	} else {
	           		onError();
	           		GLP.log('Error: ' + xmlhttp.status);
	           	}
	        }
	    }

	    xmlhttp.open("GET", url, true);
	    xmlhttp.send();
	}
};

var Util = {
	isTopic: function(url) {
		//regex message2742398
		var regex = /message[0-9]+/g;
		var match = regex.exec(url);
		if(match) {
			return true;
		}
		return false;
	},
	isLastPage: function(currentPageNumber) {
		var navpages = document.getElementsByClassName('navpages');

		var navbar = navpages[0];

		var index = 1;
		if(navbar.children[navbar.children.length-1].innerHTML === 'View All') {
			var index = 2;
		}

		var lastPage = parseInt(navbar.children[navbar.children.length-index].innerHTML);

		if(lastPage === parseInt(currentPageNumber) || (lastPage - 1) === parseInt(currentPageNumber)) {
			return true;
		}
		return false;
	}
}

GLP.init();
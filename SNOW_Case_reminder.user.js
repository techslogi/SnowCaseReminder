// ==UserScript==
// @name         SNOW Case reminder
// @namespace    http://tampermonkey.net/
// @version      1.0
// @updateURL    https://github.com/techslogi/SnowCaseReminder/raw/master/SNOW_Case_reminder.user.js
// @downloadURL	 https://github.com/techslogi/SnowCaseReminder/raw/master/SNOW_Case_reminder.user.js
// @description  Creates a div on SNOW populated with cases sent to other groups.
// @author       Victor Gasparoni, Gabriel Vicente
// @match        *://itsmgbpeu.service-now.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @grant        GM_listValues
// @run-at       document-idle
// @resource     back_disabled http://www.datatables.net/release-datatables/media/images/back_disabled.jpg
// @resource     back_enabled http://www.datatables.net/release-datatables/media/images/back_enabled.jpg
// @resource     forward_disabled http://www.datatables.net/release-datatables/media/images/forward_disabled.jpg
// @resource     forward_enabled http://www.datatables.net/release-datatables/media/images/forward_enabled.jpg
// @resource     sort_asc http://www.datatables.net/release-datatables/media/images/sort_asc.png
// @resource     sort_desc http://www.datatables.net/release-datatables/media/images/sort_desc.png
// @resource     sort_both http://www.datatables.net/release-datatables/media/images/sort_both.png
// @resource     sort_asc_disabled http://www.datatables.net/release-datatables/media/images/sort_asc_disabled.png
// @resource     sort_desc_disabled http://www.datatables.net/release-datatables/media/images/sort_desc_disabled.png
// @resource     demo_table http://cdn.datatables.net/1.10.12/css/jquery.dataTables.min.css
// @resource     https://cdn.datatables.net/1.10.19/css/jquery.dataTables.min.css
// @resource     https://cdn.datatables.net/buttons/1.5.2/css/buttons.dataTables.min.css
// @require      https://code.jquery.com/jquery-3.3.1.js
// @require      http://datatables.net/release-datatables/media/js/jquery.dataTables.js
// @require      https://cdn.datatables.net/1.10.19/js/jquery.dataTables.min.js
// @require      https://cdn.datatables.net/buttons/1.5.2/js/dataTables.buttons.min.js
// @require      https://cdn.datatables.net/buttons/1.5.2/js/buttons.flash.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/pdfmake.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/vfs_fonts.js
// @require      https://cdn.datatables.net/buttons/1.5.2/js/buttons.html5.min.js
// @require      https://cdn.datatables.net/buttons/1.5.2/js/buttons.print.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.22.2/moment.js
// ==/UserScript==

(function() {
	'use strict';

	try{

		//Functions
		function getList(){
			//This gets the list in case it exists. If it doesn't, initializes a new array to avoid errors.
			var listGet = GM_getValue("casesList");
			if(!listGet){
				/*0 is the case number,
			  1 is the URL
			  2 is the title
			  3 is the group the case is with
			  4 is the date and time
			  5 is who last interacted
			  6 is the last time it was updated
			  7 is the last worknote.*/
				var list = [];
				//list[0] = [];
				return list;
			}else{
				return listGet;
			}
		}

		function addToWatchList(casesList, currentCase, caseStatus){
			var i;
			var exists = false;
			for(i=0;i<casesList.length;i++){
				if(currentCase[0]==casesList[i][0]){
					exists = true;
					break;
				}
			}
			if(exists == false && caseStatus != 6){
				casesList.push(currentCase);
				var addConfirmation = confirm("Add this incident to the watchlist?");
				if(addConfirmation == true){
					GM_setValue("casesList", casesList);
				}
			}else if(caseStatus != 6 && exists == true){
				alert("Incident already on the watchlist.");
			}else if(caseStatus == 6 && exists == true){
				var remConfirmation = confirm("This incident is on the watchlist, but is being resolved. Remove from watchlist?");
				if(remConfirmation == true){
					var arrToPass = [];
					arrToPass[0] = i;
					removeFromList(arrToPass);
				}
			}
		}

		function removeFromList(caseNumbers){
			//Here we reverse the array so that splice() works without messing the indexes.
			caseNumbers = caseNumbers.reverse();
			var currentURL = window.location.href.toString();
			var casesList = getList();
			var i;
			for(i=0;i<caseNumbers.length;i++){
				casesList.splice(caseNumbers[i], 1);
			}
			GM_setValue("casesList", casesList);
			if(currentURL.includes("incident_list.do") || currentURL.includes("task_list.do")){
				location.reload();
			}
		}

		function updateCaseInfoEnter(casesList, i){
			GM_setValue("update", true);
			GM_setValue("quantity", "single");
			GM_setValue("updateCaseIndex", i);
			window.location.href = casesList[i][1];
		}

		function updateSelectedCases(checkedCases){
			var casesList = getList();
			var isUpdating = GM_getValue("update");
			var indexToUpdate = GM_getValue("indexToUpdate");
			if(isUpdating == true){
				if(indexToUpdate == undefined){
					GM_setValue("indexToUpdate", 0);
				}
				GM_setValue("quantity", "many");
				GM_setValue("checkedCases", checkedCases);
				window.location.href = casesList[checkedCases[indexToUpdate]][1];
			}
		}

		//Variables
		var casesList = getList();
		var currentURL = window.location.href.toString();
		var html;
		var i;

		//If we're on a incident list, reminds of the case reminder page if you haven't checked it.
		if(currentURL.includes("incident_list.do") || currentURL.includes("task_list.do") && !currentURL.includes("reminder")){
			var date = new Date();
			var currentDateTime = moment(date).format("YYYY-MM-DD");
			var lastCheckedReminderOn = GM_getValue("lastTimeSeen");
			if(lastCheckedReminderOn != null){
				if(moment(currentDateTime).isAfter(lastCheckedReminderOn) && casesList[0][0] != null){
					alert("There are incidents on your watchlist, the last time you checked the page was " + lastCheckedReminderOn + ".");
				}
			}
		}

		//If we're on the case reminder page.
		if(currentURL.includes("case") && currentURL.includes("reminder")){

			//Hides the default snow table. Some profiles have task_table, while some incident_tabke. Hides both.
			var incident_table = document.getElementById("incident_table");
			if(incident_table){
				incident_table.style.display = 'none';
			}
			var incident_expanded = document.getElementById("incident_expanded");
			if(incident_expanded){
				incident_expanded.style.display = 'none';
			}
			var task_table = document.getElementById("task_table");
			if(task_table){
				task_table.style.display = 'none';
			}
			var task_expanded = document.getElementById("task_expanded");
			if(task_expanded){
				task_expanded.style.display = 'none';
			}


			//Checks if we're still updating.
			var isUpdating = GM_getValue("update");

			//Declares the div containing the cases. the subsequent codes determine it's styling after adding it to the page.
			var divCases = document.createElement('div');
			var incidentList = document.getElementsByClassName("linked formlink");
			html = '<table class="data_list_table list_table table table-hover  list_header_search_disabled display" id="tableCases">';
			html += 	'<thead>';
			html += 		'<tr>';
			html += 			'<th style="max-width: 70px; width: 30px; white-space: nowrap;font-size: 1.5em;">&nbsp&nbsp&nbspIncidents sent to other teams:</th>';
			html += 		'</tr>';
			html += 		'<tr style="white-space: nowrap;">';
			html += 			'<th class="text-align-left list_header_cell list_hdr" style="max-width: 30px;">';
			html += 				'<input type="checkbox" id="checkAll" style="float: left; margin-left: 10px;"/>';
			html += 			'</th>';
			html += 			'<th class="text-align-left list_header_cell list_hdr">';
			html += 				'Number';
			html += 			'</th>';
			html += 			'<th class="text-align-left list_header_cell list_hdr">';
			html += 				'Summary';
			html += 			'</th>';
			html += 			'<th class="text-align-left list_header_cell list_hdr">';
			html += 				'Group with';
			html += 			'</th>';
			html += 			'<th class="text-align-left list_header_cell list_hdr">';
			html += 				'Added on';
			html += 			'</th>';
			html += 			'<th class="text-align-left list_header_cell list_hdr">';
			html += 				'Last interaction by';
			html += 			'</th>';
			html += 			'<th class="text-align-left list_header_cell list_hdr">';
			html += 				'Last interaction on';
			html += 			'</th>';
			html += 			'<th class="text-align-left list_header_cell list_hdr">';
			html += 				'Last work note';
			html += 			'</th>';
			html += 			'<th class="text-align-left list_header_cell list_hdr">';
			html += 				'Refresh';
			html += 			'</th>';
			html += 		'</tr>';
			html += 	'</thead>';
			html += '<tbody class="list2_body">';

			//Sets the innerhtml of the DIV with the cases list.
			if(casesList[0]){
				for(i=0;i<casesList.length;i++){
					html += 	'<tr class="trReminder">';
					html += 		'<td style="max-width: 30px;">';
					html += 			'<input type="checkbox" class="checkBoxCases checkbox" id="checkBox' + i + '" value="' + i + '"/>';
					html += 		'</td>';
					html += 		'<td>';
					html += 			'<a href="' + casesList[i][1] + '"> ' + casesList[i][0] + '</a>';
					html += 		'</td>';
					html += 		'<td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">';
					html += 			casesList[i][2];
					html += 		'</td>';
					html += 		'<td>';
					html += 			casesList[i][3];
					html += 		'</td>';
					html += 		'<td>';
					html += 			casesList[i][4];
					html += 		'</td>';
					html += 		'<td>';
					html += 			casesList[i][5];
					html += 		'</td>';
					html += 		'<td>';
					html += 			casesList[i][6];
					html += 		'</td>';
					html += 		'<td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">';
					html += 			casesList[i][7];
					html += 		'</td>';
					html += 		'<td>';
					html += 			'<input type="button" class="btn-update-case btn btn-default" value="Refresh"/>';
					html += 		'</td>';
					html += 	'</tr>';
				}
				html += '</tbody></table>';
			}else{
				html += '<tr><td>No incidents on the watchlist.</td></tr>';
				html += '</tbody></table>';
			}

			html += '<div style="width: 100%; margin-top: 8px;">';

			//Adds a button to update selected.
			html += '<input type="button" class="btn btn-default" id="buttonUpdateSelected" style="margin-left: 8px; margin-bottom: 8px; float: left;" value="Refresh Selected"/>';

			//Adds a button to remove a case from the list.
			html += '<input type="button" class="btn btn-default" id="buttonRemove" style="margin-left: 8px; margin-bottom: 8px; float: left;" value="Remove Selected"/>';

			//Adds a button to clear the list.
			html += '<input type="button" class="btn btn-default" id="buttonClear" style="margin-left: 8px; margin-bottom: 8px; float: left;" value="Clear List"/>';

			//Adds a button to reset the scripts values.
			html += '<input type="button" class="btn btn-default" id="buttonReset" style="margin-right: 8px; margin-bottom: 8px; float: right;" value="Reset Script"/>';

			html += '</div>';

			divCases.innerHTML = html;

						console.log(divCases);

			document.body.appendChild(divCases);

			divCases.setAttribute("class", "divCases");
			for(i=0;i<document.getElementsByClassName("divCases").length;i++){
				document.getElementsByClassName("divCases")[i].style.backgroundColor = '#eeeeee';
				document.getElementsByClassName("divCases")[i].style.width = '100%';
				document.getElementsByClassName("divCases")[i].style.border = 'solid thin';
				document.getElementsByClassName("divCases")[i].style.borderColor = "#aaaaaa";
				document.getElementsByClassName("divCases")[i].style.float = 'left';
			}

			//Styling of table.
			var tableCases = document.getElementById("tableCases");
			tableCases.style.width = "100%";

			var buttonUpdateCase = document.getElementsByClassName("btn-update-case");
			for (let j = 0; j < casesList.length; j++) {
				let button = buttonUpdateCase[j];
				button.addEventListener('click', function() {
					updateCaseInfoEnter(casesList, j);
				});
			}

			//Eventlistener to check all.
			var checkBoxCheckAll = document.getElementById("checkAll");
			if (checkBoxCheckAll){
				checkBoxCheckAll.addEventListener("change", function(){
					var checkBoxes = document.getElementsByClassName("checkBoxCases");
					if(checkBoxCheckAll.checked == true){
						for(i=0;i<checkBoxes.length;i++){
							checkBoxes[i].checked = true;
						}
					}else if(checkBoxCheckAll.checked == false){
						for(i=0;i<checkBoxes.length;i++){
							checkBoxes[i].checked = false;
						}
					}
				});
			}

			//defines the listener for the remove button. We can't define it before because it doesn't exist before being appended.
			var buttonRemove = document.getElementById("buttonRemove");
			if (buttonRemove){
				buttonRemove.addEventListener("click", function(){
					var casesList = document.getElementsByClassName("checkBoxCases");
					var checkedCases = [];
					var i;
					var j = 0;
					for(i=0;i<casesList.length;i++){
						if(casesList[i].checked){
							checkedCases[j] = i;
							j++;
						}
					}
					if(j == 0){
						alert("No incidents selected.");
					}else{
						removeFromList(checkedCases);
					}
				});
			}

			var buttonClear = document.getElementById("buttonClear");
			if (buttonClear){
				buttonClear.addEventListener("click", function(){
					var confirmClear = confirm("Do you really wish to clear the list?");
					if(confirmClear == true){
						GM_deleteValue("casesList");
						location.reload();
					}
				});
			}

			var buttonReset = document.getElementById("buttonReset");
			if (buttonReset){
				buttonReset.addEventListener("click", function(){
					var confirmReset = confirm("Do you really wish to reset the Script? This will clear all user stored settings, use this only if there are errors preventing you from using it.");
					if(confirmReset == true){
						let keys = GM_listValues();
						for (let key of keys) {
							GM_deleteValue(key);
						}
						location.reload();
					}
				});
			}

			//Adds required resources to datatables. Also check the metadata block for the resources.
			//For reference: http://userscripts-mirror.org/scripts/review/79492
			GM_addStyle(GM_getResourceText("demo_table").replace(/\.\.\/images\/([\w ]+)\.\w+/g, function(m, f){
				return GM_getResourceURL(f) || m;
			}));
			GM_addStyle("th {color:black}");

			//Sets the table as a datatable.
			$(document).ready(function() {
				$('#tableCases').DataTable({
					dom: 'Bfrtip',
					buttons: ['copy','csv','excel'],
				});

			} );

			var buttonUpdateSelected = document.getElementById("buttonUpdateSelected");
			if (buttonUpdateSelected){
				buttonUpdateSelected.addEventListener("click", function(){
					var casesListCheckBoxes = document.getElementsByClassName("checkBoxCases");
					var checkedCases = [];
					var i;
					var j = 0;
					for(i=0;i<casesListCheckBoxes.length;i++){
						if(casesListCheckBoxes[i].checked){
							checkedCases[j] = i;
							j++;
						}
					}
					if(j == 0){
						alert("Zero incidents selected!");
					}else{
						GM_setValue("update", true);
						GM_setValue("filterHref", window.top.location.href);
						GM_setValue("indexToUpdate", 0);
						updateSelectedCases(checkedCases);
					}
				});
			}

			if(isUpdating == true){
				var checkedCases = GM_getValue("checkedCases");
				var indexToUpdate = GM_getValue("indexToUpdate");
				window.location.href = casesList[checkedCases[indexToUpdate]][1];
			}

			//Code to check when was the last time the reminder page was seen.
			var date = new Date();
			var currentDateTime = moment(date).format("YYYY-MM-DD");

			GM_setValue("lastTimeSeen", currentDateTime);

		}

		//If we're inside an incident's page.
		if(currentURL.includes("incident.do")){
			var isUpdating = GM_getValue("update");
			var qntyUpdate = GM_getValue("quantity");
			//Sets data to populate the new incident.
			var date = new Date();
			var dateTime = moment(date).format("YYYY-MM-DD[ ]HH:mm:ss");
			/*var dateTime = date.getFullYear() + '-' + ('0' + (date.getMonth()+1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2) + " " + ('0' + (date.getHours()+1)).slice(-2) + ":" + ('0' + (date.getMinutes()+1)).slice(-2) + ":" + ('0' + (date.getSeconds()+1)).slice(-2);
			  By studying some libraries I found the library moment, which simplyfies by a whole lot date formatting. Worth it.*/
			var caseHref = window.location.href;
			//Filter Href to go back to in case of updating.
			var filterHref = GM_getValue("filterHref");
			//Gets the last information from the case.
			var userHistory = document.getElementsByClassName("user");
			//Checks to see if there are any user interactions. This also validates wether we're inside a new incident or not.
			if(userHistory[0] != undefined){
				var lastUser = userHistory[0].textContent;
				var dateHistory = document.getElementsByClassName("activity_date");
				var lastHistory = dateHistory[0].textContent;
				//Here we use the library moment to format the date and recude five hours from snow..
				var dateBrazil = moment(lastHistory.toString().replace(/ /g, "T")).subtract(5, 'hours').format("YYYY-MM-DD[ ]HH:mm:ss");
				var currentAnalystClass = window.top.document.getElementsByClassName("user-name");
				var currentAnalyst = currentAnalystClass[0].textContent;
				var lastWorkNotes = document.getElementsByName("work_notes");
				if(lastWorkNotes[0] != undefined){
					var lastWorkNote = lastWorkNotes[0].textContent;
				}else{
					var lastWorkNote = "No worknotes yet.";
				}

				var currentCase = [];
				if(isUpdating == true){
					var qntyToUpdate = GM_getValue("quantity");
					if(qntyToUpdate == "single"){
						var caseIndex = GM_getValue("updateCaseIndex");
						var casesListUpdating = getList();
						currentCase[0] = document.getElementById("sys_readonly.incident.number").value;
						currentCase[1] = caseHref;
						currentCase[2] = document.getElementById("incident.short_description").value;
						currentCase[3] = document.getElementById("sys_display.incident.assignment_group").value;
						currentCase[4] = casesListUpdating[caseIndex][4];
						currentCase[5] = lastUser;
						currentCase[6] = dateBrazil;
						currentCase[7] = lastWorkNote;
						for(i=0;i<casesListUpdating[caseIndex].length;i++){
							casesListUpdating[caseIndex][i] = currentCase[i];
						}
						GM_setValue("casesList", casesListUpdating);
						GM_setValue("update", false);
						GM_setValue("updateCaseIndex", null);
						window.history.back();
					}else if(qntyToUpdate == "many"){
						var casesListUpdating = getList();
						var indexToUpdate = GM_getValue("indexToUpdate");
						var checkedCases = GM_getValue("checkedCases");
						currentCase[0] = document.getElementById("sys_readonly.incident.number").value;
						currentCase[1] = caseHref;
						currentCase[2] = document.getElementById("incident.short_description").value;
						currentCase[3] = document.getElementById("sys_display.incident.assignment_group").value;
						currentCase[4] = casesListUpdating[indexToUpdate][4];
						currentCase[5] = lastUser;
						currentCase[6] = dateBrazil;
						currentCase[7] = lastWorkNote;
						for(i=0;i<casesListUpdating[checkedCases[indexToUpdate]].length;i++){
							casesListUpdating[checkedCases[indexToUpdate]][i] = currentCase[i];
						}
						indexToUpdate++;
						GM_setValue("casesList", casesListUpdating);
						GM_setValue("indexToUpdate", indexToUpdate);
						if(checkedCases[indexToUpdate] == undefined){
							GM_setValue("update", false);
							GM_setValue("indexToUpdate", 0);
						}
						window.top.location.href = filterHref;
					}
				}else{
					//Gets the standard buttons from SNOW.
					var buttonUpdate = document.getElementById("sysverb_update");
					var buttonSave = document.getElementById("sysverb_update_and_stay");
					currentCase[0] = document.getElementById("sys_readonly.incident.number").value;
					currentCase[1] = caseHref;
					currentCase[2] = document.getElementById("incident.short_description").value;
					currentCase[3] = document.getElementById("sys_display.incident.assignment_group").value;
					currentCase[4] = dateTime;
					currentCase[5] = currentAnalyst;
					currentCase[6] = dateTime;
					currentCase[7] = lastWorkNote;

					//New button to add to watchlist.
					var htmlButtonAdd = '<button class="btn btn-default" id="buttonAddToWatchlist" style="margin-right: 4px; background-color: rgb(250, 250, 210); ">Add to watchlist</button>';
					var buttonAdd = document.createElement('a');
					buttonAdd.innerHTML = htmlButtonAdd;
					buttonUpdate.parentNode.insertBefore(buttonAdd, buttonUpdate);

					//Listeners for buttons, check functions above.
					buttonAdd.addEventListener("click", function(){
						currentCase[5] = lastUser;
						currentCase[6] = dateBrazil;
						addToWatchList(casesList, currentCase, 2);
					});
					buttonUpdate.addEventListener("click", function(){
						var newGroup = document.getElementById("sys_display.incident.assignment_group").value;
						var newStatus = document.getElementById("incident.incident_state").value;
						if(newGroup!="DBS CURITIBA FD" || newStatus == 6){
							currentCase[3] = newGroup;
							addToWatchList(casesList, currentCase, newStatus);
						}
					});
					buttonSave.addEventListener("click", function(){
						var newGroup = document.getElementById("sys_display.incident.assignment_group").value;
						var newStatus = document.getElementById("incident.incident_state").value;
						if(newGroup!="DBS CURITIBA FD" || newStatus == 6){
							currentCase[3] = newGroup;
							addToWatchList(casesList, currentCase, newStatus);
						}
					});
				}
			}
		}

	}catch(e){
		alert("An error has occurred on Case Reminder: " + e.message);
	}

})();
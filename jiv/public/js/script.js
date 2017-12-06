$(document).ready(function () {
  $('#contactPopup').dialog({
    autoOpen: false,
    bgiframe: true,
    modal: true,
    dialogClass: 'contactFixed',
    close: function (event, ui) {
      $('html, body').removeAttr('style');
    }
  });
  $('#clientPopup').dialog({
    autoOpen: false,
    bgiframe: true,
    modal: true,
    dialogClass: 'clientFixed',
    close: function (event, ui) {
      $('html, body').removeAttr('style');
    }
  });

});

/*
  The below img error snippet will instantly hide any broken image placeholders
 although it appears there's extra steps happening here (hidding and unhiding),
 the reason is that the split second delay of reloading a new placeholder image
 can cause the ugly missing image placeholder to flash if we don't hide it instantly on err
 */


$("img").error(function () {
  $(this).css({visibility:"hidden"});
  if ($(this).hasClass('orgImage')) {
    $(this).attr({src:'/images/theme/no_logo_placeholder.png'});
    $(this).css({visibility:"visible"});
  }
});

function catFilter(term) {
  term = term.toLowerCase();

  var ul = document.getElementById("product-card-list");
  var items = ul.getElementsByTagName("li");
  for (var i = 0; i < items.length; ++i) {
    var tagDiv = items[i].getElementsByClassName("catLink");
    var tags = "";
    tags = $(tagDiv).text().toLowerCase();
    var txt = term;
    if (tags.indexOf(term) > -1) {
      items[i].setAttribute("style", "display:inline-block;");
      document.getElementById("clearFilters").setAttribute("style", "display:block;");
    } else {
      items[i].setAttribute("style", "display:none;");
      document.getElementById("clearFilters").setAttribute("style", "display:block;");
    }
  }
}
function clearFilter() {
  var ul = document.getElementById("product-card-list");
  var items = ul.getElementsByTagName("li");
  for (var i = 0; i < items.length; ++i) {
    items[i].setAttribute("style", "display:inline-block;");
  }
  document.getElementById("clearFilters").setAttribute("style", "display:none;");
}
function openBio(title) {
  var popup = document.getElementById("contactPopup");
  var mainDiv = document.createElement("div");
  mainDiv.setAttribute("class", "mainPopup");
  var text = document.createElement("p");
  text.setAttribute("class", "popupText");
  var img = document.createElement("img");
  img.setAttribute("height", "125");
  img.setAttribute("width", "125");
  img.setAttribute("alt", "icon");
  img.setAttribute("class", "popupImg");
  var titleDiv = document.createElement("div");
  titleDiv.setAttribute("class", "popupTitle");
  var contentDiv = document.createElement("div");
  contentDiv.setAttribute("class", "popupContent");
  var titleText = document.createElement("p");
  titleText.innerHTML = title;
  var secondTitle = document.createElement("p");
  secondTitle.setAttribute("class", "popupTitle");
  secondTitle.innerHTML = "Benefits";
  var secondContent = document.createElement("p");
  secondContent.setAttribute("class", "popupText");
  var benefitUL = document.createElement("ul");
  benefitUL.setAttribute("class", "benefitList");
  var benefitLI = document.createElement("li");
  benefitLI.setAttribute("class", "benefitLI");
  var benefitLI2 = document.createElement("li");
  benefitLI2.setAttribute("class", "benefitLI");

  var info = new Array();
  info[0] = "You have a valuable capability or service, but don’t have the platform to promote it. Jivango is an invaluable tool for anyone wanting to stand out from the crowd. The moment you join Jivango, you gain your own designated space to display your products and services as well as promote your organization and its capabilities.";
  info[1] = "Jivango facilitates open communication, promoting an environment where organizations can work together to augment their individual capabilities to provide solutions to client burning issues. Organizations that wish to extend the traditional way of doing business can do so with Jivango’s trailblazing innovation through the power of collaboration.";
  info[2] = "You have isolated an individual or multiple providers to mashup and collaborate on a solution, now it’s time to work in your designated space in AWS GovCloud. Providers jump into Jivango's immersive virtual playground not only to develop their solutions, but also to hold user engagement sessions with clients.";
  info[3] = "Jivango's unique environment allows clients to gain insight into the best capabilities on the market right at their fingertips.  All products are mature (TRL-6 or better) and can be purchased and easily integrated with little-to-no development time.";
  info[4] = "Challenges are a core element in a unique approach to problem solving. Have a burning issue that requires an innovative solution?  Post your problem and allow an expansive community of innovators to provide a customized solution.";
  info[5] = "Jivango fosters an environment of innovation, collaboration, and rapid systems integration. Peruse readily available capabilities in the Capabilities Catalog area, or participate in user engagement sessions with teams of providers ready to tackle your hardest challenges. Constant communication and collaboration ensure that all challenge requirements are satisfied and that your capability will be successfully integrated.";
  info[6] = "Direct access to government clients";
  info[7] = "Showcase your capabilities to a larger audience";
  info[8] = "";
  info[9] = "";
  info[10] = "";
  info[11] = "";
  info[12] = "";
  info[13] = "";
  info[14] = "";
  info[15] = "";
  info[16] = "";
  info[17] = "";

  img.src = "/images/theme/" + title + ".png";


  if (title == "Broadcast") {

    text.innerHTML = info[0];
    benefitLI.innerHTML = info[6];
    benefitLI2.innerHTML = info[7];

  } else if (title == "Collaborate") {

    text.innerHTML = info[1];
    benefitLI.innerHTML = info[8];
    benefitLI2.innerHTML = info[9];
  } else if (title == "Sandbox") {

    text.innerHTML = info[2];
    benefitLI.innerHTML = info[10];
    benefitLI2.innerHTML = info[11];
  } else if (title == "Discover") {

    text.innerHTML = info[3];
    benefitLI.innerHTML = info[12];
    benefitLI2.innerHTML = info[13];

  } else if (title == "Post") {
    text.innerHTML = info[4];
    benefitLI.innerHTML = info[14];
    benefitLI2.innerHTML = info[15];
  } else if (title == "Select") {
    text.innerHTML = info[5];
    benefitLI.innerHTML = info[16];
    benefitLI2.innerHTML = info[17];

  }

  contentDiv.appendChild(img);
  contentDiv.appendChild(text);
  contentDiv.appendChild(secondTitle);
  titleDiv.appendChild(titleText);
  benefitUL.appendChild(benefitLI);
  benefitUL.appendChild(benefitLI2);
  contentDiv.appendChild(benefitUL);

  popup.innerHTML = "";
  popup.appendChild(titleDiv);
  popup.appendChild(contentDiv);


  $('#contactPopup').dialog('open');


}
function openClient(title) {
  var popup = document.getElementById("clientPopup");

  var text = document.createElement("p");
  text.setAttribute("class", "clientText");

  var titleDiv = document.createElement("p");
  titleDiv.setAttribute("class", "clientTitle");


  var info = new Array();
  info[0] = "You have a valuable product or service, but don’t have the platform to promote it. Jivango is an invaluable tool for anyone wanting to stand out";
  info[1] = "You have a valuable product or service, but don’t have the platform to promote it. Jivango is an invaluable tool for anyone wanting to stand out";


  if (title == "client") {

    text.innerHTML = info[0];
    titleDiv.innerHTML = "Clients are:";


  } else if (title == "provider") {

    text.innerHTML = info[1];
    titleDiv.innerHTML = "Providers are:";

  }


  popup.innerHTML = "";
  popup.appendChild(titleDiv);
  popup.appendChild(text);


  $('#clientPopup').dialog('open');


}


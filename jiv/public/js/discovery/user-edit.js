(function (exports) {
  var _settings = {
    newStartDateSltr: null,
    newEndDateSltr: null,
    newDateDescSltr: null,
    newFeedbackDescSltr: null,
    idSltr: null,
    bassEventActionUrl: null,
    addDateAction: '/addDate',
    removeDateAction: '/removeDate',
    DiscoveryID: $('#challengeID').val()
  };
  var _CKupdate = function () {
    for (var instance in CKEDITOR.instances) {
      CKEDITOR.instances[instance].updateElement();
    }
  };
  var _setUpDatePickers = function () {
    $('#newScheduleStartDateIcon').click(function () {
      $('#newScheduleStartDate').datepicker('show');
    });

    $('#newScheduleEndDateIcon').click(function () {
      $('#newScheduleEndDate').datepicker('show');
    });

  };
  var _initCustomFieldEditor = function () {
    $.get('/problems/' + _settings.DiscoveryID + '/getfields')
        .done(function (data) {

          var formBuilder = new Formbuilder({
            selector: '#regristration-custom-fields',
            bootstrapData: data.fields
          });

          formBuilder.on('save', function (payload) {
            var customRegFields = JSON.parse(payload).fields;
            $.post('/problems/' + _settings.DiscoveryID + '/updatefields', {
              discoveryId: _settings.DiscoveryID,
              fields: customRegFields
            })
          });
          $('a[data-field-type="price"], a[data-field-type="address"], a[data-field-type="time"],a[data-field-type="website"], a[data-field-type="section_break"]').remove();
        })
        .fail(function (data) {
        });
  };
  var _initRegistrationHeaderEditor = function () {

    if(!CKEDITOR.instances.registrationDescription){
      $('#registrationDescription').ckeditor();
    }
    $('#registrationDescriptionForm').submit(function (e) {

      e.preventDefault();

      var $formEl = $(this);
      var $submitButton = $formEl.find("input[type='submit']");
      var postData = {
        discoveryId: _settings.DiscoveryID,
        registrationDescription: CKEDITOR.instances.registrationDescription.getData(),
        addWhitepaper: $formEl.find('#addWhitepaper').is(':checked'),
        addProduct: $formEl.find('#addProduct').is(':checked')
      };
      var formURL = $formEl.attr("action");
      var successVal = 'Update Optional Fields';
      var errorVal = 'Error';
      $submitButton.val('Saving...');
      $.ajax(
          {
            url: formURL,
            type: "POST",
            data: postData,
            success: function (data, textStatus, jqXHR) {
              $submitButton.val(successVal);
            },
            error: function (jqXHR, textStatus, errorThrown) {
              $submitButton.val(errorVal);
              var responseText = jqXHR.responseText;
              $('#regHdrMsg').html(responseText).show();
            }
          });
      return false;
    });
  };
  var userChallengeEdit = {};
  userChallengeEdit.init = function (startDateSltr, endDateSltr, newStartDateSltr, newEndDateSltr, newDateDescSltr, newFeedbackDescSltr, idSltr, username, regEndDateSltr) {
    $(startDateSltr).datepicker();
    $(endDateSltr).datepicker();
    $(newStartDateSltr).datepicker();
    $(newEndDateSltr).datepicker();
    var myDate = new Date($('#regEndTime').text());
    $(regEndDateSltr).datetimepicker({
      timeFormat: "hh:mm tt",
      dateFormat: "MM dd, yy",
      controlType: "select"
    });
    _settings.newDateDescSltr = newDateDescSltr;
    _settings.newFeedbackDescSltr = newFeedbackDescSltr;
    _settings.idSltr = idSltr;
    _settings.DiscoveryID = $(_settings.idSltr).val();
    _settings.newStartDateSltr = newStartDateSltr;
    _settings.newEndDateSltr = newEndDateSltr;
    _settings.username = username;
    _settings.baseRemoveEventURL = '/profile/' + _settings.username + '/manage/problems/';

    CKEDITOR.replace('newFeedbackDescription', {toolbar: 'Feedback'});
    CKEDITOR.replace('evaluationCriteria', {toolbar: 'Feedback'});
    $('#categories').tokenfield();
    _setUpDatePickers();
    _initCustomFieldEditor();
    _initRegistrationHeaderEditor();
  };


  userChallengeEdit.addDateEvent = function (event) {
    event.preventDefault();

    var $startDateInput = $(_settings.newStartDateSltr);
    var $endDateInput = $(_settings.newEndDateSltr);
    var $descInput = $(_settings.newDateDescSltr);

    var startDate = $startDateInput.val();
    var endDate = $endDateInput.val();
    var descr = $descInput.val();
    var challengeID = $(_settings.idSltr).val();
    var postData = {challengeID: challengeID, startDate: startDate, endDate: endDate, description: descr};
    $.post('/profile/' + _settings.username + '/manage/problems/' + challengeID + '/addDate', postData)
        .done(function (data) {
          var month = ["Jan.", "Feb.", "March", "April", "May",
            "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

          $startDateInput.val('');
          $endDateInput.val('');
          $descInput.val('');

          var oldStartDate = startDate.split("/");
          var newStartDate = new Date(oldStartDate[2], oldStartDate[0] - 1, oldStartDate[1]);
          var startMonth = month[newStartDate.getMonth()];

          var oldEndDate = endDate.split("/");
          var newEndDate = new Date(oldEndDate[2], oldEndDate[0] - 1, oldEndDate[1]);
          var endMonth = month[newEndDate.getMonth()];

          var displayDate = startMonth + ' ' + newStartDate.getDate() + ', ' + newStartDate.getFullYear();
          if (endDate && endMonth.length > 0) {
            displayDate += ' - ' + endMonth + ' ' + newEndDate.getDate() + ', ' + newEndDate.getFullYear();
          }
          $('#scheduleDates').append('<li class="list-group-item">\
          <div class="row">\
            <div class="col-sm-11">\
              <span class="mark">' + displayDate + ':</span>\
              <span>' + descr + '</span>\
            </div>\
            <div class="col-sm-1">\
              <a href="#" onclick="userChallengeEdit.removeDateEvent(event);" data-event-id="' + data.event._id + '">\
                <span class="glyphicon glyphicon-remove pull-right"></span>\
              </a>\
            </div>\
          </div>\
        </li>');

        }).fail(function (data) {
        });

  };
  userChallengeEdit.removeDateEvent = function (event) {
    event.preventDefault();
    var $link = $(event.target).parent();
    var challengeID = $(_settings.idSltr).val();
    var eventID = $link.attr('data-event-id');
    var postData = {challengeID: challengeID, eventID: eventID};
    $.post('/profile/' + _settings.username + '/manage/problems/' + challengeID + '/removeDate', postData)
        .done(function () {
          $link.parent().parent().parent().remove();
        })
        .fail(function (data) {
        });
  };

  userChallengeEdit.addFeedback = function (event) {
    event.preventDefault();
    _CKupdate();
    var descr = $(_settings.newFeedbackDescSltr).val();
    var challengeID = $(_settings.idSltr).val();
    var postData = {challengeID: challengeID, description: descr};
    $.post('/profile/' + _settings.username + '/manage/problems/' + challengeID + '/addFeedback', postData,
        function (data) {
          CKEDITOR.instances.newFeedbackDescription.setData('');
          var eventUL = $('#feedbackInputs');
          var eventLi = $(document.createElement('li'));
          eventLi.attr("class", "list-group-item");
          var eventDiv = $(document.createElement('div'));
          eventDiv.attr("class", "row");
          var descSpan = $(document.createElement('span'));
          descSpan.append(' ' + descr);
          var eventLink = $(document.createElement('a'));
          eventLink.attr('href', '#');
          eventLink.attr('onclick', 'userChallengeEdit.removeFeedback(event);');
          eventLink.attr('data-desc', descr);
          var eventLinkSpan = $(document.createElement('span'));
          eventLinkSpan.attr("class", "glyphicon glyphicon-remove pull-right");

          eventLink.append(eventLinkSpan);
          eventDiv.append(descSpan);
          eventDiv.append(eventLink);
          eventLi.append(eventDiv);
          eventUL.append('<li class="list-group-item"> \
            <div class="row"> \
              <div class="col-sm-11">\
                <span>' + descr + '</span>\
              </div>\
              <div class="col-sm-1">\
                <a href="#" onclick="userChallengeEdit.removeFeedback(event);" data-desc="' + descr + '">\
                  <span class="glyphicon glyphicon-remove pull-right"></span>\
                </a>\
              </div>\
            </div>\
          </li>');

        }).fail(function (data) {
        });

  };
  userChallengeEdit.removeFeedback = function (event) {
    event.preventDefault();
    var $link = $(event.target).parent();
    var challengeID = $(_settings.idSltr).val();
    var descr = $link.attr('data-desc');
    var postData = {challengeID: challengeID, description: descr};
    $.post('/profile/' + _settings.username + '/manage/problems/' + challengeID + '/removeFeedback', postData,
        function () {
          $link.parent().parent().parent().remove();
        })
        .fail(function () {
        });
  };

  userChallengeEdit.removeDocEvent = function (event) {
    event.preventDefault();
    var $link = $(event.target);
    var challengeID = $(_settings.idSltr).val();
    var docId = $link.attr('data-id');
    var postData = {challengeID: challengeID, docID: docId};
    $.post('/profile/' + _settings.username + '/manage/problems/' + challengeID + '/removeDoc', postData).done(
        function (data) {
          $link.parent().remove();
        }).fail(function (data) {
        });
  };

  // Do not allow duplicate selections
  $('#discoveryEvaluators').on("tokenfield:createtoken", function(e) {
    var newTokenValue = e.attrs.value;
    var existingTokens = $('#discoveryEvaluators').tokenfield('getTokens');

    for(var i in existingTokens) {
      if(existingTokens[i].value === newTokenValue) {
        return false
      }
    }

    return true;
  });

  $('#discoveryManagers').on("tokenfield:createtoken", function(e) {
    var newTokenValue = e.attrs.value;
    var existingTokens = $('#discoveryManagers').tokenfield('getTokens');

    for(var i in existingTokens) {
      if(existingTokens[i].value === newTokenValue) {
        return false
      }
    }

    return true;
  });

  $('[data-toggle="tooltip"]').tooltip();


  exports.userChallengeEdit = userChallengeEdit;
})(window);
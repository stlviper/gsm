var _displayMessage = function (Msg) {
  $('#manageRegisterMsg').addClass('alert-danger').removeClass('alert-info').removeClass('hide').html(Msg);
};
var _hideMessage = function () {
  $('#manageRegisterMsg').addClass('hide').html('');
};
var _hideDunsFields = function () {
  $('#dunsEntryFoundString').hide();
  $('#dunsEntryReadOnly').hide();
  $('#duns-input-overlay').hide();
};
var _showDunsFields = function () {
  $('#dunsEntryFoundString').show();
  $('#dunsEntryReadOnly').show();
  $('#duns-input-overlay').show();
};

var _skipDunsCheck = function () {
  $('#skip-duns-check').click(function () {
    var $el = $(this);
    _hideMessage();
    _showDunsFields();
    _autoPopulate({});
    showRoleSidebar();
    $('#dunsEntryFoundString').hide();
    $('#dunsEntryReadOnly').hide();
    $el.parentsUntil('.formPage').parent().hide({effect: 'fade', duration: '1000'});
  });
};

var _autoPopulate = function (orgData) {
  if (orgData.orgId) {
    $('#dunsEntryReadOnly').attr('value', orgData.orgId.value);
  }
  if (orgData.orgName) {
    $('#orgName').attr('value', orgData.orgName);
  }
  if (orgData.orgAddress) {
    $('#orgAddress').attr('value', orgData.orgAddress);
  }
  if (orgData.orgWebsite) {
    $('#orgWebsite').attr('value', orgData.orgWebsite);
  }
  if (orgData.businessPocFirstName) {
    $('#businessPocFirstName').attr('value', orgData.businessPocFirstName);
  }
  if (orgData.businessPocLastName) {
    $('#businessPocLastName').attr('value', orgData.businessPocLastName);
  }
  if (orgData.businessPocEmail) {
    $('#businessPocEmail').attr('value', orgData.businessPocEmail);
  }
  if (orgData.businessPocPhone) {
    $('#businessPocPhone').attr('value', orgData.businessPocPhone);
  }
  if (orgData.technicalPocFirstName) {
    $('#technicalPocFirstName').attr('value', orgData.technicalPocFirstName);
  }
  if (orgData.technicalPocLastName) {
    $('#technicalPocLastName').attr('value', orgData.technicalPocLastName);
  }
  if (orgData.technicalPocEmail) {
    $('#technicalPocEmail').attr('value', orgData.technicalPocEmail);
  }
  if (orgData.technicalPocPhone) {
    $('#technicalPocPhone').attr('value', orgData.technicalPocPhone);
  }
};


function showRoleSidebar() {
  $('.dunsSidebar').hide();
  $('.emailSidebar').hide();
  $('.roleSidebar').show();
  $('.contactSidebar').hide();
}
function showContactSidebar() {
  $('.dunsSidebar').hide();
  $('.emailSidebar').hide();
  $('.roleSidebar').hide();
  $('.contactSidebar').show();
}
function getSamGovOrganization(callback) {
  var dunsValue = $('#dunsEntry-input').val();
  if(dunsValue) {
    $.get('/join/get-sam-gov-organization/' + dunsValue, {}, callback);
  }
  else{
    $('#dunsEntry-input').attr('placeholder','Enter DUNs or hit I don\'t have one').addClass('has-warning');
  }
}
function validateGovernmentEmail(callback) {
  $.post('/join/check-government-email', {govEmail: $('#govEmail').val()}, callback);
}
function isFieldsEqual(field1, field2) {
  return field1 === field2 ? true : false;
}
function validateOrganizationInformation(callback) {
  $.post('/join/check-organization-information', {
    orgName: $('#orgName').val(),
    orgAddress: $('#orgAddress').val(), orgWebsite: $('#orgWebsite').val()
  }, callback);
}
function validateOrganizationPocInformation(callback) {
  $.post('/join/check-organization-poc-information', {
    businessPocFirstName: $('#businessPocFirstName').val(),
    businessPocLastName: $('#businessPocLastName').val(), businessPocEmail: $('#businessPocEmail').val(),
    businessPocPhone: $('#businessPocPhone').val(), technicalPocFirstName: $('#technicalPocFirstName').val(),
    technicalPocLastName: $('#technicalPocLastName').val(), technicalPocEmail: $('#technicalPocEmail').val(),
    technicalPocPhone: $('#technicalPocPhone').val()
  }, callback);
}

$(document).ready(function () {
  //$('#dunsEntry').hide();
  _skipDunsCheck();
  $('.big-orange-btn').on('click', function () {
    var $spinner = $('#spinnerOrgTypeLookup');
    var $el = $(this);
    if ($el.parentsUntil('.formPage').parent().get(0).id === 'formPage1') {
      if (typeof($('input[name=orgType]:checked').val()) === 'undefined') {
        _displayMessage('You must select an option.');
      } else if ($('input[name=orgType]:checked').val() !== 'government') {
        $spinner.show();
        getSamGovOrganization(function (data) {
          if (data.message) {
            _displayMessage(data.message);
          }
          else if (!data.organization) {
            _displayMessage('Cannot process your request at this time.');
          }
          else {
            _hideMessage();
            _showDunsFields();
            _autoPopulate(data.organization);
            showRoleSidebar();
            $el.parentsUntil('.formPage').parent().hide({effect: 'fade', duration: '1000'});
          }
        });
        $spinner.hide();
      } else { // Government is selected
        if ($('#govEmail').val() === '' || $('#govEmailRepeat').val() === '') {
          _displayMessage('Please fill out both email fields');
        } else if (!isFieldsEqual($('#govEmail').val(), $('#govEmailRepeat').val())) {
          _displayMessage('Email addresses are not the same');
        } else {
          $spinner.show();
          validateGovernmentEmail(function (data) {
            if (data.message) {
              _displayMessage(data.message);
            } else {
              _hideMessage();
              _hideDunsFields();
              showRoleSidebar();
              $el.parentsUntil('.formPage').parent().hide({effect: 'fade', duration: '1000'});
            }
          });
          $spinner.hide();
        }
      }
    } else if ($el.parentsUntil('.formPage').parent().get(0).id === 'formPage2') {
      if (typeof($('input[name=orgRole]:checked').val()) === 'undefined') {
        _displayMessage('You must select an organization role');
      } else if ($('input[name=orgType]:checked').val() !== 'government') {
        validateOrganizationInformation(function (data) {
          _hideMessage();
          if (data.message) {
            _displayMessage(data.message);
          } else {
            _hideMessage();
            showContactSidebar();
            $el.parentsUntil('.formPage').parent().hide({effect: 'fade', duration: '1000'});
          }
        })
      } else { // Government
        validateOrganizationInformation(function (data) {
          _hideMessage();
          _hideDunsFields();
          if (data.message) {
            _displayMessage(data.message);
          } else {
            _hideMessage();
            showContactSidebar();
            $el.parentsUntil('.formPage').parent().hide({effect: 'fade', duration: '1000'});
          }
        })
      }
    } else {
      validateOrganizationPocInformation(function (data) {
        if (data.message) {
          _displayMessage(data.message);
        } else {
          _hideMessage();
          document.getElementById('signupForm').submit();
        }
      })
    }
  });
  $('input[name=orgType]').on('click', function () {
    var email = $('#govEmail'),
      emailRepeat = $('#govEmailRepeat'),
      emailSidebar = $('.emailSidebar'),
      duns = $('#dunsEntry'),
      dunsSidebar = $('.dunsSidebar'),
      skipDunsCheck = $('#skip-duns-check');

    var type = $('input[name=orgType]:checked').val();
    if (typeof(type) === 'undefined') {
      return;
    }
    else if (type === 'government') {
      duns.hide();
      dunsSidebar.hide();
      email.show();
      emailRepeat.show();
      emailSidebar.show();
      skipDunsCheck.hide();
    } else {
      email.hide();
      emailRepeat.hide();
      emailSidebar.hide();
      duns.show();
      dunsSidebar.show();
      skipDunsCheck.show();
    }
  });
});

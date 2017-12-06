$(document).ready(function () {
  PostPageLoadPrep();
  createEventBindings();
});

function PostPageLoadPrep() {
  $('#passwordErrorMessage, #passwordSuccessMessage').hide();

}

function createEventBindings() {

  $(':input[name="newpass"]').on("keyup", function (event) {
    if (event.keyCode == '13') {
      savePasswordReset($('#routeName').text());
      return;
    }
    checkPassword($(this).val());
    checkIfPasswordsMatch();
  });
  $(':input[name="confirmpass"]').on("keyup", function (event) {
    if (event.keyCode == '13') {
      savePasswordReset($('#routeName').text());
      return;
    }
    checkIfPasswordsMatch();
  });

}

function checkIfPasswordsMatch() {
  if ($(':input[name="confirmpass"]').val() === $(':input[name="newpass"]').val()) {
    $('#confirmpassstatus').removeClass('glyphicon-remove text-danger').addClass('glyphicon-ok text-success');
  } else {
    $('#confirmpassstatus').removeClass('glyphicon-ok text-success').addClass('glyphicon-remove text-danger');
  }
}
function checkPassword(inputtxt) {
  var passw = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
  if (!inputtxt.match(passw)) {
    $('#passwordErrorMessage').show().html("<h1 class='icon'><span class='icon-warning-o'></span></h1>Your password needs to:<br>1. Be between 6 to 20 characters.<br>2. Contain at least one numeric digit.<br>3. Contain one uppercase AND one lowercase letter.");
    return true;
  }
  else {
    $('#passwordErrorMessage').hide();
    return false;
  }
}

function savePasswordReset(route) {
  $('#passwordSuccessMessage, #passwordErrorMessage').hide();
  var payload = {
    id: $(':input[name="id"]').val(),
    newpass: $(':input[name="newpass"]').val(),
    confirmpass: $(':input[name="confirmpass"]').val()
  };

  var postPassReset = $.post('',
    payload,
    null,
    "json")
    .done(function (data) {
      if (data.error) {
        $('#passwordErrorMessage').show().html(data.error);
      }
      else if (data.redirectUrl) {
        window.location = data.redirectUrl;
      }
      else {
        $('.disposable').hide();
        $('#resetPassMessage').hide();
        if (data.message) {
          $('#passwordSuccessMessage').html(data.message);
        }
        $('#passwordSuccessMessage').show();
      }
    });

}
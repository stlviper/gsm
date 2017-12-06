$(document).ready(function () {

  $('#signupForm').validate({
    rules: {
      govEmail: {
        required: true,
        email: true
      },
      govEmailRepeat: {
        required: true,
        email: true,
        equalTo: '#email'
      }
    },
    highlight: function (element) {
      $(element).closest('.control-group').removeClass('success').addClass('error');
    },
    success: function (element) {
      element/*.text('OK!')*/.addClass('valid')
        .closest('.control-group').removeClass('error').addClass('success');
    }
  });
});
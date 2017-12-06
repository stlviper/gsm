$(document).ready(function () {
  /* enable dirty form watching if page has a form */
  $('form.check-dirty').dirtyForms();
  /* this enables a rescan on bootstrap modals once they are closed */
  $('.modal').on('hidden.bs.modal', function () {
    $('form.check-dirty').dirtyForms('rescan');
    // Remove success alert
    $('.alert.alert-success').remove();

  });
});
(function (exports) {
  var _settings = {
    tblSltr: '#registrationsTbl',
    formRegistrationsIdSltr: '#registrationID',
    modalSltr: '#deleteModal',
    modalWarningSltr: '#deleteModalWarning',
    newsDeleteForm: '#newsDeleteForm'
  };

  exports.adminRegistrationListInit = function(){
    $(_settings.tblSltr).DataTable();
  };

  exports.deleteRegistration = function (event) {
    event.preventDefault();
    var $form = $(_settings.newsDeleteForm);
    var formUrl = $form.attr('action');
    var formData = {
      id: $(_settings.formRegistrationsIdSltr).val()
    };

    $.ajax({
      url: formUrl,
      type: "POST",
      data: formData,
      success: function (data) {
        $(_settings.modalSltr).modal('hide');
        var tableRow = $(_settings.tblSltr + ' > tbody > tr[data-id="' + $form.children(_settings.formRegistrationsIdSltr).val() + '"');
        tableRow.remove();
      },
      error: function (data) {
        $(_settings.modalWarningSltr).html(data.message || 'Can not process your request at this time. Please contact an Administrator')
          .parent().show();
      }
    });
  };

  exports.deleteRegistrationClick = function (element) {
    var $el = $(element.target);
    $(_settings.formRegistrationsIdSltr).attr('value', $el.attr('data-id'));
    $(_settings.modalSltr).modal('show');
  };

})(window);
adminRegistrationListInit();



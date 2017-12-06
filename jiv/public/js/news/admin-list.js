
(function (exports) {
  var _settings = {
    tblSltr: '#news-list',
    formCommunityIDSltr: '#communityFriendlyURL',
    formRegistrationsIdSltr: '#newsFriendlyURL',
    modalSltr: '#deleteModal',
    modalWarningSltr: '#deleteModalWarning',
    newsDeleteForm: '#newsDeleteForm'
  };

  exports.adminNewsListInit = function(){
    $(_settings.tblSltr).DataTable();
  };

  exports.deleteNewsPost = function (event) {
    event.preventDefault();
    var $form = $(_settings.newsDeleteForm);
    var formUrl = $form.attr('action');
    var formData = {
      communityFriendlyURL: $(_settings.formCommunityIDSltr).val(),
      newsFriendlyURL: $(_settings.formRegistrationsIdSltr).val()
    };

    $.ajax({
      url: formUrl,
      type: "POST",
      data: formData,
      success: function (data) {
        $(_settings.modalSltr).modal('hide');
        var tableRow = $(_settings.tblSltr + ' > tbody > tr[data-news-id="' + $form.children(_settings.formRegistrationsIdSltr).val() + '"');
        tableRow.remove();
      },
      error: function (data) {
        $(_settings.modalWarningSltr).html(data.message || 'Can not process your request at this time. Please contact an Administrator')
          .parent().show();
      }
    });
  };

  exports.deleteNewsClick = function (element) {
    var $el = $(element);
    $(_settings.formCommunityIDSltr).attr('value', $el.attr('data-community-id'));
    $(_settings.formRegistrationsIdSltr).attr('value', $el.attr('data-news-id'));
    $(_settings.modalSltr).modal('show');
  };

})(window);




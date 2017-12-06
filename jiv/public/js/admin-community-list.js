var _settings = {
  activeClass: 'btn-success',
  inactiveClass: 'btn-danger',
  deleteModalSltr: '#deleteModal',
  deactivateModalSltr: '#deactivateModal',
  successModalSltr: '#successmsg',
  deactivateUrl: '/admin/communities/deactivate',
  deleteUrl: '/admin/communities/delete',
  activateUrl: '/admin/communities/activate',
  deactivateHdnInptSltr: '#deactivateID',
  deleteHdnInptSltr: '#deleteID'
};
var toggleActivateStatus = function (event) {
  var $el = $(event);
  var communityID = $el.attr('data-community-id');
  if ($el.hasClass(_settings.activeClass)) {
    //Deactivate
    $(_settings.deactivateHdnInptSltr).val(communityID);
    $(_settings.deactivateModalSltr).modal('show');
  }
  else if ($el.hasClass(_settings.inactiveClass)) {
    $.post(_settings.activateUrl, {id: communityID})
      .done(function (data) {
        $el.removeClass(_settings.inactiveClass)
          .addClass(_settings.activeClass)
          .html('Deactivate');
      })
      .fail(function (data) {
      });
  }
};
var deactivate = function (event) {
  var communityID = $(_settings.deactivateHdnInptSltr).val();
  $.post(_settings.deactivateUrl, {id: communityID})
    .done(function (data) {
      $(_settings.deactivateModalSltr).modal('hide');
      $('a[data-community-id="' + communityID + '"]')
        .removeClass(_settings.activeClass)
        .addClass(_settings.inactiveClass)
        .html('Activate');
    })
    .fail(function (data) {
    });
};

var deleteCommunityClick = function (event) {
  var $el = $(event);
  var communityID = $el.attr('data-community-id');
  $(_settings.deleteHdnInptSltr).val(communityID);
  $(_settings.deleteModalSltr).modal('show');
};
var deleteCommunity = function (event) {
  var communityID = $(_settings.deleteHdnInptSltr).val();
  $.post(_settings.deleteUrl, {id: communityID})
    .done(function (data) {
      $(_settings.deleteModalSltr).modal('hide');
      $('a[data-community-id="' + communityID + '"]').parent().parent().remove()
    })
    .fail(function (data) {
    });
};
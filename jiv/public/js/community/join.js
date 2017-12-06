(function (exports) {

  var _settings = {
    joinUrl: '/community/join',
    leaveUrl: '/community/leave',
    myCommunitiesSltr: '#my-communities',
    templateCardSltr: '#mycommunity-template',
    exploreTemplateSltr: '#explore-template',
    defaultLogoUrl: '/images/create-community.png'
  };

  exports.joinCommunityClick = function (target, communityID, success, fail) {
    $.post(_settings.joinUrl, {id: communityID})
      .done(function (data) {
        $(target).html('<span class="glyphicon glyphicon-minus-sign" aria-hidden="true"></span> Leave');
        $(target).attr('onclick', 'leaveCommunityClick(this, "'+communityID+'");');
        if (success) {
          success(data);
        }
      })
      .fail(function (data) {
        if (fail) {
          fail(data);
        }
      });
    return false;
  };

  exports.leaveCommunityClick = function (target, communityID, success, fail) {
    $.post(_settings.leaveUrl, {id: communityID})
      .done(function (data) {

        $(target).html('<span class="glyphicon glyphicon-plus-sign" aria-hidden="true"></span> Join');
        $(target).attr('onclick', 'joinCommunityClick(this, "'+communityID+'");');
        if (success) {
          success(data);
        }
      })
      .fail(function (data) {
        if (fail) {
          fail(data);
        }
      });
    return false;
  };

})(window);
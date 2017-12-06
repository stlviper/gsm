(function (exports) {
  var _settings = {
    username: null,
    registrationID: null,
    removeWhitepaperUrl: '',
    removeDocumentUrl: '',
    messageSltr: '',
    productDrpDwnSltr: '#productDrpDwn',
    productDescFieldsSltr: '#productDescFields',
	productAttachment: '#whitepaper'
  };
  var _displayMsg = function (msg, isAlert) {
    var $msgDisplay = $(_settings.messageSltr);
    $msgDisplay.html(msg);
    $msgDisplay.addClass(isAlert ? 'alert-warning' : 'alert-info');
    $msgDisplay.show();
  };
  var registration_edit = {
    removeWhitepaper: function (event) {
      event.preventDefault();
      $.post(_settings.removeWhitepaperUrl, {},
        function () {
          event.target.parentElement.remove();
          _displayMsg('Whitepaper successfly successful', false);
        }
      ).fail(function () {
          _displayMsg('Error occurred while trying to remove your whitepaper.', true);
        }
      );
    },
    removeDocument: function (event, docName) {
      var postData = {docName: docName};
      $.post(_settings.removeDocumentUrl, postData,
        function () {
          event.target.parentElement.remove();
          _displayMsg('Document removed successful', false);
        }
      ).fail(function () {
          _displayMsg('Error occurred while trying to remove your whitepaper.', true);
        }
      );
    },

    productDescFields: function () {
      var $productDrpDwn = $(_settings.productDrpDwnSltr);
      var $productDescFields = $(_settings.productDescFieldsSltr);
      if ($productDrpDwn.val() !== '') {
        $productDescFields.show('slow');
      }
      $productDrpDwn.change(function () {
        if ($productDrpDwn.val() === '') {
          $productDescFields.hide('slow');
          return;
        }
        $productDescFields.show('slow');
      });
    },
    init: function (username, registrationID) {
      _settings.username = username;
      _settings.registrationID = registrationID;
      _settings.removeWhitepaperUrl = '/profile/' + _settings.username + '/manage/solutions/' + _settings.registrationID + '/deletewhitepaper';
      _settings.removeDocumentUrl = '/profile/' + _settings.username + '/manage/solutions/' + _settings.registrationID + '/deletedocument';
    }
  };

  exports.registration_edit = registration_edit;
})(window);
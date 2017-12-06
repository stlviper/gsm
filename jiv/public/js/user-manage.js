(function (exports) {

  if (!String.prototype.format) {
    String.prototype.format = function () {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined'
          ? args[number]
          : match
          ;
      });
    };
  }

  var _settings = {
    orgRef: '',
    username: '',
    msgSltr: '#manageMsg',
    screenShotFileInputSltr: '#screenShots',
    screenShotWrapperSltr: '#screenShots_wrapper',
    screenShotUploadFormSltr: '#screenShots_uploadForm', //Renamed this value to prevent broken submit listener from firing
    removeImageUrl: null
  };
  exports.userManage = {
    showMsg: function (text, isAlert) {
      var $msgElement = $(_settings.msgSltr);
      $msgElement.removeClass('hide').html(text);
      if (isAlert) {
        $msgElement.addClass('alert-warning');
      }
      else {
        $msgElement.addClass('alert-info');
      }
    },
    hideMsg: function () {
      var $msgElement = $(_settings.msgSltr);
      $msgElement.addClass('hide')
        .removeClass('alert-info')
        .removeClass('alert-warning');
    },
    showTab: function () {
      var hash = window.location.hash;
      hash = hash.substr(0, hash.indexOf('?'));
      hash && $('ul.nav a[href="' + hash + '"]').tab('show');

      $('.nav-tabs a').click(function (e) {
        $(this).tab('show');
        var scrollmem = $('body').scrollTop();
        window.location.hash = this.hash;
        $('html,body').scrollTop(scrollmem);
      });
    },
    resetFileUploadValue: function () {
      var $fileInput = $(_settings.screenShotFileInputSltr);
      $fileInput.replaceWith($fileInput.val('').clone(true));
    },
    validUpload: function () {

      var uploadFileCnt = $(_settings.screenShotFileInputSltr)[0].files.length;
	  var size = $(_settings.screenShotFileInputSltr)[0].files[0].size;
      var curImgCnt = $(_settings.screenShotWrapperSltr).children().length;
	  var $spinner = $('#spinnerScreenshot');
	  $spinner.show();
      if (uploadFileCnt > 5 || curImgCnt >= 5 || (uploadFileCnt + curImgCnt) > 5) {
        userManage.showMsg('A maximum of 5 images are allowed', true);
		$spinner.hide();
        return false;
      }
	  if (size > 2097152){
		  userManage.showMsg('The image file size cannot exceed 2MB', true);
		  $spinner.hide();
		  return false
	  }
      userManage.hideMsg();
      return true;
    },
    uploadAction: function () {
		
      
    },
    removeImage: function (event, imageName) {
      event.preventDefault();
      $.post(_settings.removeImageUrl,
        {orgRef: _settings.orgRef, imageName: imageName},
        function (res) {
          event.target.parentElement.remove();
          userManage.showMsg(res.results.message, false);
        }
      ).fail(function () {
          userManage.showMsg('Cannot remove the image at this time', true);
        }
      );
      return false;
    },
    removeScreenshot: function (event, imageName) {
        event.preventDefault();
        $.post(_settings.removeScreenshotUrl,
          { orgRef: _settings.orgRef, imageName: imageName },
          function (res) {
              $(document.getElementById(imageName)).remove();
              $('#deleteFile').modal('hide');
          }
        ).fail(function () {
            userManage.showMsg('Cannot remove the image at this time', true);
        }
        );
        return false;
    },
    init: function (orgRef, username) {
      _settings.orgRef = orgRef;
      _settings.username = username;
      _settings.removeImageUrl = '/profile/' + _settings.username + '/manage/removeimage';
      _settings.removeScreenshotUrl = '/profile/' + _settings.username + '/org-files/removeimage';
      userManage.uploadAction();
      userManage.showTab();
    }
  };
})(window);


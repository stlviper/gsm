(function (exports) {
  
  var registrationForm = {_settings: {}};
  var _getWordCount = function (wordString) {
    var words = wordString.split(" ");
    words = words.filter(function (words) {
      return words.length > 0
    }).length;
    return words;
  };
  var _isProductSelected = function () {

    return $('#productDrpDwn').length > 0 && $('#productDrpDwn').val().length > 0;
  };
  var _isWhitePaperUploaded = function (whitepaperContainer) {
    return $('#whitepaper').length > 0 && $('#whitepaper').val().length > 0 || $(whitepaperContainer).length > 0;
  };

  registrationForm.init = function (formSettings) {
    if (!formSettings) {
      registrationForm._settings = {formSltr: '#registerCreate', whitepaperContainer: null};
    }
    else {
      registrationForm._settings = formSettings;
    }

    $(registrationForm._settings.formSltr).validate({
      rules: {
        accessInstructions: {
          required: _isProductSelected
        },
		whitepaper: { filesize: 20971520  },
		otherDocumentation: { filesize: 20971520  }
      },
	  messages: { whitepaper: "File must not exceed 20MB", otherDocumentation: "File must not exceed 20MB" },
      errorPlacement: function (error, element) {
        var $el = $(element);
        var elType = $el.attr('type');
        if (elType === 'checkbox' || elType === 'radio') {
          $(element).parent().parent().siblings('.errorTxt').append(error);
        }
        else {
           error.insertBefore(element);
        }
      },
      submitHandler: function (form) {
        var $form = $(form);
        var formData = new FormData($form[0]);
        var challengeID = document.getElementById("challengeID").innerHTML;
        var $spinner = $('#spinnerRegister');
	    $spinner.show();
        $.ajax({
          url: '/marketspace/problems/' + challengeID + '/register',
          type: "POST",
          data: formData,
          processData: false,
          contentType: false,
          success: function (data, jqXHR) {
            $spinner.hide();
            $(' .registrationAlert').html('<h2>' + data.message + '</h2>').show();
            $('#newRegistrationMessage').show();
            $form[0].reset();
            $('#productDescFields').hide();

          },
          error: function (jqXHR, errorThrown) {
            $spinner.hide();
            var errorMsg = jqXHR.responseJSON.message;
            if (errorMsg == 'Invalid file type whitepaper') {
              $('#fileTypeError').html('<label id=fileValidateError class=error for=documents>Invalid file type</label>').show();
              $('#fileTypeError').focus();
            }
            else if (errorMsg == 'Invalid file type otherDocuments') {
              $('#fileTypeErrorOther').html('<label id=fileValidateError class=error for=documents>Invalid file type</label>').show();
              $('#fileTypeErrorOther').focus();
            }
            else {

              $(' .registrationAlert', '#newRegistrationMessage').html('<h2 class=errorText>' + errorMsg + '</h2>').show();
              $('#newRegistrationMessage').show();
            }
          }
        });
        return;
      }
    });

    $(registrationForm._settings.formSltr + ' input[type="date"]').datepicker({dateFormat: 'yy-mm-dd'});
    $('[data-toggle="tooltip"]').tooltip();

    var $drpDwn = $('#productDrpDwn');
    $drpDwn.change(function () {
      if ($drpDwn.val()) {
        $('#productDescFields').show();
      }
      else {
        $('#productDescFields').hide();
      }
    });

    $.validator.addMethod("wordCount",
      function (value, element) {
        var $el = $(element);
        var maxCnt = $el.attr('maxwordcount') || -1;
        var minCnt = $el.attr('minwordcount') || -1;
        var count = _getWordCount(value);
        if ((maxCnt > -1 && count > maxCnt) || (minCnt > -1 && count < minCnt)) {
          return false
        }
        else {
          return true;
        }
      },
      function (params, element) {
        var $el = $(element);
        var minCount = $el.attr('minwordcount');
        var maxCount = $el.attr('maxwordcount');
        if (minCount && maxCount) {
          return 'The field word count must be between ' + minCount + ' and ' + maxCount + ' words';
        }
        else if (minCount) {
          return 'The field must have at least ' + minCount + ' words';
        }
        else if (maxCount) {
          return 'The field must have no more then ' + maxCount + ' words';
        }
      }
    );
$.validator.addMethod('filesize', function(value, element, param) {
    return this.optional(element) || (element.files[0].size <= param) 
});


    $(registrationForm._settings.formSltr + ' input[minmaxlengthunit="words"]').each(function () {
      //NOTE: Jquery Validate won't apply rule to all objects in a query just the first one unless you loop.
      $(this).rules("add", {
        wordCount: true
      });
    });
    $(registrationForm._settings.formSltr + 'input[integersonly="true"]').each(function () {
      //NOTE: Jquery Validate won't apply rule to all objects in a query just the first one unless you loop.
      $(this).rules("add", {
        digits: true
      });
    });
  };

  exports.registrationForm = registrationForm;
})(window);